import { Client, ClientOptions, Collection, GatewayIntentBits } from 'discord.js';
import { env, type EnvConfig } from '../config/env.js';
import { Logger } from '../utils/logger.js';
import { CommandManager } from '../managers/CommandManager.js';
import { EventManager } from '../managers/EventManager.js';
import { CooldownManager } from '../managers/CooldownManager.js';
import { InteractionHandler } from '../handlers/InteractionHandler.js';
import { ErrorHandler } from '../handlers/ErrorHandler.js';
import { ComponentDispatcher } from '../handlers/ComponentDispatcher.js';
import type { BaseCommand } from '../structures/BaseCommand.js';

// Database & Repositories
import { PrismaService } from '../database/PrismaService.js';
import type { ITicketGuildRepository } from '../modules/tickets/repositories/ITicketGuildRepository.js';
import type { ITicketCategoryRepository } from '../modules/tickets/repositories/ITicketCategoryRepository.js';
import type { ITicketQuestionRepository } from '../modules/tickets/repositories/ITicketQuestionRepository.js';
import type { ITicketPanelRepository } from '../modules/tickets/repositories/ITicketPanelRepository.js';
import type { ITicketRepository } from '../modules/tickets/repositories/ITicketRepository.js';
import { PrismaTicketGuildRepository } from '../modules/tickets/infrastructure/PrismaTicketGuildRepository.js';
import { PrismaTicketCategoryRepository } from '../modules/tickets/infrastructure/PrismaTicketCategoryRepository.js';
import { PrismaTicketQuestionRepository } from '../modules/tickets/infrastructure/PrismaTicketQuestionRepository.js';
import { PrismaTicketPanelRepository } from '../modules/tickets/infrastructure/PrismaTicketPanelRepository.js';
import { PrismaTicketRepository } from '../modules/tickets/infrastructure/PrismaTicketRepository.js';

// Audit & Domain Services
import { AuditLogger } from '../modules/audit/services/AuditLogger.js';
import { TranscriptService } from '../modules/tickets/services/TranscriptService.js';
import { TicketPermissionService } from '../modules/tickets/services/TicketPermissionService.js';
import { TicketPanelService } from '../modules/tickets/services/TicketPanelService.js';
import { TicketManager } from '../modules/tickets/services/TicketManager.js';
import { getTicketComponents } from '../modules/tickets/components/index.js';

export class BotClient extends Client {
  public readonly config: EnvConfig = env;
  public readonly logger: Logger = new Logger('BotClient');
  public readonly commands: Collection<string, BaseCommand> = new Collection();

  // Core Managers & Handlers
  public readonly cooldowns: CooldownManager = new CooldownManager();
  public readonly commandManager: CommandManager = new CommandManager(this);
  public readonly eventManager: EventManager = new EventManager(this);
  public readonly interactionHandler: InteractionHandler = new InteractionHandler(this);
  public readonly errorHandler: ErrorHandler = new ErrorHandler(this);
  public readonly componentDispatcher: ComponentDispatcher = new ComponentDispatcher(this);

  // Persistence & Repositories (Hexagonal Architecture)
  public readonly prisma: PrismaService;
  public readonly guildRepo: ITicketGuildRepository;
  public readonly categoryRepo: ITicketCategoryRepository;
  public readonly questionRepo: ITicketQuestionRepository;
  public readonly panelRepo: ITicketPanelRepository;
  public readonly ticketRepo: ITicketRepository;

  // Domain & Application Services
  public readonly auditLogger: AuditLogger;
  public readonly transcriptService: TranscriptService;
  public readonly ticketPermissions: TicketPermissionService;
  public readonly ticketPanels: TicketPanelService;
  public readonly tickets: TicketManager;

  private isShuttingDown = false;

  public constructor(options?: Partial<ClientOptions>) {
    super({
      intents: options?.intents ?? [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      ...options,
    });

    // 1. Initialisation de la couche base de données
    this.prisma = new PrismaService();
    this.guildRepo = new PrismaTicketGuildRepository(this.prisma);
    this.categoryRepo = new PrismaTicketCategoryRepository(this.prisma);
    this.questionRepo = new PrismaTicketQuestionRepository(this.prisma);
    this.panelRepo = new PrismaTicketPanelRepository(this.prisma);
    this.ticketRepo = new PrismaTicketRepository(this.prisma);

    // 2. Initialisation des services métier
    this.auditLogger = new AuditLogger(this.prisma);
    this.transcriptService = new TranscriptService();
    this.ticketPermissions = new TicketPermissionService();
    this.ticketPanels = new TicketPanelService(this.categoryRepo, this.panelRepo);
    this.tickets = new TicketManager(
      this,
      this.ticketRepo,
      this.guildRepo,
      this.categoryRepo,
      this.transcriptService,
      this.auditLogger
    );

    // 3. Enregistrement des composants interactifs (boutons, sélecteurs, modals)
    this.componentDispatcher.registerAll(getTicketComponents());
  }

  public async start(): Promise<void> {
    this.logger.info('Connexion à la base de données PostgreSQL...');
    await this.prisma.connect();

    this.logger.info('Initialisation des commandes et événements...');
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
    await this.prisma.disconnect();

    this.logger.info('Arrêt propre terminé.');
    process.exit(0);
  }
}
