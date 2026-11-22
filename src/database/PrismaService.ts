import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class PrismaService extends PrismaClient {
  private readonly logger = new Logger('PrismaService');

  public constructor() {
    super({
      log:
        env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'warn' },
              { emit: 'event', level: 'error' },
            ]
          : [{ emit: 'event', level: 'error' }],
    });

    // @ts-expect-error Prisma typed event listener
    this.$on('error', (e: { message: string }) => {
      this.logger.error(`Erreur PostgreSQL Prisma: ${e.message}`);
    });
  }

  public async connect(): Promise<void> {
    try {
      this.logger.info('Connexion à PostgreSQL via Prisma ORM...');
      await this.$connect();
      this.logger.info('Connexion PostgreSQL établie avec succès.');
    } catch (error) {
      this.logger.warn(
        'Impossible de se connecter à PostgreSQL au démarrage (la base sera reconnectée automatiquement dès disponibilité) :',
        error
      );
    }
  }

  public async disconnect(): Promise<void> {
    this.logger.info('Déconnexion de PostgreSQL...');
    await this.$disconnect();
    this.logger.info('Déconnexion PostgreSQL terminée.');
  }
}
