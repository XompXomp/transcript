#pragma once

#include <vector>
#include <cstdint>
#include <string>

class AudioProcessor {
public:
    AudioProcessor();
    ~AudioProcessor();

    // Audio format conversion
    static std::vector<float> int16ToFloat32(const std::vector<int16_t>& int16Data);
    static std::vector<int16_t> float32ToInt16(const std::vector<float>& float32Data);
    
    // Sample rate conversion
    static std::vector<float> resample(const std::vector<float>& input, 
                                      int inputSampleRate, 
                                      int outputSampleRate);
    
    // Audio chunking
    static std::vector<std::vector<float>> chunkAudio(const std::vector<float>& audio, 
                                                     int chunkSize);
    
    // Audio normalization
    static std::vector<float> normalize(const std::vector<float>& audio, float targetRMS = 0.1f);
    
    // Audio analysis
    static float calculateRMS(const std::vector<float>& audio);
    static float calculatePeak(const std::vector<float>& audio);
    static bool isSilence(const std::vector<float>& audio, float threshold = 0.001f);
    
    // Audio format detection
    static bool isValidAudioData(const std::vector<float>& audio);
    
    // Audio metadata
    struct AudioMetadata {
        int sampleRate;
        int numChannels;
        int bitDepth;
        double duration;
        float peakLevel;
        float rmsLevel;
    };
    
    static AudioMetadata analyzeAudio(const std::vector<float>& audio, int sampleRate);

private:
    // Helper methods
    static void applyWindow(std::vector<float>& audio, const std::string& windowType = "hann");
    static std::vector<float> createWindow(int size, const std::string& type);
};
