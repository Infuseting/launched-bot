import { Interaction } from 'discord.js';
import type { BotClient } from '../client/BotClient.js';
import { Logger } from '../utils/logger.js';
import type { BaseComponent, ComponentInteraction } from '../structures/BaseComponent.js';

export class ComponentDispatcher {
  private readonly logger = new Logger('ComponentDispatcher');
  private readonly components: BaseComponent[] = [];

  public constructor(private readonly client: BotClient) {}

  public register(component: BaseComponent): void {
    this.components.push(component);
  }

  public registerAll(components: BaseComponent[]): void {
    for (const comp of components) {
      this.register(comp);
    }
  }

  public async dispatch(interaction: Interaction): Promise<void> {
    if (!interaction.isButton() && !interaction.isAnySelectMenu() && !interaction.isModalSubmit()) {
      return;
    }

    const component = this.components.find((comp) => comp.matches(interaction));

    if (!component) {
      this.logger.warn(`Aucun gestionnaire trouvé pour le composant customId : ${interaction.customId}`);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '⚠️ Ce composant interactif n\'est plus reconnu ou a expiré.',
          ephemeral: true,
        }).catch((err) => this.logger.debug('Impossible d\'acquitter le composant inconnu :', err));
      }
      return;
    }

    const customId = interaction.customId;

    try {
      if (component.guildOnly && !interaction.inGuild()) {
        if (interaction.isRepliable()) {
          await interaction.reply({
            content: '❌ Cette interaction ne peut être exécutée que sur un serveur.',
            ephemeral: true,
          });
        }
        return;
      }

      await component.execute(interaction as ComponentInteraction, this.client);
    } catch (error) {
      if (interaction.isRepliable()) {
        await this.client.errorHandler.handleInteractionError(error, interaction);
      } else {
        this.client.errorHandler.handleGenericError(error, `ComponentDispatcher:${customId}`);
      }
    }
  }
}
