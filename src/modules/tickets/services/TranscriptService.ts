import { AttachmentBuilder, Guild, ThreadChannel, User } from 'discord.js';
import type { TicketWithRelations } from '../repositories/ITicketRepository.js';
import type { FormAnswerDTO } from '../domain/TicketTypes.js';
import { AppEmbed } from '../../../utils/embeds.js';
import { Logger } from '../../../utils/logger.js';

export interface DispatchTranscriptParams {
  ticket: TicketWithRelations;
  guild: Guild;
  transcriptBuffer: Buffer;
  closedBy: User;
  reason: string;
}

export class TranscriptService {
  private readonly logger = new Logger('TranscriptService');

  public async generateMarkdown(
    ticket: TicketWithRelations,
    thread: ThreadChannel
  ): Promise<Buffer> {
    const messages = await this.fetchAllMessages(thread);
    const lines: string[] = [];

    // En-tête du transcript
    lines.push(`# 📋 Transcript - Ticket #${String(ticket.number).padStart(4, '0')}`);
    lines.push(`- **Serveur :** ${thread.guild.name} (\`${thread.guild.id}\`)`);
    lines.push(`- **Fil :** #${thread.name} (\`${thread.id}\`)`);
    lines.push(`- **Demandeur :** <@${ticket.creatorId}> (\`${ticket.creatorId}\`)`);
    lines.push(`- **Catégorie :** ${ticket.category.name}`);
    lines.push(`- **Date d'ouverture :** ${ticket.createdAt.toISOString()}`);
    lines.push(`- **Date de fermeture :** ${new Date().toISOString()}`);
    lines.push(`- **Priorité :** ${ticket.priority}`);
    if (ticket.topic) lines.push(`- **Sujet :** ${ticket.topic}`);
    if (ticket.claimedById) lines.push(`- **Pris en charge par :** <@${ticket.claimedById}>`);
    lines.push('');

    // Formulaire d'ouverture si présent
    const answers = (ticket.formAnswers as unknown as FormAnswerDTO[]) || [];
    if (Array.isArray(answers) && answers.length > 0) {
      lines.push('## 📝 Réponses au formulaire d\'ouverture');
      for (const item of answers) {
        lines.push(`- **${item.question} :** ${item.answer.trim() || '*Aucune réponse*'}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('## 💬 Historique des échanges');
    lines.push('');

    for (const msg of messages) {
      const timestamp = msg.createdAt.toISOString().replace('T', ' ').slice(0, 19);
      const author = `${msg.author.tag} (${msg.author.id})`;

      lines.push(`### [${timestamp} UTC] ${author}`);
      if (msg.content) {
        lines.push(msg.content);
      }

      if (msg.attachments.size > 0) {
        lines.push('');
        lines.push('**Pièces jointes :**');
        for (const attachment of msg.attachments.values()) {
          lines.push(`- [${attachment.name}](${attachment.url}) (${(attachment.size / 1024).toFixed(1)} KB)`);
        }
      }
      lines.push('');
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  public async dispatchTranscript(params: DispatchTranscriptParams): Promise<void> {
    const { ticket, guild, transcriptBuffer, closedBy, reason } = params;
    const fileName = `transcript-ticket-${String(ticket.number).padStart(4, '0')}.md`;
    const attachment = new AttachmentBuilder(transcriptBuffer, { name: fileName });

    const summaryEmbed = new AppEmbed()
      .setTitle(`📑 Transcript - Ticket #${String(ticket.number).padStart(4, '0')}`)
      .setDescription(`Le ticket **#${String(ticket.number).padStart(4, '0')}** (${ticket.category.name}) a été clôturé.`)
      .addFields(
        { name: '👤 Demandeur', value: `<@${ticket.creatorId}>`, inline: true },
        { name: '🔒 Fermé par', value: `<@${closedBy.id}>`, inline: true },
        { name: '⚡ Priorité', value: `\`${ticket.priority}\``, inline: true },
        { name: '📝 Motif', value: reason || '*Non spécifié*', inline: false }
      )
      .setTimestamp();

    // 1. Envoi dans le salon de logs configuré
    if (ticket.guild.logChannelId) {
      try {
        const logChannel = await guild.channels.fetch(ticket.guild.logChannelId);
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({
            embeds: [summaryEmbed],
            files: [attachment],
          });
        }
      } catch (err) {
        this.logger.error(`Échec de l'envoi du transcript dans le salon de logs :`, err);
      }
    }

    // 2. Envoi en Message Privé au créateur du ticket si activé
    if (ticket.guild.dmTranscript) {
      try {
        const creator = await guild.client.users.fetch(ticket.creatorId);
        await creator.send({
          content: `Voici le transcript de votre ticket sur le serveur **${guild.name}** :`,
          embeds: [summaryEmbed],
          files: [new AttachmentBuilder(transcriptBuffer, { name: fileName })],
        });
      } catch (err: unknown) {
        const discordError = err as { code?: number };
        if (discordError?.code === 50007) {
          this.logger.info(`Transcript non délivré en MP : l'utilisateur ${ticket.creatorId} a désactivé ses MPs.`);
        } else {
          this.logger.error(`Échec lors de l'envoi du transcript en MP à ${ticket.creatorId} :`, err);
        }
      }
    }
  }

  private async fetchAllMessages(thread: ThreadChannel) {
    const messages = [];
    let lastId: string | undefined;

    while (true) {
      const batch = await thread.messages.fetch({ limit: 100, before: lastId });
      if (batch.size === 0) break;
      messages.push(...batch.values());
      lastId = batch.last()?.id;
      if (batch.size < 100) break;
    }

    return messages.reverse(); // Ordre chronologique
  }
}
