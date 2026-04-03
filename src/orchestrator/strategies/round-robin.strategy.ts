import { Injectable } from '@nestjs/common';
import { ConversationParticipant, Agent } from '@prisma/client';

type ParticipantWithAgent = ConversationParticipant & { agent: Agent | null };

@Injectable()
export class RoundRobinStrategy {
  pick(agents: ParticipantWithAgent[], turnNumber: number): ParticipantWithAgent | null {
    const active = agents.filter((a) => a.agent && !a.leftAt);
    if (active.length === 0) return null;
    return active[turnNumber % active.length];
  }
}
