import { SlashCommandBuilder } from '@discordjs/builders'
import { BOT_OWNER_DISCORD_TAG, INVITE_LINK, NRG_DISCORD_SERVER_INVITE_LINK } from '../config'
import { CommandInteraction, EmbedBuilder } from 'discord.js'
import { BaseDiscordCommand } from '../..'

export const HELP_DESCRIPTION = '**How to use my services?**\n\n' +
  '- Want to display a costume? type `/costume name` and start typing a name\n' +
  '- A weapon? Type `/weapon name`\n' +
  '- Or you can try your luck using `[[costume or weapon name]]` directly in a message! (*This might break in the future*)\n\n' +
  '**Invite link**\n' +
  `[Invite bot](${INVITE_LINK})\n\n` +
  `oh! one last thing, if you need further assistance/want to report a bug please contact **${BOT_OWNER_DISCORD_TAG}** or [**join nierrein.guide**](${NRG_DISCORD_SERVER_INVITE_LINK}) Discord server!`

export default class Help implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('How to use Mama bot?')

  embed = new EmbedBuilder()
    .setTitle('Hey besties, need some help?')
    .setDescription(HELP_DESCRIPTION)
    .setThumbnail('https://cdn.discordapp.com/emojis/822205475009200128.png?size=256')
    .setFooter({
      text: 'See you in The Cage!'
    })
    .setColor(5814783)

  async run (interaction: CommandInteraction): Promise<void> {
    interaction.reply({
      ephemeral: true,
      embeds: [this.embed]
    })
  }
}
