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
      description:
        'Drives the two reminder stages: the evening before, and about two ' +
        'hours ahead. `initialValue` only fires in the Studio — the sign-up ' +
        'action writes it explicitly, and senders still read it as ' +
        'coalesce(remind, true) so older rows are not silently skipped.',
    }),
    defineField({
      name: 'minutesRecorded',
      title: 'Minutes recorded',
      type: 'number',
      description:
        'What was actually given, when it differs from the announcement’s planned ' +
        'length. Falls back to `announcement.durationMinutes` in the hours total. ' +
        'Written by the operations panel alongside a turnout mark, never on its own.',
      validation: (rule) => rule.min(0).max(24 * 60),
    }),
    defineField({
      name: 'turnout',
      title: 'Turnout',
      type: 'string',
      description:
        'Recorded by operations after the shift. ABSENT MEANS NOT YET MARKED — ' +
        'never “absent”. That is why there is no initialValue and why this is ' +
        'not a boolean: a false default would silently accuse every volunteer ' +
        'on every shift nobody got round to marking. `status` above is intent, ' +
        'declared by the volunteer; this is outcome, recorded by an organiser. ' +
        'They are separate because a row can legitimately be cancelled+present, ' +
        'or going+absent — which is the no-show, the whole point.',
      options: {
        list: [
          {title: 'Present', value: 'present'},
          {title: 'Late', value: 'late'},
          {title: 'Absent', value: 'absent'},
          // Four values, not three. Without `excused` the only honest mark for
          // "she rang at 7am, too late to cancel in the app" is `absent` — and
          // `absent` is what drives a reliability count. Conflating the two
          // makes that number punitive and wrong.
          {title: 'Excused', value: 'excused'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'turnoutAt',
      title: 'Turnout recorded at',
      type: 'datetime',
      readOnly: true,
      description:
        'Set by the panel, not by hand. A turnout mark changes a volunteer’s ' +
        'displayed hours and their no-show count, and an undated, unattributed ' +
        'accusation is not defensible when someone disputes it.',
    }),
    defineField({
      name: 'turnoutBy',
      title: 'Turnout recorded by',
      type: 'reference',
      to: [{type: 'user'}],
      readOnly: true,
      // Weak: an operations account must never become undeletable merely for
      // having marked a register once. `closeAccount` already fights the
      // strong-reference problem hard enough.
      weak: true,
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
