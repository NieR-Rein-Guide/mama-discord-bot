import axios from 'axios'
import { ApiCostume, ApiWeapon } from '../..';
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
    search,
    costumesSearch,
    weaponsSearch
  }
}