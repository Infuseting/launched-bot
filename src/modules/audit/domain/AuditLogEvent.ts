export type AuditSubsystem = 'TICKETS' | 'MODERATION' | 'ADMIN' | 'MEMBERS';

export type AuditAction =
  | 'TICKET_CREATED'
  | 'TICKET_CLAIMED'
  | 'TICKET_RELEASED'
  | 'TICKET_CLOSED'
  | 'TICKET_USER_ADDED'
  | 'TICKET_USER_REMOVED'
  | 'TICKET_PRIORITY_CHANGED'
  | 'TICKET_TOPIC_CHANGED'
  | 'TICKET_RENAMED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'QUESTION_ADDED'
  | 'QUESTION_DELETED'
  | 'PANEL_DEPLOYED'
  | 'SETTINGS_UPDATED';

export interface AuditEventPayload {
  guildId: string;
  subsystem: AuditSubsystem;
  action: AuditAction;
  actorId: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}
