import type { PrismaService } from '../../../database/PrismaService.js';
import type { AuditEventPayload } from '../domain/AuditLogEvent.js';
import { Logger } from '../../../utils/logger.js';

export class AuditLogger {
  private readonly logger = new Logger('AuditLogger');

  public constructor(private readonly prisma: PrismaService) {}

  public async log(event: AuditEventPayload): Promise<void> {
    try {
      this.logger.info(`[Audit:${event.subsystem}] ${event.action} par ${event.actorId}`, {
        guildId: event.guildId,
        targetId: event.targetId,
        metadata: event.metadata,
      });

      await this.prisma.auditLog.create({
        data: {
          guildId: event.guildId,
          subsystem: event.subsystem,
          action: event.action,
          actorId: event.actorId,
          targetId: event.targetId ?? null,
          metadata: (event.metadata as any) ?? {},
        },
      });
    } catch (error) {
      this.logger.error('Échec de l\'enregistrement du log d\'audit :', error);
    }
  }
}
