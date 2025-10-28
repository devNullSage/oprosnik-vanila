/**
 * types.ts - Shared TypeScript definitions for the project.
 */

export interface CallData {
  phone: string;
  duration: string;
  region: string;
  timestamp: number;
  source?: 'interface' | 'calculated';
  completedAt?: string;
  // The following are optional because they are added during processing
  // and may not exist on all CallData objects at all times.
  capturedAt?: string;
  savedAt?: number;
  callStartTime?: number;
  callEndTime?: number;
  calculatedDuration?: string;
}

export interface AgentStatus {
  status: string | null;
  timestamp: number;
}
