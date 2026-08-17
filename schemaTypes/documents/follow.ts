import {defineType, defineField} from 'sanity'
import {HeartIcon} from '@sanity/icons/Heart'

/**
 * One row per (user, organisation), with a deterministic `_id`
 * (`follow-<organisationId>-<userId>`) exactly like `attendance`.
 *
 * A separate document rather than a `following[]` array on `user`, for the same
 * reason attendance is counted rather than denormalised: following an
 * organisation never rewrites either document. A strong-ref array on `user`
 * would also make an organisation undeletable once anyone followed it.
 *
 * Unfollowing deletes the row. Unlike attendance, a follow carries no history
 * worth keeping and nothing references it, so deletion is always safe.
 */
export const follow = defineType({
  name: 'follow',
  title: 'Follow',
  type: 'document',
  icon: HeartIcon,
  fields: [
    defineField({
      name: 'user',
      type: 'reference',
      to: [{type: 'user'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'organisation',
      type: 'reference',
      to: [{type: 'organisation'}],
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'createdAt', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'user.name', subtitle: 'organisation.name'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Someone', subtitle}
    },
  },
})
