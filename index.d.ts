import { ApplicationCommandOptionChoiceData, CommandInteraction } from "discord.js"
import Fuse from 'fuse.js'

/**
 * Model character
 *
 */
 export type character = {
  character_id: number
  name: string | null
  image_path: string | null
}

/**
 * Model character_rank_bonus
 *
 */
export type character_rank_bonus = {
  rank_bonus_id: number
  rank_bonus_level: number
  character_id: number
  description: string | null
  stat: string | null
  type: string | null
  amount: number
}

/**
 * Model companion
 *
 */
export type companion = {
  companion_id: number
  attribute: string | null
  type: string | null
  release_time: Date
  name: string | null
  story: string | null
  image_path_base: string | null
}

/**
 * Model companion_ability
 *
 */
export type companion_ability = {
  ability_id: number
  ability_level: number
  name: string | null
  description: string | null
  image_path_base: string | null
}

/**
 * Model companion_ability_link
 *
 */
export type companion_ability_link = {
  companion_id: number
  companion_level: number
  ability_id: number
  ability_level: number
}

/**
 * Model companion_skill
 *
 */
export type companion_skill = {
  skill_id: number
  skill_level: number
  cooldown_time: number
  name: string | null
  description: string | null
  short_description: string | null
  image_path: string | null
}

/**
 * Model companion_skill_link
 *
 */
export type companion_skill_link = {
  companion_id: number
  companion_level: number
  skill_id: number
  skill_level: number
}

/**
 * Model companion_stat
 *
 */
export type companion_stat = {
  companion_id: number
  level: number
  atk: number
  hp: number
  vit: number
}

/**
 * Model costume
 *
 */
export type costume = {
  costume_id: number
  character_id: number
  emblem_id: number | null
  weapon_type: string | null
  rarity: string | null
  release_time: Date
  is_ex_costume: boolean
  slug: string | null
  title: string | null
  description: string | null
  image_path_base: string | null
}

/**
 * Model costume_ability
 *
 */
export type costume_ability = {
  ability_id: number
  ability_level: number
  name: string | null
  description: string | null
  image_path_base: string | null
}

/**
 * Model costume_ability_link
 *
 */
export type costume_ability_link = {
  costume_id: number
  ability_slot: number
  ability_id: number
  ability_level: number
}

/**
 * Model costume_skill
 *
 */
export type costume_skill = {
  skill_id: number
  skill_level: number
  gauge_rise_speed: string | null
  cooldown_time: number
  name: string | null
  description: string | null
  short_description: string | null
  image_path: string | null
}

/**
 * Model costume_skill_link
 *
 */
export type costume_skill_link = {
  costume_id: number
  skill_id: number
  skill_level: number
}

/**
 * Model costume_stat
 *
 */
export type costume_stat = {
  costume_id: number
  level: number
  agi: number
  atk: number
  crit_atk: number
  crit_rate: number
  eva_rate: number
  hp: number
  vit: number
}

/**
 * Model emblem
 *
 */
export type emblem = {
  emblem_id: number
  name: string | null
  main_message: string | null
  small_messages: string | null
  icon_path: string | null
}

/**
 * Model memoir
 *
 */
export type memoir = {
  memoir_id: number
  lottery_id: number
  rarity: string | null
  release_time: Date
  name: string | null
  story: string | null
  image_path_base: string | null
  MemoirSeriesId: number | null
}

/**
 * Model memoir_series
 *
 */
export type memoir_series = {
  memoir_series_id: number
  name: string | null
  small_set_description: string | null
  large_set_description: string | null
}

/**
 * Model weapon
 *
 */
export type weapon = {
  weapon_id: number
  evolution_group_id: number
  evolution_order: number
  weapon_type: string | null
  rarity: string | null
  attribute: string | null
  is_ex_weapon: boolean
  release_time: Date | null
  slug: string | null
  name: string | null
  image_path: string | null
}

/**
 * Model weapon_ability
 *
 */
export type weapon_ability = {
  ability_id: number
  ability_level: number
  name: string | null
  description: string | null
  image_path_base: string | null
}

/**
 * Model weapon_ability_link
 *
 */
export type weapon_ability_link = {
  weapon_id: number
  slot_number: number
  ability_id: number
  ability_level: number
}

/**
 * Model weapon_skill
 *
 */
export type weapon_skill = {
  skill_id: number
  skill_level: number
  cooldown_time: number
  name: string | null
  description: string | null
  short_description: string | null
  image_path: string | null
}

/**
 * Model weapon_skill_link
 *
 */
export type weapon_skill_link = {
  weapon_id: number
  slot_number: number
  skill_id: number
  skill_level: number
}

/**
 * Model weapon_stat
 *
 */
export type weapon_stat = {
  weapon_id: number
  level: number
  atk: number
  hp: number
  vit: number
}

/**
 * Model weapon_story
 *
 */
export type weapon_story = {
  id: number
  story: string | null
}

/**
 * Model weapon_story_link
 *
 */
export type weapon_story_link = {
  weapon_id: number
  weapon_story_id: number
}

export type ApiCostume = (costume & {
  character: character;
  costume_ability_link: (costume_ability_link & {
      costume_ability: costume_ability;
  })[];
  costume_skill_link: (costume_skill_link & {
      costume_skill: costume_skill;
  })[];
  costume_stat: costume_stat[];
})

export type ApiWeapon = (weapon & {
  weapon_ability_link: (weapon_ability_link & {
      weapon_ability: weapon_ability;
  })[];
  weapon_skill_link: (weapon_skill_link & {
      weapon_skill: weapon_skill;
  })[];
  weapon_stat: weapon_stat[];
  weapon_story_link: (weapon_story_link & {
    weapon_story: weapon_story
})[];
})

export interface BotIndexes {
  search: Fuse<any>
  costumesSearch: Fuse<ApiCostume>
  weaponsSearch: Fuse<ApiWeapon>
}

export interface BaseDiscordCommand {
  name?: string
  arguments?: string[]
  description?: string
  category?: string

  data?: SlashCommandBuilder | any

  run(...args): Promise<Message | Message[] | void>
  autocomplete?(...args): Promise<any>
  handleSelect?(...args): Promise<void | Message>
}

export interface ApiTierlistItem {
  id:                   number;
  tier_id:              number;
  item_id:              number;
  position:             number;
  tooltip:              null | string;
  tooltip_is_important: boolean | null;
  tiers:                Tiers;
}

export interface Tiers {
  id:          number;
  tierlist_id: number;
  tier:        string;
  position:    number;
  description: null | string;
  tierslists:  Tierslists;
}

export interface Tierslists {
  tierlist_id: number;
  title:       string;
  description: string;
  type:        'costumes' | 'weapons';
  created_at:  Date;
  slug:        string;
  attribute:   Attribute;
  votes:       number;
  updated_at:  Date;
  edit_key:    string;
}

export enum Attribute {
  All = "all",
}

