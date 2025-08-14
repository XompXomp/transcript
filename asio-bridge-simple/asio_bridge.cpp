#include <iostream>
#include <vector>
#include <string>
#include <thread>
#include <mutex>
#include <queue>
#include <atomic>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <sstream>
#include <iomanip>

// ASIO SDK includes
#include "asio.h"
#include "asiodrivers.h"

#pragma comment(lib, "ws2_32.lib")

// Simple WebSocket implementation
class SimpleWebSocket {
private:
    SOCKET serverSocket;
    std::vector<SOCKET> clients;
    std::mutex clientsMutex;
    std::atomic<bool> running;

    std::string generateWebSocketKey() {
        // Simple key generation for WebSocket handshake
        std::string key = "dGhlIHNhbXBsZSBub25jZQ=="; // Base64 encoded "the sample nonce"
        return key;
    }

    std::string generateAcceptKey(const std::string& clientKey) {
        // Simple accept key generation (in real implementation, you'd use proper SHA1)
        return "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=";
    }

    bool performWebSocketHandshake(SOCKET clientSocket) {
        char buffer[4096];
        int bytesReceived = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
        if (bytesReceived <= 0) return false;

        buffer[bytesReceived] = '\0';
        std::string request(buffer);

        // Parse WebSocket key from request
        std::string clientKey;
        size_t keyPos = request.find("Sec-WebSocket-Key: ");
        if (keyPos != std::string::npos) {
            size_t keyStart = keyPos + 19;
            size_t keyEnd = request.find("\r\n", keyStart);
            if (keyEnd != std::string::npos) {
                clientKey = request.substr(keyStart, keyEnd - keyStart);
            }
        }

        if (clientKey.empty()) return false;

        // Send WebSocket handshake response
        std::string response = 
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Accept: " + generateAcceptKey(clientKey) + "\r\n"
            "\r\n";

        return send(clientSocket, response.c_str(), response.length(), 0) != SOCKET_ERROR;
    }

    std::string createWebSocketFrame(const std::string& data) {
        std::string frame;
        
        // WebSocket frame structure:
        // Byte 0: FIN=1, RSV=000, Opcode=1000 (binary)
        frame.push_back(0x82); // 10000010 (FIN=1, Opcode=2 for binary)
        
        // Byte 1: MASK=0, Payload length
        if (data.length() < 126) {
            frame.push_back(static_cast<char>(data.length()));
        } else if (data.length() < 65536) {
            frame.push_back(126);
            frame.push_back((data.length() >> 8) & 0xFF);
            frame.push_back(data.length() & 0xFF);
        } else {
            frame.push_back(127);
            for (int i = 7; i >= 0; i--) {
                frame.push_back((data.length() >> (i * 8)) & 0xFF);
            }
        }
        
        // Payload
        frame += data;
        
        return frame;
    }

public:
    SimpleWebSocket() : serverSocket(INVALID_SOCKET), running(false) {}

    bool start(int port) {
        WSADATA wsaData;
        if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
            std::cerr << "WSAStartup failed" << std::endl;
            return false;
        }

        serverSocket = socket(AF_INET, SOCK_STREAM, 0);
        if (serverSocket == INVALID_SOCKET) {
            std::cerr << "Socket creation failed" << std::endl;
            return false;
        }

        // Allow address reuse
        int opt = 1;
        setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));

        sockaddr_in serverAddr;
        serverAddr.sin_family = AF_INET;
        serverAddr.sin_addr.s_addr = INADDR_ANY;
        serverAddr.sin_port = htons(port);

        if (bind(serverSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
            std::cerr << "Bind failed" << std::endl;
            closesocket(serverSocket);
            return false;
        }

        if (listen(serverSocket, SOMAXCONN) == SOCKET_ERROR) {
            std::cerr << "Listen failed" << std::endl;
            closesocket(serverSocket);
            return false;
        }

        running = true;
        std::cout << "WebSocket server started on port " << port << std::endl;
        return true;
    }

    void acceptClients() {
        while (running) {
            SOCKET clientSocket = accept(serverSocket, nullptr, nullptr);
            if (clientSocket != INVALID_SOCKET) {
                // Perform WebSocket handshake
                if (performWebSocketHandshake(clientSocket)) {
                    std::lock_guard<std::mutex> lock(clientsMutex);
                    clients.push_back(clientSocket);
                    std::cout << "WebSocket client connected. Total clients: " << clients.size() << std::endl;
                } else {
                    closesocket(clientSocket);
                }
            }
        }
    }

    void broadcast(const std::string& message) {
        std::string frame = createWebSocketFrame(message);
        std::lock_guard<std::mutex> lock(clientsMutex);
        auto it = clients.begin();
        while (it != clients.end()) {
            int result = send(*it, frame.c_str(), frame.length(), 0);
            if (result == SOCKET_ERROR) {
                closesocket(*it);
                it = clients.erase(it);
            } else {
                ++it;
            }
        }
    }

    void stop() {
        running = false;
        if (serverSocket != INVALID_SOCKET) {
            closesocket(serverSocket);
        }
        std::lock_guard<std::mutex> lock(clientsMutex);
        for (SOCKET client : clients) {
            closesocket(client);
        }
        clients.clear();
        WSACleanup();
    }
};

// ASIO Manager
class ASIOManager {
private:
    ASIODriverInfo driverInfo;
    ASIOChannelInfo channelInfo;
    ASIOBufferInfo bufferInfo[64]; // Support up to 64 channels
    ASIOCallbacks callbacks;
    long bufferSize;
    long sampleRate;
    std::vector<std::string> channelNames;
    std::vector<std::queue<std::vector<float>>> audioQueues;
    std::mutex audioMutex;
    std::atomic<bool> running;
    SimpleWebSocket* websocket;
    static ASIOManager* instance; // For static callbacks

public:
    ASIOManager() : running(false), websocket(nullptr) {
        instance = this;
        memset(&driverInfo, 0, sizeof(driverInfo));
        memset(&channelInfo, 0, sizeof(channelInfo));
        memset(&callbacks, 0, sizeof(callbacks));
        
        callbacks.bufferSwitch = &ASIOManager::bufferSwitch;
        callbacks.sampleRateDidChange = &ASIOManager::sampleRateDidChange;
        callbacks.asioMessage = &ASIOManager::asioMessage;
        callbacks.bufferSwitchTimeInfo = &ASIOManager::bufferSwitchTimeInfo;
    }

    void setWebSocket(SimpleWebSocket* ws) {
        websocket = ws;
    }

    bool initialize() {
        // List available drivers
        char driverNames[256][32];
        long numDrivers = ASIOGetDriverNames(driverNames, 256);
        std::cout << "Available ASIO drivers:" << std::endl;
        for (long i = 0; i < numDrivers; i++) {
            std::cout << "  " << i << ": " << driverNames[i] << std::endl;
        }

        // Use first available driver (you can modify this to select specific driver)
        if (numDrivers > 0) {
            return openDriver(driverNames[0]);
        }

        return false;
    }

    bool openDriver(const char* driverName) {
        if (ASIOOpenDriver(driverName, (void**)&driverInfo.driver) != ASE_OK) {
            std::cerr << "Failed to open ASIO driver: " << driverName << std::endl;
            return false;
        }

        if (ASIOInit(&driverInfo) != ASE_OK) {
            std::cerr << "ASIOInit failed" << std::endl;
            return false;
        }

        // Get channel info
        long numInputChannels, numOutputChannels;
        if (ASIOGetChannels(&numInputChannels, &numOutputChannels) != ASE_OK) {
            std::cerr << "ASIOGetChannels failed" << std::endl;
            return false;
        }

        std::cout << "Input channels: " << numInputChannels << ", Output channels: " << numOutputChannels << std::endl;

        // Get channel names
        channelNames.clear();
        audioQueues.clear();
        
        for (long i = 0; i < numInputChannels; i++) {
            channelInfo.channel = i;
            channelInfo.isInput = ASIOTrue;
            
            if (ASIOGetChannelInfo(&channelInfo) == ASE_OK) {
                std::string name = "Channel " + std::to_string(i + 1);
                if (channelInfo.name[0] != '\0') {
                    name = std::string(channelInfo.name);
                }
                channelNames.push_back(name);
                audioQueues.push_back(std::queue<std::vector<float>>());
            }
        }

        // Set up buffers
        if (ASIOGetBufferSize(&bufferSize, &bufferSize, &bufferSize, &bufferSize) != ASE_OK) {
            std::cerr << "ASIOGetBufferSize failed" << std::endl;
            return false;
        }

        if (ASIOGetSampleRate(&sampleRate) != ASE_OK) {
            std::cerr << "ASIOGetSampleRate failed" << std::endl;
            return false;
        }

        // Create buffers
        for (long i = 0; i < numInputChannels; i++) {
            bufferInfo[i].isInput = ASIOTrue;
            bufferInfo[i].channelNum = i;
            bufferInfo[i].buffers[0] = bufferInfo[i].buffers[1] = nullptr;
        }

        if (ASIOCreateBuffers(bufferInfo, numInputChannels, bufferSize, &callbacks) != ASE_OK) {
            std::cerr << "ASIOCreateBuffers failed" << std::endl;
            return false;
        }

        return true;
    }

    bool start() {
        if (ASIOStart() != ASE_OK) {
            std::cerr << "ASIOStart failed" << std::endl;
            return false;
        }

        running = true;
        std::cout << "ASIO started. Streaming " << channelNames.size() << " channels." << std::endl;
        return true;
    }

    void stop() {
        running = false;
        ASIOStop();
        ASIODisposeBuffers();
        ASIOExit();
    }

    const std::vector<std::string>& getChannelNames() const {
        return channelNames;
    }

    // ASIO Callbacks
    static long bufferSwitch(long doubleBufferIndex, ASIOBool directProcess) {
        if (instance) {
            instance->processBuffer(doubleBufferIndex);
        }
        return 0;
    }

    static long sampleRateDidChange(ASIOSampleRate sRate) {
        return 0;
    }

    static long asioMessage(long selector, long value, void* message, double* opt) {
        return 0;
    }

    static ASIOTime* bufferSwitchTimeInfo(ASIOTime* params, long doubleBufferIndex, ASIOBool directProcess) {
        return nullptr;
    }

    void processBuffer(long doubleBufferIndex) {
        std::lock_guard<std::mutex> lock(audioMutex);
        
        for (size_t i = 0; i < channelNames.size(); i++) {
            if (bufferInfo[i].buffers[doubleBufferIndex]) {
                std::vector<float> audioData(bufferSize);
                
                // Convert audio data to float32
                ASIOChannelInfo& chInfo = channelInfo;
                chInfo.channel = i;
                chInfo.isInput = ASIOTrue;
                ASIOGetChannelInfo(&chInfo);
                
                if (chInfo.type == ASIOSTInt16LSB) {
                    int16_t* samples = (int16_t*)bufferInfo[i].buffers[doubleBufferIndex];
                    for (long j = 0; j < bufferSize; j++) {
                        audioData[j] = samples[j] / 32768.0f;
                    }
                } else if (chInfo.type == ASIOSTFloat32LSB) {
                    float* samples = (float*)bufferInfo[i].buffers[doubleBufferIndex];
                    for (long j = 0; j < bufferSize; j++) {
                        audioData[j] = samples[j];
                    }
                }
                
                audioQueues[i].push(audioData);
            }
        }
    }

    // Process audio data (called from main thread)
    void processAudio() {
        while (running) {
            std::lock_guard<std::mutex> lock(audioMutex);
            
            // Process each channel
            for (size_t i = 0; i < audioQueues.size(); i++) {
                if (!audioQueues[i].empty()) {
                    auto& audioData = audioQueues[i].front();
                    
                    // Send to WebSocket clients
                    if (websocket) {
                        std::string message = "CHANNEL:" + std::to_string(i) + "|";
                        message.append((char*)audioData.data(), audioData.size() * sizeof(float));
                        websocket->broadcast(message);
                    }
                    
                    audioQueues[i].pop();
                }
            }
            
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }
    }
};

ASIOManager* ASIOManager::instance = nullptr;

int main() {
    std::cout << "Simple ASIO Bridge" << std::endl;
    std::cout << "==================" << std::endl;

    // Initialize ASIO
    ASIOManager asioManager;
    if (!asioManager.initialize()) {
        std::cerr << "Failed to initialize ASIO" << std::endl;
        return 1;
    }

    // Initialize WebSocket server
    SimpleWebSocket websocket;
    if (!websocket.start(8080)) {
        std::cerr << "Failed to start WebSocket server" << std::endl;
        return 1;
    }

    asioManager.setWebSocket(&websocket);

    // Start client acceptance thread
    std::thread acceptThread(&SimpleWebSocket::acceptClients, &websocket);

    // Start ASIO
    if (!asioManager.start()) {
        std::cerr << "Failed to start ASIO" << std::endl;
        return 1;
    }

    // Start audio processing thread
    std::thread audioThread(&ASIOManager::processAudio, &asioManager);

    std::cout << "ASIO Bridge running. Press Enter to stop..." << std::endl;
    std::cin.get();

    // Cleanup
    asioManager.stop();
    websocket.stop();
    
    if (acceptThread.joinable()) acceptThread.join();
    if (audioThread.joinable()) audioThread.join();

    return 0;
}
