import { Events, Interaction } from 'discord.js';
import { BaseEvent } from '../../structures/BaseEvent.js';
import type { BotClient } from '../../client/BotClient.js';

export default class InteractionCreateEvent extends BaseEvent<Events.InteractionCreate> {
  public readonly name = Events.InteractionCreate;

  public async execute(client: BotClient, interaction: Interaction): Promise<void> {
    await client.interactionHandler.handle(interaction);
  }
}
