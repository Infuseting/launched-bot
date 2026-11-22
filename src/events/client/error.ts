import { Events } from 'discord.js';
import { BaseEvent } from '../../structures/BaseEvent.js';
import type { BotClient } from '../../client/BotClient.js';

export default class ErrorEvent extends BaseEvent<Events.Error> {
  public readonly name = Events.Error;

  public execute(client: BotClient, error: Error): void {
    client.logger.error(`Erreur émise par la Gateway Discord : ${error.message}`, error.stack);
  }
}
