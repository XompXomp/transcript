#include "audio_processor.h"
#include <algorithm>
#include <cmath>
#include <cstring>

AudioProcessor::AudioProcessor() {
}

AudioProcessor::~AudioProcessor() {
}

std::vector<float> AudioProcessor::int16ToFloat32(const std::vector<int16_t>& int16Data) {
    std::vector<float> float32Data;
    float32Data.reserve(int16Data.size());
    
    for (int16_t sample : int16Data) {
        float32Data.push_back(static_cast<float>(sample) / 32768.0f);
    }
    
    return float32Data;
}

std::vector<int16_t> AudioProcessor::float32ToInt16(const std::vector<float>& float32Data) {
    std::vector<int16_t> int16Data;
    int16Data.reserve(float32Data.size());
    
    for (float sample : float32Data) {
        // Clamp to [-1, 1] range
        sample = std::max(-1.0f, std::min(1.0f, sample));
        int16Data.push_back(static_cast<int16_t>(sample * 32767.0f));
    }
    
    return int16Data;
}

std::vector<float> AudioProcessor::resample(const std::vector<float>& input, 
                                           int inputSampleRate, 
                                           int outputSampleRate) {
    if (inputSampleRate == outputSampleRate) {
        return input;
    }
    
    double ratio = static_cast<double>(outputSampleRate) / inputSampleRate;
    size_t outputSize = static_cast<size_t>(input.size() * ratio);
    std::vector<float> output(outputSize);
    
    // Simple linear interpolation resampling
    for (size_t i = 0; i < outputSize; i++) {
        double inputIndex = i / ratio;
        size_t index1 = static_cast<size_t>(inputIndex);
        size_t index2 = std::min(index1 + 1, input.size() - 1);
        double fraction = inputIndex - index1;
        
        if (index1 < input.size()) {
            output[i] = static_cast<float>(input[index1] * (1.0 - fraction) + input[index2] * fraction);
        }
    }
    
    return output;
}

std::vector<std::vector<float>> AudioProcessor::chunkAudio(const std::vector<float>& audio, 
                                                          int chunkSize) {
    std::vector<std::vector<float>> chunks;
    
    for (size_t i = 0; i < audio.size(); i += chunkSize) {
        size_t end = std::min(i + chunkSize, audio.size());
        chunks.emplace_back(audio.begin() + i, audio.begin() + end);
    }
    
    return chunks;
}

std::vector<float> AudioProcessor::normalize(const std::vector<float>& audio, float targetRMS) {
    if (audio.empty()) {
        return audio;
    }
    
    float currentRMS = calculateRMS(audio);
    if (currentRMS < 1e-6f) {
        return audio; // Avoid division by zero
    }
    
    float scale = targetRMS / currentRMS;
    std::vector<float> normalized;
    normalized.reserve(audio.size());
    
    for (float sample : audio) {
        normalized.push_back(sample * scale);
    }
    
    return normalized;
}

float AudioProcessor::calculateRMS(const std::vector<float>& audio) {
    if (audio.empty()) {
        return 0.0f;
    }
    
    float sum = 0.0f;
    for (float sample : audio) {
        sum += sample * sample;
    }
    
    return std::sqrt(sum / audio.size());
}

float AudioProcessor::calculatePeak(const std::vector<float>& audio) {
    if (audio.empty()) {
        return 0.0f;
    }
    
    float peak = 0.0f;
    for (float sample : audio) {
        peak = std::max(peak, std::abs(sample));
    }
    
    return peak;
}

bool AudioProcessor::isSilence(const std::vector<float>& audio, float threshold) {
    return calculateRMS(audio) < threshold;
}

bool AudioProcessor::isValidAudioData(const std::vector<float>& audio) {
    if (audio.empty()) {
        return false;
    }
    
    // Check for NaN or infinite values
    for (float sample : audio) {
        if (std::isnan(sample) || std::isinf(sample)) {
            return false;
        }
    }
    
    return true;
}

AudioProcessor::AudioMetadata AudioProcessor::analyzeAudio(const std::vector<float>& audio, int sampleRate) {
    AudioMetadata metadata;
    metadata.sampleRate = sampleRate;
    metadata.numChannels = 1; // Assuming mono for now
    metadata.bitDepth = 32; // Float32
    metadata.duration = static_cast<double>(audio.size()) / sampleRate;
    metadata.peakLevel = calculatePeak(audio);
    metadata.rmsLevel = calculateRMS(audio);
    
    return metadata;
}

void AudioProcessor::applyWindow(std::vector<float>& audio, const std::string& windowType) {
    if (audio.empty()) {
        return;
    }
    
    std::vector<float> window = createWindow(static_cast<int>(audio.size()), windowType);
    
    for (size_t i = 0; i < audio.size(); i++) {
        audio[i] *= window[i];
    }
}

std::vector<float> AudioProcessor::createWindow(int size, const std::string& type) {
    std::vector<float> window(size);
    
    if (type == "hann") {
        for (int i = 0; i < size; i++) {
            window[i] = 0.5f * (1.0f - std::cos(2.0f * M_PI * i / (size - 1)));
        }
    } else if (type == "hamming") {
        for (int i = 0; i < size; i++) {
            window[i] = 0.54f - 0.46f * std::cos(2.0f * M_PI * i / (size - 1));
        }
    } else if (type == "blackman") {
        for (int i = 0; i < size; i++) {
            window[i] = 0.42f - 0.5f * std::cos(2.0f * M_PI * i / (size - 1)) + 
                       0.08f * std::cos(4.0f * M_PI * i / (size - 1));
        }
    } else {
        // Rectangular window (no change)
        std::fill(window.begin(), window.end(), 1.0f);
    }
    
    return window;
}
