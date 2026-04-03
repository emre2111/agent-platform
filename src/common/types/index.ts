import { WorkspaceRole } from '@prisma/client';

// ─── Auth context attached to every request ────────────────────

export interface RequestUser {
  userId: string;
  email: string;
  /** Present only when auth came via API key */
  scopes?: string[];
}

export interface WorkspaceContext {
  workspaceId: string;
  role: WorkspaceRole;
  /** Precomputed from role hierarchy, used in policy checks */
  isAdmin: boolean;
  isOwner: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
  /** Set by WorkspaceMemberGuard — only present on workspace-scoped routes */
  workspace?: WorkspaceContext;
}

// ─── RBAC ──────────────────────────────────────────────────────

export enum Action {
  CREATE = 'create',
  READ   = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  START  = 'start',
  PAUSE  = 'pause',
  STOP   = 'stop',
}

export enum Resource {
  WORKSPACE  = 'workspace',
  MEMBER     = 'member',
  AGENT      = 'agent',
  CREDENTIAL = 'credential',
  ROOM       = 'room',
  MESSAGE    = 'message',
  AUDIT_LOG  = 'audit_log',
  API_KEY    = 'api_key',
}

export interface PolicyContext {
  user: RequestUser;
  workspace: WorkspaceContext;
  action: Action;
  resource: Resource;
  /** ID of the specific resource being accessed, if applicable */
  resourceId?: string;
  /** For agent-related checks: who owns the agent */
  resourceOwnerId?: string;
  /** For agent-related checks: is the agent public */
  resourceIsPublic?: boolean;
}

// ─── Pagination ────────────────────────────────────────────────

export interface PaginationQuery {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
