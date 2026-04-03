import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import { DefaultDenyGuard } from './default-deny.guard';
import { RolesGuard } from './roles.guard';
import { ScopesGuard } from './scopes.guard';
import { AgentOwnerGuard } from './agent-owner.guard';
import { RoomOwnerGuard } from './room-owner.guard';

@Module({
  providers: [
    PermissionsService,
    RolesGuard,
    ScopesGuard,
    AgentOwnerGuard,
    RoomOwnerGuard,

    // Register default-deny as a global guard.
    // Every route requires authentication unless @Public().
    {
      provide: APP_GUARD,
      useClass: DefaultDenyGuard,
    },
  ],
  exports: [
    PermissionsService,
    RolesGuard,
    ScopesGuard,
    AgentOwnerGuard,
    RoomOwnerGuard,
  ],
})
export class PermissionsModule {}
