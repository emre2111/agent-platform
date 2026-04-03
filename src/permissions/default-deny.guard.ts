import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Global guard applied via APP_GUARD. Every route requires
 * authentication UNLESS explicitly marked with @Public().
 *
 * This is the "default deny" layer: if you forget to add a guard,
 * the route is automatically protected rather than exposed.
 */
@Injectable()
export class DefaultDenyGuard extends JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
