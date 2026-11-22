import {
  AutocompleteInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { BaseCommand } from '../../structures/BaseCommand.js';
import type { BotClient } from '../../client/BotClient.js';
import { TicketError } from '../../modules/tickets/domain/TicketErrors.js';
import { AppEmbed } from '../../utils/embeds.js';
import type { PanelTypeOption } from '../../modules/tickets/domain/TicketTypes.js';
import type { QuestionStyle } from '@prisma/client';

export default class TicketAdminCommand extends BaseCommand {
  public readonly data = new SlashCommandBuilder()
    .setName('ticket-admin')
    .setDescription('Administration et configuration complète du système de tickets.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Initialiser ou réinitialiser la configuration des tickets du serveur.')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Salon d\'accueil où seront générés les fils privés des tickets')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName('support-role')
            .setDescription('Rôle support par défaut ayant accès à tous les tickets')
            .setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName('admin-role')
            .setDescription('Rôle autorisé à administrer les tickets et catégories')
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName('logs-channel')
            .setDescription('Salon dédié aux transcripts et logs des tickets')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('max-open-tickets')
            .setDescription('Nombre maximal de tickets ouverts simultanément par utilisateur (défaut: 1)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Déployer un panneau interactif de création de tickets.')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Salon où envoyer le message du panneau')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('title')
            .setDescription('Titre affiché sur l\'embed du panneau')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('description')
            .setDescription('Texte explicatif du panneau')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Format d\'affichage des catégories (Boutons ou Menu déroulant)')
            .setRequired(false)
            .addChoices(
              { name: '📋 Menu déroulant (Select Menu)', value: 'SELECT_MENU' },
              { name: '🔘 Boutons', value: 'BUTTON' }
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('category')
        .setDescription('Gestion des catégories de tickets.')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Créer une nouvelle catégorie de ticket.')
            .addStringOption((opt) =>
              opt
                .setName('name')
                .setDescription('Nom de la catégorie (ex: Support Général, Recrutement)')
                .setRequired(true)
            )
            .addStringOption((opt) =>
              opt
                .setName('prefix')
                .setDescription('Préfixe des salons/fils (ex: tech, bug, vip)')
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName('description')
                .setDescription('Description courte pour le menu déroulant')
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName('emoji')
                .setDescription('Emoji pour le bouton ou le menu')
                .setRequired(false)
            )
            .addRoleOption((opt) =>
              opt
                .setName('support-role')
                .setDescription('Rôle support spécifique à cette catégorie')
                .setRequired(false)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('list')
            .setDescription('Lister l\'ensemble des catégories configurées sur ce serveur.')
        )
        .addSubcommand((sub) =>
          sub
            .setName('edit')
            .setDescription('Modifier les paramètres d\'une catégorie existante.')
            .addStringOption((opt) =>
              opt
                .setName('category')
                .setDescription('Catégorie à modifier')
                .setAutocomplete(true)
                .setRequired(true)
            )
            .addStringOption((opt) =>
              opt.setName('name').setDescription('Nouveau nom').setRequired(false)
            )
            .addStringOption((opt) =>
              opt.setName('prefix').setDescription('Nouveau préfixe').setRequired(false)
            )
            .addStringOption((opt) =>
              opt.setName('description').setDescription('Nouvelle description').setRequired(false)
            )
            .addStringOption((opt) =>
              opt.setName('emoji').setDescription('Nouvel emoji').setRequired(false)
            )
            .addRoleOption((opt) =>
              opt.setName('support-role').setDescription('Nouveau rôle support dédié').setRequired(false)
            )
            .addBooleanOption((opt) =>
              opt.setName('active').setDescription('Activer ou désactiver cette catégorie').setRequired(false)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('delete')
            .setDescription('Supprimer une catégorie et ses questions associées.')
            .addStringOption((opt) =>
              opt
                .setName('category')
                .setDescription('Catégorie à supprimer')
                .setAutocomplete(true)
                .setRequired(true)
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('question')
        .setDescription('Gestion des formulaires modaux associés aux catégories.')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Ajouter une question modale à une catégorie (max 5).')
            .addStringOption((opt) =>
              opt
                .setName('category')
                .setDescription('Catégorie de ticket concernée')
                .setAutocomplete(true)
                .setRequired(true)
            )
            .addStringOption((opt) =>
              opt
                .setName('label')
                .setDescription('Intitulé de la question (max 45 caractères)')
                .setRequired(true)
            )
            .addStringOption((opt) =>
              opt
                .setName('style')
                .setDescription('Format de réponse attendu')
                .setRequired(true)
                .addChoices(
                  { name: 'Texte court (1 ligne)', value: 'SHORT' },
                  { name: 'Paragraphe (plusieurs lignes)', value: 'PARAGRAPH' }
                )
            )
            .addBooleanOption((opt) =>
              opt
                .setName('required')
                .setDescription('La réponse à cette question est-elle obligatoire ?')
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName('placeholder')
                .setDescription('Texte d\'exemple affiché dans le champ')
                .setRequired(false)
            )
            .addIntegerOption((opt) =>
              opt
                .setName('order')
                .setDescription('Ordre d\'apparition (1 à 5)')
                .setMinValue(1)
                .setMaxValue(5)
                .setRequired(false)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('list')
            .setDescription('Lister les questions configurées pour une catégorie.')
            .addStringOption((opt) =>
              opt
                .setName('category')
                .setDescription('Catégorie de ticket')
                .setAutocomplete(true)
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('delete')
            .setDescription('Supprimer une question modale via son identifiant.')
            .addStringOption((opt) =>
              opt
                .setName('question-id')
                .setDescription('Identifiant de la question (visible via /ticket-admin question list)')
                .setRequired(true)
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('settings')
        .setDescription('Paramètres avancés des tickets.')
        .addSubcommand((sub) =>
          sub
            .setName('view')
            .setDescription('Afficher la configuration actuelle du serveur.')
        )
        .addSubcommand((sub) =>
          sub
            .setName('update')
            .setDescription('Mettre à jour un ou plusieurs paramètres des tickets.')
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Nouveau salon d\'accueil des tickets')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
            )
            .addRoleOption((opt) =>
              opt
                .setName('support-role')
                .setDescription('Nouveau rôle support par défaut')
                .setRequired(false)
            )
            .addRoleOption((opt) =>
              opt
                .setName('admin-role')
                .setDescription('Nouveau rôle administrateur')
                .setRequired(false)
            )
            .addChannelOption((opt) =>
              opt
                .setName('logs-channel')
                .setDescription('Nouveau salon de logs & transcripts')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
            )
            .addIntegerOption((opt) =>
              opt
                .setName('max-open-tickets')
                .setDescription('Nombre max de tickets par utilisateur')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)
            )
            .addBooleanOption((opt) =>
              opt
                .setName('transcripts-dm')
                .setDescription('Envoyer une copie du transcript en message privé à l\'auteur ?')
                .setRequired(false)
            )
        )
    );

  public constructor() {
    super({
      category: 'Administration',
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
      const categories = await client.categoryRepo.listByGuild(interaction.guildId, false);
      const filtered = categories.filter((c) =>
        c.name.toLowerCase().includes(focused.value.toLowerCase())
      );

      await interaction.respond(
        filtered.slice(0, 25).map((c) => ({
          name: `${c.emoji ? c.emoji + ' ' : ''}${c.name}${c.isActive ? '' : ' [Désactivée]'}`,
          value: c.id,
        }))
      );
    }
  }

  public async execute(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    const guildId = interaction.guildId!;
    const member = (interaction.member as GuildMember) ||
      (await interaction.guild!.members.fetch(interaction.user.id));

    const guildConfig = await client.guildRepo.findByGuildId(guildId);

    if (!client.ticketPermissions.isAdmin(member, guildConfig)) {
      throw new TicketError(
        'Vous devez disposer des permissions administrateur (Gérer le serveur ou rôle admin configuré) pour utiliser cette commande.'
      );
    }

    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (group === 'category') {
      await this.handleCategoryGroup(interaction, client, subcommand);
    } else if (group === 'question') {
      await this.handleQuestionGroup(interaction, client, subcommand);
    } else if (group === 'settings') {
      await this.handleSettingsGroup(interaction, client, subcommand);
    } else if (subcommand === 'setup') {
      await this.handleSetup(interaction, client);
    } else if (subcommand === 'panel') {
      await this.handlePanel(interaction, client);
    } else {
      throw new TicketError(`Action non reconnue : ${subcommand}`);
    }
  }

  // ==========================================
  // SETUP
  // ==========================================
  private async handleSetup(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId!;
    const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText]);
    const supportRole = interaction.options.getRole('support-role');
    const adminRole = interaction.options.getRole('admin-role');
    const logsChannel = interaction.options.getChannel('logs-channel', false, [ChannelType.GuildText]);
    const maxOpenTickets = interaction.options.getInteger('max-open-tickets') ?? 1;

    const config = await client.guildRepo.upsertConfig({
      guildId,
      ticketChannelId: channel.id,
      supportRoleId: supportRole?.id,
      adminRoleId: adminRole?.id,
      logChannelId: logsChannel?.id,
      maxOpenTicketsPerUser: maxOpenTickets,
    });

    const embed = new AppEmbed()
      .setTitle('⚙️ Configuration des Tickets Initialisée')
      .setDescription(
        `Le système de tickets a été configuré avec succès pour le serveur **${interaction.guild!.name}**.`
      )
      .addFields(
        { name: '📂 Salon d\'accueil des fils', value: `<#${config.ticketChannelId}>`, inline: true },
        { name: '🛡️ Rôle Support', value: config.supportRoleId ? `<@&${config.supportRoleId}>` : '*Non défini*', inline: true },
        { name: '👑 Rôle Admin Tickets', value: config.adminRoleId ? `<@&${config.adminRoleId}>` : '*Non défini*', inline: true },
        { name: '📜 Salon de logs / transcripts', value: config.logChannelId ? `<#${config.logChannelId}>` : '*Non défini*', inline: true },
        { name: '🔢 Quota par utilisateur', value: `\`${config.maxOpenTicketsPerUser}\` ticket(s) ouvert(s) max`, inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  }

  // ==========================================
  // PANEL
  // ==========================================
  private async handlePanel(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText]) as TextChannel;
    const title = interaction.options.getString('title') || undefined;
    const description = interaction.options.getString('description') || undefined;
    const type = (interaction.options.getString('type') as PanelTypeOption) || 'SELECT_MENU';

    await client.ticketPanels.deployPanel({
      channel,
      title,
      description,
      type,
    });

    await interaction.editReply({
      content: `✅ Panneau de tickets déployé avec succès dans le salon <#${channel.id}>.`,
    });
  }

  // ==========================================
  // CATEGORY GROUP
  // ==========================================
  private async handleCategoryGroup(
    interaction: ChatInputCommandInteraction,
    client: BotClient,
    subcommand: string
  ): Promise<void> {
    const guildId = interaction.guildId!;

    if (subcommand === 'add') {
      await interaction.deferReply({ ephemeral: true });
      const name = interaction.options.getString('name', true);
      const prefix = interaction.options.getString('prefix') || 'ticket';
      const description = interaction.options.getString('description') || null;
      const emoji = interaction.options.getString('emoji') || null;
      const supportRole = interaction.options.getRole('support-role');

      const category = await client.categoryRepo.create({
        guildId,
        name,
        ticketPrefix: prefix,
        description,
        emoji,
        supportRoleId: supportRole?.id || null,
        isActive: true,
      });

      const embed = new AppEmbed()
        .setTitle('✅ Catégorie créée')
        .setDescription(`La catégorie **${category.name}** a été créée avec succès.`)
        .addFields(
          { name: 'Identifiant', value: `\`${category.id}\``, inline: true },
          { name: 'Préfixe', value: `\`${category.ticketPrefix}\``, inline: true },
          { name: 'Rôle dédié', value: category.supportRoleId ? `<@&${category.supportRoleId}>` : '*Hérité du serveur*', inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'list') {
      await interaction.deferReply({ ephemeral: true });
      const categories = await client.categoryRepo.listByGuild(guildId, false);

      if (categories.length === 0) {
        await interaction.editReply({
          content: 'ℹ️ Aucune catégorie n\'est encore configurée sur ce serveur.',
        });
        return;
      }

      const embed = new AppEmbed()
        .setTitle(`📂 Catégories de Tickets (${categories.length})`)
        .setDescription('Voici la liste des catégories configurées pour ce serveur :');

      for (const cat of categories) {
        const questionsCount = await client.questionRepo.countByCategory(cat.id);
        const status = cat.isActive ? '🟢 Actif' : '🔴 Inactif';
        const role = cat.supportRoleId ? `<@&${cat.supportRoleId}>` : '*Rôle global*';

        embed.addFields({
          name: `${cat.emoji ? cat.emoji + ' ' : ''}${cat.name} (${status})`,
          value: `• **ID :** \`${cat.id}\`\n• **Préfixe :** \`${cat.ticketPrefix}\`\n• **Rôle support :** ${role}\n• **Questions :** \`${questionsCount}/5\``,
          inline: true,
        });
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'edit') {
      await interaction.deferReply({ ephemeral: true });
      const categoryId = interaction.options.getString('category', true);
      const category = await client.categoryRepo.findById(categoryId);

      if (!category || category.guildId !== guildId) {
        throw new TicketError('Catégorie introuvable sur ce serveur.');
      }

      const name = interaction.options.getString('name') ?? undefined;
      const prefix = interaction.options.getString('prefix') ?? undefined;
      const description = interaction.options.getString('description') ?? undefined;
      const emoji = interaction.options.getString('emoji') ?? undefined;
      const supportRole = interaction.options.getRole('support-role');
      const active = interaction.options.getBoolean('active') ?? undefined;

      const updated = await client.categoryRepo.update(categoryId, {
        name,
        ticketPrefix: prefix,
        description,
        emoji,
        supportRoleId: supportRole !== null ? supportRole.id : undefined,
        isActive: active,
      });

      await interaction.editReply({
        content: `✅ La catégorie **${updated.name}** a été mise à jour avec succès.`,
      });
      return;
    }

    if (subcommand === 'delete') {
      await interaction.deferReply({ ephemeral: true });
      const categoryId = interaction.options.getString('category', true);
      const category = await client.categoryRepo.findById(categoryId);

      if (!category || category.guildId !== guildId) {
        throw new TicketError('Catégorie introuvable sur ce serveur.');
      }

      const ticketsCount = await client.prisma.ticket.count({ where: { categoryId } });
      if (ticketsCount > 0) {
        throw new TicketError(
          `Impossible de supprimer cette catégorie car ${ticketsCount} ticket(s) y sont rattaché(s). Désactivez-la plutôt avec \`/ticket-admin category edit category:${categoryId} active:false\` pour préserver l'historique.`
        );
      }

      await client.categoryRepo.delete(categoryId);
      await interaction.editReply({
        content: `🗑️ La catégorie **${category.name}** ainsi que ses formulaires ont été supprimés.`,
      });
      return;
    }
  }

  // ==========================================
  // QUESTION GROUP
  // ==========================================
  private async handleQuestionGroup(
    interaction: ChatInputCommandInteraction,
    client: BotClient,
    subcommand: string
  ): Promise<void> {
    const guildId = interaction.guildId!;

    if (subcommand === 'add') {
      await interaction.deferReply({ ephemeral: true });
      const categoryId = interaction.options.getString('category', true);
      const category = await client.categoryRepo.findById(categoryId);

      if (!category || category.guildId !== guildId) {
        throw new TicketError('Catégorie introuvable sur ce serveur.');
      }

      const count = await client.questionRepo.countByCategory(categoryId);
      if (count >= 5) {
        throw new TicketError(
          'Cette catégorie a déjà atteint le plafond de 5 questions (limitation stricte imposée par Discord).'
        );
      }

      const label = interaction.options.getString('label', true);
      const style = interaction.options.getString('style', true) as QuestionStyle;
      const required = interaction.options.getBoolean('required') ?? true;
      const placeholder = interaction.options.getString('placeholder') || null;
      const order = interaction.options.getInteger('order') ?? count + 1;

      const question = await client.questionRepo.create({
        categoryId,
        label,
        style,
        required,
        placeholder,
        order,
      });

      await interaction.editReply({
        content: `✅ Question modale créée avec succès pour **${category.name}** (ID: \`${question.id}\`, Ordre: \`${question.order}\`).`,
      });
      return;
    }

    if (subcommand === 'list') {
      await interaction.deferReply({ ephemeral: true });
      const categoryId = interaction.options.getString('category', true);
      const category = await client.categoryRepo.findById(categoryId);

      if (!category || category.guildId !== guildId) {
        throw new TicketError('Catégorie introuvable sur ce serveur.');
      }

      const questions = await client.questionRepo.listByCategory(categoryId);

      if (questions.length === 0) {
        await interaction.editReply({
          content: `ℹ️ Aucun formulaire modal n'est configuré pour la catégorie **${category.name}**.`,
        });
        return;
      }

      const embed = new AppEmbed()
        .setTitle(`📝 Formulaire Modal - ${category.name}`)
        .setDescription(`Questions posées lors de l'ouverture d'un ticket (${questions.length}/5) :`);

      for (const q of questions) {
        embed.addFields({
          name: `#${q.order} : ${q.label}`,
          value: `• **ID :** \`${q.id}\`\n• **Format :** \`${q.style}\`\n• **Obligatoire :** ${q.required ? 'Oui' : 'Non'}\n• **Placeholder :** ${q.placeholder ? `*${q.placeholder}*` : '*Aucun*'}`,
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'delete') {
      await interaction.deferReply({ ephemeral: true });
      const questionId = interaction.options.getString('question-id', true);
      const question = await client.questionRepo.findById(questionId);

      if (!question) {
        throw new TicketError('Question introuvable avec cet identifiant.');
      }

      const category = await client.categoryRepo.findById(question.categoryId);
      if (!category || category.guildId !== guildId) {
        throw new TicketError('Cette question n\'appartient pas à ce serveur.');
      }

      await client.questionRepo.delete(questionId);
      await interaction.editReply({
        content: `🗑️ La question \`${question.label}\` a été supprimée.`,
      });
      return;
    }
  }

  // ==========================================
  // SETTINGS GROUP
  // ==========================================
  private async handleSettingsGroup(
    interaction: ChatInputCommandInteraction,
    client: BotClient,
    subcommand: string
  ): Promise<void> {
    const guildId = interaction.guildId!;

    if (subcommand === 'view') {
      await interaction.deferReply({ ephemeral: true });
      const config = await client.guildRepo.findByGuildId(guildId);

      if (!config) {
        throw new TicketError(
          'Le système de tickets n\'est pas encore configuré sur ce serveur. Utilisez `/ticket-admin setup`.'
        );
      }

      const embed = new AppEmbed()
        .setTitle(`⚙️ Paramètres des Tickets - ${interaction.guild!.name}`)
        .addFields(
          { name: '📂 Salon d\'accueil des fils', value: config.ticketChannelId ? `<#${config.ticketChannelId}>` : '*Non défini*', inline: true },
          { name: '🛡️ Rôle Support par défaut', value: config.supportRoleId ? `<@&${config.supportRoleId}>` : '*Non défini*', inline: true },
          { name: '👑 Rôle Admin Tickets', value: config.adminRoleId ? `<@&${config.adminRoleId}>` : '*Non défini*', inline: true },
          { name: '📜 Salon de logs / transcripts', value: config.logChannelId ? `<#${config.logChannelId}>` : '*Non défini*', inline: true },
          { name: '🔢 Tickets max par utilisateur', value: `\`${config.maxOpenTicketsPerUser}\``, inline: true },
          { name: '📩 Transcripts envoyés en MP', value: config.dmTranscript ? '✅ Oui' : '❌ Non', inline: true },
          { name: '🎫 Compteur total de tickets', value: `\`#${config.ticketCounter}\``, inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'update') {
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.options.getChannel('channel', false, [ChannelType.GuildText]);
      const supportRole = interaction.options.getRole('support-role');
      const adminRole = interaction.options.getRole('admin-role');
      const logsChannel = interaction.options.getChannel('logs-channel', false, [ChannelType.GuildText]);
      const maxOpenTickets = interaction.options.getInteger('max-open-tickets') ?? undefined;
      const transcriptsDm = interaction.options.getBoolean('transcripts-dm') ?? undefined;

      await client.guildRepo.updateSettings(guildId, {
        ticketChannelId: channel?.id,
        supportRoleId: supportRole?.id,
        adminRoleId: adminRole?.id,
        logChannelId: logsChannel?.id,
        maxOpenTicketsPerUser: maxOpenTickets,
        dmTranscript: transcriptsDm,
      });

      await interaction.editReply({
        content: `✅ Configuration mise à jour avec succès pour le serveur **${interaction.guild!.name}**.`,
      });
      return;
    }
  }
}
