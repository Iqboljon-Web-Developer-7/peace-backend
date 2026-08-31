import {defineType, defineField} from 'sanity'
import {WarningOutlineIcon} from '@sanity/icons/WarningOutline'

/**
 * Written with a deterministic `_id` (`report-<targetId>-<reporterId>`) so one
 * person reporting the same thing twice does not inflate the count.
 */
export const report = defineType({
  name: 'report',
  title: 'Report',
  type: 'document',
  icon: WarningOutlineIcon,
  fields: [
    defineField({
      name: 'targetType',
      title: 'Target type',
      type: 'string',
      options: {
        list: [
          {title: 'Announcement', value: 'announcement'},
          {title: 'Comment', value: 'comment'},
          {title: 'Memory', value: 'memory'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'target',
      type: 'reference',
      to: [
        {type: 'announcement'},
        {type: 'comment'},
        {type: 'memory'},
        /*
         * No `attendance`. `submitReport` validates the target against
         * ["announcement","comment","memory"], and the attendance panel
         * deliberately files against the announcement id — so no report
         * document with an attendance target exists or can be created, and
         * leaving the type here is dead reference surface that the moderation
         * queue would have to handle for no reason.
         *
         * `reason: 'attendance'` stays, and is right: the reason describes the
         * complaint, the target describes the document. "This shift's
         * attendance was a problem" is an announcement target with an
         * attendance reason. Re-add this line if a specific person's row ever
         * needs reporting.
         */
      ],
      // Weak: a moderator must still be able to delete the offending document.
      weak: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'reason',
      type: 'string',
      options: {
        list: [
          {title: 'Spam', value: 'spam'},
          {title: 'Harassment or abuse', value: 'abuse'},
          {title: 'Misleading or inaccurate', value: 'misleading'},
          {title: 'Attendance problem', value: 'attendance'},
          {title: 'Something else', value: 'other'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'note',
      type: 'text',
      rows: 3,
      description:
        'What the reporter typed. Optional, and empty on every report filed ' +
        'before the app had a field for it — the reason list on its own could ' +
        'not say what actually happened.',
      validation: (rule) => rule.max(500),
    }),
    defineField({
      name: 'reporter',
      type: 'reference',
      to: [{type: 'user'}],
      description:
        'Absent means the report was filed anonymously, which the app offers ' +
        'on purpose. This was `required()`, and it was wrong: `submitReport` ' +
        'omits the field entirely for an anonymous report, API writes skip ' +
        'validation so the write succeeded, and the row then showed a ' +
        'validation error in the Studio forever. The moderation queue already ' +
        'reads the absence correctly as "anonymous".',
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: [
          {title: 'Open', value: 'open'},
          {title: 'Reviewing', value: 'reviewing'},
          {title: 'Resolved', value: 'resolved'},
        ],
        layout: 'radio',
      },
      initialValue: 'open',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'createdAt', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'reason', subtitle: 'targetType', status: 'status'},
    prepare({title, subtitle, status}) {
      return {title: `${title} (${status})`, subtitle}
    },
  },
})
