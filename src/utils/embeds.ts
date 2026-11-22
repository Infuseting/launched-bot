import { EmbedBuilder, type EmbedData } from 'discord.js';
import { COLORS } from '../config/constants.js';

export class AppEmbed extends EmbedBuilder {
  public constructor(data?: EmbedData) {
    super(data);
    this.setColor(COLORS.ORANGE);
  }
}
