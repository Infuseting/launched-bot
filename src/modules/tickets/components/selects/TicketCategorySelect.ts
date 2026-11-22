import { AnySelectMenuInteraction } from 'discord.js';
import { BaseComponent, type ComponentInteraction } from '../../../../structures/BaseComponent.js';
import type { BotClient } from '../../../../client/BotClient.js';
import { ModalHelper } from '../ModalHelper.js';
import { TicketError } from '../../domain/TicketErrors.js';

export class TicketCategorySelect extends BaseComponent {
  public readonly customId = 'ticket:select_category';
  public readonly type = 'SELECT_MENU';

  public async execute(interaction: ComponentInteraction, client: BotClient): Promise<void> {
    if (!interaction.isAnySelectMenu()) return;
    const selectInteraction = interaction as AnySelectMenuInteraction;

    const categoryId = selectInteraction.values[0];
    if (!categoryId) return;

    const category = await client.categoryRepo.findById(categoryId);

    if (!category || !category.isActive || category.guildId !== selectInteraction.guildId) {
      throw new TicketError('Cette catégorie n\'existe plus ou n\'appartient pas à ce serveur.');
    }

    const questions = await client.questionRepo.listByCategory(categoryId);

    if (questions.length > 0) {
      const modal = ModalHelper.createQuestionsModal(category.id, category.name, questions);
      await selectInteraction.showModal(modal);
      return;
    }

    // Aucun formulaire requis : création immédiate
    await selectInteraction.deferReply({ ephemeral: true });

    if (!selectInteraction.guild) {
      throw new TicketError('Cette interaction doit être effectuée au sein d\'un serveur.');
    }

    const { thread } = await client.tickets.createTicket({
      guild: selectInteraction.guild,
      user: selectInteraction.user,
      categoryId: category.id,
    });

    await selectInteraction.editReply({
      content: `✅ Votre ticket a été créé avec succès : <#${thread.id}>`,
    });
  }
}
