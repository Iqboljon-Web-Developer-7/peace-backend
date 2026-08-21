/**
 * Seeds demo organisations, announcements, commenters, comments and memories
 * from the "Peace Announcements" design.
 *
 *   node scripts/seed-announcements.mjs          # create / update
 *   node scripts/seed-announcements.mjs --undo   # remove everything it created
 *
 * Idempotent: organisations and announcements are upserted by slug, demo users
 * by auth0Id, and comments/memories are only created for an announcement that
 * has none yet. Re-running does not duplicate.
 *
 * Demo users get a `seed|` auth0Id prefix so they are trivially distinguishable
 * from real Auth0 accounts.
 */
import {readFileSync} from 'node:fs'
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
  const r = await fetch(`${API}/data/mutate/${DATASET}?returnIds=true`, {
    method: 'POST',
    headers: {...auth, 'Content-Type': 'application/json'},
    body: JSON.stringify({mutations}),
  })
  const j = await r.json()
  if (j.error) throw new Error(JSON.stringify(j.error))
  return j
}

const assetCache = new Map()
async function uploadImage(url, filename) {
  if (assetCache.has(url)) return assetCache.get(url)
  // Existing asset with the same label? Reuse rather than re-upload.
  const existing = await query('*[_type=="sanity.imageAsset" && originalFilename==$f][0]._id', {
    f: filename,
  })
  if (existing) {
    assetCache.set(url, existing)
    return existing
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`image fetch ${res.status}: ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const r = await fetch(
    `${API}/assets/images/${DATASET}?filename=${encodeURIComponent(filename)}`,
    {method: 'POST', headers: {...auth, 'Content-Type': 'image/jpeg'}, body: buf},
  )
  const j = await r.json()
  if (j.error) throw new Error(JSON.stringify(j.error))
  const id = j.document._id
  assetCache.set(url, id)
  console.log(`  uploaded ${filename} -> ${id}`)
  return id
}

const img = (assetId, alt) => ({
  _type: 'image',
  alt,
  asset: {_type: 'reference', _ref: assetId},
})
const ref = (id) => ({_type: 'reference', _ref: id})
const unsplash = (id, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`
const blocks = (paragraphs) =>
  paragraphs.map((text, i) => ({
    _type: 'block',
    _key: `b${i}`,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `b${i}s0`, text, marks: []}],
  }))

// ---------------------------------------------------------------- seed data

// `organiser` becomes a member of the organisation, which is what makes their
// comments render the "Organiser" badge.
const ORGS = [
  {slug: 'blue-line-trust', name: 'Blue Line Trust', organiser: 'dilnoza-k'},
  {slug: 'northgate-house', name: 'Northgate House', organiser: 'sevara-r'},
  {slug: 'st-annes-kitchen', name: "St. Anne's Kitchen", organiser: 'father-timur'},
  {slug: 'city-parks', name: 'City Parks', organiser: 'bekzod-r'},
  {slug: 'fairfield-primary', name: 'Fairfield Primary', organiser: 'zulfiya-k'},
  {slug: 'regional-relief', name: 'Regional Relief', organiser: 'shahzod-h'},
]

const DEMO_USERS = [
  {key: 'dilnoza-k', name: 'Dilnoza K.'},
  {key: 'aziz-b', name: 'Aziz B.'},
  {key: 'malika-o', name: 'Malika O.'},
  {key: 'sevara-r', name: 'Sevara R.'},
  {key: 'jasur-b', name: 'Jasur B.'},
  {key: 'father-timur', name: 'Father Timur'},
  {key: 'gulnora-n', name: 'Gulnora N.'},
  {key: 'bekzod-r', name: 'Bekzod R.'},
  {key: 'zulfiya-k', name: 'Zulfiya K.'},
  {key: 'rustam-k', name: 'Rustam K.'},
  {key: 'shahzod-h', name: 'Shahzod H.'},
  {key: 'nilufar-s', name: 'Nilufar S.'},
  {key: 'timur-a', name: 'Timur A.'},
]

const ANNOUNCEMENTS = [
  {
    slug: 'riverbank-cleanup-at-mill-bend',
    title: 'Riverbank cleanup at Mill Bend',
    org: 'blue-line-trust',
    image: unsplash('photo-1618477461853-cf6ed80faba5'),
    alt: 'Volunteers collecting litter into bags along a shoreline',
    excerpt:
      'Waders, gloves and grabbers provided. We are pulling the silt trap clear before the autumn rain.',
    lede: 'The silt trap has to be clear before the autumn rain, and it takes forty pairs of hands to do it in one morning.',
    body: [
      'We work the stretch between Mill Bend and the old lock in three teams: bank clearing, water line, and sorting at the truck. Waders, gloves and grabbers are provided at the gate, so come in clothes you do not mind ruining and closed shoes.',
      'Tea and something hot at the halfway mark. If the water level rises past the second marker on the morning, the water-line team stands down and everyone works the bank instead — you will get a message by 07:00 either way.',
    ],
    tags: ['urgent', 'week', 'nearby', 'bus'],
    badges: ['Urgent', 'Bus provided'],
    whenLabel: 'Sat 16 Aug · 09:00',
    startsAt: '2026-08-16T09:00:00.000Z',
    durationLabel: '3 hrs',
    distanceLabel: '2.4 km',
    spotsTotal: 44,
    address: 'Mill Bend gate, Kanal St. 44 — meet at the green container',
    entryNote:
      'Enter through the green side gate, not the main yard. The walkthrough shows the turn from Kanal St. and where to sign in.',
    buses: [
      {kind: 'bus', number: '4', stop: 'Kanal St. stop (changed)', note: 'Was Bekat Sq. until Wednesday', departsAt: '08:10', seatsTotal: 45, seatsLeft: 9},
      {kind: 'bus', number: '11', stop: 'Central station, east door', note: 'Direct, no stops', departsAt: '08:25', seatsTotal: 45, seatsLeft: 22},
      {kind: 'minibus', number: '7', stop: 'Yunusobod market', note: 'Two pickups on the way', departsAt: '07:55', seatsTotal: 20, seatsLeft: 0},
    ],
    comments: [
      {user: 'dilnoza-k', text: 'Bus 4 now picks up on Kanal St., not Bekat Sq. — the square is closed for resurfacing. Everything else is unchanged.'},
      {user: 'aziz-b', text: 'Did this in May and it was the best three hours of my month. Bring a spare pair of socks, seriously.'},
      {user: 'malika-o', text: 'Is the sorting team standing the whole time? Asking for my mother, she wants to come but cannot stand for long.'},
    ],
  },
  {
    slug: 'winter-coat-drive-sorting-day',
    title: 'Winter coat drive, sorting day',
    org: 'northgate-house',
    image: unsplash('photo-1593113630400-ea4288922497'),
    alt: 'Volunteers unloading supply boxes from a truck',
    excerpt:
      'Four thousand donations to size, check and shelve before the doors open in October.',
    lede: 'Four thousand donated coats, and every one has to be sized, checked and shelved before the doors open in October.',
    body: [
      'Three stations: intake and sort by size, quality check for zips and lining, then shelving by the size chart. You can sit at any of the three, and you can move between them whenever you like.',
      'The hall is warm and the work is easy on the body, so this shift suits anyone who would rather not be outdoors in the heat. Bring a water bottle; there is a filler in the corridor.',
    ],
    tags: ['week', 'nearby', 'indoor'],
    badges: ['Indoor'],
    whenLabel: 'Sun 17 Aug · 08:00',
    startsAt: '2026-08-17T08:00:00.000Z',
    durationLabel: '4 hrs',
    distanceLabel: '3.3 km',
    spotsTotal: 38,
    address: 'Northgate House, Amir Temur 118 — hall B, first floor',
    entryNote:
      'Reception will not have your name — go straight past to hall B and sign the clipboard by the door.',
    buses: [
      {kind: 'bus', number: '2', stop: 'Amir Temur, north side', note: 'Every 20 minutes', departsAt: '07:30', seatsTotal: 45, seatsLeft: 18},
      {kind: 'bus', number: '9', stop: 'Chorsu, main gate', note: 'One pickup on the way', departsAt: '07:15', seatsTotal: 45, seatsLeft: 31},
    ],
    comments: [
      {user: 'sevara-r', text: 'We now have a signed PDF of verified hours available the same evening — ask at the desk if you need it for school or work.'},
      {user: 'jasur-b', text: 'Can I come for two hours instead of four? I have something at midday.'},
    ],
  },
  {
    slug: 'evening-meal-service',
    title: 'Evening meal service',
    org: 'st-annes-kitchen',
    image: unsplash('photo-1547573854-74d2a71d0826'),
    alt: 'Hands reaching across a table laid with shared dishes',
    excerpt:
      'Serving, clearing and washing up for around 120 guests. No experience needed.',
    lede: 'A hundred and twenty guests, one long table, and a kitchen that has not missed a Tuesday in nine years.',
    body: [
      'You will be on serving, clearing or washing up — the shift lead decides on the night based on who turns up. No cooking experience needed and no knives involved.',
      'Wear closed shoes and tie long hair back. Aprons are on the hook by the pass. There is a staff meal at the end of the service and everyone eats together.',
    ],
    tags: ['urgent', 'week', 'nearby', 'indoor'],
    badges: ['3 spots left'],
    whenLabel: 'Tue 12 Aug · 17:30',
    startsAt: '2026-08-12T17:30:00.000Z',
    durationLabel: '2.5 hrs',
    distanceLabel: '800 m',
    spotsTotal: 15,
    address: "St. Anne's Kitchen, Navoi 7 — staff entrance on the lane",
    entryNote:
      'The front door is for guests. Use the staff entrance on the lane; the video shows the turn and the bell.',
    buses: [
      {kind: 'minibus', number: '1', stop: 'Navoi, opposite the pharmacy', note: 'Walkable if you are in the centre', departsAt: '17:05', seatsTotal: 20, seatsLeft: 12},
    ],
    comments: [
      {user: 'father-timur', text: 'While the heat holds we are shortening outdoor prep to two hours. The service itself runs as normal, indoors.'},
      {user: 'gulnora-n', text: 'If you have never done this before, take washing up on your first night. You learn the room without being in the room.'},
    ],
  },
  {
    slug: 'tree-planting-hollow-park',
    title: 'Tree planting, Hollow Park',
    org: 'city-parks',
    image: unsplash('photo-1466692476868-aef1dfb1e735'),
    alt: 'Young seedlings growing in dark soil',
    excerpt:
      'Six hundred saplings along the north ridge. Bring a team, or join one on the day.',
    lede: 'Six hundred saplings along the north ridge, in the last window before the ground hardens.',
    body: [
      'Teams of four to a row: one digs, one places, two backfill and water. A ranger walks each row twice to check depth, because a sapling planted shallow will not survive its first winter.',
      'Bring a hat and sunscreen. Spades, gloves and water are at the ridge tent. Company teams can register together and keep the same row, pooling hours to one account.',
    ],
    tags: ['week', 'bus', 'team', 'outdoor'],
    badges: ['Team friendly', 'Bus provided'],
    whenLabel: 'Sat 23 Aug · 10:00',
    startsAt: '2026-08-23T10:00:00.000Z',
    durationLabel: '5 hrs',
    distanceLabel: '6.8 km',
    spotsTotal: 100,
    address: 'Hollow Park, north ridge tent — park at the west lot',
    entryNote:
      'The west lot barrier stays down until 09:40. The video shows the footpath from the lot to the ridge tent.',
    buses: [
      {kind: 'bus', number: '14', stop: 'Beruniy metro, exit 3', note: 'Direct to the west lot', departsAt: '09:10', seatsTotal: 45, seatsLeft: 7},
      {kind: 'bus', number: '15', stop: 'Olmazor, bus bay 2', note: 'Two pickups on the way', departsAt: '08:50', seatsTotal: 45, seatsLeft: 26},
      {kind: 'minibus', number: '16', stop: 'Sergeli crossing', note: 'Added for this shift', departsAt: '08:40', seatsTotal: 45, seatsLeft: 40},
    ],
    comments: [
      {user: 'bekzod-r', text: 'Rows are assigned at the tent, not in advance. If you are coming as a team, arrive together or you will be split.'},
      {user: 'timur-a', text: 'Bringing 25 from floor 4. Do you need anyone to run water between rows? We have two people who cannot dig.'},
    ],
  },
  {
    slug: 'reading-hour-with-year-3',
    title: 'Reading hour with Year 3',
    org: 'fairfield-primary',
    image: unsplash('photo-1588072432836-e10032774350'),
    alt: 'Primary school children working at their desks',
    excerpt:
      'One hour, one child, one book. Background check handled by the school in advance.',
    lede: 'One hour, one child, one book — the same child every week for a term, which is the part that matters.',
    body: [
      'You read together for forty minutes and talk about it for twenty. The school picks the pairing and the books; you bring nothing but attention.',
      'The background check is handled by the school and takes about ten days, so sign up now for the term starting in September. A term is twelve sessions and the same hour each week.',
    ],
    tags: ['week', 'nearby', 'indoor'],
    badges: ['Weekly'],
    whenLabel: 'Thu 14 Aug · 14:00',
    startsAt: '2026-08-14T14:00:00.000Z',
    durationLabel: '1 hr',
    distanceLabel: '5.1 km',
    spotsTotal: 16,
    address: 'Fairfield Primary, Mustaqillik 3 — visitor door by the flagpole',
    entryNote:
      'Sign in at the visitor door and wait in the blue chairs. A teacher collects you — do not walk to the classroom alone.',
    buses: [
      {kind: 'minibus', number: '6', stop: 'Mustaqillik, school stop', note: 'Every 15 minutes', departsAt: '13:35', seatsTotal: 20, seatsLeft: 15},
    ],
    comments: [
      {user: 'zulfiya-k', text: 'Please only sign up if you can hold the same hour for the whole term. The children notice when someone stops coming.'},
      {user: 'rustam-k', text: 'Third term doing this. My reader finished her first chapter book in May and I have not stopped thinking about it since.'},
    ],
  },
  {
    slug: 'flood-response-standby-list',
    title: 'Flood response standby list',
    org: 'regional-relief',
    image: unsplash('photo-1428592953211-077101b2021b'),
    alt: 'Heavy rain falling on the surface of a river',
    excerpt:
      'Add your name and we will call only if the river passes the second gauge. Training on arrival.',
    lede: 'Add your name and we will call only if the river passes the second gauge. Most months, we do not call.',
    body: [
      'The list exists so that we are not recruiting in the first twelve hours of an emergency. If it activates you get a message with a window, a muster point and a bus time, and you confirm or decline — declining costs you nothing.',
      'Training happens on arrival and covers sandbag lines, intake at the reception centre, and what not to touch. Under 18s cannot be on the list, and nobody works a water line without a paired partner.',
    ],
    tags: ['urgent', 'bus', 'team'],
    badges: ['On standby'],
    whenLabel: 'Rolling · 48 hrs notice',
    durationLabel: 'Shifts of 6 hours',
    distanceLabel: 'City-wide',
    spotsTotal: 200,
    address: 'Regional Relief depot, Yangi Yo‘l 2 — muster point sent with the call',
    entryNote:
      'Depot gate 2 only. The walkthrough shows the muster board and where to collect a tabard.',
    buses: [
      {kind: 'bus', number: 'R1', stop: 'Depot shuttle, central station', note: 'Runs on activation only', departsAt: 'On call'},
      {kind: 'minibus', number: 'R2', stop: 'Depot shuttle, Chilonzor', note: 'Runs on activation only', departsAt: 'On call'},
    ],
    comments: [
      {user: 'shahzod-h', text: 'We called the list twice in three years. Both times we had enough people inside four hours. That is the whole point of it.'},
      {user: 'nilufar-s', text: 'If you decline a call, does it affect whether you get called again? I travel a lot for work.'},
    ],
  },
]

const MEMORY_IMAGES = [
  {url: unsplash('photo-1469571486292-0ba58a3f068b', 900), alt: 'Hands together forming a painted heart', user: 'rustam-k'},
  {url: unsplash('photo-1559027615-cd4628902d4a', 900), alt: 'A volunteer in a marked jersey at an event', user: 'malika-o'},
  {url: unsplash('photo-1560252829-804f1aedf1be', 900), alt: 'Volunteers working alongside children', user: 'timur-a'},
  {url: unsplash('photo-1582213782179-e0d53f98f2ca', 900), alt: 'A group stacking their hands together', user: 'nilufar-s'},
]

// ---------------------------------------------------------------- undo

async function undo() {
  const ids = await query(`*[
    (_type=="organisation" && slug.current in $orgSlugs) ||
    (_type=="announcement" && slug.current in $annSlugs) ||
    (_type=="user" && string::startsWith(auth0Id, "seed|")) ||
    (_type in ["comment","memory","attendance","report"] && announcement->slug.current in $annSlugs)
  ]._id`, {
    orgSlugs: ORGS.map((o) => o.slug),
    annSlugs: ANNOUNCEMENTS.map((a) => a.slug),
  })
  if (!ids.length) return console.log('Nothing to remove.')
  // Children first so strong references never block a delete.
  const order = [
    'comment',
    'memory',
    'attendance',
    'report',
    'follow',
    'announcement',
    'organisation',
    'user',
  ]
  // Collect the images these documents point at, before the references vanish.
  const assetRows = await query(
    `*[_id in $ids]{
      "refs": [
        mainImage.asset._ref, entryImage.asset._ref, entryVideo.asset._ref,
        image.asset._ref, avatar.asset._ref, logo.asset._ref
      ]
    }.refs`,
    {ids},
  )
  const assetIds = [...new Set(assetRows.flat().filter(Boolean))]

  const typed = await query('*[_id in $ids]{_id,_type}', {ids})
  typed.sort((a, b) => order.indexOf(a._type) - order.indexOf(b._type))
  await mutate(typed.map((d) => ({delete: {id: d._id}})))
  console.log(`Removed ${typed.length} documents.`)

  /*
   * Deleting a document only drops the *reference* to its image. The file stays
   * on the public CDN, so without this every --undo leaves the whole seed's
   * imagery downloadable by anyone holding a URL.
   *
   * Only assets nothing else points at are removed — a shared image, or one
   * someone attached by hand in the Studio, is left alone.
   */
  const orphans = assetIds.length
    ? await query(`*[_id in $assetIds && count(*[references(^._id)]) == 0]._id`, {assetIds})
    : []
  if (orphans.length) await mutate(orphans.map((id) => ({delete: {id}})))
  console.log(`Removed ${orphans.length} now-unused image assets.`)
}

// ---------------------------------------------------------------- seed

async function upsertBySlug(type, slug, doc) {
  const existing = await query('*[_type==$t && slug.current==$s][0]._id', {t: type, s: slug})
  if (existing) {
    await mutate([{patch: {id: existing, set: doc}}])
    return existing
  }
  const res = await mutate([
    {create: {_type: type, slug: {_type: 'slug', current: slug}, ...doc}},
  ])
  return res.results[0].id
}

async function seed() {
  console.log('Demo commenters…')
  const userIds = {}
  for (const u of DEMO_USERS) {
    const auth0Id = `seed|${u.key}`
    const existing = await query('*[_type=="user" && auth0Id==$a][0]._id', {a: auth0Id})
    userIds[u.key] = existing
      ? existing
      : (await mutate([{create: {_type: 'user', auth0Id, name: u.name}}])).results[0].id
  }

  console.log('Organisations…')
  const orgIds = {}
  for (const o of ORGS) {
    orgIds[o.slug] = await upsertBySlug('organisation', o.slug, {
      name: o.name,
      verified: true,
      members: [{_type: 'reference', _key: o.organiser, _ref: userIds[o.organiser]}],
    })
  }

  console.log('Images…')
  for (const a of ANNOUNCEMENTS) a.assetId = await uploadImage(a.image, `${a.slug}.jpg`)
  for (const m of MEMORY_IMAGES) m.assetId = await uploadImage(m.url, `memory-${m.user}.jpg`)

  console.log('Announcements…')
  const annIds = {}
  for (const a of ANNOUNCEMENTS) {
    annIds[a.slug] = await upsertBySlug('announcement', a.slug, {
      title: a.title,
      organisation: ref(orgIds[a.org]),
      mainImage: img(a.assetId, a.alt),
      excerpt: a.excerpt,
      lede: a.lede,
      body: blocks(a.body),
      tags: a.tags,
      badges: a.badges,
      whenLabel: a.whenLabel,
      ...(a.startsAt ? {startsAt: a.startsAt} : {}),
      durationLabel: a.durationLabel,
      distanceLabel: a.distanceLabel,
      spotsTotal: a.spotsTotal,
      address: a.address,
      entryNote: a.entryNote,
      entryImage: img(a.assetId, a.alt),
      buses: a.buses.map((b, i) => ({_type: 'bus', _key: `bus${i}`, ...b})),
      publishedAt: new Date('2026-08-14T09:00:00.000Z').toISOString(),
    })
  }

  console.log('Comments…')
  for (const a of ANNOUNCEMENTS) {
    const has = await query('count(*[_type=="comment" && announcement._ref==$id])', {
      id: annIds[a.slug],
    })
    if (has > 0) {
      console.log(`  ${a.slug}: ${has} already, skipping`)
      continue
    }
    await mutate(
      a.comments.map((c, i) => ({
        create: {
          _type: 'comment',
          announcement: ref(annIds[a.slug]),
          author: ref(userIds[c.user]),
          text: c.text,
          status: 'visible',
          likes: [],
          createdAt: new Date(Date.UTC(2026, 7, 13, 9 + i)).toISOString(),
        },
      })),
    )
  }

  console.log('Memories…')
  const first = annIds[ANNOUNCEMENTS[0].slug]
  const hasMem = await query('count(*[_type=="memory" && announcement._ref==$id])', {id: first})
  if (hasMem > 0) {
    console.log(`  ${ANNOUNCEMENTS[0].slug}: ${hasMem} already, skipping`)
  } else {
    await mutate(
      MEMORY_IMAGES.map((m, i) => ({
        create: {
          _type: 'memory',
          announcement: ref(first),
          author: ref(userIds[m.user]),
          image: img(m.assetId, m.alt),
          status: 'visible',
          likes: [],
          createdAt: new Date(Date.UTC(2026, 4, 20 + i)).toISOString(),
        },
      })),
    )
  }

  console.log('\nDone.')
}

if (process.argv.includes('--undo')) await undo()
else await seed()
