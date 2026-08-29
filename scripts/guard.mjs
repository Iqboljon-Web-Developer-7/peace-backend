/**
 * Shared safety rail for the seed scripts.
 *
 * All three hardcoded `DATASET = 'production'` with no dry-run and no
 * confirmation, so the obvious command — `node scripts/seed-notifications.mjs` —
 * wrote fabricated content straight into the live dataset. Worse, the blueprint
 * fires on `create` *and* `update`, so seeding published real push
 * notifications to real people about fake shifts.
 *
 * Now: the dataset comes from `SANITY_DATASET` (default `development`), and
 * writing to `production` needs `--yes` typed on purpose.
 */
export function resolveDataset(argv = process.argv) {
  const flag = argv.find((a) => a.startsWith('--dataset='))
  const dataset = flag ? flag.slice('--dataset='.length) : process.env.SANITY_DATASET || 'development'

  if (dataset === 'production' && !argv.includes('--yes')) {
    console.error(
      [
        '',
        'Refusing to seed `production` without --yes.',
        '',
        'This writes fabricated announcements, comments and users, and publishing',
        'an announcement triggers real push notifications to real people.',
        '',
        '  node scripts/<script>.mjs --dataset=development     # what you want',
        '  node scripts/<script>.mjs --dataset=production --yes # if you mean it',
        '',
      ].join('\n'),
    )
    process.exit(1)
  }
  return dataset
}

/** True when the caller explicitly opted into touching real accounts. */
export const includeReal = (argv = process.argv) => argv.includes('--include-real')

/**
 * The write token, from the environment.
 *
 * It used to be read out of `../../peace-front/.env.local`, which hard-coupled
 * this repo to the frontend's directory layout and meant seeding required a
 * secret to be sitting in a sibling checkout.
 */
export function writeToken() {
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!token) {
    console.error(
      'Missing SANITY_API_WRITE_TOKEN.\n' +
        '  export SANITY_API_WRITE_TOKEN=$(grep ^SANITY_API_WRITE_TOKEN ../peace-front/.env.local | cut -d= -f2-)',
    )
    process.exit(1)
  }
  return token
}
