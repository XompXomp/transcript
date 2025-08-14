#include "asio_manager.h"
#include "audio_processor.h"
#include <iostream>
#include <algorithm>
#include <chrono>

// Global instance for ASIO callbacks
static ASIOManager* g_asioManager = nullptr;

ASIOManager::ASIOManager() 
    : m_asio(nullptr)
    , m_bufferInfos(nullptr)
    , m_channelInfos(nullptr)
    , m_bufferSize(0)
    , m_sampleRate(0)
    , m_numChannels(0)
    , m_isCapturing(false)
    , m_shouldStop(false) {
    g_asioManager = this;
}

ASIOManager::~ASIOManager() {
    stopCapture();
    closeDevice();
    g_asioManager = nullptr;
}

bool ASIOManager::initialize() {
    std::lock_guard<std::mutex> lock(m_mutex);
    
    // ASIO is initialized when we open a device
    // No need to pre-load anything
    return true;
}

std::vector<std::string> ASIOManager::getAvailableDevices() {
    std::vector<std::string> devices;
    
    // Enumerate ASIO drivers
    char driverNames[256][32];
    long numDrivers = 0;
    
    if (ASIOGetDriverNames(driverNames, &numDrivers) == ASE_OK) {
        for (long i = 0; i < numDrivers; i++) {
            devices.push_back(std::string(driverNames[i]));
        }
    }
    
    return devices;
}

std::vector<ASIOChannel> ASIOManager::getChannels(const std::string& deviceName) {
    std::vector<ASIOChannel> channels;
    
    if (!openDevice(deviceName)) {
        return channels;
    }
    
    long numInputChannels, numOutputChannels;
    if (m_asio->getChannels(&numInputChannels, &numOutputChannels) == ASE_OK) {
        for (long i = 0; i < numInputChannels; i++) {
            ASIOChannel channel;
            channel.id = static_cast<int>(i);
            channel.isActive = false;
            
            // Get channel info
            channel.info.channel = i;
            channel.info.isInput = ASIOTrue;
            
            if (m_asio->getChannelInfo(&channel.info) == ASE_OK) {
                channel.name = std::string(channel.info.name);
                channels.push_back(channel);
            }
        }
    }
    
    return channels;
}

bool ASIOManager::startCapture(const std::string& deviceName, const std::vector<int>& channelIds) {
    std::lock_guard<std::mutex> lock(m_mutex);
    
    if (m_isCapturing) {
        stopCapture();
    }
    
    if (!openDevice(deviceName)) {
        return false;
    }
    
    m_activeChannels = channelIds;
    m_numChannels = static_cast<int>(channelIds.size());
    
    if (!setupBuffers()) {
        return false;
    }
    
    // Start ASIO
    ASIOError result = m_asio->start();
    if (result != ASE_OK) {
        std::cerr << "Failed to start ASIO: " << result << std::endl;
        return false;
    }
    
    m_isCapturing = true;
    m_shouldStop = false;
    
    // Start capture thread
    m_captureThread = std::thread(&ASIOManager::captureThread, this);
    
    std::cout << "Started ASIO capture for " << m_numChannels << " channels" << std::endl;
    return true;
}

void ASIOManager::stopCapture() {
    std::lock_guard<std::mutex> lock(m_mutex);
    
    if (!m_isCapturing) {
        return;
    }
    
    m_shouldStop = true;
    m_isCapturing = false;
    
    if (m_asio) {
        m_asio->stop();
    }
    
    if (m_captureThread.joinable()) {
        m_captureThread.join();
    }
    
    cleanupBuffers();
    
    std::cout << "Stopped ASIO capture" << std::endl;
}

void ASIOManager::setAudioCallback(std::function<void(const AudioChunk&)> callback) {
    std::lock_guard<std::mutex> lock(m_callbackMutex);
    m_audioCallback = callback;
}

bool ASIOManager::openDevice(const std::string& deviceName) {
    if (m_asio) {
        closeDevice();
    }
    
    // Load ASIO driver
    if (ASIOInit(&m_asio) != ASE_OK) {
        std::cerr << "Failed to initialize ASIO" << std::endl;
        return false;
    }
    
    // Initialize ASIO
    if (m_asio->init(0) != ASE_OK) {
        std::cerr << "Failed to initialize ASIO device" << std::endl;
        return false;
    }
    
    m_currentDevice = deviceName;
    
    // Get sample rate
    m_asio->getSampleRate(&m_sampleRate);
    
    // Get buffer size
    long minSize, maxSize, preferredSize, granularity;
    if (m_asio->getBufferSize(&minSize, &maxSize, &preferredSize, &granularity) == ASE_OK) {
        m_bufferSize = preferredSize;
    } else {
        m_bufferSize = 1024; // Default
    }
    
    // Setup callbacks
    m_callbacks.bufferSwitch = &ASIOManager::bufferSwitch;
    m_callbacks.sampleRateDidChange = &ASIOManager::sampleRateDidChange;
    m_callbacks.asioMessage = &ASIOManager::asioMessage;
    m_callbacks.bufferSwitchTimeInfo = &ASIOManager::bufferSwitchTimeInfo;
    
    return true;
}

void ASIOManager::closeDevice() {
    if (m_asio) {
        m_asio->disposeBuffers();
        m_asio->exit();
        m_asio = nullptr;
    }
    m_currentDevice.clear();
}

void ASIOManager::setupBuffers() {
    if (!m_asio || m_numChannels == 0) {
        return;
    }
    
    // Allocate buffer info
    m_bufferInfos = new ASIOBufferInfo[m_numChannels];
    m_channelInfos = new ASIOChannelInfo[m_numChannels];
    
    // Setup buffer info for each channel
    for (int i = 0; i < m_numChannels; i++) {
        m_bufferInfos[i].isInput = ASIOTrue;
        m_bufferInfos[i].channelNum = m_activeChannels[i];
        m_bufferInfos[i].buffers[0] = nullptr;
        m_bufferInfos[i].buffers[1] = nullptr;
        
        // Setup channel info
        m_channelInfos[i].channel = m_activeChannels[i];
        m_channelInfos[i].isInput = ASIOTrue;
        m_asio->getChannelInfo(&m_channelInfos[i]);
    }
    
    // Create buffers
    ASIOError result = m_asio->createBuffers(m_bufferInfos, m_numChannels, m_bufferSize, &m_callbacks);
    if (result != ASE_OK) {
        std::cerr << "Failed to create ASIO buffers: " << result << std::endl;
        cleanupBuffers();
        return;
    }
}

void ASIOManager::cleanupBuffers() {
    if (m_asio) {
        m_asio->disposeBuffers();
    }
    
    delete[] m_bufferInfos;
    delete[] m_channelInfos;
    m_bufferInfos = nullptr;
    m_channelInfos = nullptr;
}

void ASIOManager::captureThread() {
    while (!m_shouldStop) {
        std::unique_lock<std::mutex> lock(m_bufferMutex);
        m_bufferCondition.wait_for(lock, std::chrono::milliseconds(10));
        
        // Process any queued audio data
        while (!m_audioQueue.empty()) {
            AudioChunk chunk = m_audioQueue.front();
            m_audioQueue.pop();
            lock.unlock();
            
            // Call audio callback
            std::lock_guard<std::mutex> callbackLock(m_callbackMutex);
            if (m_audioCallback) {
                m_audioCallback(chunk);
            }
            
            lock.lock();
        }
    }
}

void ASIOManager::processAudioData(long doubleBufferIndex) {
    if (!m_isCapturing || !m_asio) {
        return;
    }
    
    auto now = std::chrono::high_resolution_clock::now();
    double timestamp = std::chrono::duration<double>(now.time_since_epoch()).count();
    
    // Process each active channel
    for (int i = 0; i < m_numChannels; i++) {
        if (m_bufferInfos[i].buffers[doubleBufferIndex]) {
            // Convert audio data to float32
            std::vector<float> samples;
            samples.reserve(m_bufferSize);
            
            if (m_channelInfos[i].type == ASIOSTInt16LSB) {
                int16_t* buffer = static_cast<int16_t*>(m_bufferInfos[i].buffers[doubleBufferIndex]);
                for (long j = 0; j < m_bufferSize; j++) {
                    samples.push_back(static_cast<float>(buffer[j]) / 32768.0f);
                }
            } else if (m_channelInfos[i].type == ASIOSTFloat32LSB) {
                float* buffer = static_cast<float*>(m_bufferInfos[i].buffers[doubleBufferIndex]);
                samples.assign(buffer, buffer + m_bufferSize);
            } else if (m_channelInfos[i].type == ASIOSTInt24LSB) {
                // Handle 24-bit audio
                uint8_t* buffer = static_cast<uint8_t*>(m_bufferInfos[i].buffers[doubleBufferIndex]);
                for (long j = 0; j < m_bufferSize; j++) {
                    int32_t sample = (buffer[j*3] << 8) | (buffer[j*3+1] << 16) | (buffer[j*3+2] << 24);
                    sample >>= 8; // Sign extend
                    samples.push_back(static_cast<float>(sample) / 8388608.0f);
                }
            }
            
            // Create audio chunk
            AudioChunk chunk;
            chunk.channelId = m_activeChannels[i];
            chunk.samples = std::move(samples);
            chunk.timestamp = timestamp;
            chunk.sampleRate = static_cast<int>(m_sampleRate);
            
            // Queue for processing
            std::lock_guard<std::mutex> lock(m_bufferMutex);
            m_audioQueue.push(std::move(chunk));
            m_bufferCondition.notify_one();
        }
    }
}

// ASIO Callbacks
void ASIOManager::bufferSwitch(long doubleBufferIndex, ASIOBool directProcess) {
    if (g_asioManager) {
        g_asioManager->processAudioData(doubleBufferIndex);
    }
}

void ASIOManager::sampleRateDidChange(ASIOSampleRate sRate) {
    if (g_asioManager) {
        g_asioManager->m_sampleRate = sRate;
    }
}

long ASIOManager::asioMessage(long selector, long value, void* message, double* opt) {
    switch (selector) {
        case kAsioSelectorSupported:
            if (value == kAsioResetRequest || value == kAsioEngineVersion ||
                value == kAsioResyncRequest || value == kAsioLatenciesChanged) {
                return 1L;
            }
            break;
        case kAsioResetRequest:
            return 1L;
        case kAsioResyncRequest:
            return 1L;
        case kAsioLatenciesChanged:
            return 1L;
        case kAsioEngineVersion:
            return 2L;
    }
    return 0L;
}

ASIOTime* ASIOManager::bufferSwitchTimeInfo(ASIOTime* params, long doubleBufferIndex, ASIOBool directProcess) {
    if (g_asioManager) {
        g_asioManager->processAudioData(doubleBufferIndex);
    }
    return params;
}
