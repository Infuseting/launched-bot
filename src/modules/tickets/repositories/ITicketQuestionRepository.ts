import type { TicketQuestion } from '@prisma/client';
import type { TicketQuestionDTO } from '../domain/TicketTypes.js';

export interface ITicketQuestionRepository {
  findById(id: string): Promise<TicketQuestion | null>;
  listByCategory(categoryId: string): Promise<TicketQuestion[]>;
  create(dto: TicketQuestionDTO): Promise<TicketQuestion>;
  update(id: string, data: Partial<TicketQuestionDTO>): Promise<TicketQuestion>;
  delete(id: string): Promise<void>;
  countByCategory(categoryId: string): Promise<number>;
}
