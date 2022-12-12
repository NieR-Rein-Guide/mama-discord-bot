import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, ComponentType, StringSelectMenuBuilder } from 'discord.js'
import getWeaponEmbed from '../utils/getWeaponEmbed'
import { ApiCostume, ApiWeapon, BaseDiscordCommand, BotIndexes } from '../..'
import { RARITY, WEAPON_TYPE_WORDS } from '../config'
import api from '../libs/api'
import getCostumeEmbed from '../utils/getCostumeEmbed'

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
  optionsLabels = {
    weapon_info: '⚔️ View Weapon',
    weapon_costume: '🧑 View Costume',
  }

  constructor(costumes: ApiWeapon[], index: BotIndexes['weaponsSearch']) {
    this.costumes = costumes;
    this.index = index;
  }

  async autocomplete (interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const choices = this.index.search(focusedValue)
      .map(item => item.item)
      .map(choice => ({
        name: `[${WEAPON_TYPE_WORDS[choice.weapon_type]}] -${choice.is_ex_weapon ? 'EX' : ''} ${choice.name} (${new Array(RARITY[choice.rarity]).fill('★').join('')})`,
        value: `${choice.weapon_id}`
      }))
      .slice(0, 10)

    interaction.respond(choices).catch(() => {})
  }

  async run (interaction: ChatInputCommandInteraction): Promise<void> {
    const id = interaction.options.getString('name')
    const options = [
      {
        label: this.optionsLabels.weapon_info,
        description: 'Weapon stats and abilities',
        value: 'weapon_info',
      },
    ]
    const embeds = new Map()

    /**
     * Weapon
     */
     const weapon = this.costumes.find((weapon) => `${weapon.weapon_id}` === id)
     const weaponCostumeData = await api.get(`/weapon/costume/${weapon.weapon_id}`)
     const weaponCostume: ApiCostume = weaponCostumeData.data
     const weaponEmbed = getWeaponEmbed(weapon, weaponCostume)

     embeds.set('weapon_info', weaponEmbed)

    /**
     * Weapon
     */

    if (weaponCostume?.costume_id) {
      const costumeEmbed = getCostumeEmbed(weaponCostume, weapon)
      embeds.set('weapon_costume', costumeEmbed)
      options.push({
        label: this.optionsLabels.weapon_costume,
        description: 'Weapon\'s costume stats and abilities',
        value: 'weapon_costume',
      })
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('weapon-pagination')
          .setPlaceholder('Weapon info')
          .addOptions(options)
      )

    const message = await interaction.reply({
      embeds: [embeds.get('weapon_info')],
      components: embeds.size > 1 ? [row] : []
    })

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60 * 1000,
    })

    collector.on('collect', (newInteraction) => {
      const value = newInteraction.values[0]

      const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('weapon-pagination')
          .setPlaceholder(this.optionsLabels[value])
          .addOptions(options)
      )

      newInteraction.update({
        embeds: [embeds.get(value)],
        components: embeds.size > 1 ? [row] : []
      })
    })

    collector.on('end', () => {
      interaction.editReply({
        components: [],
      })
    })
  }
}
