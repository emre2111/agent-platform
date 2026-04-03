import { RoomSnapshot, StopReason } from './types';

/**
 * Evaluate all stop conditions against the current room state.
 * Returns the first applicable StopReason, or null if the loop
 * should continue.
 *
 * These are pure functions — no DB calls, no side effects.
 * Order matters: earlier checks take priority.
 */
export function evaluateStopConditions(
  room: RoomSnapshot,
  activeAgentCount: number,
  now: Date = new Date(),
): StopReason | null {
  if (room.status !== 'RUNNING') {
    return StopReason.ROOM_NOT_RUNNING;
  }

  if (activeAgentCount === 0) {
    return StopReason.NO_ACTIVE_AGENTS;
  }

  if (room.maxTurns !== null && room.turnCount >= room.maxTurns) {
    return StopReason.MAX_TURNS_REACHED;
  }

  if (room.consecutiveFailures >= room.maxConsecutiveFailures) {
    return StopReason.CIRCUIT_BREAKER;
  }

  if (room.absoluteDeadline && now >= room.absoluteDeadline) {
    return StopReason.DEADLINE_EXCEEDED;
  }

  return null;
}

/**
 * In MODERATED mode, check whether the loop should pause for
 * human approval after an agent turn completes.
 */
export function shouldAwaitModeration(room: RoomSnapshot): boolean {
  return room.turnPolicy === 'MODERATED';
}

/**
 * Human-readable explanation for a stop reason.
 */
export function stopReasonMessage(reason: StopReason): string {
  const messages: Record<StopReason, string> = {
    [StopReason.MAX_TURNS_REACHED]:   'Maximum turn count reached',
    [StopReason.CIRCUIT_BREAKER]:     'Too many consecutive failures',
    [StopReason.DEADLINE_EXCEEDED]:   'Conversation deadline exceeded',
    [StopReason.NO_ACTIVE_AGENTS]:    'No active agents remaining',
    [StopReason.ROOM_NOT_RUNNING]:    'Room is no longer in running state',
    [StopReason.MANUALLY_STOPPED]:    'Conversation stopped by user',
    [StopReason.AWAITING_MODERATION]: 'Awaiting human moderation',
  };
  return messages[reason];
}
