class ChannelExtractor {
  constructor() {
    this.virtualDevices = new Map();
    this.physicalToVirtualMap = new Map();
    // Use consistent device IDs based on physical device numbers, not random increments
  }

  /**
   * Extract left and right channels from stereo PCM data
   * @param {Int16Array} stereoData - Interleaved L-R-L-R PCM data
   * @returns {Object} - { left: Int16Array, right: Int16Array }
   */
  extractChannels(stereoData) {
    const leftChannel = new Int16Array(Math.ceil(stereoData.length / 2));
    const rightChannel = new Int16Array(Math.ceil(stereoData.length / 2));
    
    let leftIndex = 0;
    let rightIndex = 0;
    
    for (let i = 0; i < stereoData.length; i += 2) {
      // Left channel (even indices: 0, 2, 4, 6...)
      if (i < stereoData.length) {
        leftChannel[leftIndex++] = stereoData[i];
      }
      
      // Right channel (odd indices: 1, 3, 5, 7...)
      if (i + 1 < stereoData.length) {
        rightChannel[rightIndex++] = stereoData[i + 1];
      }
    }
    
    return {
      left: leftChannel.slice(0, leftIndex),
      right: rightChannel.slice(0, rightIndex)
    };
  }

  /**
   * Create virtual devices for a physical DVS Receive device
   * @param {Object} physicalDevice - Physical device info
   * @returns {Array} - Array of virtual device objects
   */
  createVirtualDevices(physicalDevice) {
    if (!physicalDevice.name.toLowerCase().includes('dvs receive')) {
      return [physicalDevice]; // Return original device if not DVS Receive
    }

    const deviceNumber = this.extractDeviceNumber(physicalDevice.name);
    if (!deviceNumber) {
      return [physicalDevice]; // Return original if can't parse name
    }

    // Create left and right virtual devices with consistent IDs based on device number
    const leftDevice = {
      id: deviceNumber * 2 - 1, // Left channel: 1, 3, 5, 7, 9, 11, 13, 15
      name: `DVS Receive ${deviceNumber}`,
      isVirtual: true,
      physicalDeviceId: physicalDevice.id,
      channel: 'left',
      maxInputs: 1,
      defaultSampleRate: physicalDevice.defaultSampleRate || 48000,
      hostAPIName: physicalDevice.hostAPIName || 'Unknown',
      isDante: true
    };

    const rightDevice = {
      id: deviceNumber * 2, // Right channel: 2, 4, 6, 8, 10, 12, 14, 16
      name: `DVS Receive ${deviceNumber + 1}`,
      isVirtual: true,
      physicalDeviceId: physicalDevice.id,
      channel: 'right',
      maxInputs: 1,
      defaultSampleRate: physicalDevice.defaultSampleRate || 48000,
      hostAPIName: physicalDevice.hostAPIName || 'Unknown',
      isDante: true
    };

    // Store virtual devices
    this.virtualDevices.set(leftDevice.id, leftDevice);
    this.virtualDevices.set(rightDevice.id, rightDevice);

    // Map physical device to virtual devices
    this.physicalToVirtualMap.set(physicalDevice.id, [leftDevice.id, rightDevice.id]);

    return [leftDevice, rightDevice];
  }

  /**
   * Extract device number from DVS Receive device name
   * @param {string} deviceName - Device name like "DVS Receive 1-2 (Dante Virtual Soundcard)"
   * @returns {number|null} - Device number or null if can't parse
   */
  extractDeviceNumber(deviceName) {
    // Extract the first number from "DVS Receive 1-2" -> returns 1
    const match = deviceName.match(/DVS Receive\s+(\d+)-\d+/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Get all virtual devices
   * @returns {Array} - Array of virtual device objects
   */
  getVirtualDevices() {
    return Array.from(this.virtualDevices.values());
  }

  /**
   * Get virtual device by ID
   * @param {number} virtualDeviceId - Virtual device ID
   * @returns {Object|null} - Virtual device object or null
   */
  getVirtualDevice(virtualDeviceId) {
    return this.virtualDevices.get(virtualDeviceId) || null;
  }

  /**
   * Check if a device ID is virtual
   * @param {number} deviceId - Device ID to check
   * @returns {boolean} - True if virtual device
   */
  isVirtualDevice(deviceId) {
    return this.virtualDevices.has(deviceId);
  }

  /**
   * Get physical device ID for a virtual device
   * @param {number} virtualDeviceId - Virtual device ID
   * @returns {number|null} - Physical device ID or null
   */
  getPhysicalDeviceId(virtualDeviceId) {
    const virtualDevice = this.virtualDevices.get(virtualDeviceId);
    return virtualDevice ? virtualDevice.physicalDeviceId : null;
  }

  /**
   * Get channel type for a virtual device
   * @param {number} virtualDeviceId - Virtual device ID
   * @returns {string|null} - 'left' or 'right' or null
   */
  getChannelType(virtualDeviceId) {
    const virtualDevice = this.virtualDevices.get(virtualDeviceId);
    return virtualDevice ? virtualDevice.channel : null;
  }

  /**
   * Process audio data for a virtual device
   * @param {Int16Array} stereoData - Original stereo PCM data
   * @param {number} virtualDeviceId - Virtual device ID
   * @returns {Int16Array|null} - Extracted mono channel data or null
   */
  processAudioForVirtualDevice(stereoData, virtualDeviceId) {
    const virtualDevice = this.virtualDevices.get(virtualDeviceId);
    if (!virtualDevice || !virtualDevice.isVirtual) {
      return null;
    }

    const { left, right } = this.extractChannels(stereoData);
    return virtualDevice.channel === 'left' ? left : right;
  }
}

module.exports = ChannelExtractor;
