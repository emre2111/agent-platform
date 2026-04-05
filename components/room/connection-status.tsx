export function ConnectionStatus({ connected }: { connected: boolean }) {
  if (connected) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 border-b border-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Reconnecting to live updates...
    </div>
  );
}
