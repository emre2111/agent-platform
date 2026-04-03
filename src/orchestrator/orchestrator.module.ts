import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { AgentRunService } from './agent-run.service';
import { ConversationLoopProcessor } from './conversation-loop.processor';
import { TurnProcessor } from './processors/turn.processor';
import { RoundRobinStrategy } from './strategies/round-robin.strategy';
import { AdaptersModule } from '../adapters/adapters.module';
import { MessagesModule } from '../messages/messages.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    AdaptersModule,
    MessagesModule,
    CredentialsModule,
    RealtimeModule,
  ],
  providers: [
    OrchestratorService,
    ConversationLoopProcessor,
    AgentRunService,
    TurnProcessor,
    RoundRobinStrategy,
  ],
  exports: [OrchestratorService, AgentRunService],
})
export class OrchestratorModule {}
