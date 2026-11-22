import { Client, ClientOptions, Collection, GatewayIntentBits } from 'discord.js';
import { env, type EnvConfig } from '../config/env.js';
import { Logger } from '../utils/logger.js';
import { CommandManager } from '../managers/CommandManager.js';
import { EventManager } from '../managers/EventManager.js';
import { CooldownManager } from '../managers/CooldownManager.js';
import { InteractionHandler } from '../handlers/InteractionHandler.js';
import { ErrorHandler } from '../handlers/ErrorHandler.js';
import type { BaseCommand } from '../structures/BaseCommand.js';

export class BotClient extends Client {
  public readonly config: EnvConfig = env;
  public readonly logger: Logger = new Logger('BotClient');
  public readonly commands: Collection<string, BaseCommand> = new Collection();

  public readonly cooldowns: CooldownManager = new CooldownManager();
  public readonly commandManager: CommandManager = new CommandManager(this);
  public readonly eventManager: EventManager = new EventManager(this);
  public readonly interactionHandler: InteractionHandler = new InteractionHandler(this);
  public readonly errorHandler: ErrorHandler = new ErrorHandler(this);

  private isShuttingDown = false;

  public constructor(options?: Partial<ClientOptions>) {
    super({
      intents: options?.intents ?? [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
      ...options,
    });
  }

  public async start(): Promise<void> {
    this.logger.info('Initialisation des sous-systèmes du bot...');

    await this.commandManager.loadCommands();
    await this.eventManager.loadEvents();

    this.logger.info('Connexion à la Gateway Discord...');
    await this.login(this.config.DISCORD_TOKEN);
  }

  public async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logger.warn(`Signal ${signal} reçu. Arrêt propre du bot en cours...`);

    this.cooldowns.destroy();
    await this.destroy();

    this.logger.info('Arrêt propre terminé.');
    process.exit(0);
  }
}
