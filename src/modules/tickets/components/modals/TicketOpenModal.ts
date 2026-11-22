import { ModalSubmitInteraction } from 'discord.js';
import { BaseComponent, type ComponentInteraction } from '../../../../structures/BaseComponent.js';
import type { BotClient } from '../../../../client/BotClient.js';
import type { FormAnswerDTO } from '../../domain/TicketTypes.js';
import { TicketError } from '../../domain/TicketErrors.js';

export class TicketOpenModal extends BaseComponent {
  public readonly customId = 'ticket:modal_open:';
  public readonly type = 'MODAL';

  public async execute(interaction: ComponentInteraction, client: BotClient): Promise<void> {
    if (!interaction.isModalSubmit()) return;
    const modalInteraction = interaction as ModalSubmitInteraction;

    const categoryId = modalInteraction.customId.replace(this.customId, '');
    const category = await client.categoryRepo.findById(categoryId);

    if (!category || !category.isActive || category.guildId !== modalInteraction.guildId) {
      throw new TicketError('Cette catégorie n\'existe plus ou n\'appartient pas à ce serveur.');
    }

    if (!modalInteraction.guild) {
      throw new TicketError('Cette interaction doit être effectuée au sein d\'un serveur.');
    }

    // Récupération des questions pour mapper les identifiants
    const questions = await client.questionRepo.listByCategory(categoryId);
    const formAnswers: FormAnswerDTO[] = [];

    for (const q of questions) {
      const fieldId = `question_${q.id}`;
      try {
        const value = modalInteraction.fields.getTextInputValue(fieldId);
        formAnswers.push({
          question: q.label,
          answer: value || '',
        });
      } catch {
        // Champ non présent dans la soumission
      }
    }

    await modalInteraction.deferReply({ ephemeral: true });

    const { thread } = await client.tickets.createTicket({
      guild: modalInteraction.guild,
      user: modalInteraction.user,
      categoryId: category.id,
      formAnswers,
    });

    await modalInteraction.editReply({
      content: `✅ Votre ticket a été créé avec succès : <#${thread.id}>`,
    });
  }
}
