'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuth } from '@/lib/stores/auth-context';

const NAV_ITEMS = [
  { label: 'Agents', path: 'agents', icon: '◆' },
  { label: 'Rooms', path: 'rooms', icon: '◈' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, currentWorkspaceId, workspaces, logout, setCurrentWorkspace } = useAuth();
  const currentWs = workspaces.find((w) => w.id === currentWorkspaceId);

  return (
    <aside className="flex h-full w-56 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <Link href="/workspaces" className="text-sm font-bold text-zinc-900">
          Agent Platform
        </Link>
        {currentWs && (
          <div className="mt-1">
            <select
              value={currentWorkspaceId ?? ''}
              onChange={(e) => setCurrentWorkspace(e.target.value)}
              className="w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {currentWorkspaceId &&
          NAV_ITEMS.map((item) => {
            const href = `/${currentWorkspaceId}/${item.path}`;
            const isActive = pathname.includes(`/${item.path}`);
            return (
              <Link
                key={item.path}
                href={href}
                className={clsx(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-zinc-600 hover:bg-zinc-100',
                )}
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-zinc-200 px-4 py-3">
        <div className="text-sm font-medium text-zinc-800 truncate">
          {user?.email}
        </div>
        <button
          onClick={logout}
          className="mt-1 text-xs text-zinc-400 hover:text-red-500 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
