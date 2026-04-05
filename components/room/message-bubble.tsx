import { clsx } from 'clsx';
import type { Message } from '@/lib/types/room';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSenderName(message: Message): string {
  if (message.senderName) return message.senderName;
  if (message.senderType === 'AGENT' && message.senderAgent?.name) return message.senderAgent.name;
  if (message.senderType === 'USER' && message.senderUser?.name) return message.senderUser.name;
  if (message.senderType === 'SYSTEM') return 'System';
  return 'Unknown';
}

function SenderAvatar({ message }: { message: Message }) {
  const name = getSenderName(message);

  if (message.senderType === 'SYSTEM') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 text-xs font-bold">
        SYS
      </div>
    );
  }

  if (message.senderType === 'AGENT') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  const isSystem = message.senderType === 'SYSTEM';
  const name = getSenderName(message);

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-zinc-400 italic">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-3 py-3">
      <SenderAvatar message={message} />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={clsx(
              'text-sm font-semibold',
              message.senderType === 'AGENT'
                ? 'text-violet-700'
                : 'text-blue-700',
            )}
          >
            {name}
          </span>
          <span className="text-xs text-zinc-400">
            {formatTime(message.createdAt)}
          </span>
          {message.senderType === 'AGENT' && (
            <span className="text-xs text-zinc-300">
              turn {message.turnNumber}
            </span>
          )}
          {message.tokenCount != null && (
            <span className="text-xs text-zinc-300">
              {message.tokenCount} tokens
            </span>
          )}
        </div>

        <div className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </div>
      </div>
    </div>
  );
}
