export type TicketStatusType = 'OPEN' | 'CLAIMED' | 'CLOSED' | 'ARCHIVED';
export type TicketPriorityType = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type QuestionStyleType = 'SHORT' | 'PARAGRAPH';
export type PanelTypeOption = 'BUTTON' | 'SELECT_MENU';

export interface FormAnswerDTO {
  question: string;
  answer: string;
}

export interface CreateTicketDTO {
  guildId: string;
  categoryId: string;
  creatorId: string;
  threadId: string;
  topic?: string;
  priority?: TicketPriorityType;
  formAnswers: FormAnswerDTO[];
}

export interface TicketGuildConfigDTO {
  guildId: string;
  ticketChannelId: string;
  logChannelId?: string | null;
  supportRoleId?: string | null;
  adminRoleId?: string | null;
  maxOpenTicketsPerUser?: number;
  dmTranscript?: boolean;
}

export interface TicketCategoryDTO {
  id?: string;
  guildId: string;
  name: string;
  description?: string | null;
  emoji?: string | null;
  ticketPrefix?: string;
  supportRoleId?: string | null;
  order?: number;
  isActive?: boolean;
}

export interface TicketQuestionDTO {
  id?: string;
  categoryId: string;
  label: string;
  placeholder?: string | null;
  style?: QuestionStyleType;
  required?: boolean;
  minLength?: number | null;
  maxLength?: number | null;
  order?: number;
}
