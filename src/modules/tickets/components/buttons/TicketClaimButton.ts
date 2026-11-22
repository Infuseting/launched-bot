import { ButtonInteraction, GuildMember } from 'discord.js';
import { BaseComponent, type ComponentInteraction } from '../../../../structures/BaseComponent.js';
import type { BotClient } from '../../../../client/BotClient.js';
import { TicketError, TicketNotFoundError } from '../../domain/TicketErrors.js';

export class TicketClaimButton extends BaseComponent {
  public readonly customId = 'ticket:claim:';
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

    const member =
      btnInteraction.member instanceof GuildMember
        ? btnInteraction.member
        : await btnInteraction.guild.members.fetch(btnInteraction.user.id).catch(() => null);
    const guildConfig = await client.guildRepo.findByGuildId(btnInteraction.guildId);

    if (!member || !client.ticketPermissions.isStaff(member, guildConfig, ticket.category)) {
      throw new TicketError('Seul un membre de l\'équipe de support peut prendre en charge ce ticket.');
    }

    await btnInteraction.deferReply({ ephemeral: true });

    await client.tickets.claimTicket(ticket, btnInteraction.user);

    await btnInteraction.editReply({
      content: '✅ Vous avez pris en charge ce ticket avec succès.',
    });
  }
}
