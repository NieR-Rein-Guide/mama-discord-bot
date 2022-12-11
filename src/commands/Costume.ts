import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, ComponentType, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js'
import getCostumeEmbed from '../utils/getCostumeEmbed'
import { ApiCostume, ApiTierlistItem, ApiWeapon, BaseDiscordCommand, BotIndexes } from '../..'
import { FEATURED_TIERLISTS, RARITY } from '../config'
import api from '../libs/api'
import getWeaponEmbed from '../utils/getWeaponEmbed'

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
  optionsLabels = {
    costume_info: '🧑 View Costume',
    costume_weapon: '⚔️ View Weapon',
    tierlist_info: '📊 View Tierlist position'
  }

  constructor(costumes: ApiCostume[], index: BotIndexes['costumesSearch']) {
    this.costumes = costumes;
    this.index = index;
  }

  async autocomplete (interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const choices = this.index.search(focusedValue)
      .map(item => item.item)
      .map(choice => ({
        name: `${choice.is_ex_costume ? 'EX ' : ''}${choice.character.name} - ${choice.title} (${new Array(RARITY[choice.rarity]).fill('★').join('')})`,
        value: `${choice.costume_id}`
      }))
      .slice(0, 10)

    await interaction.respond(choices).catch(() => {});
  }

  async run (interaction: ChatInputCommandInteraction): Promise<void> {
    const id = interaction.options.getString('name')
    const options = [
      {
        label: this.optionsLabels.costume_info,
        description: 'Costume stats and abilities',
        value: 'costume_info',
      },
    ]
    const embeds = new Map()

    /**
     * Costume
     */
    const costume = this.costumes.find((costume) => `${costume.costume_id}` === id)

    const [costumeEmbed, costumeWeaponData] = await Promise.all([
      getCostumeEmbed(costume),
      api.get(`/costume/weapon/${costume.costume_id}`)
    ])

    embeds.set('costume_info', costumeEmbed)

    /**
     * Weapon
     */
    const costumeWeapon: ApiWeapon = costumeWeaponData.data
    if (costumeWeapon.weapon_id) {
      const weaponEmbed = getWeaponEmbed(costumeWeapon)
      embeds.set('costume_weapon', weaponEmbed)
      options.push({
        label: this.optionsLabels.costume_weapon,
        description: 'Costume\'s weapon stats and abilities',
        value: 'costume_weapon',
      })
    }

    /**
     * Tierlists
     */

     const tierlistsItemsResponse = await api.get(`/tierlists/item/${costume.costume_id}`)
     const tierlistsItems: ApiTierlistItem[] = tierlistsItemsResponse.data
     if (tierlistsItems?.length > 0) {

      options.push({
        label: this.optionsLabels.tierlist_info,
        description: 'Costume\'s tierlist position',
        value: 'tierlist_info',
      })

      let description = '';

      for (const tierlistItem of tierlistsItems) {
        const tierlistId = tierlistItem.tiers.tierslists.tierlist_id
        const isPve = FEATURED_TIERLISTS.pve.includes(tierlistId)
        const isPvp = FEATURED_TIERLISTS.pvp.includes(tierlistId)
        if (isPve || isPvp) {
          description += `\n${isPvp ? 'PvP ': ''}[${tierlistItem.tiers.tierslists.title}](https://nierrein.guide/tierlist/${tierlistItem.tiers.tierslists.slug}): **${tierlistItem.tiers.tier}**`
         }
       }

      const embed = EmbedBuilder.from(costumeEmbed)
        .setDescription(description)
      embeds.set('tierlist_info', embed)
     }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('costume-pagination')
          .setPlaceholder('Costume info')
          .addOptions(options)
      )

    const message = await interaction.reply({
      embeds: [embeds.get('costume_info')],
      components: [row],
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
          .setCustomId('costume-pagination')
          .setPlaceholder(this.optionsLabels[value])
          .addOptions(options)
      )

      newInteraction.update({
        embeds: [embeds.get(value)],
        components: [row]
      })
    })

    collector.on('end', () => {
      interaction.editReply({
        components: [],
      })
    })
  }
}
