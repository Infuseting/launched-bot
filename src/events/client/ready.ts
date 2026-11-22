import { Events, type Client } from 'discord.js';
import { BaseEvent } from '../../structures/BaseEvent.js';
import type { BotClient } from '../../client/BotClient.js';

export default class ReadyEvent extends BaseEvent<Events.ClientReady> {
  public readonly name = Events.ClientReady;

  public constructor() {
    super(true);
  }

  public execute(client: BotClient, readyClient: Client<true>): void {
    client.logger.info(`Connecté avec succès sous le compte : ${readyClient.user.tag} (ID: ${readyClient.user.id})`);
    client.logger.info(`Actif sur ${readyClient.guilds.cache.size} serveur(s) | ${client.commands.size} commande(s) prête(s).`);
  }
}
