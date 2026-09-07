import {defineType, defineField, defineArrayMember} from 'sanity'
import {CommentIcon} from '@sanity/icons/Comment'

/**
 * Likes are an array of user references: the count is the array length and
 * "did the current user like this" is answerable in the same query, with no
 * per-comment subquery.
 */
export const comment = defineType({
  name: 'comment',
  title: 'Comment',
  type: 'document',
  icon: CommentIcon,
  fields: [
    defineField({
      name: 'announcement',
      type: 'reference',
      to: [{type: 'announcement'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'author',
      type: 'reference',
      to: [{type: 'user'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'text',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required().max(2000),
    }),
    defineField({
      name: 'likes',
      title: 'Liked by',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'user'}]})],
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: [
          {title: 'Visible', value: 'visible'},
          {title: 'Flagged', value: 'flagged'},
          {title: 'Removed', value: 'removed'},
        ],
        layout: 'radio',
      },
      initialValue: 'visible',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'statusBy',
      title: 'Status set by',
      type: 'reference',
      to: [{type: 'user'}],
      readOnly: true,
      // Weak, for the same reason `attendance.turnoutBy` is: an operations
      // account must never become undeletable merely for having moderated
      // something once.
      weak: true,
      description:
        'The operator who last changed the status, written by the ops panel. ' +
        'Sanity keeps the previous *value* in document history, but history ' +
        'records the API token rather than a person — every panel write goes ' +
        'through one token, so without this field there is no record of who.',
    }),
    defineField({
      name: 'statusAt',
      title: 'Status set at',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({name: 'createdAt', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'text', subtitle: 'author.name'},
  },
})
