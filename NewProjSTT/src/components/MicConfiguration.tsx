import React, { useState, useEffect } from 'react';
import { MicConfig, AudioDevice, STTEndpoint } from '../types';
import { databaseService } from '../databaseService';

interface MicConfigurationProps {
  onMicAdded: (micId: string) => void;
  onMicUpdated: (micId: string) => void;
}

const MicConfiguration: React.FC<MicConfigurationProps> = ({ onMicAdded, onMicUpdated }) => {
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [sttEndpoints] = useState<STTEndpoint[]>([
    {
      id: 'endpoint1',
      name: 'STT Server 1',
      url: 'ws://172.22.225.138:11004/api/asr-streaming',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint2',
      name: 'STT Server 2',
      url: 'ws://172.22.225.139:11004/api/asr-streaming', // Example second endpoint
      apiKey: 'public_token'
    }
  ]);
  
  const [formData, setFormData] = useState({
    deviceId: '',
    zoneId: 1,
    tableId: '',
    topicId: '',
    topicName: '',
    sttEndpoint: 'endpoint1'
  });

  const [mics, setMics] = useState<MicConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAudioDevices();
    loadMics();
  }, []);

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }));
      setAudioDevices(audioInputs);
    } catch (error) {
      console.error('Error loading audio devices:', error);
    }
  };

  const loadMics = async () => {
    try {
      const allMics = await databaseService.getAllMics();
      setMics(allMics);
    } catch (error) {
      console.error('Error loading mics:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const selectedDevice = audioDevices.find(device => device.deviceId === formData.deviceId);
      if (!selectedDevice) {
        alert('Please select a microphone device');
        return;
      }

      const micId = await databaseService.addMic({
        deviceId: formData.deviceId,
        deviceName: selectedDevice.label,
        zoneId: formData.zoneId,
        tableId: formData.tableId,
        topicId: formData.topicId,
        topicName: formData.topicName,
        sttEndpoint: formData.sttEndpoint,
        isActive: false
      });

      // Reset form
      setFormData({
        deviceId: '',
        zoneId: 1,
        tableId: '',
        topicId: '',
        topicName: '',
        sttEndpoint: 'endpoint1'
      });

      await loadMics();
      onMicAdded(micId);
      alert('Microphone configuration added successfully!');
    } catch (error) {
      console.error('Error adding mic:', error);
      alert('Error adding microphone configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMic = async (micId: string) => {
    if (window.confirm('Are you sure you want to delete this microphone configuration?')) {
      try {
        await databaseService.deleteMic(micId);
        await loadMics();
        alert('Microphone configuration deleted successfully!');
      } catch (error) {
        console.error('Error deleting mic:', error);
        alert('Error deleting microphone configuration');
      }
    }
  };

  const handleToggleActive = async (micId: string, isActive: boolean) => {
    try {
      await databaseService.setMicActive(micId, isActive);
      await loadMics();
      onMicUpdated(micId);
    } catch (error) {
      console.error('Error updating mic status:', error);
    }
  };

  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ marginBottom: 20, color: '#333' }}>Microphone Configuration</h2>
      
      {/* Add New Mic Form */}
      <div style={{
        background: '#f9f9f9',
        padding: 20,
        borderRadius: 8,
        marginBottom: 20,
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginBottom: 15 }}>Add New Microphone</h3>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Microphone Device:
              </label>
              <select
                value={formData.deviceId}
                onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #ddd'
                }}
              >
                <option value="">Select a microphone...</option>
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Zone ID:
              </label>
              <select
                value={formData.zoneId}
                onChange={(e) => setFormData({ ...formData, zoneId: parseInt(e.target.value) })}
                required
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #ddd'
                }}
              >
                <option value={1}>Zone 1</option>
                <option value={2}>Zone 2</option>
                <option value={3}>Zone 3</option>
                <option value={4}>Zone 4</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Table ID:
              </label>
              <input
                type="text"
                value={formData.tableId}
                onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
                required
                placeholder="Enter Table ID"
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #ddd'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Topic ID:
              </label>
              <input
                type="text"
                value={formData.topicId}
                onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                required
                placeholder="Enter Topic ID"
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #ddd'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Topic Name:
              </label>
              <input
                type="text"
                value={formData.topicName}
                onChange={(e) => setFormData({ ...formData, topicName: e.target.value })}
                required
                placeholder="Enter Topic Name"
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #ddd'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                STT Endpoint:
              </label>
              <select
                value={formData.sttEndpoint}
                onChange={(e) => setFormData({ ...formData, sttEndpoint: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #ddd'
                }}
              >
                {sttEndpoints.map(endpoint => (
                  <option key={endpoint.id} value={endpoint.id}>
                    {endpoint.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '10px 20px',
              fontSize: 16,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: 15,
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Adding...' : 'Add Microphone'}
          </button>
        </form>
      </div>

      {/* Existing Mics List */}
      <div>
        <h3 style={{ marginBottom: 15 }}>Configured Microphones</h3>
        
        {mics.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
            No microphones configured yet. Add one above to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {mics.map(mic => (
              <div
                key={mic.micId}
                style={{
                  background: mic.isActive ? '#e8f5e8' : '#f5f5f5',
                  padding: 15,
                  borderRadius: 8,
                  border: `2px solid ${mic.isActive ? '#4caf50' : '#ddd'}`,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 15,
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    {mic.deviceName} (ID: {mic.micId.slice(-8)})
                  </div>
                  <div style={{ fontSize: 14, color: '#666' }}>
                    Zone: {mic.zoneId} | Table: {mic.tableId} | Topic: {mic.topicName}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    STT: {sttEndpoints.find(e => e.id === mic.sttEndpoint)?.name}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleActive(mic.micId, !mic.isActive)}
                  style={{
                    background: mic.isActive ? '#f44336' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  {mic.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  onClick={() => handleDeleteMic(mic.micId)}
                  style={{
                    background: '#ff5722',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MicConfiguration; 