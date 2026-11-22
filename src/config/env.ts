import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const snowflakeRegex = /^\d{17,20}$/;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DISCORD_TOKEN: z.string().min(1, 'Le token Discord est requis.'),
  CLIENT_ID: z.string().regex(snowflakeRegex, 'Identifiant CLIENT_ID invalide (Snowflake requis)'),
  GUILD_ID: z.string().regex(snowflakeRegex, 'Identifiant GUILD_ID invalide (Snowflake requis)').optional(),
  OWNER_ID: z.string().regex(snowflakeRegex, 'Identifiant OWNER_ID invalide (Snowflake requis)').optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().url('DATABASE_URL PostgreSQL valide requise.'),
});

function parseEnvironment() {
  const rawToken = process.env.DISCORD_TOKEN || process.env.BOT_KEY;

  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    DISCORD_TOKEN: rawToken,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID || undefined,
    OWNER_ID: process.env.OWNER_ID || undefined,
    LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    DATABASE_URL: process.env.DATABASE_URL,
  };

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    console.error('❌ Configuration de l\'environnement (.env) invalide :');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return Object.freeze(result.data);
}

export type EnvConfig = z.infer<typeof envSchema>;
export const env: EnvConfig = parseEnvironment();
