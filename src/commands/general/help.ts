import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BaseCommand } from '../../structures/BaseCommand.js';
import type { BotClient } from '../../client/BotClient.js';
import { AppEmbed } from '../../utils/embeds.js';

export default class HelpCommand extends BaseCommand {
  public readonly data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes disponibles et leur description.');

  public constructor() {
    super({
      category: 'Général',
      cooldown: 5,
    });
  }

  public async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const categories = new Map<string, BaseCommand[]>();

    for (const command of client.commands.values()) {
      const cat = command.options.category || 'Autres';
      const list = categories.get(cat) ?? [];
      list.push(command);
      categories.set(cat, list);
    }

    const embed = new AppEmbed()
      .setTitle('📚 Centre d\'Aide - Launched Bot')
      .setDescription('Voici l\'ensemble des commandes slash disponibles sur le bot :');

    for (const [category, commands] of categories) {
      const formatted = commands
        .map((cmd) => `**\`/${cmd.name}\`** : ${cmd.data.description} *(délai: ${cmd.options.cooldown}s)*`)
        .join('\n');

      embed.addFields({
        name: `📁 ${category}`,
        value: formatted || '*Aucune commande*',
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
