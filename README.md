# 🤖 Launched Bot

Bot Discord compagnon officiel du launcher **Launched**, développé en **TypeScript** avec **Discord.js v14+** et une architecture modulaire orientée objet d'entreprise.

---

## 🚀 Caractéristiques

- **TypeScript ESM Moderne** : Typage strict, résolution `NodeNext`, exécution native.
- **Patrons de Conception (Design Patterns)** :
  - **Command Pattern** : Classe abstraite `BaseCommand` avec validation des options, cooldowns, permissions et support d'autocomplétion.
  - **Observer / Event Pattern** : Classe abstraite `BaseEvent` typée sur les `ClientEvents` de Discord.js.
  - **Extended Client & Managers** : `BotClient` centralise la gestion des commandes (`CommandManager`), événements (`EventManager`), cooldowns (`CooldownManager`) et erreurs (`ErrorHandler`).
- **Validation d'Environnement** : Schéma strict avec **Zod** (prise en charge de `BOT_KEY` ou `DISCORD_TOKEN`, vérification Snowflake du `CLIENT_ID`).
- **Système de Logs Haute Performance** : Basé sur **Pino** (format colorisé et lisible en dev via `pino-pretty`, format JSON structuré en production).
- **Déploiement REST Découplé** : Script `pnpm deploy:commands` évitant les limites de taux (rate-limits) de Discord lors des recharges du bot.
- **Rechargement à chaud automatique** : En mode développement avec `tsx watch`.

---

## 📁 Architecture du projet

```text
launched-bot/
├── .env.example                       # Gabarit de configuration d'environnement
├── package.json
├── tsconfig.json
├── pnpm-workspace.yaml
├── scripts/
│   └── deploy-commands.ts             # Déploiement des Slash Commands via l'API REST Discord
└── src/
    ├── index.ts                       # Point d'entrée & écoute des signaux système
    ├── config/
    │   └── env.ts                     # Validation Zod & normalisation de la configuration
    ├── client/
    │   └── BotClient.ts               # Extension du Client Discord.js & cycle de vie
    ├── structures/
    │   ├── BaseCommand.ts             # Contrat abstrait pour les commandes slash
    │   └── BaseEvent.ts               # Contrat abstrait pour les écouteurs d'événements
    ├── managers/
    │   ├── CommandManager.ts          # Découverte automatique et chargement des commandes
    │   ├── EventManager.ts            # Découverte automatique et liaison des événements
    │   └── CooldownManager.ts         # Suivi des délais avec purge automatique (sweep)
    ├── handlers/
    │   ├── InteractionHandler.ts      # Routage des interactions, permissions & cooldowns
    │   └── ErrorHandler.ts            # Gestion centralisée et sécurisée des erreurs
    ├── utils/
    │   └── logger.ts                  # Service de logs contextuel Pino
    ├── commands/                      # Commandes slash réparties par domaine
    │   ├── general/
    │   │   ├── ping.ts                # Mesure latence API & WebSocket
    │   │   └── help.ts                # Liste dynamique des commandes
    │   └── system/
    │       └── status.ts              # Uptime, mémoire et informations hôte
    └── events/                        # Écouteurs d'événements Discord
        ├── client/
        │   ├── ready.ts               # Initialisation & notification de connexion
        │   └── error.ts               # Capture des erreurs de la Gateway
        └── interaction/
            └── interactionCreate.ts   # Transmission des interactions au routeur
```

---

## 🛠️ Commandes Disponibles

| Commande | Rôle |
|---|---|
| `pnpm dev` | Démarre le bot en mode développement avec rechargement automatique (`tsx watch`) |
| `pnpm deploy:commands` | Enregistre les commandes Slash auprès de l'API REST de Discord (serveur test si `GUILD_ID` défini, sinon global) |
| `pnpm deploy:commands:global` | Force l'enregistrement des commandes sur l'ensemble des serveurs (global) |
| `pnpm typecheck` | Vérifie les types TypeScript sans compiler (`tsc --noEmit`) |
| `pnpm build` | Compile le code source TypeScript vers `./dist` |
| `pnpm start` | Exécute la version compilée en production |

---

## ⚙️ Configuration (`.env`)

Copiez le fichier `.env.example` en `.env` :

```bash
cp .env.example .env
```

Renseignez vos variables :
```env
BOT_KEY=votre_token_secret_discord
CLIENT_ID=1552256142317453423

# Optionnel : Ajoutez l'identifiant d'un serveur Discord de test pour des mises à jour de commandes instantanées
# GUILD_ID=123456789012345678

NODE_ENV=development
LOG_LEVEL=info
```

---

## 🎨 Charte Graphique & Embeds (`AppEmbed`)

La constante de couleur orange du logo est définie dans `src/config/constants.ts` :
- `COLORS.ORANGE` : `0xF4762F`

Pour créer des embeds utilisant cette couleur par défaut, vous pouvez utiliser la classe `AppEmbed` ([`src/utils/embeds.ts`](src/utils/embeds.ts)) qui hérite de `EmbedBuilder` de Discord.js :

```typescript
import { AppEmbed } from '../../utils/embeds.js';

// Embed pré-configuré avec COLORS.ORANGE
const embed = new AppEmbed()
  .setTitle('🚀 Titre de mon Embed')
  .setDescription('Ceci est un embed aux couleurs du bot.');
```

---

## 💡 Ajouter une nouvelle commande Slash

Créez simplement un fichier dans `src/commands/<categorie>/<nom>.ts` :

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BaseCommand } from '../../structures/BaseCommand.js';
import type { BotClient } from '../../client/BotClient.js';

export default class MaCommande extends BaseCommand {
  public readonly data = new SlashCommandBuilder()
    .setName('bonjour')
    .setDescription('Dit bonjour à l\'utilisateur.');

  public constructor() {
    super({
      category: 'Général',
      cooldown: 5, // Cooldown de 5 secondes par utilisateur
      guildOnly: false, // Accessible en MP ou non
    });
  }

  public async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    await interaction.reply(`Bonjour ${interaction.user.username} ! 👋`);
  }
}
```

Déployez-la ensuite avec :
```bash
pnpm deploy:commands
```

---

## 💡 Ajouter un nouvel événement Discord

Créez un fichier dans `src/events/<domaine>/<nom>.ts` :

```typescript
import { Events, GuildMember } from 'discord.js';
import { BaseEvent } from '../../structures/BaseEvent.js';
import type { BotClient } from '../../client/BotClient.js';

export default class MemberJoinEvent extends BaseEvent<Events.GuildMemberAdd> {
  public readonly name = Events.GuildMemberAdd;

  public execute(client: BotClient, member: GuildMember): void {
    client.logger.info(`Nouveau membre : ${member.user.tag} a rejoint ${member.guild.name}`);
  }
}
```
Le bot charge automatiquement tous les fichiers de commandes et d'événements sans configuration manuelle supplémentaire !
