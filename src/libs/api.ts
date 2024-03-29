import axios from 'axios'
import { ApiCostume, ApiWeapon, costume_ability, weapon_ability } from '../..';
import Fuse from 'fuse.js'
import { env } from '../env'

const api = axios.create({
  baseURL: env.API_URL,
  timeout: 10 * 1000,
});

export default api

export async function getDataset() {
  const { data: costumes }: {
    data: ApiCostume[]
  } = await api.get('/costumes')

  const { data: weapons }: {
    data: ApiWeapon[]
  } = await api.get('/weapons')

  const { data: costumesAbilities }: { data: costume_ability[] } = await api.get('/costume/abilities')
  const { data: weaponsAbilities }: { data: weapon_ability[] } = await api.get('/weapon/abilities')

  console.log(`[Dataset] Loaded ${costumes.length} costumes.`)
  console.log(`[Dataset] Loaded ${weapons.length} weapons.`)
  console.log(`[Dataset] Loaded ${costumesAbilities.length} costumes abilities.`)
  console.log(`[Dataset] Loaded ${weaponsAbilities.length} weapons abilities.`)

  if (costumes.length === 0 || weapons.length === 0) {
    throw new Error('Costumes or Weapons are empty.')
  }

  const modifiedCostumes = costumes.map((costume) => ({
    ...costume,
    fullname: `${costume.is_ex_costume ? 'EX ' : ''}${costume.character.name} ${costume.title}`,
  }))

  const modifiedWeapons = weapons.map((weapon) => ({
    ...weapon,
    fullname: `${weapon.is_ex_weapon ? 'EX ' : ''}${weapon.name}`,
  }))

  const search = new Fuse([...modifiedCostumes, ...modifiedWeapons], {
    keys: ['fullname'],
    includeScore: true,
  })

  const costumesSearch = new Fuse(modifiedCostumes, {
    keys: ['fullname'],
    includeScore: true,
  })

  const weaponsSearch = new Fuse(modifiedWeapons, {
    keys: ['fullname'],
    includeScore: true,
  })

  return {
    costumes,
    weapons,
    costumesAbilities,
    weaponsAbilities,
    search,
    costumesSearch,
    weaponsSearch
  }
}