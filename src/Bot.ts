import { Client, Collection, Guild, Interaction, Message, EmbedBuilder } from 'discord.js'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import { PrismaClient } from '@prisma/client'
import { formatRegex } from './config'
import { getDataset } from './libs/api'
import { ApiCostume, ApiWeapon, BaseDiscordCommand, BotIndexes } from '..'
import getCostumeEmbed from './utils/getCostumeEmbed'
import getWeaponEmbed from './utils/getWeaponEmbed'
import { env } from './env'

export default class Bot {
  apiKey = '' // Discord API Key
  client: Client = null // The Discord Client

  rest = new REST({ version: '9' })

  commands = new Collection<string, BaseDiscordCommand>()

  indexes: BotIndexes = {
    search: null,
    costumesSearch: null,
    weaponsSearch: null,
  }

  // Blacklist
  blacklist = new Map()

  constructor (client: Client, apiKey: string) {
    this.client = client
    this.apiKey = apiKey
    this.rest.setToken(apiKey)

    this.client.once('ready', async () => {
      this.initSlashCommands()
    })

    // Add listeners here
    this.client.on('guildCreate', this.onGuildCreate)
    this.client.on('guildDelete', this.onGuildDelete)
    this.client.on('interactionCreate', this.onInteractionCreate)
    this.client.on('messageCreate', this.messageCreate)

    // Cleared every hour
    setInterval(() => {
      this.blacklist.clear()
    }, 3600000)
  }

  /**
   * Run a / command
   */
  onInteractionCreate = async (interaction: Interaction): Promise<void> => {
    try {
      if (interaction.isAutocomplete()) {
        const command = this.commands.get(interaction.commandName)
        await command.autocomplete(interaction)
      }

      if (interaction.isCommand()) {
        const command = this.commands.get(interaction.commandName)
        await command.run(interaction)
      }
    } catch (error) {
      console.error(error, interaction)
      if (interaction.isCommand()) {
        interaction.reply({
          content: 'Sorry, There was an unknown error. Please try again.',
          ephemeral: true
        })
      }
    }
  }

  initSlashCommands = async (): Promise<void> => {
    try {
      console.log('Started refreshing application (/) commands.')

      const body = this.commands.map(command => command.data.toJSON())

      if (env.NODE_ENV === 'development') {
        await this.rest.put(
          Routes.applicationGuildCommands(
            env.DISCORD_CLIENT_ID,
            env.DISCORD_GUILD_ID
          ),
          { body }
        )
      }

      if (env.NODE_ENV === 'production') {
        await this.rest.put(
          Routes.applicationCommands(env.DISCORD_CLIENT_ID),
          { body }
        )
      }

      console.log('Successfully reloaded application (/) commands.')
    } catch (error) {
      console.error(error)
    }
  }

  messageCreate = async (message: Message): Promise<any> => {
    if (message.author.bot || this.blacklist.has(message.author.id)) {
      return
    }

    const prisma = new PrismaClient()

    try {
      let matches = [...message.content.matchAll(formatRegex)]

      // If the user is using too much references at once, add to temp blacklist
      if (matches.length > 3) {
        if (this.blacklist.has(message.author.id)) {
          const count = this.blacklist.get(message.author.id)
          this.blacklist.set(message.author.id, count + 1)

          if (count >= 4) {
            return message.reply(`${message.member}, Mama is not happy. Please don't spam the channel with too many references at once! Max is 3 per message.`)
          }
        } else {
          this.blacklist.set(message.author.id, 0)
        }

        // Truncate the matches to 3 to avoid spam
        matches = matches.slice(0, 3);
      }

      if (matches?.length > 0 ) {
        for (const match of matches) {
          const alias = match[0].replaceAll('[', '').replaceAll(']', '').trim()
          // First step is to try to find a specific reference
          const reference = await prisma.references.findFirst({
            where: {
              alias,
            }
          })

          // An alias has been found in the database, use it in priority
          if (reference) {
            if (reference.type === 'costume') {
              const [firstResult] = this.indexes.costumesSearch.search(reference.item_id)
              const costume: ApiCostume = firstResult.item
              const embed = getCostumeEmbed(costume)

              console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" and reference "${reference.alias}" to reference ${costume.character.name} - ${costume.title}`)

              message.channel.send({ embeds: [embed] })
            }

            if (reference.type === 'weapon') {
              const [firstResult] = this.indexes.weaponsSearch.search(reference.item_id)
              const weapon = firstResult.item as ApiWeapon
              const embed = getWeaponEmbed(weapon)

              console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" and reference "${reference.alias}" to reference ${weapon.name}`)

              message.channel.send({ embeds: [embed] })
            }

            continue
          }

          // If no alias has been found, try finding it with fuzzy search
          const [firstResult] = this.indexes.search.search(alias)

          if (!firstResult) {
            console.warn(`${message.author.username}#${message.author.discriminator} used "${alias}" but yield no result.`)

            message.reply(`I am so sorry, Mama couldn't find anything useful from \`${alias}\`.\nTry searching the costume's title like \`[[Reborn Contractor]]\` or \`[[Sickly Exile]]\``)
            continue
          }

          // Score isn't satisfying, try searching separately
          // 0 is perfect match, 1 is not a match
          if (firstResult.score >= 0.007) {
            const [costumeResult] = this.indexes.costumesSearch.search(alias)

            // No viable costume was found
            // trying searching for a weapon instead
            if (!costumeResult || costumeResult.score >= 0.007) {
              const [weaponResult] = this.indexes.weaponsSearch.search(alias)

              // No weapon either? Welp no luck.
              if (!weaponResult) {
                console.warn(`${message.author.username}#${message.author.discriminator} used "${alias}" but yield no result.`)
                message.reply(`I am so sorry, Mama couldn't find anything useful from \`${alias}\`.\nTry searching the costume's title like \`[[Reborn Contractor]]\` or \`[[Sickly Exile]]\``)
                continue
              }

              const weapon = weaponResult.item as ApiWeapon
              const embed = getWeaponEmbed(weapon)

              console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" to reference ${weapon.name}`)

              message.channel.send({ embeds: [embed] })

              continue
            }

            const costume: ApiCostume = costumeResult.item as ApiCostume
            const embed = getCostumeEmbed(costume)


            console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" to reference ${costume.character.name} - ${costume.title}`)

            message.channel.send({ embeds: [embed] })

            continue
          }

          // It's a costume
          if (firstResult.item.costume_id) {
            const costume = firstResult.item as ApiCostume
            const embed = getCostumeEmbed(costume)
            console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" to reference ${costume.character.name} - ${costume.title}`)
            message.channel.send({ embeds: [embed] })
          }
          // It's a weapon
          else {
            const weapon = firstResult.item as ApiWeapon
            const embed = getWeaponEmbed(weapon)

            console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" to reference ${weapon.name}`)

            message.channel.send({ embeds: [embed] })
          }

          continue
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      prisma.$disconnect();
    }
  }

  /**
   * Send some basic instructions on guild join
   */
  onGuildCreate = (guild: Guild): void => {
    console.log(`${guild.name} (${guild.id}) has been added.`)

    if (!guild.systemChannel) {
      return console.warn(`Could not send "guildCreate" message to ${guild.id}`)
    }

    const embed = new EmbedBuilder()
      .setTitle('Hey besties, thank you for inviting me ! :blush:')
      .setDescription(
        '@TODO'
      )
      .setFooter({
        text: 'See you in The Cage!'
      })
      .setColor(5814783)

    guild.systemChannel.send({ embeds: [embed] })
      .catch(() => console.warn(`Could not send "guildCreate" message to ${guild.id}`))
  }

  /**
   * On guild delete
   */
  onGuildDelete = async (guild: Guild): Promise<void> => {
    console.log(`${guild.name} (${guild.id}) has been removed.`)
  }

  /**
   * Add a command to the bot's list
   *
   * @param {Object} command
   * @returns
   * @memberof Bot
   */
  addCommand = (command: BaseDiscordCommand): this => {
    this.commands.set(command.data.name, command)
    return this
  }

  /**
   * Tasks to run before connecting the bot
   */
  prerun = async (): Promise<void> => {
    console.log('Fetching dataset')
    const { search, costumesSearch, weaponsSearch }  = await getDataset()
    this.indexes.search = search;
    this.indexes.costumesSearch = costumesSearch;
    this.indexes.weaponsSearch = weaponsSearch;
    console.log('Dataset is ready')
  }

  /**
   * Run the bot
   *
   * @memberof Bot
   */
  run = async (): Promise<void> => {
    console.log('Connecting to Discord...')
    try {
      await this.prerun()
      await this.client.login(this.apiKey)
    } catch (error) {
      console.error('Error while connecting to Discord :', error)
    }
  }
}
