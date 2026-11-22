import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { TicketQuestion } from '@prisma/client';

export class ModalHelper {
  public static createQuestionsModal(
    categoryId: string,
    categoryName: string,
    questions: TicketQuestion[]
  ): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId(`ticket:modal_open:${categoryId}`)
      .setTitle(`Ticket - ${categoryName}`.slice(0, 45));

    // Discord autorise un maximum strict de 5 ActionRows par modal
    const sortedQuestions = [...questions].sort((a, b) => a.order - b.order).slice(0, 5);

    for (const q of sortedQuestions) {
      const input = new TextInputBuilder()
        .setCustomId(`question_${q.id}`)
        .setLabel(q.label.slice(0, 45))
        .setStyle(q.style === 'PARAGRAPH' ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(q.required);

      if (q.placeholder) {
        input.setPlaceholder(q.placeholder.slice(0, 100));
      }
      if (q.minLength !== null && q.minLength > 0) {
        input.setMinLength(q.minLength);
      }
      if (q.maxLength !== null && q.maxLength > 0) {
        input.setMaxLength(q.maxLength);
      }

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    }

    return modal;
  }
}
