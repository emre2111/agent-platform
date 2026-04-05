import type { TurnStarted, TurnError } from '@/lib/types/room';

interface TurnIndicatorProps {
  activeTurn: TurnStarted | null;
  lastError: TurnError | null;
}

export function TurnIndicator({ activeTurn, lastError }: TurnIndicatorProps) {
  if (lastError) {
    return (
      <div className="mx-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
        Turn {lastError.turnNumber} failed: {lastError.error}
      </div>
    );
  }

  if (!activeTurn) return null;

  return (
    <div className="mx-4 flex items-center gap-2 rounded-lg bg-violet-50 px-4 py-2 text-sm text-violet-700">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
      </span>
      <span>
        <strong>{activeTurn.agentName || 'Agent'}</strong> is generating turn{' '}
        {activeTurn.turnNumber}...
      </span>
    </div>
  );
}
