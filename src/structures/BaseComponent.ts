import type {
  ButtonInteraction,
  AnySelectMenuInteraction,
  ModalSubmitInteraction,
  Interaction,
} from 'discord.js';
import type { BotClient } from '../client/BotClient.js';

export type ComponentInteraction =
  | ButtonInteraction
  | AnySelectMenuInteraction
  | ModalSubmitInteraction;

export type ComponentType = 'BUTTON' | 'SELECT_MENU' | 'MODAL';

export abstract class BaseComponent {
  /**
   * Identifiant ou préfixe customId (ou RegExp) pour faire correspondre le composant
   */
  public abstract readonly customId: string | RegExp;

  /**
   * Type d'interaction Discord attendue
   */
  public abstract readonly type: ComponentType;

  /**
   * Définit si l'interaction doit impérativement avoir lieu au sein d'un serveur
   */
  public readonly guildOnly: boolean = true;

  /**
   * Vérifie si l'interaction correspond à ce composant
   */
  public matches(interaction: Interaction): boolean {
    if (this.type === 'BUTTON' && !interaction.isButton()) return false;
    if (this.type === 'SELECT_MENU' && !interaction.isAnySelectMenu()) return false;
    if (this.type === 'MODAL' && !interaction.isModalSubmit()) return false;

    if (!('customId' in interaction)) return false;

    if (typeof this.customId === 'string') {
      return interaction.customId.startsWith(this.customId);
    }
    return this.customId.test(interaction.customId);
  }

  /**
   * Exécution du composant
   */
  public abstract execute(
    interaction: ComponentInteraction,
    client: BotClient
  ): Promise<void>;
}
