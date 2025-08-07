import React, { useState, useEffect } from 'react';
import { Transcript, MicConfig } from '../types';
import { databaseService } from '../databaseService';

const TranscriptHistoryViewer: React.FC = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [mics, setMics] = useState<MicConfig[]>([]);
  const [filterMicId, setFilterMicId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load mics and transcripts from localStorage
      await databaseService.initializeFromStorage();
      const allMics = await databaseService.getAllMics();
      const allTranscripts = await databaseService.getAllTranscripts();
      
      setMics(allMics);
      setTranscripts(allTranscripts);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTranscripts = transcripts.filter(transcript => {
    const matchesMic = !filterMicId || transcript.micId === filterMicId;
    const matchesSearch = !searchTerm || 
      transcript.transcript.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transcript.topicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transcript.tableId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesMic && matchesSearch;
  });

  const handleExportAll = () => {
    const dataStr = JSON.stringify(filteredTranscripts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcripts_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Mic ID', 'Zone', 'Table ID', 'Topic ID', 'Topic Name', 'Transcript'];
    const csvData = filteredTranscripts.map(t => [
      new Date(t.timestamp).toLocaleString(),
      t.micId,
      t.zoneId,
      t.tableId,
      t.topicId,
      t.topicName,
      `"${t.transcript.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcripts_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMicName = (micId: string) => {
    const mic = mics.find(m => m.micId === micId);
    return mic ? mic.deviceName : `Mic ${micId.slice(-8)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const clearAllTranscripts = async () => {
    if (window.confirm('Are you sure you want to delete ALL transcripts? This action cannot be undone.')) {
      try {
        // Clear localStorage
        localStorage.removeItem('sttDatabase');
        // Reload the page to reset the database service
        window.location.reload();
      } catch (error) {
        console.error('Error clearing transcripts:', error);
        alert('Error clearing transcripts');
      }
    }
  };

  return (
    <div style={{
      maxWidth: 1400,
      margin: '0 auto',
      padding: 20,
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30
      }}>
        <h1 style={{ color: '#333', margin: 0 }}>
          📝 Transcript History Viewer
        </h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={loadData}
            style={{
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleExportAll}
            disabled={filteredTranscripts.length === 0}
            style={{
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: filteredTranscripts.length > 0 ? 'pointer' : 'not-allowed',
              opacity: filteredTranscripts.length > 0 ? 1 : 0.5
            }}
          >
            📥 Export JSON
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredTranscripts.length === 0}
            style={{
              background: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: filteredTranscripts.length > 0 ? 'pointer' : 'not-allowed',
              opacity: filteredTranscripts.length > 0 ? 1 : 0.5
            }}
          >
            📊 Export CSV
          </button>
          <button
            onClick={clearAllTranscripts}
            style={{
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#f9f9f9',
        padding: 20,
        borderRadius: 8,
        marginBottom: 20,
        border: '1px solid #ddd'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
              Filter by Microphone:
            </label>
            <select
              value={filterMicId}
              onChange={(e) => setFilterMicId(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 4,
                border: '1px solid #ddd'
              }}
            >
              <option value="">All Microphones</option>
              {mics.map(mic => (
                <option key={mic.micId} value={mic.micId}>
                  {mic.deviceName} (Zone {mic.zoneId}, Table {mic.tableId})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
              Search Transcripts:
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in transcript, topic name, or table ID..."
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 4,
                border: '1px solid #ddd'
              }}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        background: '#e3f2fd',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        border: '1px solid #2196f3'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 5 }}>
          Summary
        </div>
        <div style={{ fontSize: 14, color: '#666' }}>
          Total transcripts: {transcripts.length} | 
          Filtered results: {filteredTranscripts.length}
          {filterMicId && (
            <span> | Filtered by: {getMicName(filterMicId)}</span>
          )}
          {searchTerm && (
            <span> | Search: "{searchTerm}"</span>
          )}
        </div>
      </div>

      {/* Transcripts List */}
      <div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            Loading transcripts...
          </div>
        ) : filteredTranscripts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666', fontStyle: 'italic' }}>
            {transcripts.length === 0 ? 'No transcripts found in database.' : 'No transcripts match the current filters.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 15 }}>
            {filteredTranscripts.map(transcript => (
              <div
                key={transcript.id}
                style={{
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 15,
                  paddingBottom: 10,
                  borderBottom: '1px solid #eee'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                      {getMicName(transcript.micId)}
                    </div>
                    <div style={{ fontSize: 14, color: '#666' }}>
                      Zone {transcript.zoneId} | Table {transcript.tableId} | Topic: {transcript.topicName}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>
                    {formatTimestamp(transcript.timestamp)}
                  </div>
                </div>

                {/* Transcript Content */}
                <div style={{
                  background: '#f8f9fa',
                  padding: 15,
                  borderRadius: 6,
                  border: '1px solid #e9ecef',
                  fontFamily: 'monospace',
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  maxHeight: 200,
                  overflowY: 'auto'
                }}>
                  {transcript.transcript || '(Empty transcript)'}
                </div>

                {/* Metadata */}
                <div style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: '#888',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>ID: {transcript.id.slice(-8)}</span>
                  {transcript.duration && (
                    <span>Duration: {transcript.duration.toFixed(1)}s</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptHistoryViewer; 