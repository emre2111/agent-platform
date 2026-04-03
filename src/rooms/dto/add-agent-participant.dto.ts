import { IsUUID } from 'class-validator';

export class AddAgentParticipantDto {
  @IsUUID()
  agentId: string;
}
