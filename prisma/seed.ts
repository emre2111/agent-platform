import { PrismaClient, WorkspaceRole, AgentStatus, ParticipantType, TurnPolicy } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

if (process.env.NODE_ENV === 'production') {
  console.error('Seed script must not run in production.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.com' },
    update: {},
    create: {
      email: 'alice@demo.com',
      name: 'Alice Chen',
      passwordHash,
      emailVerified: true,
    },
  });
  console.log(`  User: ${alice.email} (${alice.id})`);

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Workspace',
      slug: 'demo',
    },
  });
  console.log(`  Workspace: ${workspace.name} (${workspace.id})`);

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: alice.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: alice.id,
      role: WorkspaceRole.OWNER,
    },
  });
  console.log(`  Membership: Alice -> Demo Workspace (OWNER)`);

  const analyst = await prisma.agent.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      workspaceId: workspace.id,
      ownerId: alice.id,
      name: 'Research Analyst',
      description: 'Analyzes topics and provides evidence-based arguments',
      systemPrompt:
        'You are a research analyst in a multi-agent debate. Present well-reasoned arguments supported by evidence. Be concise but thorough. Respond to other participants\' points directly.',
      modelProvider: 'openai',
      modelName: 'gpt-4o',
      modelConfig: { temperature: 0.7, maxTokens: 1024 },
      status: AgentStatus.ACTIVE,
      isPublic: true,
    },
  });
  console.log(`  Agent: ${analyst.name} (${analyst.id})`);

  const advocate = await prisma.agent.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000002',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      workspaceId: workspace.id,
      ownerId: alice.id,
      name: "Devil's Advocate",
      description: 'Challenges assumptions and finds counterarguments',
      systemPrompt:
        'You are a devil\'s advocate in a multi-agent debate. Your role is to challenge the other participant\'s arguments, find weaknesses, and present counterpoints. Be rigorous but respectful.',
      modelProvider: 'anthropic',
      modelName: 'claude-sonnet-4-20250514',
      modelConfig: { temperature: 0.8, maxTokens: 1024 },
      status: AgentStatus.ACTIVE,
      isPublic: true,
    },
  });
  console.log(`  Agent: ${advocate.name} (${advocate.id})`);

  const room = await prisma.conversationRoom.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000010',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      workspaceId: workspace.id,
      createdById: alice.id,
      name: 'Debate: AI Safety Governance',
      description: 'Two agents discuss approaches to AI safety regulation.',
      turnPolicy: TurnPolicy.ROUND_ROBIN,
      maxTurns: 20,
    },
  });
  console.log(`  Room: ${room.name} (${room.id})`);

  const existingParticipants = await prisma.conversationParticipant.findMany({
    where: { roomId: room.id },
  });

  if (existingParticipants.length === 0) {
    await prisma.conversationParticipant.createMany({
      data: [
        {
          roomId: room.id,
          participantType: ParticipantType.AGENT,
          agentId: analyst.id,
          seatOrder: 0,
        },
        {
          roomId: room.id,
          participantType: ParticipantType.AGENT,
          agentId: advocate.id,
          seatOrder: 1,
        },
        {
          roomId: room.id,
          participantType: ParticipantType.USER,
          userId: alice.id,
          canIntervene: true,
          seatOrder: 2,
        },
      ],
    });
    console.log(`  Participants: 2 agents + Alice added to room`);
  }

  console.log('\nSeed complete!');
  console.log(`\nLogin credentials: alice@demo.com / password123`);
  console.log(`Workspace ID: ${workspace.id}`);
  console.log(`Room ID: ${room.id}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
