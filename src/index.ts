import { BotClient } from './client/BotClient.js';
import { Logger } from './utils/logger.js';

const logger = new Logger('Process');
const client = new BotClient();

// Capture des signaux système pour arrêt propre
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void client.shutdown(signal);
  });
}

// Gestion globale des exceptions non interceptées
process.on('unhandledRejection', (reason) => {
  logger.error('Rejet de promesse non intercepté (unhandledRejection) :', reason);
});

process.on('uncaughtException', (error) => {
  logger.fatal('Exception non gérée (uncaughtException) :', error);
  process.exit(1);
});

// Démarrage du bot
try {
  await client.start();
} catch (error) {
  logger.fatal('Erreur fatale lors du démarrage du bot :', error);
  process.exit(1);
}
