import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BaseCommand } from '../../structures/BaseCommand.js';
import type { BotClient } from '../../client/BotClient.js';

export default class PingCommand extends BaseCommand {
  public readonly data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Affiche la latence WebSocket et le temps de réponse de l\'API.');

  public constructor() {
    super({
      category: 'Général',
      cooldown: 5,
    });
  }

  public async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const sent = await interaction.reply({
      content: '🏓 Calcul de la latence...',
      fetchReply: true,
    });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = client.ws.ping;

    await interaction.editReply(
      `🏓 **Pong !**\n• Temps de réponse API : \`${roundtrip}ms\`\n• Latence WebSocket : \`${wsPing}ms\``
    );
  }
}
