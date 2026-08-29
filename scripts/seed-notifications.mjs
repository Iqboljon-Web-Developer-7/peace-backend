/**
 * Makes the five notification channels demonstrable.
 *
 *   node scripts/seed-notifications.mjs --dataset=development
 *   node scripts/seed-notifications.mjs --dataset=development --undo
 *
 * Defaults to the `development` dataset; `production` additionally needs
 * `--yes`. Reads SANITY_API_WRITE_TOKEN from the environment.
 *
 * Without this nothing fires: no user has `notify` set, one has interests, one
 * has two of twenty-eight availability slots, one announcement of eight has any
 * category, one organisation of six has a follower, and no attendance has
 * `remind`.
 *
 * Deliberately does NOT seed `pushSubscription`. A fabricated endpoint 404s on
 * the first send and gets pruned, which looks like a bug in the pruning code
 * rather than a bad fixture — subscriptions have to come from a real browser.
 */
import {resolveDataset, includeReal, writeToken} from './guard.mjs'

const PROJECT = 'ysi42gxq'
const DATASET = resolveDataset()
const API = `https://${PROJECT}.api.sanity.io/v2026-08-07`

const TOKEN = writeToken()
const INCLUDE_REAL = includeReal()
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
  const r = await fetch(`${API}/data/mutate/${DATASET}?visibility=sync`, {
    method: 'POST',
    headers: {...auth, 'Content-Type': 'application/json'},
    body: JSON.stringify({mutations}),
  })
  const j = await r.json()
  if (j.error) throw new Error(JSON.stringify(j.error))
  return j
}

/* ---------------------------------------------------------------- slot maths */

/**
 * The same boundaries the engine uses (`lib/notifications/slots.ts`). Duplicated
 * rather than imported because the two packages are separate repositories — if
 * one moves, this comment is the reminder that the other must follow.
 */
const SLOT_HOURS = [
  ['morn', 6, 12],
  ['mid', 12, 16],
  ['aft', 16, 20],
  ['eve', 20, 24],
]

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tashkent',
  weekday: 'short',
  hour: '2-digit',
  hour12: false,
})

function slotKeyFor(iso) {
  const parts = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
  const day = String(parts.weekday).slice(0, 3).toLowerCase()
  const hour = Number(parts.hour)
  const found = SLOT_HOURS.find(([, from, until]) => hour >= from && hour < until)
  return found ? `${day}-${found[0]}` : null
}

/* -------------------------------------------------------------------- fixtures */

const INTEREST_SLUGS = [
  'kitchen',
  'teaching',
  'cleaning',
  'logistics',
  'welcome',
  'repairs',
  'youth',
  'drivers',
]

const SEEDED_ATTENDANCE_PREFIX = 'seedn-attendance-'
const SEEDED_FOLLOW_PREFIX = 'seedn-follow-'

/* ------------------------------------------------------------------------ seed */

async function seed() {
  const now = Date.now()

  const categories = Object.fromEntries(
    (await query(`*[_type == "category" && kind == "interest"]{_id, "slug": slug.current}`)).map(
      (c) => [c.slug, c._id],
    ),
  )
  const missing = INTEREST_SLUGS.filter((s) => !categories[s])
  if (missing.length) {
    throw new Error(`Run seed-profile.mjs first — missing categories: ${missing.join(', ')}`)
  }

  /*
   * Fixtures first, and real accounts only when asked for.
   *
   * This used to put real people at the *front* of the list, because they are
   * the only ones with real devices — and then `set` their interests and
   * availability, flip `notify.everything` on for four of them and
   * `notify.matches` off for one. That is someone's stated consent, overwritten
   * by a demo script, against production, with an `--undo` that refuses to put
   * it back. Broadcast opt-in especially: the schema says "absent means OFF,
   * because it is a broadcast and has to be asked for".
   *
   * So: demo fixtures by default. `--include-real` opts in, and even then real
   * accounts only ever get preferences they do not already have (§ applyPrefs).
   */
  const demoUsers = await query(
    `*[_type == "user" && string::startsWith(auth0Id, "seed|")] | order(_createdAt asc)[0...8]{_id, name}`,
  )
  const realUsers = INCLUDE_REAL
    ? await query(
        `*[_type == "user" && !string::startsWith(auth0Id, "seed|") && coalesce(status,"active") != "closed"] | order(_createdAt asc){_id, name, "hasPrefs": defined(interests) || defined(availability) || defined(notify)}`,
      )
    : []
  const people = [...demoUsers, ...realUsers]
  if (people.length < 3) {
    throw new Error(
      'Not enough demo users to seed against — run seed-announcements.mjs first.',
    )
  }
  if (INCLUDE_REAL && realUsers.length) {
    console.log(`including:       ${realUsers.length} real account(s) (--include-real)`)
  }

  const orgs = await query(`*[_type == "organisation"] | order(name asc){_id, name}`)
  const org = orgs[0]

  // 1. Three announcements at known distances, so each channel has a subject.
  const inNinetyMinutes = new Date(now + 90 * 60 * 1000).toISOString()
  const tomorrowMorning = (() => {
    const d = new Date(now + 24 * 60 * 60 * 1000)
    // 10:00 Tashkent is 05:00 UTC.
    d.setUTCHours(5, 0, 0, 0)
    return d.toISOString()
  })()
  const nextWeek = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()

  const announcements = [
    {
      _id: 'seedn-ann-soon',
      title: 'Kitchen help this afternoon',
      slug: 'kitchen-help-this-afternoon',
      startsAt: inNinetyMinutes,
      categories: ['kitchen'],
      excerpt: 'A short shift in the kitchen, starting soon.',
    },
    {
      _id: 'seedn-ann-tomorrow',
      title: 'Carpet cleaning day',
      slug: 'carpet-cleaning-day',
      startsAt: tomorrowMorning,
      categories: ['cleaning', 'repairs'],
      excerpt: 'Cleaning and small repairs, tomorrow morning.',
    },
    {
      _id: 'seedn-ann-week',
      title: 'Reading hour, next week',
      slug: 'reading-hour-next-week',
      startsAt: nextWeek,
      categories: ['teaching', 'youth'],
      excerpt: 'An hour of reading with Year 3.',
    },
  ]

  await mutate(
    announcements.map((a) => ({
      createOrReplace: {
        _id: a._id,
        _type: 'announcement',
        title: a.title,
        slug: {_type: 'slug', current: a.slug},
        excerpt: a.excerpt,
        lede: a.excerpt,
        organisation: {_type: 'reference', _ref: org._id},
        startsAt: a.startsAt,
        whenLabel: null,
        durationLabel: '2 hrs',
        durationMinutes: 120,
        categories: a.categories.map((slug) => ({
          _key: slug,
          _type: 'reference',
          _ref: categories[slug],
        })),
        publishedAt: new Date().toISOString(),
      },
    })),
  )
  console.log(`announcements:   ${announcements.length} (90 min, tomorrow, next week)`)

  // 2. Interests and availability, aimed at the slots those shifts fall in, so
  //    `matches` has somebody to find rather than being technically correct and
  //    practically empty.
  const wantedSlots = [...new Set(announcements.map((a) => slotKeyFor(a.startsAt)).filter(Boolean))]
  const prefMutations = []
  people.slice(0, 8).forEach((u, i) => {
    const picks = [
      INTEREST_SLUGS[i % INTEREST_SLUGS.length],
      INTEREST_SLUGS[(i + 3) % INTEREST_SLUGS.length],
      // Everyone in the first half also gets kitchen, so the "soon" shift has
      // an audience.
      ...(i < 4 ? ['kitchen'] : []),
    ]
    const interests = [...new Set(picks)].map((slug) => ({
      _key: slug,
      _type: 'reference',
      _ref: categories[slug],
    }))
    // The exact slots, plus a couple of neighbours so the grid does not look
    // machine-generated.
    const availability = [...new Set([...wantedSlots, 'sat-morn', 'sun-mid'])]
    // `setIfMissing` for anyone who already chose: a fixture may be shaped
    // freely, but a real person's answers are not ours to replace.
    const op = u.hasPrefs ? 'setIfMissing' : 'set'
    prefMutations.push({patch: {id: u._id, [op]: {interests, availability}}})
  })
  await mutate(prefMutations)
  console.log(`preferences:     ${prefMutations.length} users given interests + availability`)

  // 3. The broadcast opt-in on a few people, absent on the rest — that single
  //    dataset proves both the opt-in and the coalesce(x, false) default.
  //    Fixtures only, always: `everything` is consent to be broadcast at, and
  //    a seed script is not where that gets granted.
  const broadcasters = demoUsers.slice(0, 4)
  await mutate(
    broadcasters.map((u) => ({patch: {id: u._id, set: {'notify.everything': true}}})),
  )
  console.log(`broadcast opt-in: ${broadcasters.length} fixtures (never real accounts)`)

  // 4. One person who matches perfectly but has the switch off, so a run can be
  //    seen to honour it. A fixture, for the same reason.
  const silenced = demoUsers[Math.min(2, demoUsers.length - 1)]
  await mutate([{patch: {id: silenced._id, set: {'notify.matches': false}}}])
  console.log(`silenced:        ${silenced.name ?? silenced._id} (notify.matches = false)`)

  // 5. Follows, so the cleaning channel has an audience.
  const followers = people.slice(0, 3)
  await mutate(
    followers.map((u) => ({
      createOrReplace: {
        _id: `${SEEDED_FOLLOW_PREFIX}${org._id}-${u._id}`,
        _type: 'follow',
        user: {_type: 'reference', _ref: u._id},
        organisation: {_type: 'reference', _ref: org._id},
        createdAt: new Date().toISOString(),
      },
    })),
  )
  console.log(`follows:         ${followers.length} against ${org.name}`)

  // 6. Attendance on the imminent shift. `remind` is left undefined on most,
  //    which is the fixture that proves coalesce(remind, true) — the single
  //    likeliest bug in the system — and set false on exactly one to prove
  //    opt-out is honoured.
  const attendees = people.slice(0, 3)
  await mutate(
    attendees.map((u, i) => ({
      createOrReplace: {
        _id: `${SEEDED_ATTENDANCE_PREFIX}${u._id}`,
        _type: 'attendance',
        announcement: {_type: 'reference', _ref: 'seedn-ann-soon'},
        user: {_type: 'reference', _ref: u._id},
        status: 'going',
        // Undefined for everyone but the last, who opts out explicitly.
        ...(i === attendees.length - 1 ? {remind: false} : {}),
        createdAt: new Date().toISOString(),
      },
    })),
  )
  console.log(`attendance:      ${attendees.length} on the 90-minute shift (1 opted out)`)

  // 7. The seasonal announcement must be in the future or the freshness guard
  //    skips it.
  const seasonal = await query(
    `*[_type == "announcement" && count(categories[@->kind == "season"]) > 0][0]{_id, startsAt}`,
  )
  if (seasonal) {
    await mutate([
      {
        patch: {
          id: seasonal._id,
          set: {startsAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()},
        },
      },
    ])
    console.log(`seasonal:        ${seasonal._id} moved 30 days out`)
  }
}

/* ------------------------------------------------------------------------ undo */

async function undo() {
  // Notifications first — they hold a weak ref, but deleting them first keeps
  // the announcement delete clean regardless.
  const notifications = await query(
    `*[_type == "notification" && announcement._ref in $ids]._id`,
    {ids: ['seedn-ann-soon', 'seedn-ann-tomorrow', 'seedn-ann-week']},
  )
  const attendance = await query(
    `*[_type == "attendance" && string::startsWith(_id, $p)]._id`,
    {p: SEEDED_ATTENDANCE_PREFIX},
  )
  const follows = await query(`*[_type == "follow" && string::startsWith(_id, $p)]._id`, {
    p: SEEDED_FOLLOW_PREFIX,
  })

  // Children before the announcements they point at.
  for (const ids of [notifications, attendance, follows]) {
    await mutate(ids.map((id) => ({delete: {id}})))
  }
  await mutate(
    ['seedn-ann-soon', 'seedn-ann-tomorrow', 'seedn-ann-week'].map((id) => ({delete: {id}})),
  )

  console.log(`removed: ${notifications.length} notifications, ${attendance.length} attendance,`)
  console.log(`         ${follows.length} follows, 3 announcements`)
  console.log('note:    interests, availability and notify preferences are left in place —')
  console.log('         they are backfills of real accounts, not fixtures this script owns.')
}

if (process.argv.includes('--undo')) await undo()
else await seed()
