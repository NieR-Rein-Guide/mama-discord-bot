import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, ComponentType, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js'
import getWeaponEmbed from '../utils/getWeaponEmbed'
import { ApiCostume, ApiWeapon, BaseDiscordCommand, BotIndexes } from '../..'
import { emojis, RARITY, WEAPON_TYPE_WORDS } from '../config'
import api from '../libs/api'
import getCostumeEmbed from '../utils/getCostumeEmbed'
import urlSlug from 'slugg'

export default class Weapon implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('weapon')
    .setDescription('View weapon details')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Weapon name to search for')
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption(option =>
          option.setName('view')
            .setDescription('Select which information to view first')
            .setRequired(false)
            .addChoices(
              { name: '⚔️ View Weapon', value: 'weapon_info' },
              { name: '📜 View skills and abilities', value: 'weapon_skills' },
              { name: '🧑 View Costume', value: 'weapon_costume' },
            ))

  costumes: ApiWeapon[] = []
  index: BotIndexes['weaponsSearch']
  optionsLabels = {
    weapon_info: '⚔️ View Weapon',
    weapon_skills: '📜 View skills and abilities',
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
    let selectedView = interaction.options.getString('view') || 'weapon_info'

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
     const weaponCostumeData = await api.get(`/weapon/costume/${weapon.weapon_id}`).catch(() => undefined)
     const weaponCostume: ApiCostume = weaponCostumeData?.data

     // No costume found for weapon force switch to weapon_info view
     if (!weaponCostume && selectedView === 'weapon_costume') {
      selectedView = 'weapon_info'
     }

     const weaponEmbed = getWeaponEmbed(weapon, weaponCostume)

     embeds.set('weapon_info', weaponEmbed)

     /**
     * Weapon skills
     */
    let weaponSkillsDescription = ''

    weaponSkillsDescription += `\n\n\`Skills\`:\n${[...weapon.weapon_skill_link].splice(0, 2).map(skill => `${emojis.skill} __${skill.weapon_skill.name}__ (*${skill.weapon_skill.cooldown_time / 30}sec*)\n${skill.weapon_skill.description}`).join('\n')}`

    weaponSkillsDescription += `\n\n\`Abilities\`:\n${[...weapon.weapon_ability_link].splice(0, 2).map(ability => `${emojis.ability} [**${ability.weapon_ability.name}**](https://nierrein.guide/ability/weapon/${urlSlug(ability.weapon_ability.name)}-${ability.weapon_ability.ability_id}) \n${ability.weapon_ability.description}`).join('\n')}`

    const weaponSkillsEmbeds = EmbedBuilder.from(weaponEmbed)
      .setDescription(weaponSkillsDescription)

    embeds.set('weapon_skills', weaponSkillsEmbeds)
    options.push({
      label: this.optionsLabels.weapon_skills,
      description: 'Weapon\'s skills',
      value: 'weapon_skills',
    })

    /**
     * Weapon's costume
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
      embeds: [embeds.get(selectedView)],
      components: embeds.size > 1 ? [row] : []
    })

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60 * 1000 * 10,
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
