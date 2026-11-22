import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type TextChannel,
} from 'discord.js';
import type { ITicketCategoryRepository } from '../repositories/ITicketCategoryRepository.js';
import type { ITicketPanelRepository } from '../repositories/ITicketPanelRepository.js';
import { AppEmbed } from '../../../utils/embeds.js';
import type { PanelTypeOption } from '../domain/TicketTypes.js';

export class TicketPanelService {
  public constructor(
    private readonly categoryRepo: ITicketCategoryRepository,
    private readonly panelRepo: ITicketPanelRepository
  ) {}

  public async deployPanel(params: {
    channel: TextChannel;
    title?: string;
    description?: string;
    type?: PanelTypeOption;
  }) {
    const { channel, title, description, type = 'SELECT_MENU' } = params;
    const categories = await this.categoryRepo.listByGuild(channel.guildId, true);

    if (categories.length === 0) {
      throw new Error(
        'Aucune catégorie active n\'est configurée pour ce serveur. Utilisez `/ticket-admin category` pour en ajouter avant de déployer un panneau.'
      );
    }

    const displayCategories = categories.slice(0, 25);

    const panelEmbed = new AppEmbed()
      .setTitle(title || '🚀 Centre de Support & Assistance')
      .setDescription(
        description ||
          'Besoin d\'aide, d\'assistance technique ou d\'informations ?\nSélectionnez la catégorie appropriée ci-dessous pour ouvrir un ticket auprès de notre équipe.'
      );

    const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

    if (type === 'BUTTON') {
      // Affichage sous forme de boutons (max 5 par rangée, 25 max par message)
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      let currentRow = new ActionRowBuilder<ButtonBuilder>();

      for (let i = 0; i < displayCategories.length; i++) {
        const cat = displayCategories[i]!;
        if (currentRow.components.length === 5) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder<ButtonBuilder>();
        }

        const button = new ButtonBuilder()
          .setCustomId(`ticket:create:${cat.id}`)
          .setLabel(cat.name)
          .setStyle(ButtonStyle.Primary);

        if (cat.emoji) button.setEmoji(cat.emoji);
        currentRow.addComponents(button);
      }

      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }
      components.push(...rows);
    } else {
      // Affichage sous forme de StringSelectMenu (max 25 options)
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket:select_category')
        .setPlaceholder('👉 Choisissez une catégorie de support...')
        .setMinValues(1)
        .setMaxValues(1);

      for (const cat of displayCategories) {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(cat.name.slice(0, 100))
          .setValue(cat.id)
          .setDescription((cat.description || 'Ouvrir un ticket dans cette catégorie').slice(0, 100));

        if (cat.emoji) option.setEmoji(cat.emoji);
        selectMenu.addOptions(option);
      }

      components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
    }

    const message = await channel.send({
      embeds: [panelEmbed],
      components,
    });

    await this.panelRepo.create({
      guildId: channel.guildId,
      channelId: channel.id,
      messageId: message.id,
      title: title || '🚀 Centre de Support & Assistance',
      description: description || 'Sélectionnez une catégorie...',
      type,
    });

    return message;
  }
}
