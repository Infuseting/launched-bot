import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { BotClient } from '../client/BotClient.js';
import { BaseCommand } from '../structures/BaseCommand.js';
import { Logger } from '../utils/logger.js';

export class CommandManager {
  private readonly logger = new Logger('CommandManager');

  public constructor(private readonly client: BotClient) {}

  public async loadCommands(): Promise<void> {
    const commandsDir = fileURLToPath(new URL('../commands', import.meta.url));

    if (!existsSync(commandsDir)) {
      this.logger.warn(`Le dossier des commandes est introuvable : ${commandsDir}`);
      return;
    }

    const files = this.scanDirectory(commandsDir);
    let count = 0;

    for (const filePath of files) {
      if (!this.isValidCommandFile(filePath)) continue;

      try {
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);
        const CommandClass = this.extractCommandClass(module);

        if (CommandClass) {
          const commandInstance: BaseCommand = new CommandClass();
          this.client.commands.set(commandInstance.name, commandInstance);
          count++;
          this.logger.debug(`Commande enregistrée : /${commandInstance.name} [${commandInstance.options.category}]`);
        } else {
          this.logger.warn(`Le fichier ${filePath} n'exporte pas une classe BaseCommand valide.`);
        }
      } catch (error) {
        this.logger.error(`Erreur lors du chargement de la commande ${filePath}:`, error);
      }
    }

    this.logger.info(`${count} commande(s) slash chargée(s) avec succès.`);
  }

  private extractCommandClass(module: Record<string, unknown>): (new () => BaseCommand) | null {
    if (typeof module.default === 'function' && module.default.prototype instanceof BaseCommand) {
      return module.default as new () => BaseCommand;
    }

    for (const value of Object.values(module)) {
      if (typeof value === 'function' && value.prototype instanceof BaseCommand) {
        return value as new () => BaseCommand;
      }
    }

    return null;
  }

  private isValidCommandFile(filePath: string): boolean {
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
