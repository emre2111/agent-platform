import { WorkspaceRole } from '@prisma/client';
import { Action, Resource } from '../common/types';

// ─── Access matrix ─────────────────────────────────────────────
//
// Each entry defines: for (resource, action), which roles may
// perform it, and whether ownership further restricts access.
//
//  'role'      → minimum workspace role required
//  'ownership' → 'any'    = any member with sufficient role
//                'own'     = only the resource owner (or admin+)
//                'public'  = owner OR resource.isPublic
//
// If a (resource, action) pair is missing, it is DENIED.

export interface PolicyRule {
  role: WorkspaceRole;
  ownership: 'any' | 'own' | 'public';
}

export type PolicyKey = `${Resource}:${Action}`;

export const ACCESS_POLICIES: Partial<Record<PolicyKey, PolicyRule>> = {
  // ── Workspace management ───────────────────────────────────
  'workspace:read':    { role: 'MEMBER', ownership: 'any' },
  'workspace:update':  { role: 'ADMIN',  ownership: 'any' },
  'workspace:delete':  { role: 'OWNER',  ownership: 'any' },

  // ── Workspace members ──────────────────────────────────────
  'member:read':       { role: 'MEMBER', ownership: 'any' },
  'member:create':     { role: 'ADMIN',  ownership: 'any' },
  'member:update':     { role: 'ADMIN',  ownership: 'any' },
  'member:delete':     { role: 'ADMIN',  ownership: 'any' },

  // ── Agents ─────────────────────────────────────────────────
  'agent:create':      { role: 'MEMBER', ownership: 'any' },
  'agent:read':        { role: 'MEMBER', ownership: 'public' },
  'agent:update':      { role: 'MEMBER', ownership: 'own' },
  'agent:delete':      { role: 'MEMBER', ownership: 'own' },

  // ── Agent credentials ──────────────────────────────────────
  'credential:create': { role: 'MEMBER', ownership: 'own' },
  'credential:read':   { role: 'MEMBER', ownership: 'own' },
  'credential:update': { role: 'MEMBER', ownership: 'own' },
  'credential:delete': { role: 'MEMBER', ownership: 'own' },

  // ── Conversation rooms ─────────────────────────────────────
  'room:create':       { role: 'MEMBER', ownership: 'any' },
  'room:read':         { role: 'MEMBER', ownership: 'any' },
  'room:update':       { role: 'MEMBER', ownership: 'own' },
  'room:delete':       { role: 'MEMBER', ownership: 'own' },
  'room:start':        { role: 'MEMBER', ownership: 'own' },
  'room:pause':        { role: 'MEMBER', ownership: 'own' },
  'room:stop':         { role: 'MEMBER', ownership: 'own' },

  // ── Messages ───────────────────────────────────────────────
  'message:create':    { role: 'MEMBER', ownership: 'any' },
  'message:read':      { role: 'MEMBER', ownership: 'any' },

  // ── Audit logs ─────────────────────────────────────────────
  'audit_log:read':    { role: 'ADMIN',  ownership: 'any' },

  // ── API keys ───────────────────────────────────────────────
  'api_key:create':    { role: 'MEMBER', ownership: 'any' },
  'api_key:read':      { role: 'MEMBER', ownership: 'own' },
  'api_key:delete':    { role: 'MEMBER', ownership: 'own' },
};

/**
 * Role hierarchy weights — higher = more privilege.
 */
export const ROLE_WEIGHT: Record<WorkspaceRole, number> = {
  OWNER: 30,
  ADMIN: 20,
  MEMBER: 10,
};
