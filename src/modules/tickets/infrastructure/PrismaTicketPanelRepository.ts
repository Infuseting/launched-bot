import type { TicketPanel } from '@prisma/client';
import type { ITicketPanelRepository, CreatePanelDTO } from '../repositories/ITicketPanelRepository.js';
import type { PrismaService } from '../../../database/PrismaService.js';

export class PrismaTicketPanelRepository implements ITicketPanelRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string): Promise<TicketPanel | null> {
    return this.prisma.ticketPanel.findUnique({
      where: { id },
    });
  }

  public async findByMessageId(messageId: string): Promise<TicketPanel | null> {
    return this.prisma.ticketPanel.findUnique({
      where: { messageId },
    });
  }

  public async listByGuild(guildId: string): Promise<TicketPanel[]> {
    return this.prisma.ticketPanel.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(dto: CreatePanelDTO): Promise<TicketPanel> {
    return this.prisma.ticketPanel.create({
      data: {
        guildId: dto.guildId,
        channelId: dto.channelId,
        messageId: dto.messageId,
        title: dto.title,
        description: dto.description,
        type: dto.type ?? 'SELECT_MENU',
        buttonLabel: dto.buttonLabel ?? null,
      },
    });
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.ticketPanel.delete({
      where: { id },
    });
  }
}
