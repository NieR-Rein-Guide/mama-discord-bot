import { MeiliSearch } from "meilisearch";
import { ApiCostume, ApiWeapon } from "../..";
import { env } from "../env";

export async function updateDocuments(costumes: ApiCostume[], weapons: ApiWeapon[]) {
  const meilisearch = new MeiliSearch({
    host: "https://search.nierrein.guide",
    apiKey: env.MEILISEARCH_MASTER_KEY,
  });

  const costumesDocuments = costumes.map((costume) => ({
    id: costume.costume_id,
    character_name: costume.character.name,
    title: costume.title,
    description: costume.description,
    abilities: costume.costume_ability_link.map((ability) => ({
      name: ability.costume_ability.name,
      description: ability.costume_ability.description,
    })),
    skill: costume.costume_skill_link.map((skill) => ({
      name: skill.costume_skill.name,
      description: skill.costume_skill.description,
      short_description: skill.costume_skill.short_description,
    }))
  }))

  const weaponsDocuments = weapons.map((weapon) => ({
    id: weapon.weapon_id,
    name: weapon.name,
    story: weapon.weapon_story_link.map((story) => story.weapon_story.story).join('\n\n'),
    abilities: weapon.weapon_ability_link.map((ability) => ({
      name: ability.weapon_ability.name,
      description: ability.weapon_ability.description,
    })),
    skill: weapon.weapon_skill_link.map((skill) => ({
      name: skill.weapon_skill.name,
      description: skill.weapon_skill.description,
      short_description: skill.weapon_skill.short_description,
    }))
  }))

  console.log('[Meilisearch] Updating documents...')
  const costumesIndex = meilisearch.index("costumes")
  await costumesIndex.addDocuments(costumesDocuments)
  const weaponsIndex = meilisearch.index("weapons")
  await weaponsIndex.addDocuments(weaponsDocuments)
  console.log('[Meilisearch] Updated.')
}

