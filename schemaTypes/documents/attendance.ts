import {defineType, defineField} from 'sanity'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'

/**
 * One row per (user, announcement). Written with a deterministic `_id`
 * (`attendance-<announcementId>-<userId>`) via createIfNotExists, which makes
 * duplicates structurally impossible without a read-then-write race.
 *
 * Cancelling sets status rather than deleting, so history survives.
 */
export const attendance = defineType({
  name: 'attendance',
  title: 'Attendance',
  type: 'document',
  icon: CheckmarkCircleIcon,
  fields: [
    defineField({
      name: 'announcement',
      type: 'reference',
      to: [{type: 'announcement'}],
      // Strong reference: Sanity refuses to delete an announcement that still
      // has attendance, giving referential integrity for free.
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'user',
      type: 'reference',
      to: [{type: 'user'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: [
          {title: 'Going', value: 'going'},
          {title: 'Cancelled', value: 'cancelled'},
        ],
        layout: 'radio',
      },
      initialValue: 'going',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'remind',
      title: 'Remind me',
      type: 'boolean',
      initialValue: true,
      description: 'STORED ONLY — no reminder is sent yet.',
    }),
    defineField({
      name: 'minutesRecorded',
      title: 'Minutes recorded',
      type: 'number',
      description:
        'What was actually given, when it differs from the announcement’s planned ' +
        'length. Falls back to `announcement.durationMinutes` in the hours total.',
      validation: (rule) => rule.min(0).max(24 * 60),
    }),
    defineField({name: 'createdAt', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'user.name', subtitle: 'announcement.title', status: 'status'},
    prepare({title, subtitle, status}) {
      return {title: `${title ?? 'Someone'} — ${status}`, subtitle}
    },
  },
})
