import { SlashCommandBuilder } from '@discordjs/builders'
import { AutocompleteInteraction, ChatInputCommandInteraction, CommandInteraction } from 'discord.js'
import getCostumeEmbed from '../utils/getCostumeEmbed'
import { ApiCostume, BaseDiscordCommand, BotIndexes } from '../..'

export default class Costume implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('costume')
    .setDescription('View costume details')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Costume name to search for')
        .setRequired(true)
        .setAutocomplete(true))

  costumes: ApiCostume[] = []
  index: BotIndexes['costumesSearch']

  constructor(costumes: ApiCostume[], index: BotIndexes['costumesSearch']) {
    this.costumes = costumes;
    this.index = index;
  }

  async autocomplete (interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const choices = this.index.search(focusedValue)
      .map(item => item.item)
      .map(choice => ({ name: choice.title, value: choice.slug }))
      .slice(0, 10)

    await interaction.respond(choices);
  }

  async run (interaction: ChatInputCommandInteraction): Promise<void> {
    const slug = interaction.options.getString('name')

    const costume = this.costumes.find((costume) => costume.slug === slug)
    const embed = getCostumeEmbed(costume)

    interaction.reply({
      embeds: [embed],
    })
  }
}
