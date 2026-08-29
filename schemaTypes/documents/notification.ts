import {defineType, defineField} from 'sanity'
import {BellIcon} from '@sanity/icons/Bell'

/**
 * One notification for one person.
 *
 * The document is written before anything is delivered, and its `_id` is
 * deterministic — `notif-new-<announcementId>-<userId>` for anything triggered
 * by publishing, `notif-remind-2h-…` / `notif-remind-eve-…` for the two
 * reminder stages. That id is the entire idempotency story: a re-run, an
 * overlapping cron, or the document function and the sweep both firing all
 * collapse to a no-op on `createIfNotExists`.
 *
 * Note what is *not* in the publish-time id: the kind. All four publish
 * channels (matches, cleanings, seasonal, everything) share one id, so
 * "one announcement produces at most one push per person" is guaranteed by the
 * key rather than by the correctness of the audience union above it.
 *
 * There is deliberately no `dedupeId` field — the `_id` already is one, and a
 * second copy could drift from it. There is also deliberately no `createdAt`,
 * breaking with the convention the other user-owned types follow: `_createdAt`
 * is system-maintained, orderable, and cannot disagree with reality.
 */
export const notification = defineType({
  name: 'notification',
  title: 'Notification',
  type: 'document',
  icon: BellIcon,
  fields: [
    defineField({
      name: 'kind',
      type: 'string',
      description:
        'Deliberately the same strings as the `notify.*` keys on user, so a ' +
        'preference and the channel it governs never need a mapping table.',
      options: {
        list: [
          {title: 'Shift that matches them', value: 'matches'},
          {title: 'Shift reminder', value: 'reminders'},
          {title: 'Cleaning day', value: 'cleanings'},
          {title: 'Seasonal rota', value: 'seasonal'},
          {title: 'Every new announcement', value: 'everything'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'user',
      type: 'reference',
      to: [{type: 'user'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'announcement',
      type: 'reference',
      to: [{type: 'announcement'}],
      // Weak, unlike attendance. A strong reference would make an announcement
      // permanently undeletable the moment one person was told about it, and a
      // notification carries no integrity obligation the way attendance does.
      weak: true,
    }),
    defineField({
      name: 'title',
      type: 'string',
      description:
        'Frozen copy. The push payload and the in-app row are built from these ' +
        'three fields, so they can never disagree, and editing the announcement ' +
        'afterwards does not rewrite history.',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'body', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'url',
      type: 'string',
      description: 'Frozen too — it derives from the slug, and slugs change.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sentAt',
      title: 'Delivery attempted at',
      type: 'datetime',
      description:
        'Attempted, not succeeded. Absent means no transport has given a ' +
        'verdict yet, so the next sweep picks the row up — which is what makes ' +
        'a run that dies mid-delivery recoverable. Stamped even when there was ' +
        'no device to deliver to, so a volunteer without push is not retried ' +
        'forever.',
    }),
    defineField({
      name: 'claimedAt',
      title: 'Claimed at',
      type: 'datetime',
      readOnly: true,
      description:
        'Set by a delivery run before it sends, so a second run overlapping it ' +
        'does not pick the same rows up and push them twice. Treated as expired ' +
        'after a few minutes, so a run that dies mid-flight is retried.',
    }),
    defineField({name: 'readAt', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'title', subtitle: 'user.name', kind: 'kind'},
    prepare({title, subtitle, kind}) {
      return {title, subtitle: `${kind} · ${subtitle ?? 'Someone'}`}
    },
  },
})
