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
          {title: 'Attendance', value: 'attendance'},
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
        {type: 'attendance'},
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
    defineField({name: 'note', type: 'text', rows: 3, validation: (rule) => rule.max(500)}),
    defineField({
      name: 'reporter',
      type: 'reference',
      to: [{type: 'user'}],
      validation: (rule) => rule.required(),
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
