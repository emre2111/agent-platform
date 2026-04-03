import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * Extracts the verified workspace ID from the request context.
 *
 * SECURITY: Only reads from request.workspace (set by WorkspaceMemberGuard
 * after verifying membership). Never falls back to headers or query params.
 */
export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const wsId = request.workspace?.workspaceId;
    if (!wsId) {
      throw new BadRequestException(
        'WorkspaceId decorator requires WorkspaceMemberGuard to run first',
      );
    }
    return wsId;
  },
);
