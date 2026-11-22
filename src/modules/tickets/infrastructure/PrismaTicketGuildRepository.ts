import type { TicketGuildConfig } from '@prisma/client';
import type { ITicketGuildRepository } from '../repositories/ITicketGuildRepository.js';
import type { TicketGuildConfigDTO } from '../domain/TicketTypes.js';
import type { PrismaService } from '../../../database/PrismaService.js';

export class PrismaTicketGuildRepository implements ITicketGuildRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async findByGuildId(guildId: string): Promise<TicketGuildConfig | null> {
    return this.prisma.ticketGuildConfig.findUnique({
      where: { guildId },
    });
  }

  public async upsertConfig(dto: TicketGuildConfigDTO): Promise<TicketGuildConfig> {
    return this.prisma.ticketGuildConfig.upsert({
      where: { guildId: dto.guildId },
      create: {
        guildId: dto.guildId,
        ticketChannelId: dto.ticketChannelId,
        logChannelId: dto.logChannelId ?? undefined,
        supportRoleId: dto.supportRoleId ?? undefined,
        adminRoleId: dto.adminRoleId ?? undefined,
        maxOpenTicketsPerUser: dto.maxOpenTicketsPerUser ?? 3,
        dmTranscript: dto.dmTranscript ?? true,
      },
      update: {
        ticketChannelId: dto.ticketChannelId,
        logChannelId: dto.logChannelId !== undefined ? dto.logChannelId : undefined,
        supportRoleId: dto.supportRoleId !== undefined ? dto.supportRoleId : undefined,
        adminRoleId: dto.adminRoleId !== undefined ? dto.adminRoleId : undefined,
        maxOpenTicketsPerUser: dto.maxOpenTicketsPerUser ?? undefined,
        dmTranscript: dto.dmTranscript ?? undefined,
      },
    });
  }

  public async incrementTicketCounter(guildId: string): Promise<number> {
    const updated = await this.prisma.ticketGuildConfig.update({
      where: { guildId },
      data: { ticketCounter: { increment: 1 } },
      select: { ticketCounter: true },
    });
    return updated.ticketCounter;
  }

  public async updateSettings(
    guildId: string,
    data: Partial<Omit<TicketGuildConfig, 'guildId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TicketGuildConfig> {
    return this.prisma.ticketGuildConfig.update({
      where: { guildId },
      data,
    });
  }
}
