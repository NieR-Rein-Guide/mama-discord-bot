import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, Colors, ComponentType, Embed, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js'
import getCostumeEmbed from '../utils/getCostumeEmbed'
import { ApiCostume, ApiTierlistItem, ApiWeapon, BaseDiscordCommand, BotIndexes, debris } from '../..'
import { emojis, FEATURED_TIERLISTS, RARITY } from '../config'
import api from '../libs/api'
import getWeaponEmbed from '../utils/getWeaponEmbed'
import urlSlug from 'slugg'

export default class Costume implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('costume')
    .setDescription('View costume details')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Costume name to search for')
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption(option =>
          option.setName('view')
            .setDescription('Select which information to view first')
            .setRequired(false)
            .addChoices(
              { name: '🧑 Costume', value: 'costume_info' },
              { name: '📜Costume skills and abilities', value: 'costume_skills' },
              { name: '⚔️ Costume weapon', value: 'costume_weapon' },
              { name: '📊 Tierlist', value: 'tierlist_info' },
              { name: '📚 View weapon stories', value: 'weapon_stories' },
            ))

  costumes: ApiCostume[] = []
  index: BotIndexes['costumesSearch']
  optionsLabels = {
    costume_info: '🧑 View Costume',
    costume_skills: '📜 View skills and abilities',
    costume_weapon: '⚔️ View Weapon',
    tierlist_info: '📊 View Tierlist position',
    costume_story: '📚 View costume story',
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
    const selectedView = interaction.options.getString('view') || 'costume_info'

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
    let costume = this.costumes.find((costume) => `${costume.costume_id}` === id)

    if (!costume) {
      const [firstResult] = this.index.search(id)

      if (!firstResult) {
        const embed = new EmbedBuilder()
          .setDescription(`I am sorry, Mama could not find anything useful for \`${id}\``)
          .setColor(Colors.Red)

        interaction.reply({
          embeds: [embed],
          ephemeral: true,
        })

        console.log(`${interaction.user.username}#${interaction.user.discriminator} used "/costume <${id}> <${selectedView}>" but no costume found. [in Guild:${interaction.guild?.name}]`)
        return
      }

      costume = firstResult.item as ApiCostume
    }

    console.log(`${interaction.user.username}#${interaction.user.discriminator} used "/costume <${id}> <${selectedView}>" to reference ${costume?.character?.name} - ${costume?.title} [in Guild:${interaction.guild?.name}]`)

    const costumeWeaponData = await api.get(`/costume/weapon/${costume.costume_id}`)
    const costumeWeapon: ApiWeapon = costumeWeaponData?.data
    const costumeDebrisData = await api.get(`/costume/debris/${costume.costume_id}`)
    const costumeDebris = costumeDebrisData?.data as debris
    const costumeEmbed = getCostumeEmbed(costume, costumeWeapon, costumeDebris)
    embeds.set('costume_info', costumeEmbed)

    /**
     * Costume skill and abilities
     */

    let costumeSkillsDescription = ''
    costumeSkillsDescription += `\`Skill\`\n${emojis.skill} __${costume.costume_skill_link[0].costume_skill.name}__ (Gauge ${costume.costume_skill_link[0].costume_skill.gauge_rise_speed})\n${costume.costume_skill_link[0].costume_skill.description}`

    costumeSkillsDescription += `\n\n\`Abilities\`\n${[...costume.costume_ability_link].splice(0, 2).map(ability => `${emojis.ability} [**${ability.costume_ability.name}**](https://nierrein.guide/ability/costume/${urlSlug(ability.costume_ability.name)}-${ability.costume_ability.ability_id})\n${ability.costume_ability.description}`).join('\n')}`

    if (costume.costume_ability_link[2]) {
      const awakeningAbility = costume.costume_ability_link[2]
      costumeSkillsDescription += `\n\n${emojis.awakening3} \`Awakening Ability\`\n${emojis.ability} ${`[**${awakeningAbility.costume_ability.name}**](${urlSlug(awakeningAbility.costume_ability.name)}-${awakeningAbility.costume_ability.ability_id})\n${awakeningAbility.costume_ability.description}`}`
    }

    if (costumeDebris) {
      costumeSkillsDescription += `\n\n${emojis.awakening5} \`Debris\`\n${emojis.ability} **${costumeDebris.name.replace('Debris: ', '')}**\n ${costumeDebris.description_long}`
    }

    const costumeSkillsEmbeds = EmbedBuilder.from(costumeEmbed)
      .setDescription(costumeSkillsDescription)

    embeds.set('costume_skills', costumeSkillsEmbeds)
    options.push({
      label: this.optionsLabels.costume_skills,
      description: 'Costume skill and abilities',
      value: 'costume_skills',
    })

    /**
     * Costume story
     */

    const costumeStoryEmbed = EmbedBuilder.from(costumeEmbed)
    costumeStoryEmbed.setDescription(
      costume.description
        .replaceAll('\\n', ' ')
    )

    embeds.set('costume_story', costumeStoryEmbed)
    options.push({
      label: this.optionsLabels.costume_story,
      description: 'View costume story',
      value: 'costume_story',
    })

    /**
     * Weapon
     */

    if (costumeWeapon?.weapon_id) {
      const weaponEmbed = getWeaponEmbed(costumeWeapon, costume)
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

     const tierlistsItemsResponse = await api.get(`/tierlists/item/${costume.costume_id}`).catch(() => undefined)

     const tierlistsItems: ApiTierlistItem[] = tierlistsItemsResponse?.data

     const hasPinnedTierlists = tierlistsItems?.some((tierlistItem) => {
      const tierlistId = tierlistItem.tiers.tierslists.tierlist_id
      const isPve = FEATURED_TIERLISTS.pve.includes(tierlistId)
      const isPvp = FEATURED_TIERLISTS.pvp.includes(tierlistId)

      if (isPve || isPvp) {
        return true
      }

      return false
     })

     if (hasPinnedTierlists) {

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
      embeds: [embeds.get(selectedView)],
      components: [row],
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
          .setCustomId('costume-pagination')
          .setPlaceholder(this.optionsLabels[value])
          .addOptions(options)
      )

      console.log(`${newInteraction.user.username}#${newInteraction.user.discriminator} updated existing embed "/costume <${id}> <${selectedView}>" to view ${value} - ${costume?.character?.name} - ${costume?.title} [in Guild:${newInteraction.guild?.name}]`)


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
