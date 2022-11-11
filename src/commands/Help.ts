import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { BaseDiscordCommand } from '../..'

export default class Help implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get some information/links about the bot')

  async run (interaction: CommandInteraction): Promise<void> {
    interaction.reply({ content: 'Hello there.', ephemeral: true })
  }
}
