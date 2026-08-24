import {defineBlueprint, defineDocumentFunction} from '@sanity/blueprints'

/**
 * Instant notifications when an announcement is published.
 *
 * Only `defineDocumentFunction` is used here on purpose. `defineScheduledFunction`
 * exists in the installed SDK but is marked `@alpha` — "Deploying Scheduled
 * Functions via Blueprints is experimental. This feature is not available
 * publicly yet." The time-based half is a cron hitting `/api/notifications/sweep`
 * instead, so nothing core depends on an unreleased feature.
 */
export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      name: 'announcement-published',
      event: {
        // `update` fires on every later edit too, forever — the freshness guard
        // that stops a typo fix notifying anyone lives in the app's `run.ts`,
        // where it can be tested.
        on: ['create', 'update'],
        filter: '_type == "announcement" && defined(slug.current)',
        projection: '{_id}',
      },
    }),
  ],
})
