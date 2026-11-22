import {
  ActionRowBuilder,
  ButtonInteraction,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { BaseComponent, type ComponentInteraction } from '../../../../structures/BaseComponent.js';
import type { BotClient } from '../../../../client/BotClient.js';
import { TicketError, TicketNotFoundError } from '../../domain/TicketErrors.js';

export class TicketClosePromptButton extends BaseComponent {
  public readonly customId = 'ticket:close_prompt:';
  public readonly type = 'BUTTON';

  public async execute(interaction: ComponentInteraction, client: BotClient): Promise<void> {
    if (!interaction.isButton()) return;
    const btnInteraction = interaction as ButtonInteraction;

    if (!btnInteraction.guild || !btnInteraction.guildId) {
      throw new TicketError('Cette interaction doit être effectuée au sein d\'un serveur.');
    }

    const ticketId = btnInteraction.customId.replace(this.customId, '');
    const ticket = await client.tickets.getTicketById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError(ticketId);
    }

    if (ticket.guildId !== btnInteraction.guildId) {
      throw new TicketError('Ce ticket n\'appartient pas à ce serveur.');
    }

    if (ticket.status === 'CLOSED' || ticket.status === 'ARCHIVED') {
      throw new TicketError('Ce ticket est déjà clôturé.');
    }

    const member =
      btnInteraction.member instanceof GuildMember
        ? btnInteraction.member
        : await btnInteraction.guild.members.fetch(btnInteraction.user.id).catch(() => null);
    const guildConfig = await client.guildRepo.findByGuildId(btnInteraction.guildId);

    const isCreator = ticket.creatorId === btnInteraction.user.id;
    const isStaff = member ? client.ticketPermissions.isStaff(member, guildConfig, ticket.category) : false;

    if (!isCreator && !isStaff) {
      throw new TicketError('Vous n\'avez pas l\'autorisation de fermer ce ticket.');
    }

    const modal = new ModalBuilder()
      .setCustomId(`ticket:modal_close:${ticket.id}`)
      .setTitle('Fermeture du ticket');

    const reasonInput = new TextInputBuilder()
      .setCustomId('close_reason')
      .setLabel('Motif de fermeture')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Précisez la raison de la clôture (optionnel)...')
      .setRequired(false)
      .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));

    await btnInteraction.showModal(modal);
  }
}
