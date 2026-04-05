import { Matches } from 'class-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AddAgentParticipantDto {
  @Matches(UUID_REGEX, { message: 'agentId must be a valid UUID' })
  agentId: string;
}
