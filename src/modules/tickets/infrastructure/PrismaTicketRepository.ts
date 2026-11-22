import type { Ticket, TicketPriority, TicketStatus } from '@prisma/client';
import type { ITicketRepository, TicketWithRelations } from '../repositories/ITicketRepository.js';
import type { CreateTicketDTO } from '../domain/TicketTypes.js';
import type { PrismaService } from '../../../database/PrismaService.js';
import { TicketError } from '../domain/TicketErrors.js';

export class PrismaTicketRepository implements ITicketRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async createWithIncrement(dto: CreateTicketDTO): Promise<Ticket> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Incrément atomique du compteur de tickets pour le serveur
      const guildConfig = await tx.ticketGuildConfig.update({
        where: { guildId: dto.guildId },
        data: { ticketCounter: { increment: 1 } },
        select: { ticketCounter: true },
      });

      // 2. Création de l'entité Ticket liée
      return tx.ticket.create({
        data: {
          guildId: dto.guildId,
          number: guildConfig.ticketCounter,
          threadId: dto.threadId,
          categoryId: dto.categoryId,
          creatorId: dto.creatorId,
          topic: dto.topic ?? null,
          priority: dto.priority ?? 'NORMAL',
          formAnswers: dto.formAnswers as any,
          participants: [dto.creatorId],
          status: 'OPEN',
        },
      });
    });
  }

  public async findByThreadId(threadId: string): Promise<TicketWithRelations | null> {
    return this.prisma.ticket.findUnique({
      where: { threadId },
      include: {
        category: true,
        guild: true,
      },
    });
  }

  public async findById(id: string): Promise<TicketWithRelations | null> {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        category: true,
        guild: true,
      },
    });
  }

  public async findOpenByCreator(guildId: string, creatorId: string): Promise<Ticket[]> {
    return this.prisma.ticket.findMany({
      where: {
        guildId,
        creatorId,
        status: { in: ['OPEN', 'CLAIMED'] },
      },
    });
  }

  public async updateStatus(
    id: string,
    status: TicketStatus,
    closedById?: string,
    closeReason?: string
  ): Promise<Ticket> {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status,
        closedById: closedById ?? undefined,
        closeReason: closeReason ?? undefined,
        closedAt: status === 'CLOSED' ? new Date() : undefined,
      },
    });
  }

  public async updateClaim(id: string, claimedById: string | null): Promise<Ticket> {
    if (claimedById !== null) {
      const current = await this.prisma.ticket.findUnique({ where: { id } });
      if (!current || current.status === 'CLOSED') {
        throw new TicketError('Ce ticket est introuvable ou déjà clôturé.');
      }
      if (current.claimedById) {
        throw new TicketError(`Ce ticket a déjà été pris en charge par <@${current.claimedById}>.`);
      }
    }

    return this.prisma.ticket.update({
      where: { id },
      data: {
        claimedById,
        status: claimedById ? 'CLAIMED' : 'OPEN',
      },
    });
  }

  public async updatePriority(id: string, priority: TicketPriority): Promise<Ticket> {
    return this.prisma.ticket.update({
      where: { id },
      data: { priority },
    });
  }

  public async updateTopic(id: string, topic: string): Promise<Ticket> {
    return this.prisma.ticket.update({
      where: { id },
      data: { topic },
    });
  }

  public async addParticipant(id: string, userId: string): Promise<Ticket> {
    const existing = await this.prisma.ticket.findUniqueOrThrow({ where: { id } });
    if (existing.participants.includes(userId)) return existing;

    return this.prisma.ticket.update({
      where: { id },
      data: {
        participants: {
          push: userId,
        },
      },
    });
  }

  public async removeParticipant(id: string, userId: string): Promise<Ticket> {
    const existing = await this.prisma.ticket.findUniqueOrThrow({ where: { id } });
    return this.prisma.ticket.update({
      where: { id },
      data: {
        participants: existing.participants.filter((p) => p !== userId),
      },
    });
  }

  public async countActiveByGuild(guildId: string): Promise<number> {
    return this.prisma.ticket.count({
      where: {
        guildId,
        status: { in: ['OPEN', 'CLAIMED'] },
      },
    });
  }
}
