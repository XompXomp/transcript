export interface MicConfig {
  micId: string;
  deviceId: string;
  deviceName: string;
  zoneId: number;
  tableId: string;
  topicId: string;
  topicName: string;
  sttEndpoint: string;
  isActive: boolean;
}

export interface Transcript {
  id: string;
  micId: string;
  zoneId: number;
  tableId: string;
  topicId: string;
  topicName: string;
  transcript: string;
  timestamp: string;
  duration?: number;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export interface STTEndpoint {
  id: string;
  name: string;
  url: string;
  apiKey: string;
}

export interface Database {
  mics: MicConfig[];
  transcripts: Transcript[];
} 