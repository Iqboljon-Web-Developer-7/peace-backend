import {defineType, defineField, defineArrayMember} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

export const announcement = defineType({
  name: 'announcement',
  title: 'Announcement',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'attendance', // people who attended the announcement
      type: 'array',
      of: [defineArrayMember({type: 'text'})],
    }),
    defineField({
      name: 'memories', // memories of the announcement
      type: 'array',
      of: [defineArrayMember({type: 'text'})],
    }),
    defineField({
      name: 'comments', // comments of the announcement
      type: 'array',
      of: [{name: 'comment', type: 'text'}],
    }),
    defineField({
      name: 'busses',
      type: 'array',
      of: [{name: 'bus', type: 'number'}],
    }),
    defineField({
      name: 'google-map', // google map of the announcement
      type: 'text',
    }),
    defineField({
      name: 'apple-map', // location of the announcement
      type: 'text',
    }),
    defineField({
      name: 'yandex-map', // yandex map of the announcement
      type: 'text',
    }),
    defineField({
      name: 'entrance-video',
      type: 'file',
    }),
    defineField({
      name: 'user',
      type: 'reference',
      to: [{type: 'user'}],
    }),
    defineField({
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
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
      name: 'categories',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'category'}]})],
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'excerpt',
      type: 'text',
      validation: (rule) => rule.max(200).warning('Keep it under 200 characters for best SEO'),
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
    }),
  ],
  preview: {
    select: {title: 'title', author: 'author.name', media: 'mainImage'},
    prepare(selection) {
      const {author} = selection
      return {...selection, subtitle: author && `by ${author}`}
    },
  },
})
