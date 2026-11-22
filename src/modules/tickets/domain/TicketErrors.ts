export class TicketError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'TicketError';
  }
}

export class TicketNotFoundError extends TicketError {
  public constructor(identifier: string) {
    super(`Ticket introuvable pour la référence : ${identifier}`);
    this.name = 'TicketNotFoundError';
  }
}

export class TicketLimitReachedError extends TicketError {
  public constructor(current: number, max: number) {
    super(`Vous avez atteint la limite de tickets ouverts (${current}/${max}).`);
    this.name = 'TicketLimitReachedError';
  }
}

export class TicketPermissionError extends TicketError {
  public constructor(action: string) {
    super(`Vous ne possédez pas les autorisations nécessaires pour : ${action}`);
    this.name = 'TicketPermissionError';
  }
}

export class TicketConfigMissingError extends TicketError {
  public constructor(guildName: string) {
    super(`Le système de tickets n'est pas encore configuré sur le serveur "${guildName}". Utilisez \`/ticket-admin setup\` pour l'initialiser.`);
    this.name = 'TicketConfigMissingError';
  }
}
