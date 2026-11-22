import { Collection } from 'discord.js';

export interface CooldownStatus {
  onCooldown: boolean;
  remaining: number;
}

export class CooldownManager {
  // Map<CommandName, Map<UserId, ExpirationTimestampMs>>
  private readonly cooldowns: Collection<string, Collection<string, number>> = new Collection();
  private readonly sweepInterval: NodeJS.Timeout;

  public constructor() {
    // Purge les entrées expirées toutes les 60 secondes pour éviter les fuites mémoire
    this.sweepInterval = setInterval(() => this.sweep(), 60_000);
    this.sweepInterval.unref();
  }

  public isOnCooldown(commandName: string, userId: string): CooldownStatus {
    const now = Date.now();
    let timestamps = this.cooldowns.get(commandName);

    if (!timestamps) {
      timestamps = new Collection<string, number>();
      this.cooldowns.set(commandName, timestamps);
    }

    const expirationTime = timestamps.get(userId);
    if (expirationTime && now < expirationTime) {
      const remaining = (expirationTime - now) / 1000;
      return { onCooldown: true, remaining };
    }

    return { onCooldown: false, remaining: 0 };
  }

  public setCooldown(commandName: string, userId: string, cooldownSeconds: number): void {
    if (cooldownSeconds <= 0) return;

    let timestamps = this.cooldowns.get(commandName);
    if (!timestamps) {
      timestamps = new Collection<string, number>();
      this.cooldowns.set(commandName, timestamps);
    }

    const expirationTime = Date.now() + cooldownSeconds * 1000;
    timestamps.set(userId, expirationTime);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [, timestamps] of this.cooldowns) {
      for (const [userId, exp] of timestamps) {
        if (now >= exp) {
          timestamps.delete(userId);
        }
      }
    }
  }

  public destroy(): void {
    clearInterval(this.sweepInterval);
    this.cooldowns.clear();
  }
}
