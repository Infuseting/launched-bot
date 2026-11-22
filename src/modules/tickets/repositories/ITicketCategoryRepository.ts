import type { TicketCategory, TicketQuestion } from '@prisma/client';
import type { TicketCategoryDTO } from '../domain/TicketTypes.js';

export interface TicketCategoryWithQuestions extends TicketCategory {
  questions: TicketQuestion[];
}

export interface ITicketCategoryRepository {
  findById(id: string): Promise<TicketCategoryWithQuestions | null>;
  findByName(guildId: string, name: string): Promise<TicketCategoryWithQuestions | null>;
  listByGuild(guildId: string, onlyActive?: boolean): Promise<TicketCategoryWithQuestions[]>;
  create(dto: TicketCategoryDTO): Promise<TicketCategory>;
  update(id: string, data: Partial<TicketCategoryDTO>): Promise<TicketCategory>;
  delete(id: string): Promise<void>;
}
