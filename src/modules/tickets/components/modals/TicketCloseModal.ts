import { GuildMember, ModalSubmitInteraction } from 'discord.js';
import { BaseComponent, type ComponentInteraction } from '../../../../structures/BaseComponent.js';
import type { BotClient } from '../../../../client/BotClient.js';
import { TicketError, TicketNotFoundError } from '../../domain/TicketErrors.js';

export class TicketCloseModal extends BaseComponent {
  public readonly customId = 'ticket:modal_close:';
  public readonly type = 'MODAL';

  public async execute(interaction: ComponentInteraction, client: BotClient): Promise<void> {
    if (!interaction.isModalSubmit()) return;
    const modalInteraction = interaction as ModalSubmitInteraction;

    if (!modalInteraction.guild || !modalInteraction.guildId) {
      throw new TicketError('Cette interaction doit être effectuée au sein d\'un serveur.');
    }

    const ticketId = modalInteraction.customId.replace(this.customId, '');
    const ticket = await client.tickets.getTicketById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError(ticketId);
    }

    if (ticket.guildId !== modalInteraction.guildId) {
      throw new TicketError('Ce ticket n\'appartient pas à ce serveur.');
    }

    if (ticket.status === 'CLOSED' || ticket.status === 'ARCHIVED') {
      throw new TicketError('Ce ticket est déjà clôturé.');
    }

    const member =
      modalInteraction.member instanceof GuildMember
        ? modalInteraction.member
        : await modalInteraction.guild.members.fetch(modalInteraction.user.id).catch(() => null);
    const guildConfig = await client.guildRepo.findByGuildId(modalInteraction.guildId);

    const isCreator = ticket.creatorId === modalInteraction.user.id;
    const isStaff = member ? client.ticketPermissions.isStaff(member, guildConfig, ticket.category) : false;

    if (!isCreator && !isStaff) {
      throw new TicketError('Vous n\'avez pas l\'autorisation de fermer ce ticket.');
    }

    let reason = 'Aucun motif renseigné';
    try {
      const inputReason = modalInteraction.fields.getTextInputValue('close_reason');
      if (inputReason && inputReason.trim().length > 0) {
        reason = inputReason.trim();
      }
    } catch {
      // Champ non présent
    }

    await modalInteraction.deferReply({ ephemeral: true });

    await client.tickets.closeTicket({
      ticket,
      closedBy: modalInteraction.user,
      reason,
    });

    await modalInteraction.editReply({
      content: '✅ Le ticket a été clôturé avec succès.',
    });
  }
}
