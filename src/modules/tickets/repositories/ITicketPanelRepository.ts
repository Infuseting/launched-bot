import type { TicketPanel, PanelType } from '@prisma/client';

export interface CreatePanelDTO {
  guildId: string;
  channelId: string;
  messageId: string;
  title: string;
  description: string;
  type?: PanelType;
  buttonLabel?: string | null;
}

export interface ITicketPanelRepository {
  findById(id: string): Promise<TicketPanel | null>;
  findByMessageId(messageId: string): Promise<TicketPanel | null>;
  listByGuild(guildId: string): Promise<TicketPanel[]>;
  create(dto: CreatePanelDTO): Promise<TicketPanel>;
  delete(id: string): Promise<void>;
}
