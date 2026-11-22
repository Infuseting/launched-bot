import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Guild,
  TextChannel,
  ThreadAutoArchiveDuration,
  ThreadChannel,
  User,
} from 'discord.js';
import type { BotClient } from '../../../client/BotClient.js';
import type { ITicketRepository, TicketWithRelations } from '../repositories/ITicketRepository.js';
import type { ITicketGuildRepository } from '../repositories/ITicketGuildRepository.js';
import type { ITicketCategoryRepository } from '../repositories/ITicketCategoryRepository.js';
import type { TranscriptService } from './TranscriptService.js';
import type { AuditLogger } from '../../audit/services/AuditLogger.js';
import type { FormAnswerDTO } from '../domain/TicketTypes.js';
import { AppEmbed } from '../../../utils/embeds.js';
import { Logger } from '../../../utils/logger.js';
import {
  TicketConfigMissingError,
  TicketError,
  TicketLimitReachedError,
  TicketNotFoundError,
} from '../domain/TicketErrors.js';
import type { Ticket, TicketPriority } from '@prisma/client';

export class TicketManager {
  private readonly logger = new Logger('TicketManager');

  public constructor(
    private readonly client: BotClient,
    private readonly ticketRepo: ITicketRepository,
    private readonly guildRepo: ITicketGuildRepository,
    private readonly categoryRepo: ITicketCategoryRepository,
    private readonly transcriptService: TranscriptService,
    private readonly auditLogger: AuditLogger
  ) {}

  public async createTicket(params: {
    guild: Guild;
    user: User;
    categoryId: string;
    formAnswers?: FormAnswerDTO[];
  }): Promise<{ ticket: Ticket; thread: ThreadChannel }> {
    const { guild, user, categoryId, formAnswers = [] } = params;

    // 1. Récupération de la configuration du serveur
    const guildConfig = await this.guildRepo.findByGuildId(guild.id);
    if (!guildConfig || !guildConfig.ticketChannelId) {
      throw new TicketConfigMissingError(guild.name);
    }

    // 2. Récupération et vérification de la catégorie
    const category = await this.categoryRepo.findById(categoryId);
    if (!category || !category.isActive) {
      throw new TicketError('Cette catégorie de ticket n\'existe pas ou a été désactivée.');
    }

    // 3. Vérification du quota de tickets ouverts pour cet utilisateur
    const openTickets = await this.ticketRepo.findOpenByCreator(guild.id, user.id);
    if (openTickets.length >= guildConfig.maxOpenTicketsPerUser) {
      throw new TicketLimitReachedError(openTickets.length, guildConfig.maxOpenTicketsPerUser);
    }

    // 4. Récupération du salon racine où seront hébergés les fils privés
    const parentChannel = await guild.channels.fetch(guildConfig.ticketChannelId).catch(() => null);
    if (!parentChannel || !(parentChannel instanceof TextChannel)) {
      throw new TicketError(
        'Le salon support configuré pour accueillir les tickets est inaccessible ou invalide.'
      );
    }

    // 5. Création du Thread Privé Discord
    const nextNumber = guildConfig.ticketCounter + 1;
    const initialThreadName = `${category.ticketPrefix}-${String(nextNumber).padStart(4, '0')}`;

    const thread = await parentChannel.threads.create({
      name: initialThreadName,
      type: ChannelType.PrivateThread,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      invitable: false,
      reason: `Ticket créé pour ${user.tag} (${user.id})`,
    });

    let ticket: Ticket;
    try {
      // 6. Ajout du créateur du ticket au fil privé
      await thread.members.add(user.id);

      // 7. Enregistrement transactionnel en base de données
      ticket = await this.ticketRepo.createWithIncrement({
        guildId: guild.id,
        categoryId: category.id,
        creatorId: user.id,
        threadId: thread.id,
        priority: 'NORMAL',
        formAnswers,
      });

      // Synchronisation du nom du fil si le compteur atomique diffère
      const actualThreadName = `${category.ticketPrefix}-${String(ticket.number).padStart(4, '0')}`;
      if (thread.name !== actualThreadName) {
        await thread.setName(actualThreadName).catch(() => {});
      }
    } catch (creationError) {
      this.logger.error(
        `Échec lors de l'enregistrement du ticket en BDD. Nettoyage du fil privé Discord ${thread.id} :`,
        creationError
      );
      await thread.delete('Échec de la transaction de création du ticket').catch(() => {});
      throw creationError;
    }

    // 8. Message d'accueil et panneau d'actions dans le fil
    const welcomeEmbed = new AppEmbed()
      .setTitle(`🎫 Ticket #${String(ticket.number).padStart(4, '0')} - ${category.name}`)
      .setDescription(
        `Bonjour <@${user.id}>, bienvenue dans votre ticket d'assistance.\nL'équipe de support prendra en charge votre demande dans les plus brefs délais.`
      )
      .addFields(
        { name: '👤 Demandeur', value: `<@${user.id}>`, inline: true },
        { name: '⚡ Priorité', value: `\`${ticket.priority}\``, inline: true },
        { name: '📂 Catégorie', value: category.name, inline: true }
      );

    if (formAnswers.length > 0) {
      for (const item of formAnswers) {
        welcomeEmbed.addFields({
          name: `📋 ${item.question}`,
          value: item.answer.trim() || '*Aucune réponse*',
          inline: false,
        });
      }
    }

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket:claim:${ticket.id}`)
        .setLabel('Prendre en charge')
        .setEmoji('✋')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`ticket:close_prompt:${ticket.id}`)
        .setLabel('Fermer')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    );

    const supportRole = category.supportRoleId || guildConfig.supportRoleId;
    await thread.send({
      content: supportRole ? `<@&${supportRole}> nouveau ticket à traiter !` : undefined,
      embeds: [welcomeEmbed],
      components: [actionRow],
    });

    // 9. Enregistrement de l'événement d'audit
    await this.auditLogger.log({
      guildId: guild.id,
      subsystem: 'TICKETS',
      action: 'TICKET_CREATED',
      actorId: user.id,
      targetId: thread.id,
      metadata: { ticketId: ticket.id, number: ticket.number, category: category.name },
    });

    this.logger.info(`Ticket #${ticket.number} créé par ${user.tag} dans ${thread.name}`);
    return { ticket, thread };
  }

  public async closeTicket(params: {
    ticket: TicketWithRelations;
    closedBy: User;
    reason?: string;
  }): Promise<void> {
    const { ticket, closedBy, reason } = params;

    if (ticket.status === 'CLOSED' || ticket.status === 'ARCHIVED') {
      throw new TicketError('Ce ticket est déjà clôturé.');
    }

    const guild = await this.client.guilds.fetch(ticket.guildId);
    const thread = (await guild.channels.fetch(ticket.threadId).catch(() => null)) as ThreadChannel | null;

    if (thread && thread.isThread()) {
      try {
        // Si le fil est déjà archivé automatiquement par Discord, on le réouvre temporairement pour poster et verrouiller
        if (thread.archived) {
          await thread.setArchived(false, 'Réouverture temporaire pour clôture propre');
        }

        // 1. Génération du transcript Markdown
        const transcriptBuffer = await this.transcriptService.generateMarkdown(ticket, thread);

        // 2. Envoi du transcript aux destinataires configurés (MP + logs)
        await this.transcriptService.dispatchTranscript({
          ticket,
          guild,
          transcriptBuffer,
          closedBy,
          reason: reason || 'Aucun motif renseigné',
        });

        // 3. Notification dans le fil
        const closeEmbed = new AppEmbed()
          .setTitle('🔒 Ticket Fermé')
          .setDescription(
            `Ce ticket a été clôturé par <@${closedBy.id}>.\n**Motif :** ${reason || '*Aucun motif renseigné*'}`
          )
          .setFooter({ text: 'Le fil a été archivé et verrouillé.' });

        await thread.send({ embeds: [closeEmbed] });

        // 4. Verrouillage et archivage Discord
        await thread.setLocked(true, `Clôturé par ${closedBy.tag}`);
        await thread.setArchived(true, `Clôturé par ${closedBy.tag}`);
      } catch (discordErr) {
        this.logger.error(`Erreur Discord lors de la clôture du fil ${thread.id} :`, discordErr);
      }
    }

    // 5. Mise à jour de l'état en base de données
    await this.ticketRepo.updateStatus(ticket.id, 'CLOSED', closedBy.id, reason);

    // 6. Audit
    await this.auditLogger.log({
      guildId: ticket.guildId,
      subsystem: 'TICKETS',
      action: 'TICKET_CLOSED',
      actorId: closedBy.id,
      targetId: ticket.threadId,
      metadata: { ticketId: ticket.id, reason },
    });

    this.logger.info(`Ticket #${ticket.number} clôturé par ${closedBy.tag}`);
  }

  public async claimTicket(ticket: TicketWithRelations, staff: User): Promise<Ticket> {
    if (ticket.status === 'CLOSED') {
      throw new TicketError('Impossible de prendre en charge un ticket clôturé.');
    }
    if (ticket.claimedById) {
      throw new TicketError(`Ce ticket est déjà pris en charge par <@${ticket.claimedById}>.`);
    }

    const updated = await this.ticketRepo.updateClaim(ticket.id, staff.id);

    const guild = await this.client.guilds.fetch(ticket.guildId);
    const thread = (await guild.channels.fetch(ticket.threadId).catch(() => null)) as ThreadChannel | null;

    if (thread && thread.isThread()) {
      await thread.send({
        embeds: [
          new AppEmbed().setDescription(`✋ Ce ticket a été pris en charge par <@${staff.id}>.`),
        ],
      });
    }

    await this.auditLogger.log({
      guildId: ticket.guildId,
      subsystem: 'TICKETS',
      action: 'TICKET_CLAIMED',
      actorId: staff.id,
      targetId: ticket.threadId,
      metadata: { ticketId: ticket.id },
    });

    return updated;
  }

  public async releaseTicket(ticket: TicketWithRelations, staff: User): Promise<Ticket> {
    if (!ticket.claimedById) {
      throw new TicketError('Ce ticket n\'est pas pris en charge actuellement.');
    }

    const updated = await this.ticketRepo.updateClaim(ticket.id, null);

    const guild = await this.client.guilds.fetch(ticket.guildId);
    const thread = (await guild.channels.fetch(ticket.threadId).catch(() => null)) as ThreadChannel | null;

    if (thread && thread.isThread()) {
      await thread.send({
        embeds: [
          new AppEmbed().setDescription(
            `👐 La prise en charge a été libérée par <@${staff.id}>. Le ticket est de nouveau disponible.`
          ),
        ],
      });
    }

    await this.auditLogger.log({
      guildId: ticket.guildId,
      subsystem: 'TICKETS',
      action: 'TICKET_RELEASED',
      actorId: staff.id,
      targetId: ticket.threadId,
      metadata: { ticketId: ticket.id },
    });

    return updated;
  }

  public async addParticipant(
    ticket: TicketWithRelations,
    targetUser: User,
    actor: User
  ): Promise<Ticket> {
    const guild = await this.client.guilds.fetch(ticket.guildId);
    const thread = (await guild.channels.fetch(ticket.threadId).catch(() => null)) as ThreadChannel | null;

    if (thread && thread.isThread()) {
      await thread.members.add(targetUser.id);
      await thread.send({
        embeds: [
          new AppEmbed().setDescription(
            `➕ <@${targetUser.id}> a été ajouté au ticket par <@${actor.id}>.`
          ),
        ],
      });
    }

    const updated = await this.ticketRepo.addParticipant(ticket.id, targetUser.id);

    await this.auditLogger.log({
      guildId: ticket.guildId,
      subsystem: 'TICKETS',
      action: 'TICKET_USER_ADDED',
      actorId: actor.id,
      targetId: targetUser.id,
      metadata: { ticketId: ticket.id },
    });

    return updated;
  }

  public async removeParticipant(
    ticket: TicketWithRelations,
    targetUser: User,
    actor: User
  ): Promise<Ticket> {
    const guild = await this.client.guilds.fetch(ticket.guildId);
    const thread = (await guild.channels.fetch(ticket.threadId).catch(() => null)) as ThreadChannel | null;

    if (thread && thread.isThread()) {
      await thread.members.remove(targetUser.id);
      await thread.send({
        embeds: [
          new AppEmbed().setDescription(
            `➖ <@${targetUser.id}> a été retiré du ticket par <@${actor.id}>.`
          ),
        ],
      });
    }

    const updated = await this.ticketRepo.removeParticipant(ticket.id, targetUser.id);

    await this.auditLogger.log({
      guildId: ticket.guildId,
      subsystem: 'TICKETS',
      action: 'TICKET_USER_REMOVED',
      actorId: actor.id,
      targetId: targetUser.id,
      metadata: { ticketId: ticket.id },
    });

    return updated;
  }

  public async setPriority(
    ticket: TicketWithRelations,
    priority: TicketPriority,
    actor: User
  ): Promise<Ticket> {
    const updated = await this.ticketRepo.updatePriority(ticket.id, priority);

    const guild = await this.client.guilds.fetch(ticket.guildId);
    const thread = (await guild.channels.fetch(ticket.threadId).catch(() => null)) as ThreadChannel | null;

    if (thread && thread.isThread()) {
      await thread.send({
        embeds: [
          new AppEmbed().setDescription(
            `⚡ La priorité du ticket a été définie sur **\`${priority}\`** par <@${actor.id}>.`
          ),
        ],
      });
    }

    await this.auditLogger.log({
      guildId: ticket.guildId,
      subsystem: 'TICKETS',
      action: 'TICKET_PRIORITY_CHANGED',
      actorId: actor.id,
      targetId: ticket.threadId,
      metadata: { ticketId: ticket.id, priority },
    });

    return updated;
  }

  public async setTopic(
    ticket: TicketWithRelations,
    topic: string,
    actor: User
  ): Promise<Ticket> {
    const updated = await this.ticketRepo.updateTopic(ticket.id, topic);

    const guild = await this.client.guilds.fetch(ticket.guildId);
    const thread = (await guild.channels.fetch(ticket.threadId).catch(() => null)) as ThreadChannel | null;

    if (thread && thread.isThread()) {
      await thread.send({
        embeds: [
          new AppEmbed()
            .setTitle('📌 Sujet du ticket mis à jour')
            .setDescription(`**Nouveau sujet :** ${topic}\n*Modifié par <@${actor.id}>*`),
        ],
      });
    }

    await this.auditLogger.log({
      guildId: ticket.guildId,
      subsystem: 'TICKETS',
      action: 'TICKET_TOPIC_CHANGED',
      actorId: actor.id,
      targetId: ticket.threadId,
      metadata: { ticketId: ticket.id, topic },
    });

    return updated;
  }

  public async renameTicket(
    ticket: TicketWithRelations,
    newName: string,
    actor: User
  ): Promise<void> {
    const guild = await this.client.guilds.fetch(ticket.guildId);
    const thread = (await guild.channels.fetch(ticket.threadId).catch(() => null)) as ThreadChannel | null;

    if (thread && thread.isThread()) {
      await thread.setName(newName);
      await thread.send({
        embeds: [
          new AppEmbed().setDescription(`✏️ Le salon a été renommé en **\`${newName}\`** par <@${actor.id}>.`),
        ],
      });
    }

    await this.auditLogger.log({
      guildId: ticket.guildId,
      subsystem: 'TICKETS',
      action: 'TICKET_RENAMED',
      actorId: actor.id,
      targetId: ticket.threadId,
      metadata: { ticketId: ticket.id, newName },
    });
  }

  public async getTicketByThreadId(threadId: string): Promise<TicketWithRelations | null> {
    return this.ticketRepo.findByThreadId(threadId);
  }

  public async getTicketById(ticketId: string): Promise<TicketWithRelations | null> {
    return this.ticketRepo.findById(ticketId);
  }
}
