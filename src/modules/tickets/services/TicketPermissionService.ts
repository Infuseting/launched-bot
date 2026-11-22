import { GuildMember, PermissionFlagsBits } from 'discord.js';
import type { TicketGuildConfig, TicketCategory } from '@prisma/client';

export class TicketPermissionService {
  /**
   * Vérifie si un membre est considéré comme staff pour une catégorie donnée (ou globalement)
   */
  public isStaff(
    member: GuildMember,
    guildConfig: TicketGuildConfig | null,
    category?: TicketCategory | null
  ): boolean {
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;

    const hasRole = (roleId: string): boolean => {
      if (!roleId) return false;
      if (member.roles && 'cache' in member.roles) {
        return member.roles.cache.has(roleId);
      }
      if (Array.isArray(member.roles)) {
        return (member.roles as unknown as string[]).includes(roleId);
      }
      return false;
    };

    // Rôle staff spécifique à la catégorie
    if (category?.supportRoleId && hasRole(category.supportRoleId)) {
      return true;
    }

    // Rôle support global
    if (guildConfig?.supportRoleId && hasRole(guildConfig.supportRoleId)) {
      return true;
    }

    // Rôle admin ticket
    if (guildConfig?.adminRoleId && hasRole(guildConfig.adminRoleId)) {
      return true;
    }

    return false;
  }

  /**
   * Vérifie si un membre possède les privilèges d'administration des tickets
   */
  public isAdmin(member: GuildMember, guildConfig: TicketGuildConfig | null): boolean {
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;

    if (guildConfig?.adminRoleId) {
      if (member.roles && 'cache' in member.roles) {
        return member.roles.cache.has(guildConfig.adminRoleId);
      }
      if (Array.isArray(member.roles)) {
        return (member.roles as unknown as string[]).includes(guildConfig.adminRoleId);
      }
    }

    return false;
  }
}
