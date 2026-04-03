/**
 * Canonical audit event catalog.
 *
 * Naming convention:  <resource>.<past_tense_verb>
 *
 *   resource  = lowercase singular noun matching the domain entity
 *   verb      = past tense describing what happened
 *
 * Examples:
 *   agent.created    (not "agent.create" — the log records what DID happen)
 *   credential.set   (not "credential.updated" — "set" is more precise for upsert)
 *   room.started     (not "room.start" — past tense)
 *
 * Adding a new event:
 *   1. Add it to AuditAction enum below
 *   2. Map it to a TargetType in ACTION_TARGET_MAP
 *   3. Define the metadata shape in AuditMetadataMap (optional but recommended)
 *   4. Call auditService.log() at the call site
 */

// ─── Actions ───────────────────────────────────────────────────

export enum AuditAction {
  // Auth
  USER_REGISTERED          = 'user.registered',
  USER_LOGGED_IN           = 'user.logged_in',
  USER_LOGIN_FAILED        = 'user.login_failed',

  // Workspace
  WORKSPACE_CREATED        = 'workspace.created',

  // Members
  MEMBER_ADDED             = 'member.added',
  MEMBER_REMOVED           = 'member.removed',
  MEMBER_ROLE_CHANGED      = 'member.role_changed',

  // Agents
  AGENT_CREATED            = 'agent.created',
  AGENT_UPDATED            = 'agent.updated',
  AGENT_ARCHIVED           = 'agent.archived',
  AGENT_ACTIVATED          = 'agent.activated',

  // Credentials
  CREDENTIAL_SET           = 'credential.set',
  CREDENTIAL_DELETED       = 'credential.deleted',
  CREDENTIAL_ACCESSED      = 'credential.accessed',
  CREDENTIAL_VALIDATION_FAILED = 'credential.validation_failed',

  // Rooms
  ROOM_CREATED             = 'room.created',
  ROOM_STARTED             = 'room.started',
  ROOM_RESUMED             = 'room.resumed',
  ROOM_PAUSED              = 'room.paused',
  ROOM_STOPPED             = 'room.stopped',
  ROOM_CLOSED_AUTO         = 'room.closed_auto',

  // Participants
  PARTICIPANT_ADDED        = 'participant.added',
  PARTICIPANT_REMOVED      = 'participant.removed',

  // Messages
  MESSAGE_INTERVENTION     = 'message.intervention',

  // API Keys
  API_KEY_CREATED          = 'api_key.created',
  API_KEY_REVOKED          = 'api_key.revoked',
}

// ─── Target types ──────────────────────────────────────────────

export enum AuditTargetType {
  USER                     = 'User',
  WORKSPACE                = 'Workspace',
  WORKSPACE_MEMBER         = 'WorkspaceMember',
  AGENT                    = 'Agent',
  AGENT_CREDENTIAL         = 'AgentCredential',
  CONVERSATION_ROOM        = 'ConversationRoom',
  CONVERSATION_PARTICIPANT = 'ConversationParticipant',
  MESSAGE                  = 'Message',
  API_KEY                  = 'ApiKey',
}

// ─── Action → TargetType mapping ───────────────────────────────

export const ACTION_TARGET_MAP: Record<AuditAction, AuditTargetType> = {
  [AuditAction.USER_REGISTERED]:            AuditTargetType.USER,
  [AuditAction.USER_LOGGED_IN]:             AuditTargetType.USER,
  [AuditAction.USER_LOGIN_FAILED]:          AuditTargetType.USER,

  [AuditAction.WORKSPACE_CREATED]:          AuditTargetType.WORKSPACE,

  [AuditAction.MEMBER_ADDED]:               AuditTargetType.WORKSPACE_MEMBER,
  [AuditAction.MEMBER_REMOVED]:             AuditTargetType.WORKSPACE_MEMBER,
  [AuditAction.MEMBER_ROLE_CHANGED]:        AuditTargetType.WORKSPACE_MEMBER,

  [AuditAction.AGENT_CREATED]:              AuditTargetType.AGENT,
  [AuditAction.AGENT_UPDATED]:              AuditTargetType.AGENT,
  [AuditAction.AGENT_ARCHIVED]:             AuditTargetType.AGENT,
  [AuditAction.AGENT_ACTIVATED]:            AuditTargetType.AGENT,

  [AuditAction.CREDENTIAL_SET]:             AuditTargetType.AGENT_CREDENTIAL,
  [AuditAction.CREDENTIAL_DELETED]:         AuditTargetType.AGENT_CREDENTIAL,
  [AuditAction.CREDENTIAL_ACCESSED]:        AuditTargetType.AGENT_CREDENTIAL,
  [AuditAction.CREDENTIAL_VALIDATION_FAILED]: AuditTargetType.AGENT_CREDENTIAL,

  [AuditAction.ROOM_CREATED]:               AuditTargetType.CONVERSATION_ROOM,
  [AuditAction.ROOM_STARTED]:               AuditTargetType.CONVERSATION_ROOM,
  [AuditAction.ROOM_RESUMED]:               AuditTargetType.CONVERSATION_ROOM,
  [AuditAction.ROOM_PAUSED]:                AuditTargetType.CONVERSATION_ROOM,
  [AuditAction.ROOM_STOPPED]:               AuditTargetType.CONVERSATION_ROOM,
  [AuditAction.ROOM_CLOSED_AUTO]:           AuditTargetType.CONVERSATION_ROOM,

  [AuditAction.PARTICIPANT_ADDED]:          AuditTargetType.CONVERSATION_PARTICIPANT,
  [AuditAction.PARTICIPANT_REMOVED]:        AuditTargetType.CONVERSATION_PARTICIPANT,

  [AuditAction.MESSAGE_INTERVENTION]:       AuditTargetType.MESSAGE,

  [AuditAction.API_KEY_CREATED]:            AuditTargetType.API_KEY,
  [AuditAction.API_KEY_REVOKED]:            AuditTargetType.API_KEY,
};
