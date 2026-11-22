import { ChatInputCommandInteraction, RepliableInteraction } from 'discord.js';
import type { BotClient } from '../client/BotClient.js';
import { Logger } from '../utils/logger.js';
import { AppEmbed } from '../utils/embeds.js';
import { TicketError } from '../modules/tickets/domain/TicketErrors.js';

export class ErrorHandler {
  private readonly logger = new Logger('ErrorHandler');

  public constructor(public readonly client: BotClient) {}

  public async handleCommandError(
    error: unknown,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    await this.handleInteractionError(error, interaction, `/${interaction.commandName}`);
  }

  public async handleInteractionError(
    error: unknown,
    interaction: RepliableInteraction,
    context?: string
  ): Promise<void> {
    const err = error instanceof Error ? error : new Error(String(error));
    const interactionContext = context || ('customId' in interaction ? interaction.customId : 'Interaction');

    const isTicketDomainError = error instanceof TicketError;

    if (isTicketDomainError) {
      this.logger.warn(`Règle métier ticket non respectée [${interactionContext}]: ${err.message}`, {
        user: `${interaction.user.tag} (${interaction.user.id})`,
        guildId: interaction.guildId ?? 'DM',
      });
    } else {
      this.logger.error(`Erreur lors de l'exécution de [${interactionContext}]: ${err.message}`, {
        err,
        user: `${interaction.user.tag} (${interaction.user.id})`,
        guildId: interaction.guildId ?? 'DM',
      });
    }

    const embed = new AppEmbed();
    if (isTicketDomainError) {
      embed
        .setTitle('⚠️ Action impossible')
        .setDescription(err.message);
    } else {
      embed
        .setTitle('❌ Erreur d\'exécution')
        .setDescription('Une erreur inattendue est survenue lors du traitement de cette action.');
    }

    const errorPayload = {
      embeds: [embed],
      ephemeral: true,
    };

    try {
      if (interaction.replied) {
        await interaction.followUp(errorPayload);
      } else if (interaction.deferred) {
        await interaction.editReply(errorPayload);
      } else {
        await interaction.reply(errorPayload);
      }
    } catch (replyError) {
      this.logger.error('Échec de la notification d\'erreur à l\'utilisateur :', replyError);
    }
  }

  public handleGenericError(error: unknown, context = 'Global'): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error(`[${context}] Erreur : ${err.message}`, err);
  }
}
