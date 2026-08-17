import {defineType, defineField} from 'sanity'
import {TagIcon} from '@sanity/icons/Tag'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: TagIcon,
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
      name: 'kind',
      type: 'string',
      description:
        'Interests are offered to volunteers on their profile. Seasons drive the ' +
        '"season ahead" card.',
      initialValue: 'interest',
      options: {
        list: [
          {title: 'Volunteer interest', value: 'interest'},
          {title: 'Season', value: 'season'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
    }),
  ],
  preview: {
    select: {title: 'title', kind: 'kind'},
    prepare({title, kind}) {
      return {title, subtitle: kind === 'season' ? 'Season' : 'Interest'}
    },
  },
})
