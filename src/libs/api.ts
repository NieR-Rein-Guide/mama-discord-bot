import { PrismaClient } from '@prisma/client';
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
  const prisma = new PrismaClient()

  const { data: costumes }: {
    data: ApiCostume[]
  } = await api.get('/costumes')

  const { data: weapons }: {
    data: ApiWeapon[]
  } = await api.get('/weapons')

  if (costumes.length === 0 || weapons.length === 0) {
    throw new Error('Costumes or Weapons are empty.')
  }

  const search = new Fuse([...costumes, ...weapons], {
    keys: ['name', 'title', 'character.name'],
    includeScore: true,
  })

  const costumesSearch = new Fuse(costumes, {
    keys: ['title', 'character.name'],
    includeScore: true,
  })

  const weaponsSearch = new Fuse(weapons, {
    keys: ['name'],
    includeScore: true,
  })

  prisma.$disconnect();

  return {
    costumes,
    weapons,
    search,
    costumesSearch,
    weaponsSearch
  }
}