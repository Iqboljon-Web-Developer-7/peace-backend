import {defineType, defineField, defineArrayMember} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

/**
 * Editorial content only. Everything user-generated — attendance, comments,
 * memories, reports — lives in its own document type referencing this one, so
 * a new comment never rewrites the announcement.
 */
export const announcement = defineType({
  name: 'announcement',
  title: 'Announcement',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'logistics', title: 'Logistics'},
    {name: 'meta', title: 'Meta'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'organisation',
      title: 'Published by',
      type: 'reference',
      group: 'content',
      to: [{type: 'organisation'}],
      description: 'Shown as the byline. The person who posted is recorded separately.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'postedBy',
      title: 'Posted by (member)',
      type: 'reference',
      group: 'meta',
      to: [{type: 'user'}],
      description: 'Recorded for attribution; not displayed on the site.',
    }),
    defineField({
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
          validation: (rule) => rule.required().warning('Alt text is important for SEO'),
        }),
      ],
    }),
    defineField({
      name: 'excerpt',
      title: 'Card description',
      type: 'text',
      group: 'content',
      rows: 3,
      validation: (rule) => rule.max(200).warning('Keep it under 200 characters'),
    }),
    defineField({
      name: 'lede',
      title: 'Lede',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'The large serif italic opening line on the detail page.',
    }),
    defineField({
      name: 'body',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({type: 'block'})],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'meta',
      description: 'Drives the filter pills on the feed.',
      options: {
        list: [
          {title: 'Urgent', value: 'urgent'},
          {title: 'This week', value: 'week'},
          {title: 'Under 3 km', value: 'nearby'},
          {title: 'Team friendly', value: 'team'},
          {title: 'Bus provided', value: 'bus'},
          {title: 'Indoor', value: 'indoor'},
          {title: 'Outdoor', value: 'outdoor'},
        ],
      },
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({
      name: 'badges',
      title: 'Card badges',
      type: 'array',
      group: 'meta',
      description: 'Short labels overlaid on the card image, e.g. "Training given".',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.max(2).warning('Two badges is all the card fits'),
    }),
    defineField({
      name: 'whenLabel',
      title: 'When (label)',
      type: 'string',
      group: 'logistics',
      description: 'Free text so "Rolling · 48 hrs notice" is expressible.',
    }),
    defineField({
      name: 'startsAt',
      title: 'Starts at',
      type: 'datetime',
      group: 'logistics',
      description: 'Optional machine-readable start, used for ordering.',
    }),
    defineField({
      name: 'durationLabel',
      title: 'Duration (label)',
      type: 'string',
      group: 'logistics',
    }),
    defineField({
      name: 'durationMinutes',
      title: 'Duration (minutes)',
      type: 'number',
      group: 'logistics',
      description:
        'Machine-readable length, used for a volunteer’s hours total — the ' +
        'counterpart to `durationLabel`, exactly as `startsAt` is to `whenLabel`. ' +
        'Leave empty for rolling or standby shifts; those contribute no hours.',
      validation: (rule) => rule.min(0).max(24 * 60),
    }),
    defineField({
      name: 'distanceLabel',
      title: 'Distance (label)',
      type: 'string',
      group: 'logistics',
      description: 'e.g. "2.4 km". Display only.',
    }),
    defineField({
      name: 'spotsTotal',
      title: 'Spots total',
      type: 'number',
      group: 'logistics',
      description: 'Spots left is this minus the number attending.',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'string',
      group: 'logistics',
      description: 'Map links for Google, Yandex and Apple are generated from this.',
    }),
    defineField({
      name: 'buses',
      title: 'Buses',
      type: 'array',
      group: 'logistics',
      of: [defineArrayMember({type: 'bus'})],
    }),
    defineField({
      name: 'entryNote',
      title: 'Entering the place — note',
      type: 'text',
      group: 'logistics',
      rows: 3,
    }),
    defineField({
      name: 'entryImage',
      title: 'Entering the place — poster',
      type: 'image',
      group: 'logistics',
      options: {hotspot: true},
      description: 'Poster frame for the walkthrough video.',
    }),
    defineField({
      name: 'entryVideo',
      title: 'Entering the place — video',
      type: 'file',
      group: 'logistics',
      options: {accept: 'video/*'},
    }),
    defineField({
      name: 'categories',
      type: 'array',
      group: 'meta',
      of: [defineArrayMember({type: 'reference', to: [{type: 'category'}]})],
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      group: 'meta',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {title: 'title', org: 'organisation.name', media: 'mainImage'},
    prepare({title, org, media}) {
      return {title, media, subtitle: org}
    },
  },
})
