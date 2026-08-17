/**
 * Seeds the data the /profile page needs, and backfills the fields added
 * alongside it.
 *
 *   node scripts/seed-profile.mjs          # create / update
 *   node scripts/seed-profile.mjs --undo   # remove the categories it created
 *
 * Idempotent: categories are upserted by slug, and every backfill only touches
 * documents where the field is still undefined.
 *
 * `--undo` removes only the categories this script created, and refuses any
 * that are still referenced. The backfills (`kind`, `durationMinutes`,
 * `referralCode`, `status`) are deliberately NOT undone — they are migrations
 * of pre-existing documents, not things this script owns.
 */
import {readFileSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PROJECT = 'ysi42gxq'
const DATASET = 'production'
const API = `https://${PROJECT}.api.sanity.io/v2026-08-07`

const env = Object.fromEntries(
  readFileSync(join(HERE, '../../peace-front/.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)
const TOKEN = env.SANITY_API_WRITE_TOKEN
if (!TOKEN) throw new Error('Missing SANITY_API_WRITE_TOKEN')
const auth = {Authorization: `Bearer ${TOKEN}`}

const query = async (groq, params = {}) => {
  const u = new URL(`${API}/data/query/${DATASET}`)
  u.searchParams.set('query', groq)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(`$${k}`, JSON.stringify(v))
  const r = await fetch(u, {headers: auth})
  const j = await r.json()
  if (j.error) throw new Error(JSON.stringify(j.error))
  return j.result
}

const mutate = async (mutations) => {
  if (!mutations.length) return {results: []}
  const r = await fetch(`${API}/data/mutate/${DATASET}?returnIds=true`, {
    method: 'POST',
    headers: {...auth, 'Content-Type': 'application/json'},
    body: JSON.stringify({mutations}),
  })
  const j = await r.json()
  if (j.error) throw new Error(JSON.stringify(j.error))
  return j
}

// ------------------------------------------------------------------ data

/** The design's interest list, in its own order. */
const INTERESTS = [
  ['kitchen', 'Kitchen and meals'],
  ['teaching', 'Teaching'],
  ['cleaning', 'Cleaning'],
  ['logistics', 'Logistics'],
  ['welcome', 'Guest welcome'],
  ['repairs', 'Small repairs'],
  ['youth', 'Youth groups'],
  ['drivers', 'Driving'],
]

const SEASONS = [['ramadan-and-eid', 'Ramadan and Eid']]

/**
 * Planned length of the seeded shifts, in minutes.
 *
 * `flood-response-standby-list` is deliberately absent: it is a standby list
 * with no scheduled date, so crediting anyone six hours for it would be a lie.
 * Its `durationLabel` ("Shifts of 6 hours") stays as editorial phrasing.
 */
const DURATIONS = {
  'riverbank-cleanup-at-mill-bend': 180,
  'winter-coat-drive-sorting-day': 240,
  'evening-meal-service': 150,
  'tree-planting-hollow-park': 300,
  'reading-hour-with-year-3': 60,
}

// ------------------------------------------------------------------ helpers

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16) || 'friend'

/** Mints a code that is not already taken. Mirrors the frontend's helper. */
async function mintReferralCode(seed, taken) {
  for (let i = 0; i < 5; i++) {
    const code = `${slugify(seed)}-${randomBytes(3).toString('hex').slice(0, 4)}`
    if (!taken.has(code)) {
      taken.add(code)
      return code
    }
  }
  throw new Error(`Could not mint a referral code for "${seed}"`)
}

const categoryId = (kind, slug) => `category-${kind}-${slug}`

/**
 * The "season ahead" card renders the next announcement tagged with a season
 * category. Without one the block simply never appears, so the seed creates it.
 * Dated relative to the run so the countdown is always in the future.
 */
const SEASONAL = {
  _id: 'announcement-ramadan-rotas',
  slug: 'ramadan-rotas-open',
  title: 'Ramadan rotas open',
  excerpt:
    'Iftar hosting, the night rota and food packing are published early so you can pick your places before they fill.',
  daysAhead: 34,
}

// ------------------------------------------------------------------ seed

async function seed() {
  const muts = []

  // 1 + 2. Interest and season categories, upserted by deterministic id.
  for (const [kind, list] of [
    ['interest', INTERESTS],
    ['season', SEASONS],
  ]) {
    for (const [slug, title] of list) {
      const _id = categoryId(kind, slug)
      muts.push({
        createOrReplace: {
          _id,
          _type: 'category',
          title,
          kind,
          slug: {_type: 'slug', current: slug},
        },
      })
    }
  }
  await mutate(muts)
  console.log(`categories:      ${INTERESTS.length} interests, ${SEASONS.length} season`)

  // 3. Backfill `kind` on any category that predates the field.
  const untyped = await query(`*[_type == "category" && !defined(kind)]._id`)
  await mutate(untyped.map((_id) => ({patch: {id: _id, set: {kind: 'interest'}}})))
  console.log(`category.kind:   ${untyped.length} backfilled`)

  // 4. Backfill `durationMinutes` so the record card has real hours to add up.
  const needDuration = await query(
    `*[_type == "announcement" && !defined(durationMinutes) && slug.current in $slugs]{_id, "slug": slug.current}`,
    {slugs: Object.keys(DURATIONS)},
  )
  await mutate(
    needDuration.map((a) => ({
      patch: {id: a._id, set: {durationMinutes: DURATIONS[a.slug]}},
    })),
  )
  console.log(`durationMinutes: ${needDuration.length} backfilled`)

  // 5. Backfill referral codes. Demo users (`seed|` prefix) are skipped —
  //    nobody signs up through a fixture's link.
  const taken = new Set(await query(`*[_type == "user" && defined(referralCode)].referralCode`))
  const needCode = await query(
    `*[_type == "user" && !defined(referralCode) && !string::startsWith(auth0Id, "seed|")]{_id, name, email}`,
  )
  const codeMuts = []
  for (const u of needCode) {
    const code = await mintReferralCode(u.name ?? u.email ?? 'friend', taken)
    codeMuts.push({patch: {id: u._id, set: {referralCode: code}}})
  }
  await mutate(codeMuts)
  console.log(`referralCode:    ${needCode.length} minted`)

  // 6. Backfill account status.
  const needStatus = await query(`*[_type == "user" && !defined(status)]._id`)
  await mutate(needStatus.map((_id) => ({patch: {id: _id, set: {status: 'active'}}})))
  console.log(`user.status:     ${needStatus.length} backfilled`)

  // 7. A seasonal announcement, so the "season ahead" card has something real.
  const org = await query(`*[_type == "organisation"] | order(name asc)[0]._id`)
  if (org) {
    const startsAt = new Date(Date.now() + SEASONAL.daysAhead * 86_400_000).toISOString()
    await mutate([
      {
        createOrReplace: {
          _id: SEASONAL._id,
          _type: 'announcement',
          title: SEASONAL.title,
          slug: {_type: 'slug', current: SEASONAL.slug},
          excerpt: SEASONAL.excerpt,
          lede: SEASONAL.excerpt,
          organisation: {_type: 'reference', _ref: org},
          categories: [
            {_key: 'season', _type: 'reference', _ref: categoryId('season', 'ramadan-and-eid')},
          ],
          whenLabel: 'Opens soon',
          startsAt,
          durationLabel: 'Varies by rota',
          badges: ['Season'],
          tags: ['week'],
          publishedAt: new Date().toISOString(),
        },
      },
    ])
    console.log(`seasonal:        1 announcement (${SEASONAL.daysAhead} days out)`)
  }
}

// ------------------------------------------------------------------ undo

async function undo() {
  // The announcement goes first: it references the season category, and Sanity
  // refuses to delete a document that is still pointed at.
  await mutate([{delete: {id: SEASONAL._id}}])

  const ids = [
    ...INTERESTS.map(([slug]) => categoryId('interest', slug)),
    ...SEASONS.map(([slug]) => categoryId('season', slug)),
  ]

  // Refuse to delete anything still pointed at — a dangling reference in a
  // volunteer's interests would be worse than leaving the category behind.
  const referenced = await query(`*[_id in $ids && count(*[references(^._id)]) > 0]._id`, {ids})
  const safe = ids.filter((id) => !referenced.includes(id))

  await mutate(safe.map((id) => ({delete: {id}})))
  console.log(`deleted:  ${safe.length} categories`)
  if (referenced.length) {
    console.log(`kept:     ${referenced.length} still referenced (${referenced.join(', ')})`)
  }
  console.log('note:     backfilled fields are migrations and were left in place.')
}

if (process.argv.includes('--undo')) await undo()
else await seed()
