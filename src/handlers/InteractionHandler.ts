import {
  Interaction,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import type { BotClient } from '../client/BotClient.js';
import { Logger } from '../utils/logger.js';

export class InteractionHandler {
  private readonly logger = new Logger('InteractionHandler');

  public constructor(private readonly client: BotClient) {}

  public async handle(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      await this.handleChatInput(interaction);
    } else if (interaction.isAutocomplete()) {
      await this.handleAutocomplete(interaction);
    }
  }

  private async handleChatInput(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.client.commands.get(interaction.commandName);

    try {
      if (!command) {
        this.logger.warn(`Commande inconnue reçue : /${interaction.commandName}`);
        await interaction.reply({
          content: '⚠️ Commande non reconnue par le bot.',
          ephemeral: true,
        });
        return;
      }

      // Vérification ownerOnly
      if (command.options.ownerOnly) {
        const isOwner = this.client.config.OWNER_ID
          ? interaction.user.id === this.client.config.OWNER_ID
          : false;

        if (!isOwner) {
          await interaction.reply({
            content: '⛔ Cette commande est strictement réservée au propriétaire du bot.',
            ephemeral: true,
          });
          return;
        }
      }

      // Vérification guildOnly
      if (command.options.guildOnly && !interaction.inGuild()) {
        await interaction.reply({
          content: '❌ Cette commande peut uniquement être utilisée sur un serveur.',
          ephemeral: true,
        });
        return;
      }

      // Vérification des permissions utilisateur (interdit en DM si des permissions de serveur sont requises)
      if (command.options.userPermissions.length > 0) {
        if (!interaction.inGuild() || !interaction.memberPermissions) {
          await interaction.reply({
            content: '❌ Cette commande requiert des permissions de serveur et ne peut pas être exécutée en message privé.',
            ephemeral: true,
          });
          return;
        }

        const missing = interaction.memberPermissions.missing(command.options.userPermissions);
        if (missing.length > 0) {
          await interaction.reply({
            content: `⛔ Vous ne possédez pas les permissions requises : \`${missing.join(', ')}\``,
            ephemeral: true,
          });
          return;
        }
      }

      // Vérification des permissions du bot (utilise interaction.appPermissions qui résout les overwrites du salon)
      if (interaction.inGuild() && command.options.botPermissions.length > 0) {
        const permissions = interaction.appPermissions;
        if (permissions && !permissions.has(command.options.botPermissions)) {
          const missing = permissions.missing(command.options.botPermissions);
          await interaction.reply({
            content: `⛔ Le bot n'a pas les permissions requises dans ce salon : \`${missing.join(', ')}\``,
            ephemeral: true,
          });
          return;
        }
      }

      // Vérification du cooldown
      const { onCooldown, remaining } = this.client.cooldowns.isOnCooldown(command.name, interaction.user.id);
      if (onCooldown) {
        await interaction.reply({
          content: `⏳ Veuillez patienter encore **${remaining.toFixed(1)}s** avant de réutiliser la commande \`/${command.name}\`.`,
          ephemeral: true,
        });
        return;
      }

      // Gestion du différé automatique (deferReply)
      if (command.options.deferReply) {
        await interaction.deferReply({
          ephemeral: command.options.deferReply === 'ephemeral',
        });
      }

      // Exécution de la commande
      await command.execute(interaction, this.client);

      // Le cooldown n'est activé qu'après une exécution réussie
      this.client.cooldowns.setCooldown(command.name, interaction.user.id, command.options.cooldown);
    } catch (error) {
      await this.client.errorHandler.handleCommandError(error, interaction);
    }
  }

  private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const command = this.client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) {
      if (!interaction.responded) {
        await interaction.respond([]).catch(() => {});
      }
      return;
    }

    try {
      await command.autocomplete(interaction, this.client);
    } catch (error) {
      this.logger.error(`Erreur d'autocomplétion sur /${command.name}:`, error);
      if (!interaction.responded) {
        await interaction.respond([]).catch(() => {});
      }
    }
  }
}
