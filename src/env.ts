import { str, envsafe, url } from 'envsafe';

export const env = envsafe({
  NODE_ENV: str({
    devDefault: 'development',
    choices: ['development', 'production'],
  }),
  DISCORD_CLIENT_ID: str({}),
  DISCORD_BOT_TOKEN: str({}),
  DISCORD_GUILD_ID: str({
    desc: 'Used to refresh slash commands in dev mode.',
  }),
  API_URL: url({
    devDefault: 'http://localhost:3000/api/',
    desc: 'The API base URL with trailing slash.'
  }),
});