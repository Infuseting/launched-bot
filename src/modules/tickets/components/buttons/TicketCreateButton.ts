import { ButtonInteraction } from 'discord.js';
import { BaseComponent, type ComponentInteraction } from '../../../../structures/BaseComponent.js';
import type { BotClient } from '../../../../client/BotClient.js';
import { ModalHelper } from '../ModalHelper.js';
import { TicketError } from '../../domain/TicketErrors.js';

export class TicketCreateButton extends BaseComponent {
  public readonly customId = 'ticket:create:';
  public readonly type = 'BUTTON';

  public async execute(interaction: ComponentInteraction, client: BotClient): Promise<void> {
    if (!interaction.isButton()) return;
    const btnInteraction = interaction as ButtonInteraction;

    const categoryId = btnInteraction.customId.replace(this.customId, '');
    const category = await client.categoryRepo.findById(categoryId);

    if (!category || !category.isActive || category.guildId !== btnInteraction.guildId) {
      throw new TicketError('Cette catégorie n\'existe plus ou n\'appartient pas à ce serveur.');
    }

    const questions = await client.questionRepo.listByCategory(categoryId);

    if (questions.length > 0) {
      const modal = ModalHelper.createQuestionsModal(category.id, category.name, questions);
      await btnInteraction.showModal(modal);
      return;
    }

    // Aucun formulaire requis : création immédiate
    await btnInteraction.deferReply({ ephemeral: true });

    if (!btnInteraction.guild) {
      throw new TicketError('Cette interaction doit être effectuée au sein d\'un serveur.');
    }

    const { thread } = await client.tickets.createTicket({
      guild: btnInteraction.guild,
      user: btnInteraction.user,
      categoryId: category.id,
    });

    await btnInteraction.editReply({
      content: `✅ Votre ticket a été créé avec succès : <#${thread.id}>`,
    });
  }
}
