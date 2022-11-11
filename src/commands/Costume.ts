import { SlashCommandBuilder } from '@discordjs/builders'
import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, CommandInteraction } from 'discord.js'
import { BaseDiscordCommand } from '../..'

export default class Costume implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('costume')
    .setDescription('View costume details')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Costume name to search for')
        .setRequired(true)
        .setAutocomplete(true))

  async autocomplete (interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const choices = ['Popular Topics: Threads', 'Sharding: Getting started', 'Library: Voice Connections', 'Interactions: Replying to slash commands', 'Popular Topics: Embed preview'];
    const filtered = choices.filter(choice => choice.startsWith(focusedValue));
    await interaction.respond(
      filtered.map(choice => ({ name: choice, value: choice })),
    );
  }

  async run (interaction: CommandInteraction): Promise<void> {
    interaction.reply({ content: 'Hello there.', ephemeral: true })
  }
}
