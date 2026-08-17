import {defineType, defineField, defineArrayMember} from 'sanity'
import {ImagesIcon} from '@sanity/icons/Images'

/** A photo a volunteer contributed from a past edition of a shift. */
export const memory = defineType({
  name: 'memory',
  title: 'Memory',
  type: 'document',
  icon: ImagesIcon,
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
      name: 'image',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'caption',
      type: 'string',
      validation: (rule) => rule.max(280),
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
    defineField({name: 'createdAt', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'author.name', subtitle: 'announcement.title', media: 'image'},
  },
})
