import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { BotClient } from '../client/BotClient.js';
import { BaseEvent } from '../structures/BaseEvent.js';
import { Logger } from '../utils/logger.js';

export class EventManager {
  private readonly logger = new Logger('EventManager');

  public constructor(private readonly client: BotClient) {}

  public async loadEvents(): Promise<void> {
    const eventsDir = fileURLToPath(new URL('../events', import.meta.url));

    if (!existsSync(eventsDir)) {
      this.logger.warn(`Le dossier des événements est introuvable : ${eventsDir}`);
      return;
    }

    const files = this.scanDirectory(eventsDir);
    let count = 0;

    for (const filePath of files) {
      if (!this.isValidEventFile(filePath)) continue;

      try {
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);
        const EventClass = this.extractEventClass(module);

        if (EventClass) {
          const event: BaseEvent = new EventClass();

          const listener = (...args: any[]) => {
            Promise.resolve((event as any).execute(this.client, ...args)).catch((error: unknown) => {
              this.client.errorHandler.handleGenericError(error, `Event:${String(event.name)}`);
            });
          };

          if (event.once) {
            this.client.once(event.name, listener);
          } else {
            this.client.on(event.name, listener);
          }

          count++;
          this.logger.debug(`Événement rattaché : ${String(event.name)} (once: ${event.once})`);
        } else {
          this.logger.warn(`Le fichier ${filePath} n'exporte pas une classe BaseEvent valide.`);
        }
      } catch (error) {
        this.logger.error(`Erreur lors du chargement de l'événement ${filePath}:`, error);
      }
    }

    this.logger.info(`${count} écouteur(s) d'événement(s) initialisé(s).`);
  }

  private extractEventClass(module: Record<string, unknown>): (new () => BaseEvent) | null {
    if (typeof module.default === 'function' && module.default.prototype instanceof BaseEvent) {
      return module.default as new () => BaseEvent;
    }

    for (const value of Object.values(module)) {
      if (typeof value === 'function' && value.prototype instanceof BaseEvent) {
        return value as new () => BaseEvent;
      }
    }

    return null;
  }

  private isValidEventFile(filePath: string): boolean {
    return (
      (filePath.endsWith('.ts') || filePath.endsWith('.js')) &&
      !filePath.endsWith('.d.ts') &&
      !filePath.endsWith('.map')
    );
  }

  private scanDirectory(directory: string): string[] {
    const files: string[] = [];
    try {
      const items = readdirSync(directory);
      for (const item of items) {
        const fullPath = join(directory, item);
        if (statSync(fullPath).isDirectory()) {
          files.push(...this.scanDirectory(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.error(`Erreur d'accès lors de la lecture du dossier ${directory}:`, error);
    }
    return files;
  }
}
