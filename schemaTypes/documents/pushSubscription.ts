import {defineType, defineField} from 'sanity'
import {BellIcon} from '@sanity/icons/Bell'

/**
 * One registered device, not one volunteer — people use a phone and a laptop.
 *
 * The `_id` is derived from the endpoint alone (`push-<sha256(endpoint)>`),
 * never from the user. A browser mints one push endpoint per service-worker
 * registration rather than per account, so when two people share a browser
 * there is one row and only the current owner should receive pushes. The
 * frontend therefore writes it with `createOrReplace`, which re-points the row,
 * rather than `createIfNotExists`, which would leave the previous person
 * receiving someone else's shifts.
 *
 * These are credentials, not content: `readOnly` so nothing in the Studio ever
 * hand-edits them, and the preview shows only the push service's host, because
 * the full endpoint is a device identifier.
 */
export const pushSubscription = defineType({
  name: 'pushSubscription',
  title: 'Push subscription',
  type: 'document',
  icon: BellIcon,
  readOnly: true,
  fields: [
    defineField({
      name: 'user',
      type: 'reference',
      to: [{type: 'user'}],
      // Strong: a subscription with no one to deliver to is meaningless, and
      // `closeAccount` deletes these rows before it touches the user anyway.
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'endpoint',
      type: 'url',
      description: 'The push service URL. Identifies the device.',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'p256dh', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'auth', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'createdAt', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'user.name', subtitle: 'endpoint'},
    prepare({title, subtitle}) {
      let host = 'unknown push service'
      try {
        if (subtitle) host = new URL(subtitle).host
      } catch {
        // A malformed endpoint should not break the Studio list.
      }
      return {title: title ?? 'Someone', subtitle: host}
    },
  },
})
