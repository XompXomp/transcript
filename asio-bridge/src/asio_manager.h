#pragma once

#include <vector>
#include <string>
#include <memory>
#include <functional>
#include <thread>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <queue>
#include <asio.h>

struct ASIOChannel {
    int id;
    std::string name;
    bool isActive;
    ASIOChannelInfo info;
};

struct AudioChunk {
    int channelId;
    std::vector<float> samples;
    double timestamp;
    int sampleRate;
};

class ASIOManager {
public:
    ASIOManager();
    ~ASIOManager();

    // Initialize ASIO
    bool initialize();
    
    // Get available ASIO devices
    std::vector<std::string> getAvailableDevices();
    
    // Get channels for a specific device
    std::vector<ASIOChannel> getChannels(const std::string& deviceName);
    
    // Start capturing from specific channels
    bool startCapture(const std::string& deviceName, const std::vector<int>& channelIds);
    
    // Stop capture
    void stopCapture();
    
    // Set callback for audio data
    void setAudioCallback(std::function<void(const AudioChunk&)> callback);
    
    // Check if capture is active
    bool isCapturing() const { return m_isCapturing; }
    
    // Get current device info
    std::string getCurrentDevice() const { return m_currentDevice; }

private:
    // ASIO callbacks
    static void bufferSwitch(long doubleBufferIndex, ASIOBool directProcess);
    static void sampleRateDidChange(ASIOSampleRate sRate);
    static long asioMessage(long selector, long value, void* message, double* opt);
    static ASIOTime* bufferSwitchTimeInfo(ASIOTime* params, long doubleBufferIndex, ASIOBool directProcess);

    // Internal methods
    bool openDevice(const std::string& deviceName);
    void closeDevice();
    void processAudioData(long doubleBufferIndex);
    void captureThread();
    void setupBuffers();
    void cleanupBuffers();

    // ASIO instance
    IASIO* m_asio;
    std::string m_currentDevice;
    
    // Audio buffers
    ASIOBufferInfo* m_bufferInfos;
    ASIOChannelInfo* m_channelInfos;
    long m_bufferSize;
    long m_sampleRate;
    int m_numChannels;
    
    // Capture state
    std::atomic<bool> m_isCapturing;
    std::atomic<bool> m_shouldStop;
    std::thread m_captureThread;
    
    // Audio callback
    std::function<void(const AudioChunk&)> m_audioCallback;
    std::mutex m_callbackMutex;
    
    // Active channels
    std::vector<int> m_activeChannels;
    
    // Buffer management
    std::mutex m_bufferMutex;
    std::queue<AudioChunk> m_audioQueue;
    std::condition_variable m_bufferCondition;
    
    // Thread safety
    mutable std::mutex m_mutex;
};
