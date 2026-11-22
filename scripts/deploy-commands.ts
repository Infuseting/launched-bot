import { REST, Routes } from 'discord.js';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { env } from '../src/config/env.js';
import { BaseCommand } from '../src/structures/BaseCommand.js';

async function deploy(): Promise<void> {
  const isGlobal = process.argv.includes('--global');
  const commandsDir = fileURLToPath(new URL('../src/commands', import.meta.url));

  console.log(`🚀 Démarrage du déploiement des commandes Slash [Mode: ${isGlobal || !env.GUILD_ID ? 'GLOBAL' : 'GUILD'}]...`);

  if (!existsSync(commandsDir)) {
    console.error(`❌ Dossier des commandes introuvable : ${commandsDir}`);
    process.exit(1);
  }

  function scan(dir: string): string[] {
    const files: string[] = [];
    try {
      for (const item of readdirSync(dir)) {
        const full = join(dir, item);
        if (statSync(full).isDirectory()) {
          files.push(...scan(full));
        } else if (
          (full.endsWith('.ts') || full.endsWith('.js')) &&
          !full.endsWith('.d.ts') &&
          !full.endsWith('.map')
        ) {
          files.push(full);
        }
      }
    } catch (err) {
      console.error(`❌ Erreur de lecture du dossier ${dir}:`, err);
      process.exit(1);
    }
    return files;
  }

  function extractCommandClass(module: Record<string, unknown>): (new () => BaseCommand) | null {
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

  const files = scan(commandsDir);
  const commandsPayload: unknown[] = [];
  let hasErrors = false;

  for (const file of files) {
    try {
      const module = await import(pathToFileURL(file).href);
      const CommandClass = extractCommandClass(module);

      if (CommandClass) {
        const cmd: BaseCommand = new CommandClass();
        commandsPayload.push(cmd.toJSON());
        console.log(`  ✓ Commande préparée : /${cmd.name} [${cmd.options.category}]`);
      } else {
        console.error(`  ❌ Fichier invalide (classe héritant de BaseCommand introuvable) : ${file}`);
        hasErrors = true;
      }
    } catch (err) {
      console.error(`  ❌ Erreur lors de l'import de ${file}:`, err);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n🛑 Déploiement interrompu : des erreurs ont été détectées dans vos fichiers de commandes.');
    console.error('Aucune requête n\'a été envoyée à Discord pour éviter la suppression involontaire de commandes.');
    process.exit(1);
  }

  if (commandsPayload.length === 0) {
    console.error('\n🛑 Déploiement interrompu : 0 commande valide trouvée.');
    console.error('L\'envoi d\'une liste vide supprimerait toutes vos commandes enregistrées sur Discord.');
    process.exit(1);
  }

  console.log(`\n📦 Total de commandes prêtes au déploiement : ${commandsPayload.length}`);

  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  try {
    if (isGlobal || !env.GUILD_ID) {
      console.log(`📡 Enregistrement global en cours pour l'application ID: ${env.CLIENT_ID}...`);
      await rest.put(Routes.applicationCommands(env.CLIENT_ID), {
        body: commandsPayload,
      });
      console.log('✅ Commandes globales publiées avec succès ! (Propagation Discord : jusqu\'à 1h)');
    } else {
      console.log(`📡 Enregistrement sur le serveur de test (${env.GUILD_ID})...`);
      await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), {
        body: commandsPayload,
      });
      console.log('✅ Commandes de guilde publiées avec succès ! (Propagation immédiate)');
    }
  } catch (error) {
    console.error('❌ Échec du déploiement des commandes auprès de l\'API Discord :', error);
    process.exit(1);
  }
}

deploy().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
