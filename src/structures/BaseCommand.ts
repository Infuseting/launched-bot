import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  PermissionResolvable,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { BotClient } from '../client/BotClient.js';

export type CommandBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

export interface CommandOptions {
  category: string;
  cooldown?: number; // In seconds, default: 3
  botPermissions?: PermissionResolvable[];
  userPermissions?: PermissionResolvable[];
  guildOnly?: boolean; // default: false
  ownerOnly?: boolean; // default: false
  deferReply?: boolean | 'ephemeral'; // Auto-defers before execution if true or 'ephemeral'
}

export abstract class BaseCommand {
  public abstract readonly data: CommandBuilder;
  public readonly options: Required<CommandOptions>;

  protected constructor(options: CommandOptions) {
    this.options = {
      category: options.category,
      cooldown: options.cooldown ?? 3,
      botPermissions: options.botPermissions ?? [],
      userPermissions: options.userPermissions ?? [],
      guildOnly: options.guildOnly ?? false,
      ownerOnly: options.ownerOnly ?? false,
      deferReply: options.deferReply ?? false,
    };
  }

  public get name(): string {
    return this.data.name;
  }

  public abstract execute(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<void>;

  public autocomplete?(
    interaction: AutocompleteInteraction,
    client: BotClient
  ): Promise<void>;

  public toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    return this.data.toJSON();
  }
}
