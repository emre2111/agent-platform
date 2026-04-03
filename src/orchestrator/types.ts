import { ProviderUsage } from '../adapters/types';

// ─── Queue job payloads ────────────────────────────────────────

export interface LoopJobData {
  roomId: string;
  workspaceId: string;
  turnNumber: number;
  triggeredBy: 'start' | 'next_turn' | 'resume';
}

// ─── Stop reasons ──────────────────────────────────────────────

export enum StopReason {
  MAX_TURNS_REACHED     = 'max_turns_reached',
  CIRCUIT_BREAKER       = 'circuit_breaker',
  DEADLINE_EXCEEDED     = 'deadline_exceeded',
  NO_ACTIVE_AGENTS      = 'no_active_agents',
  ROOM_NOT_RUNNING      = 'room_not_running',
  MANUALLY_STOPPED      = 'manually_stopped',
  AWAITING_MODERATION   = 'awaiting_moderation',
}

// ─── Turn execution result ─────────────────────────────────────

export interface TurnSuccess {
  ok: true;
  messageId: string;
  agentId: string;
  turnNumber: number;
  usage: ProviderUsage;
  latencyMs: number;
}

export interface TurnFailure {
  ok: false;
  agentId: string;
  turnNumber: number;
  error: string;
  retriable: boolean;
}

export type TurnResult = TurnSuccess | TurnFailure;

// ─── Room snapshot for loop decisions ──────────────────────────

export interface RoomSnapshot {
  id: string;
  workspaceId: string;
  createdById: string;
  status: string;
  turnPolicy: string;
  turnCount: number;
  maxTurns: number | null;
  consecutiveFailures: number;
  maxConsecutiveFailures: number;
  turnDelayMs: number;
  absoluteDeadline: Date | null;
}
