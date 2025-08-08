import { Database, MicConfig, Transcript } from './types';

class DatabaseService {
  private dbPath = '/src/database.json';
  private database: Database = { mics: [], transcripts: [] };

  constructor() {
    this.loadDatabase();
  }

  private async loadDatabase(): Promise<void> {
    try {
      const response = await fetch(this.dbPath);
      if (response.ok) {
        this.database = await response.json();
      }
    } catch (error) {
      console.error('Error loading database:', error);
      // Initialize with empty database if file doesn't exist
      this.database = { mics: [], transcripts: [] };
    }
  }

  private async saveDatabase(): Promise<void> {
    try {
      // In a real app, you'd save to a backend API
      // For now, we'll store in localStorage as a fallback
      localStorage.setItem('sttDatabase', JSON.stringify(this.database, null, 2));
      console.log('Database saved to localStorage');
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  // Mic Configuration Methods
  async addMic(micConfig: Omit<MicConfig, 'micId'>): Promise<string> {
    const micId = `mic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMic: MicConfig = {
      ...micConfig,
      micId,
      isActive: false
    };
    
    this.database.mics.push(newMic);
    await this.saveDatabase();
    return micId;
  }

  async updateMic(micId: string, updates: Partial<MicConfig>): Promise<void> {
    const micIndex = this.database.mics.findIndex(mic => mic.micId === micId);
    if (micIndex !== -1) {
      this.database.mics[micIndex] = { ...this.database.mics[micIndex], ...updates };
      await this.saveDatabase();
    }
  }

  async deleteMic(micId: string): Promise<void> {
    this.database.mics = this.database.mics.filter(mic => mic.micId !== micId);
    await this.saveDatabase();
  }

  async getMic(micId: string): Promise<MicConfig | undefined> {
    return this.database.mics.find(mic => mic.micId === micId);
  }

  async getAllMics(): Promise<MicConfig[]> {
    return this.database.mics;
  }

  async setMicActive(micId: string, isActive: boolean): Promise<void> {
    await this.updateMic(micId, { isActive });
  }

  // Transcript Methods
  async addTranscript(transcript: Omit<Transcript, 'id'>): Promise<string> {
    const id = `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTranscript: Transcript = {
      ...transcript,
      id
    };
    
    this.database.transcripts.push(newTranscript);
    await this.saveDatabase();
    return id;
  }

  async getTranscriptsByMicId(micId: string): Promise<Transcript[]> {
    return this.database.transcripts
      .filter(transcript => transcript.micId === micId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getAllTranscripts(): Promise<Transcript[]> {
    return this.database.transcripts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async updateTranscript(transcriptId: string, updates: Partial<Transcript>): Promise<void> {
    const transcriptIndex = this.database.transcripts.findIndex(transcript => transcript.id === transcriptId);
    if (transcriptIndex !== -1) {
      this.database.transcripts[transcriptIndex] = { ...this.database.transcripts[transcriptIndex], ...updates };
      await this.saveDatabase();
    }
  }

  async deleteTranscript(transcriptId: string): Promise<void> {
    this.database.transcripts = this.database.transcripts.filter(transcript => transcript.id !== transcriptId);
    await this.saveDatabase();
  }

  async deleteTranscriptsByTableId(tableId: string): Promise<void> {
    this.database.transcripts = this.database.transcripts.filter(transcript => transcript.tableId !== tableId);
    await this.saveDatabase();
  }

  // Export/Import Methods
  async exportDatabase(): Promise<string> {
    return JSON.stringify(this.database, null, 2);
  }

  async importDatabase(jsonData: string): Promise<void> {
    try {
      const importedDb = JSON.parse(jsonData);
      if (importedDb.mics && importedDb.transcripts) {
        this.database = importedDb;
        await this.saveDatabase();
      }
    } catch (error) {
      throw new Error('Invalid database format');
    }
  }

  // Initialize database from localStorage if needed
  async initializeFromStorage(): Promise<void> {
    const stored = localStorage.getItem('sttDatabase');
    if (stored) {
      try {
        this.database = JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored database:', error);
      }
    }
  }

  // Force reload from localStorage (useful when external changes are made)
  async reloadFromStorage(): Promise<void> {
    await this.initializeFromStorage();
  }

  // Clear all transcripts from both memory and localStorage
  async clearAllTranscripts(): Promise<void> {
    this.database.transcripts = [];
    await this.saveDatabase();
  }
}

export const databaseService = new DatabaseService(); 