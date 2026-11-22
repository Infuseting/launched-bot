import type { ClientEvents } from 'discord.js';
import type { BotClient } from '../client/BotClient.js';

export abstract class BaseEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  public abstract readonly name: K;
  public readonly once: boolean;

  protected constructor(once: boolean = false) {
    this.once = once;
  }

  public abstract execute(
    client: BotClient,
    ...args: ClientEvents[K]
  ): Promise<void> | void;
}
