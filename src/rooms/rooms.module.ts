import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { ParticipantsService } from './participants.service';
import { InvitesService } from './invites.service';
import { RoomsController } from './rooms.controller';
import { ParticipantsController } from './participants.controller';
import { InvitesController, MyInvitesController } from './invites.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

@Module({
  imports: [PermissionsModule, OrchestratorModule],
  controllers: [RoomsController, ParticipantsController, InvitesController, MyInvitesController],
  providers: [RoomsService, ParticipantsService, InvitesService],
  exports: [RoomsService, ParticipantsService, InvitesService],
})
export class RoomsModule {}
