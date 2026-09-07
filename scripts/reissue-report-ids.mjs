/**
 * Reissues report documents whose `_id` names the person who filed them.
 *
 *   node scripts/reissue-report-ids.mjs --dataset=development
 *   node scripts/reissue-report-ids.mjs --dataset=production --yes --apply
 *
 * Dry run by default: it lists what it would do and writes nothing until
 * `--apply` is passed. Reads SANITY_API_WRITE_TOKEN from the environment.
 *
 * ## Why
 *
 * Report ids used to be `report-<targetId>-<reporterKey>-<reason>`, where
 * `reporterKey` was `sha256(viewerId:targetId)` for a report filed
 * anonymously. Every input to that digest except the reporter is visible on
 * `/ops/reports`, and `/ops/volunteers` lists candidate user ids in the same
 * panel — so one hash per candidate recovers the reporter, from exactly the
 * person the "send my feedback anonymously" switch hides them from.
 *
 * `peace-front/lib/report-key.ts` now derives the id with an HMAC keyed off the
 * Sanity write token, which an operator does not hold. New reports are safe.
 * Rows already in the dataset keep their old id until this runs.
 *
 * ## What it does
 *
 * A document id cannot be changed in place, so each row is recreated under its
 * new id and the old one deleted, in a single transaction per report so a
 * failure cannot leave both or neither. `_createdAt` and `_updatedAt` are
 * system fields and will be reset by the recreate; the `createdAt` field the
 * queue actually sorts and displays is copied across, so nothing user-visible
 * moves.
 *
 * Named (non-anonymous) reports are reissued too. Their reporter is stored as a
 * reference anyway so nothing is hidden by it — but leaving them alone would
 * mean the id *format* announces which reports are anonymous, which is the same
 * leak one step removed.
 *
 * Idempotent: a row already at its new id is skipped, so a re-run after a
 * partial failure finishes the job.
 */
import {createHash, createHmac} from 'node:crypto'
import {resolveDataset, writeToken} from './guard.mjs'

const PROJECT = 'ysi42gxq'
const DATASET = resolveDataset()
const API = `https://${PROJECT}.api.sanity.io/v2026-08-07`
const APPLY = process.argv.includes('--apply')

const TOKEN = writeToken()
const auth = {Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json'}

/** Must stay byte-identical to `peace-front/lib/report-key.ts`. */
const KEY = createHash('sha256').update(`peace:report-dedupe:${TOKEN}`).digest()
const newId = (viewerId, targetId, reason) =>
  `report-${createHmac('sha256', KEY)
    .update(JSON.stringify([viewerId, targetId, reason]))
    .digest('hex')
    .slice(0, 32)}`

const query = async (groq) => {
  const u = new URL(`${API}/data/query/${DATASET}`)
  u.searchParams.set('query', groq)
  const res = await fetch(u, {headers: auth})
  if (!res.ok) throw new Error(`query failed: ${res.status} ${await res.text()}`)
  return (await res.json()).result
}

const mutate = async (mutations) => {
  const res = await fetch(`${API}/data/mutate/${DATASET}?visibility=sync`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({mutations}),
  })
  if (!res.ok) throw new Error(`mutate failed: ${res.status} ${await res.text()}`)
}

/*
 * The reporter is the one thing an old anonymous id does not contain in a form
 * we can read back — that is the point of the bug. So the new id can only be
 * derived for a report whose reporter reference is present.
 *
 * For anonymous rows there is nothing to recompute from, and inverting the old
 * hash would mean doing the very attack this fixes. They are deleted instead:
 * the row cannot be carried across without either naming the reporter or
 * keeping the leaking id, and an anonymous report that survives as a
 * deanonymisable id is worse than one that is gone. The count is reported
 * loudly so the decision is never silent.
 */
const rows = await query(
  `*[_type == "report" && string::startsWith(_id, "report-") && _id match "report-*-*"]{
     _id, reason, status, note, createdAt, targetType,
     "targetId": target._ref,
     "reporterId": reporter._ref,
     "anonymous": !defined(reporter)
   }`,
)

const legacy = rows.filter((r) => r.targetId && r.reason)
const named = legacy.filter((r) => !r.anonymous)
const anonymous = legacy.filter((r) => r.anonymous)

const moves = named
  .map((r) => ({row: r, to: newId(r.reporterId, r.targetId, r.reason)}))
  .filter((m) => m.row._id !== m.to)

console.log(`dataset:            ${DATASET}`)
console.log(`reports found:      ${rows.length}`)
console.log(`  named, to reissue:  ${moves.length}`)
console.log(`  anonymous, to drop: ${anonymous.length}`)

if (anonymous.length) {
  console.log(
    '\nAnonymous rows cannot be reissued: their reporter is not stored, and the\n' +
      'old id is only invertible by doing the attack this fixes. They will be\n' +
      'deleted, which loses the report but not the reporter.\n',
  )
}

if (!APPLY) {
  console.log('\nDry run. Pass --apply to write.')
  process.exit(0)
}

for (const {row, to} of moves) {
  const exists = await query(`count(*[_id == "${to}"])`)
  if (exists > 0) {
    await mutate([{delete: {id: row._id}}])
    console.log(`skip (already reissued), removed old: ${row._id}`)
    continue
  }
  await mutate([
    {
      create: {
        _id: to,
        _type: 'report',
        targetType: row.targetType,
        target: {_type: 'reference', _ref: row.targetId, _weak: true},
        reason: row.reason,
        ...(row.note ? {note: row.note} : {}),
        reporter: {_type: 'reference', _ref: row.reporterId},
        status: row.status ?? 'open',
        ...(row.createdAt ? {createdAt: row.createdAt} : {}),
      },
    },
    {delete: {id: row._id}},
  ])
  console.log(`reissued: ${row._id} -> ${to}`)
}

for (const row of anonymous) {
  await mutate([{delete: {id: row._id}}])
  console.log(`deleted anonymous legacy row: ${row._id}`)
}

console.log('\nDone.')
