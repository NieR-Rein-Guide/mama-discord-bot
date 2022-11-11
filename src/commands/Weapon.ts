import { SlashCommandBuilder } from '@discordjs/builders'
import { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js'
import getWeaponEmbed from '../utils/getWeaponEmbed'
import { ApiWeapon, BaseDiscordCommand, BotIndexes } from '../..'
import { RARITY, WEAPON_TYPE_WORDS } from '../config'

export default class Weapon implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('weapon')
    .setDescription('View weapon details')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Weapon name to search for')
        .setRequired(true)
        .setAutocomplete(true))

  costumes: ApiWeapon[] = []
  index: BotIndexes['weaponsSearch']

  constructor(costumes: ApiWeapon[], index: BotIndexes['weaponsSearch']) {
    this.costumes = costumes;
    this.index = index;
  }

  async autocomplete (interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const choices = this.index.search(focusedValue)
      .map(item => item.item)
      .map(choice => ({ name: `[${WEAPON_TYPE_WORDS[choice.weapon_type]}] -${choice.is_ex_weapon ? 'EX' : ''} ${choice.name} (${new Array(RARITY[choice.rarity]).fill('★').join('')})`, value: choice.slug }))
      .slice(0, 10)

    await interaction.respond(choices);
  }

  async run (interaction: ChatInputCommandInteraction): Promise<void> {
    const slug = interaction.options.getString('name')

    const costume = this.costumes.find((costume) => costume.slug === slug)
    const embed = getWeaponEmbed(costume)

    interaction.reply({
      embeds: [embed],
    })
  }
}
