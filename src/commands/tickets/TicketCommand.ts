import {
  ActionRowBuilder,
  AttachmentBuilder,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ThreadChannel,
} from 'discord.js';
import { BaseCommand } from '../../structures/BaseCommand.js';
import type { BotClient } from '../../client/BotClient.js';
import { TicketError, TicketNotFoundError } from '../../modules/tickets/domain/TicketErrors.js';
import type { TicketWithRelations } from '../../modules/tickets/repositories/ITicketRepository.js';
import type { TicketPriority } from '@prisma/client';
import { ModalHelper } from '../../modules/tickets/components/ModalHelper.js';
import { AppEmbed } from '../../utils/embeds.js';

export default class TicketCommand extends BaseCommand {
  public readonly data = new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Commandes utilisateur et gestion opérationnelle des tickets.')
    .addSubcommand((sub) =>
      sub
        .setName('new')
        .setDescription('Ouvrir un nouveau ticket d\'assistance.')
        .addStringOption((opt) =>
          opt
            .setName('category')
            .setDescription('Catégorie de support souhaitée')
            .setAutocomplete(true)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Fermer le ticket actuel.')
        .addStringOption((opt) =>
          opt
            .setName('reason')
            .setDescription('Motif de la clôture (optionnel)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('claim')
        .setDescription('Prendre en charge le ticket actuel (Équipe support).')
    )
    .addSubcommand((sub) =>
      sub
        .setName('release')
        .setDescription('Libérer la prise en charge du ticket actuel (Équipe support).')
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Ajouter un utilisateur au ticket.')
        .addUserOption((opt) =>
          opt
            .setName('user')
            .setDescription('Utilisateur à ajouter dans le fil privé')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Retirer un utilisateur du ticket.')
        .addUserOption((opt) =>
          opt
            .setName('user')
            .setDescription('Utilisateur à retirer du fil privé')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('transcript')
        .setDescription('Générer et exporter le transcript Markdown du ticket actuel.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('rename')
        .setDescription('Renommer le salon du ticket (Équipe support).')
        .addStringOption((opt) =>
          opt
            .setName('name')
            .setDescription('Nouveau nom pour le fil')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('topic')
        .setDescription('Définir ou modifier le sujet du ticket (Équipe support).')
        .addStringOption((opt) =>
          opt
            .setName('topic')
            .setDescription('Description du problème ou de la demande')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('priority')
        .setDescription('Définir le niveau de priorité du ticket (Équipe support).')
        .addStringOption((opt) =>
          opt
            .setName('priority')
            .setDescription('Niveau de priorité')
            .setRequired(true)
            .addChoices(
              { name: '🟢 Basse (LOW)', value: 'LOW' },
              { name: '🔵 Normale (NORMAL)', value: 'NORMAL' },
              { name: '🟠 Haute (HIGH)', value: 'HIGH' },
              { name: '🔴 Urgente (URGENT)', value: 'URGENT' }
            )
        )
    );

  public constructor() {
    super({
      category: 'Tickets',
      guildOnly: true,
      cooldown: 2,
    });
  }

  public override async autocomplete(
    interaction: AutocompleteInteraction,
    client: BotClient
  ): Promise<void> {
    if (!interaction.guildId) {
      await interaction.respond([]);
      return;
    }

    const focused = interaction.options.getFocused(true);

    if (focused.name === 'category') {
      const categories = await client.categoryRepo.listByGuild(interaction.guildId, true);
      const filtered = categories.filter((c) =>
        c.name.toLowerCase().includes(focused.value.toLowerCase())
      );

      await interaction.respond(
        filtered.slice(0, 25).map((c) => ({
          name: (c.emoji ? `${c.emoji} ` : '') + c.name,
          value: c.id,
        }))
      );
    }
  }

  public async execute(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'new':
        await this.handleNew(interaction, client);
        break;
      case 'close':
        await this.handleClose(interaction, client);
        break;
      case 'claim':
        await this.handleClaim(interaction, client);
        break;
      case 'release':
        await this.handleRelease(interaction, client);
        break;
      case 'add':
        await this.handleAdd(interaction, client);
        break;
      case 'remove':
        await this.handleRemove(interaction, client);
        break;
      case 'transcript':
        await this.handleTranscript(interaction, client);
        break;
      case 'rename':
        await this.handleRename(interaction, client);
        break;
      case 'topic':
        await this.handleTopic(interaction, client);
        break;
      case 'priority':
        await this.handlePriority(interaction, client);
        break;
      default:
        throw new TicketError(`Sous-commande inconnue : ${subcommand}`);
    }
  }

  private async getTicketContext(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<{ ticket: TicketWithRelations; member: GuildMember }> {
    if (!interaction.channel || !interaction.channel.isThread()) {
      throw new TicketError('Cette commande doit être exécutée à l\'intérieur d\'un fil de ticket actif.');
    }

    const ticket = await client.tickets.getTicketByThreadId(interaction.channelId);
    if (!ticket) {
      throw new TicketError('Aucun ticket actif n\'est associé à ce fil de discussion.');
    }

    if (ticket.guildId !== interaction.guildId) {
      throw new TicketError('Ce ticket n\'appartient pas à ce serveur.');
    }

    const member = (interaction.member as GuildMember) ||
      (await interaction.guild!.members.fetch(interaction.user.id));

    return { ticket, member };
  }

  private async handleNew(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const guild = interaction.guild!;
    const categoryId = interaction.options.getString('category');

    if (categoryId) {
      const category = await client.categoryRepo.findById(categoryId);
      if (!category || !category.isActive || category.guildId !== guild.id) {
        throw new TicketError('La catégorie sélectionnée n\'existe plus ou est inactive.');
      }

      const questions = await client.questionRepo.listByCategory(category.id);
      if (questions.length > 0) {
        const modal = ModalHelper.createQuestionsModal(category.id, category.name, questions);
        await interaction.showModal(modal);
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const { thread } = await client.tickets.createTicket({
        guild,
        user: interaction.user,
        categoryId: category.id,
      });

      await interaction.editReply({
        content: `✅ Votre ticket a été créé avec succès : <#${thread.id}>`,
      });
      return;
    }

    // Aucune catégorie spécifiée : affichage du menu déroulant interactif
    const categories = await client.categoryRepo.listByGuild(guild.id, true);
    if (categories.length === 0) {
      throw new TicketError('Aucune catégorie de support active n\'est actuellement disponible.');
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket:select_category')
      .setPlaceholder('👉 Sélectionnez une catégorie de ticket...')
      .setMinValues(1)
      .setMaxValues(1);

    for (const cat of categories.slice(0, 25)) {
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(cat.name.slice(0, 100))
        .setValue(cat.id)
        .setDescription((cat.description || 'Ouvrir un ticket dans cette catégorie').slice(0, 100));

      if (cat.emoji) option.setEmoji(cat.emoji);
      selectMenu.addOptions(option);
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({
      content: 'Veuillez choisir la catégorie correspondant à votre demande :',
      components: [row],
      ephemeral: true,
    });
  }

  private async handleClose(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const { ticket, member } = await this.getTicketContext(interaction, client);
    const guildConfig = await client.guildRepo.findByGuildId(interaction.guildId!);

    const isCreator = ticket.creatorId === interaction.user.id;
    const isStaff = client.ticketPermissions.isStaff(member, guildConfig, ticket.category);

    if (!isCreator && !isStaff) {
      throw new TicketError('Vous n\'avez pas l\'autorisation de fermer ce ticket.');
    }

    const reason = interaction.options.getString('reason') || 'Aucun motif renseigné';

    await interaction.deferReply({ ephemeral: true });
    await client.tickets.closeTicket({
      ticket,
      closedBy: interaction.user,
      reason,
    });

    await interaction.editReply({
      content: '✅ Le ticket a été clôturé avec succès.',
    });
  }

  private async handleClaim(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const { ticket, member } = await this.getTicketContext(interaction, client);
    const guildConfig = await client.guildRepo.findByGuildId(interaction.guildId!);

    if (!client.ticketPermissions.isStaff(member, guildConfig, ticket.category)) {
      throw new TicketError('Seul un membre de l\'équipe de support peut prendre en charge ce ticket.');
    }

    await interaction.deferReply({ ephemeral: true });
    await client.tickets.claimTicket(ticket, interaction.user);
    await interaction.editReply({
      content: '✅ Vous avez pris en charge ce ticket.',
    });
  }

  private async handleRelease(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const { ticket, member } = await this.getTicketContext(interaction, client);
    const guildConfig = await client.guildRepo.findByGuildId(interaction.guildId!);

    if (!client.ticketPermissions.isStaff(member, guildConfig, ticket.category)) {
      throw new TicketError('Seul un membre de l\'équipe de support peut libérer ce ticket.');
    }

    await interaction.deferReply({ ephemeral: true });
    await client.tickets.releaseTicket(ticket, interaction.user);
    await interaction.editReply({
      content: '✅ La prise en charge du ticket a été libérée.',
    });
  }

  private async handleAdd(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const { ticket, member } = await this.getTicketContext(interaction, client);
    const guildConfig = await client.guildRepo.findByGuildId(interaction.guildId!);

    const isCreator = ticket.creatorId === interaction.user.id;
    const isStaff = client.ticketPermissions.isStaff(member, guildConfig, ticket.category);

    if (!isCreator && !isStaff) {
      throw new TicketError('Vous n\'avez pas l\'autorisation d\'ajouter des membres à ce ticket.');
    }

    const targetUser = interaction.options.getUser('user', true);
    await interaction.deferReply({ ephemeral: true });

    await client.tickets.addParticipant(ticket, targetUser, interaction.user);
    await interaction.editReply({
      content: `✅ <@${targetUser.id}> a été ajouté au ticket avec succès.`,
    });
  }

  private async handleRemove(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const { ticket, member } = await this.getTicketContext(interaction, client);
    const guildConfig = await client.guildRepo.findByGuildId(interaction.guildId!);

    const isCreator = ticket.creatorId === interaction.user.id;
    const isStaff = client.ticketPermissions.isStaff(member, guildConfig, ticket.category);

    if (!isCreator && !isStaff) {
      throw new TicketError('Vous n\'avez pas l\'autorisation de retirer des membres de ce ticket.');
    }

    const targetUser = interaction.options.getUser('user', true);

    if (targetUser.id === ticket.creatorId) {
      throw new TicketError('Le créateur du ticket ne peut pas être retiré du salon.');
    }

    if (targetUser.id === client.user?.id) {
      throw new TicketError('Le bot ne peut pas être retiré du ticket.');
    }

    if (targetUser.id === ticket.claimedById) {
      throw new TicketError('Le membre du support ayant pris en charge le ticket ne peut pas être retiré.');
    }

    if (!isStaff) {
      const targetMember = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);
      if (targetMember && client.ticketPermissions.isStaff(targetMember, guildConfig, ticket.category)) {
        throw new TicketError('Vous ne pouvez pas retirer un membre de l\'équipe de support.');
      }
    }

    await interaction.deferReply({ ephemeral: true });
    await client.tickets.removeParticipant(ticket, targetUser, interaction.user);
    await interaction.editReply({
      content: `✅ <@${targetUser.id}> a été retiré du ticket avec succès.`,
    });
  }

  private async handleTranscript(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const { ticket, member } = await this.getTicketContext(interaction, client);
    const guildConfig = await client.guildRepo.findByGuildId(interaction.guildId!);

    const isCreator = ticket.creatorId === interaction.user.id;
    const isStaff = client.ticketPermissions.isStaff(member, guildConfig, ticket.category);

    if (!isCreator && !isStaff) {
      throw new TicketError('Vous n\'avez pas l\'autorisation d\'exporter le transcript de ce ticket.');
    }

    await interaction.deferReply({ ephemeral: true });
    const thread = interaction.channel as ThreadChannel;

    const buffer = await client.transcriptService.generateMarkdown(ticket, thread);
    const attachment = new AttachmentBuilder(buffer, {
      name: `transcript-ticket-${String(ticket.number).padStart(4, '0')}.md`,
    });

    await interaction.editReply({
      content: '📄 Voici le transcript Markdown complet de ce ticket :',
      files: [attachment],
    });
  }

  private async handleRename(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const { ticket, member } = await this.getTicketContext(interaction, client);
    const guildConfig = await client.guildRepo.findByGuildId(interaction.guildId!);

    if (!client.ticketPermissions.isStaff(member, guildConfig, ticket.category)) {
      throw new TicketError('Seul un membre du support peut renommer ce ticket.');
    }

    const newName = interaction.options.getString('name', true);
    await interaction.deferReply({ ephemeral: true });

    await client.tickets.renameTicket(ticket, newName, interaction.user);
    await interaction.editReply({
      content: `✅ Le ticket a été renommé en **\`${newName}\`**.`,
    });
  }

  private async handleTopic(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const { ticket, member } = await this.getTicketContext(interaction, client);
    const guildConfig = await client.guildRepo.findByGuildId(interaction.guildId!);

    if (!client.ticketPermissions.isStaff(member, guildConfig, ticket.category)) {
      throw new TicketError('Seul un membre du support peut modifier le sujet de ce ticket.');
    }

    const topic = interaction.options.getString('topic', true);
    await interaction.deferReply({ ephemeral: true });

    await client.tickets.setTopic(ticket, topic, interaction.user);
    await interaction.editReply({
      content: '✅ Le sujet du ticket a été mis à jour.',
    });
  }

  private async handlePriority(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const { ticket, member } = await this.getTicketContext(interaction, client);
    const guildConfig = await client.guildRepo.findByGuildId(interaction.guildId!);

    if (!client.ticketPermissions.isStaff(member, guildConfig, ticket.category)) {
      throw new TicketError('Seul un membre du support peut modifier la priorité de ce ticket.');
    }

    const priority = interaction.options.getString('priority', true) as TicketPriority;
    await interaction.deferReply({ ephemeral: true });

    await client.tickets.setPriority(ticket, priority, interaction.user);
    await interaction.editReply({
      content: `✅ La priorité du ticket a été définie sur **\`${priority}\`**.`,
    });
  }
}
