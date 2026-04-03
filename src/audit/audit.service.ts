import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditAction, AuditTargetType, ACTION_TARGET_MAP } from './audit-events';

// ─── Public interface ──────────────────────────────────────────

export interface AuditEntry {
  /** Always required — tenant boundary */
  workspaceId: string;

  /** Who performed the action. For system actions, use a well-known system user ID. */
  actorId: string;

  /** What happened — must be a value from AuditAction enum */
  action: AuditAction;

  /** The ID of the affected resource (optional for actions like login) */
  targetId?: string;

  /** Structured context — varies per event type. See guidelines below. */
  metadata?: Record<string, unknown>;
}

/**
 * Convenience builder for HTTP-request-scoped audit entries.
 * Extracts common fields from the request context.
 */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Write an audit log entry.
   *
   * The `targetType` is derived automatically from the `action` enum
   * via ACTION_TARGET_MAP — callers never specify it manually.
   *
   * This method NEVER throws. Audit logging must not break the
   * primary operation. Failures are logged to stderr.
   */
  async log(entry: AuditEntry, requestContext?: RequestContext): Promise<void> {
    try {
      const targetType: AuditTargetType = ACTION_TARGET_MAP[entry.action];

      const metadata: Record<string, unknown> = {
        ...entry.metadata,
      };

      if (requestContext) {
        metadata.ip = requestContext.ip;
        metadata.userAgent = requestContext.userAgent;
        metadata.method = requestContext.method;
        metadata.path = requestContext.path;
      }

      await this.db.auditLog.create({
        data: {
          workspaceId: entry.workspaceId,
          actorId: entry.actorId,
          action: entry.action,
          targetType,
          targetId: entry.targetId,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit log [${entry.action}]: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Query audit logs for a workspace with optional filters.
   * Cursor-paginated, newest-first.
   */
  async query(
    workspaceId: string,
    filters?: {
      actorId?: string;
      action?: string;
      targetType?: string;
      targetId?: string;
      cursor?: string;
      limit?: number;
    },
  ) {
    const limit = Math.min(filters?.limit ?? 50, 100);

    return this.db.auditLog.findMany({
      where: {
        workspaceId,
        ...(filters?.actorId && { actorId: filters.actorId }),
        ...(filters?.action && { action: { startsWith: filters.action } }),
        ...(filters?.targetType && { targetType: filters.targetType }),
        ...(filters?.targetId && { targetId: filters.targetId }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(filters?.cursor
        ? { skip: 1, cursor: { id: filters.cursor } }
        : {}),
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
