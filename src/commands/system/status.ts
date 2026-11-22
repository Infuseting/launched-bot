import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  version as djsVersion,
} from 'discord.js';
import process from 'node:process';
import os from 'node:os';
import { BaseCommand } from '../../structures/BaseCommand.js';
import type { BotClient } from '../../client/BotClient.js';
import { AppEmbed } from '../../utils/embeds.js';

export default class StatusCommand extends BaseCommand {
  public readonly data = new SlashCommandBuilder()
    .setName('status')
    .setDescription('Affiche l\'état du système, la consommation mémoire et les statistiques du bot.');

  public constructor() {
    super({
      category: 'Système',
      cooldown: 10,
    });
  }

  public async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const memory = process.memoryUsage();
    const heapUsedMb = (memory.heapUsed / 1024 / 1024).toFixed(2);
    const rssMb = (memory.rss / 1024 / 1024).toFixed(2);
    const totalMemoryMb = (os.totalmem() / 1024 / 1024).toFixed(0);

    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeStr = `${days}j ${hours}h ${minutes}m ${seconds}s`;

    const embed = new AppEmbed()
      .setTitle('📊 Statut & Télémétrie - Launched Bot')
      .addFields(
        {
          name: '⏱️ Uptime',
          value: `\`${uptimeStr}\``,
          inline: true,
        },
        {
          name: '🏓 Latence WebSocket',
          value: `\`${client.ws.ping}ms\``,
          inline: true,
        },
        {
          name: '🌐 Serveurs & Commandes',
          value: `Serveurs: \`${client.guilds.cache.size}\` | Commandes: \`${client.commands.size}\``,
          inline: true,
        },
        {
          name: '💾 Mémoire',
          value: `Heap: \`${heapUsedMb} MB\` / RSS: \`${rssMb} MB\` (Hôte: \`${totalMemoryMb} MB\`)`,
          inline: false,
        },
        {
          name: '⚙️ Environnement',
          value: `Node.js: \`${process.version}\` | Discord.js: \`v${djsVersion}\` | Plateforme: \`${os.platform()} (${os.arch()})\``,
          inline: false,
        }
      );

    await interaction.reply({ embeds: [embed] });
  }
}
