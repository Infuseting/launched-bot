import type { Ticket, TicketCategory, TicketGuildConfig, TicketPriority, TicketStatus } from '@prisma/client';
import type { CreateTicketDTO } from '../domain/TicketTypes.js';

export interface TicketWithRelations extends Ticket {
  category: TicketCategory;
  guild: TicketGuildConfig;
}

export interface ITicketRepository {
  createWithIncrement(dto: CreateTicketDTO): Promise<Ticket>;
  findByThreadId(threadId: string): Promise<TicketWithRelations | null>;
  findById(id: string): Promise<TicketWithRelations | null>;
  findOpenByCreator(guildId: string, creatorId: string): Promise<Ticket[]>;
  updateStatus(
    id: string,
    status: TicketStatus,
    closedById?: string,
    closeReason?: string
  ): Promise<Ticket>;
  updateClaim(id: string, claimedById: string | null): Promise<Ticket>;
  updatePriority(id: string, priority: TicketPriority): Promise<Ticket>;
  updateTopic(id: string, topic: string): Promise<Ticket>;
  addParticipant(id: string, userId: string): Promise<Ticket>;
  removeParticipant(id: string, userId: string): Promise<Ticket>;
  countActiveByGuild(guildId: string): Promise<number>;
}
