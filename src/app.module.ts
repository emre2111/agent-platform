import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { CryptoModule } from './crypto/crypto.module';
import { AuthModule } from './auth/auth.module';
import { PermissionsModule } from './permissions/permissions.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { AgentsModule } from './agents/agents.module';
import { CredentialsModule } from './credentials/credentials.module';
import { RoomsModule } from './rooms/rooms.module';
import { MessagesModule } from './messages/messages.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { AdaptersModule } from './adapters/adapters.module';
import { AuditModule } from './audit/audit.module';
import { RealtimeModule } from './realtime/realtime.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    QueueModule,
    CryptoModule,
    AuthModule,
    PermissionsModule,
    WorkspacesModule,
    AgentsModule,
    CredentialsModule,
    RoomsModule,
    MessagesModule,
    OrchestratorModule,
    AdaptersModule,
    AuditModule,
    RealtimeModule,
  ],
})
export class AppModule {}
