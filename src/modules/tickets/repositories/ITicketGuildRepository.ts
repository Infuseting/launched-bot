import type { TicketGuildConfig } from '@prisma/client';
import type { TicketGuildConfigDTO } from '../domain/TicketTypes.js';

export interface ITicketGuildRepository {
  findByGuildId(guildId: string): Promise<TicketGuildConfig | null>;
  upsertConfig(dto: TicketGuildConfigDTO): Promise<TicketGuildConfig>;
  incrementTicketCounter(guildId: string): Promise<number>;
  updateSettings(
    guildId: string,
    data: Partial<Omit<TicketGuildConfig, 'guildId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TicketGuildConfig>;
}
