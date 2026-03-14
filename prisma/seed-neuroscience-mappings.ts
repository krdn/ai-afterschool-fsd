import { config } from "dotenv"
config({ path: ".env.local" })
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set")
}
const pool = new Pool({ connectionString: databaseUrl })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const NEUROSCIENCE_MAPPINGS = [
  {
    featureType: 'neuroscience_strategy',
    matchMode: 'auto_tag',
    requiredTags: ['text'],
    excludedTags: [],
    priority: 1,
    fallbackMode: 'any_available',
  },
  {
    featureType: 'neuroscience_knowledge',
    matchMode: 'auto_tag',
    requiredTags: ['text'],
    excludedTags: [],
    priority: 1,
    fallbackMode: 'any_available',
  },
  {
    featureType: 'neuroscience_coaching',
    matchMode: 'auto_tag',
    requiredTags: ['text'],
    excludedTags: [],
    priority: 1,
    fallbackMode: 'any_available',
  },
]

async function main() {
  for (const mapping of NEUROSCIENCE_MAPPINGS) {
    const existing = await prisma.featureMapping.findFirst({
      where: { featureType: mapping.featureType },
    })
    if (existing) {
      console.log(`[SKIP] ${mapping.featureType} already exists`)
      continue
    }
    await prisma.featureMapping.create({ data: mapping })
    console.log(`[CREATED] ${mapping.featureType}`)
  }
  console.log('\nDone! Neuroscience feature mappings are ready.')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
