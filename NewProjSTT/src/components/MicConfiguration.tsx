import React, { useState, useEffect } from 'react';
import { MicConfig, AudioDevice, STTEndpoint } from '../types';
import { databaseService } from '../databaseService';

interface MicConfigurationProps {
  onMicAdded: (micId: string) => void;
  onMicUpdated: (micId: string) => void;
}

const MicConfiguration: React.FC<MicConfigurationProps> = ({ onMicAdded, onMicUpdated }) => {
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  
  // Topic mapping based on structure.md
  const topicMapping = [
    { id: '01', name: 'Urban Intelligence', zoneId: 1 },
    { id: '02', name: 'New Energy', zoneId: 1 },
    { id: '03', name: 'Mobility', zoneId: 1 },
    { id: '04', name: 'Education and talent', zoneId: 1 },
    { id: '05', name: 'Mission driven ecosystems', zoneId: 1 },
    { id: '06', name: 'City funding', zoneId: 2 },
    { id: '07', name: 'City branding and identity', zoneId: 2 },
    { id: '08', name: 'Trade and Investment hubs', zoneId: 2 },
    { id: '09', name: 'Planned Urban Expansion', zoneId: 2 },
    { id: '10', name: 'City Diplomacy', zoneId: 2 },
    { id: '11', name: 'City Leadership and Capacity building', zoneId: 2 },
    { id: '12', name: 'Tourism and Visitor Economy', zoneId: 3 },
    { id: '13', name: 'Affordable and Inclusive housing', zoneId: 3 },
    { id: '14', name: 'Urban Health Systems', zoneId: 3 },
    { id: '15', name: 'Active City Living', zoneId: 3 },
    { id: '16', name: 'Urban Safety and Security', zoneId: 3 },
    { id: '17', name: 'Social Value Infrastructure', zoneId: 3 },
    { id: '18', name: 'Orange Economy and Cultural Investment', zoneId: 3 },
    { id: '19', name: 'Urban Heat', zoneId: 4 },
    { id: '20', name: 'Climate Adaptation and Mitigation', zoneId: 4 },
    { id: '21', name: 'Decarbonizing the built environment', zoneId: 4 },
    { id: '22', name: 'Nature Positive Cities', zoneId: 4 },
    { id: '23', name: 'Blue Economy', zoneId: 4 },
    { id: '24', name: 'Urban Water and Food Security', zoneId: 4 },
    { id: '25', name: 'Zero Waste and Resource Circularity', zoneId: 4 }
  ];

  const [sttEndpoints] = useState<STTEndpoint[]>([
    { id: 'endpoint1', name: 'STT Server 1', url: '', apiKey: 'public_token' },
    { id: 'endpoint2', name: 'STT Server 2', url: '', apiKey: 'public_token' },
    { id: 'endpoint3', name: 'STT Server 3', url: '', apiKey: 'public_token' },
    { id: 'endpoint4', name: 'STT Server 4', url: '', apiKey: 'public_token' },
    { id: 'endpoint5', name: 'STT Server 5', url: '', apiKey: 'public_token' },
    { id: 'endpoint6', name: 'STT Server 6', url: '', apiKey: 'public_token' },
    { id: 'endpoint7', name: 'STT Server 7', url: '', apiKey: 'public_token' },
    { id: 'endpoint8', name: 'STT Server 8', url: '', apiKey: 'public_token' },
    { id: 'endpoint9', name: 'STT Server 9', url: '', apiKey: 'public_token' },
    { id: 'endpoint10', name: 'STT Server 10', url: '', apiKey: 'public_token' },
    { id: 'endpoint11', name: 'STT Server 11', url: '', apiKey: 'public_token' },
    { id: 'endpoint12', name: 'STT Server 12', url: '', apiKey: 'public_token' },
    { id: 'endpoint13', name: 'STT Server 13', url: '', apiKey: 'public_token' },
    { id: 'endpoint14', name: 'STT Server 14', url: '', apiKey: 'public_token' },
    { id: 'endpoint15', name: 'STT Server 15', url: '', apiKey: 'public_token' },
    { id: 'endpoint16', name: 'STT Server 16', url: '', apiKey: 'public_token' },
    { id: 'endpoint17', name: 'STT Server 17', url: '', apiKey: 'public_token' },
    { id: 'endpoint18', name: 'STT Server 18', url: '', apiKey: 'public_token' },
    { id: 'endpoint19', name: 'STT Server 19', url: '', apiKey: 'public_token' },
    { id: 'endpoint20', name: 'STT Server 20', url: '', apiKey: 'public_token' },
    { id: 'endpoint21', name: 'STT Server 21', url: '', apiKey: 'public_token' },
    { id: 'endpoint22', name: 'STT Server 22', url: '', apiKey: 'public_token' },
    { id: 'endpoint23', name: 'STT Server 23', url: '', apiKey: 'public_token' },
    { id: 'endpoint24', name: 'STT Server 24', url: '', apiKey: 'public_token' },
    { id: 'endpoint25', name: 'STT Server 25', url: '', apiKey: 'public_token' },
    { id: 'endpoint26', name: 'STT Server 26', url: '', apiKey: 'public_token' },
    { id: 'endpoint27', name: 'STT Server 27', url: '', apiKey: 'public_token' },
    { id: 'endpoint28', name: 'STT Server 28', url: '', apiKey: 'public_token' },
    { id: 'endpoint29', name: 'STT Server 29', url: '', apiKey: 'public_token' },
    { id: 'endpoint30', name: 'STT Server 30', url: '', apiKey: 'public_token' },
    { id: 'endpoint31', name: 'STT Server 31', url: '', apiKey: 'public_token' },
    { id: 'endpoint32', name: 'STT Server 32', url: '', apiKey: 'public_token' }
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
                onChange={(e) => {
                  const newZoneId = parseInt(e.target.value);
                  setFormData({
                    ...formData,
                    zoneId: newZoneId,
                    topicId: '',
                    topicName: ''
                  });
                }}
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
              <select
                value={formData.topicId}
                onChange={(e) => {
                  const selectedTopicId = e.target.value;
                  const selectedTopic = topicMapping.find(topic => topic.id === selectedTopicId);
                  setFormData({
                    ...formData,
                    topicId: selectedTopicId,
                    topicName: selectedTopic ? selectedTopic.name : ''
                  });
                }}
                required
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #ddd'
                }}
              >
                <option value="">Select Topic ID...</option>
                {topicMapping
                  .filter(topic => topic.zoneId === formData.zoneId)
                  .map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.id}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Topic Name:
              </label>
              <select
                value={formData.topicName}
                onChange={(e) => {
                  const selectedTopicName = e.target.value;
                  const selectedTopic = topicMapping.find(topic => topic.name === selectedTopicName);
                  setFormData({
                    ...formData,
                    topicName: selectedTopicName,
                    topicId: selectedTopic ? selectedTopic.id : ''
                  });
                }}
                required
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #ddd'
                }}
              >
                <option value="">Select Topic Name...</option>
                {topicMapping
                  .filter(topic => topic.zoneId === formData.zoneId)
                  .map(topic => (
                    <option key={topic.id} value={topic.name}>
                      {topic.name}
                    </option>
                  ))}
              </select>
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