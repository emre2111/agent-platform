import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../common/decorators';

/**
 * For API-key authenticated requests, verifies the key's scopes
 * include all scopes required by @RequireScopes(...).
 *
 * JWT-authenticated users bypass this guard (they have implicit
 * full scope within their role's permissions).
 */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredScopes?.length) return true;

    const request = context.switchToHttp().getRequest();
    const userScopes: string[] | undefined = request.user?.scopes;

    // JWT users don't have scopes — they use role-based access
    if (!userScopes) return true;

    const missing = requiredScopes.filter((s) => !userScopes.includes(s));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `API key missing required scopes: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
