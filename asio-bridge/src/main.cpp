#include "asio_manager.h"
#include "websocket_server.h"
#include "audio_processor.h"
#include <iostream>
#include <signal.h>
#include <thread>
#include <chrono>
#include <vector>
#include <string>

// Global variables for cleanup
ASIOManager* g_asioManager = nullptr;
WebSocketServerManager* g_wsManager = nullptr;
bool g_running = true;

// Signal handler for graceful shutdown
void signalHandler(int signal) {
    std::cout << "\nReceived signal " << signal << ", shutting down..." << std::endl;
    g_running = false;
}

// Audio callback function
void onAudioData(const AudioChunk& chunk) {
    if (g_wsManager) {
        // Resample to 24kHz if needed (STT requirement)
        std::vector<float> resampledSamples;
        if (chunk.sampleRate != 24000) {
            resampledSamples = AudioProcessor::resample(chunk.samples, chunk.sampleRate, 24000);
        } else {
            resampledSamples = chunk.samples;
        }
        
        // Send to WebSocket clients
        g_wsManager->sendAudioData(chunk.channelId, resampledSamples, chunk.timestamp);
    }
}

// Subscription callback function
void onSubscriptionChange(int channelId, bool subscribed) {
    std::cout << "Channel " << channelId << " " << (subscribed ? "subscribed" : "unsubscribed") << std::endl;
    
    // Update ASIO capture based on subscriptions
    if (g_asioManager && g_wsManager) {
        auto subscriptions = g_wsManager->getSubscriptions();
        std::vector<int> activeChannels;
        
        for (const auto& sub : subscriptions) {
            if (sub.isActive) {
                activeChannels.push_back(sub.channelId);
            }
        }
        
        // Restart capture with new channel list
        if (!activeChannels.empty()) {
            std::string currentDevice = g_asioManager->getCurrentDevice();
            if (!currentDevice.empty()) {
                g_asioManager->startCapture(currentDevice, activeChannels);
            }
        } else {
            g_asioManager->stopCapture();
        }
    }
}

int main(int argc, char* argv[]) {
    std::cout << "ASIO Bridge - Audio Streaming Server" << std::endl;
    std::cout << "====================================" << std::endl;
    
    // Set up signal handlers
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);
    
    // Parse command line arguments
    int wsPort = 8080;
    std::string asioDevice;
    
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--port" && i + 1 < argc) {
            wsPort = std::stoi(argv[++i]);
        } else if (arg == "--device" && i + 1 < argc) {
            asioDevice = argv[++i];
        } else if (arg == "--help") {
            std::cout << "Usage: " << argv[0] << " [options]" << std::endl;
            std::cout << "Options:" << std::endl;
            std::cout << "  --port <port>     WebSocket server port (default: 8080)" << std::endl;
            std::cout << "  --device <name>   ASIO device name to use" << std::endl;
            std::cout << "  --help           Show this help message" << std::endl;
            return 0;
        }
    }
    
    try {
        // Initialize ASIO Manager
        g_asioManager = new ASIOManager();
        if (!g_asioManager->initialize()) {
            std::cerr << "Failed to initialize ASIO Manager" << std::endl;
            return 1;
        }
        
        // Get available ASIO devices
        auto devices = g_asioManager->getAvailableDevices();
        if (devices.empty()) {
            std::cerr << "No ASIO devices found" << std::endl;
            return 1;
        }
        
        std::cout << "Available ASIO devices:" << std::endl;
        for (size_t i = 0; i < devices.size(); i++) {
            std::cout << "  " << i << ": " << devices[i] << std::endl;
        }
        
        // Select device
        if (asioDevice.empty()) {
            if (devices.size() == 1) {
                asioDevice = devices[0];
                std::cout << "Auto-selected device: " << asioDevice << std::endl;
            } else {
                std::cout << "Please select a device (0-" << devices.size() - 1 << "): ";
                int selection;
                std::cin >> selection;
                
                if (selection >= 0 && selection < static_cast<int>(devices.size())) {
                    asioDevice = devices[selection];
                } else {
                    std::cerr << "Invalid device selection" << std::endl;
                    return 1;
                }
            }
        }
        
        // Get channels for selected device
        auto channels = g_asioManager->getChannels(asioDevice);
        if (channels.empty()) {
            std::cerr << "No input channels found on device: " << asioDevice << std::endl;
            return 1;
        }
        
        std::cout << "Available channels on " << asioDevice << ":" << std::endl;
        std::vector<std::string> channelNames;
        for (const auto& channel : channels) {
            std::cout << "  " << channel.id << ": " << channel.name << std::endl;
            channelNames.push_back(channel.name);
        }
        
        // Initialize WebSocket Manager
        g_wsManager = new WebSocketServerManager();
        
        // Set up callbacks
        g_asioManager->setAudioCallback(onAudioData);
        g_wsManager->setSubscriptionCallback(onSubscriptionChange);
        
        // Start WebSocket server
        if (!g_wsManager->start(wsPort)) {
            std::cerr << "Failed to start WebSocket server" << std::endl;
            return 1;
        }
        
        // Send initial channel list
        g_wsManager->sendChannelList(channelNames);
        
        std::cout << "ASIO Bridge is running..." << std::endl;
        std::cout << "WebSocket server: ws://localhost:" << wsPort << std::endl;
        std::cout << "ASIO device: " << asioDevice << std::endl;
        std::cout << "Available channels: " << channels.size() << std::endl;
        std::cout << "Press Ctrl+C to stop" << std::endl;
        
        // Main loop
        while (g_running) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    // Cleanup
    std::cout << "Shutting down..." << std::endl;
    
    if (g_asioManager) {
        g_asioManager->stopCapture();
        delete g_asioManager;
        g_asioManager = nullptr;
    }
    
    if (g_wsManager) {
        g_wsManager->stop();
        delete g_wsManager;
        g_wsManager = nullptr;
    }
    
    std::cout << "ASIO Bridge stopped" << std::endl;
    return 0;
}
