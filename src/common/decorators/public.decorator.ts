import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as publicly accessible, bypassing the global
 * default-deny JwtAuthGuard. Use sparingly: only for
 * /auth/login, /auth/register, health checks.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
