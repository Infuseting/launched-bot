import type { TicketCategory } from '@prisma/client';
import type {
  ITicketCategoryRepository,
  TicketCategoryWithQuestions,
} from '../repositories/ITicketCategoryRepository.js';
import type { TicketCategoryDTO } from '../domain/TicketTypes.js';
import type { PrismaService } from '../../../database/PrismaService.js';
import { TicketError } from '../domain/TicketErrors.js';

export class PrismaTicketCategoryRepository implements ITicketCategoryRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string): Promise<TicketCategoryWithQuestions | null> {
    return this.prisma.ticketCategory.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  public async findByName(guildId: string, name: string): Promise<TicketCategoryWithQuestions | null> {
    return this.prisma.ticketCategory.findUnique({
      where: {
        guildId_name: {
          guildId,
          name,
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  public async listByGuild(guildId: string, onlyActive = false): Promise<TicketCategoryWithQuestions[]> {
    return this.prisma.ticketCategory.findMany({
      where: {
        guildId,
        ...(onlyActive ? { isActive: true } : {}),
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  public async create(dto: TicketCategoryDTO): Promise<TicketCategory> {
    return this.prisma.ticketCategory.create({
      data: {
        guildId: dto.guildId,
        name: dto.name,
        description: dto.description ?? null,
        emoji: dto.emoji ?? null,
        ticketPrefix: dto.ticketPrefix || 'ticket',
        supportRoleId: dto.supportRoleId ?? null,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  public async update(id: string, data: Partial<TicketCategoryDTO>): Promise<TicketCategory> {
    return this.prisma.ticketCategory.update({
      where: { id },
      data,
    });
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.prisma.ticketCategory.delete({
        where: { id },
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2003') {
        throw new TicketError(
          'Impossible de supprimer cette catégorie car des tickets y sont déjà rattachés. Désactivez-la plutôt pour préserver l\'historique.'
        );
      }
      throw error;
    }
  }
}
