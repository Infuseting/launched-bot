import type { TicketQuestion } from '@prisma/client';
import type { ITicketQuestionRepository } from '../repositories/ITicketQuestionRepository.js';
import type { TicketQuestionDTO } from '../domain/TicketTypes.js';
import type { PrismaService } from '../../../database/PrismaService.js';

export class PrismaTicketQuestionRepository implements ITicketQuestionRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string): Promise<TicketQuestion | null> {
    return this.prisma.ticketQuestion.findUnique({
      where: { id },
    });
  }

  public async listByCategory(categoryId: string): Promise<TicketQuestion[]> {
    return this.prisma.ticketQuestion.findMany({
      where: { categoryId },
      orderBy: { order: 'asc' },
    });
  }

  public async create(dto: TicketQuestionDTO): Promise<TicketQuestion> {
    return this.prisma.ticketQuestion.create({
      data: {
        categoryId: dto.categoryId,
        label: dto.label,
        placeholder: dto.placeholder ?? null,
        style: dto.style ?? 'PARAGRAPH',
        required: dto.required ?? true,
        minLength: dto.minLength ?? 0,
        maxLength: dto.maxLength ?? 1000,
        order: dto.order ?? 1,
      },
    });
  }

  public async update(id: string, data: Partial<TicketQuestionDTO>): Promise<TicketQuestion> {
    return this.prisma.ticketQuestion.update({
      where: { id },
      data,
    });
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.ticketQuestion.delete({
      where: { id },
    });
  }

  public async countByCategory(categoryId: string): Promise<number> {
    return this.prisma.ticketQuestion.count({
      where: { categoryId },
    });
  }
}
