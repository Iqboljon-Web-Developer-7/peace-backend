import {defineType, defineField, defineArrayMember} from 'sanity'
import {UsersIcon} from '@sanity/icons/Users'

/**
 * The entity an announcement is published as. When a member posts, the
 * announcement is bylined with the organisation, not the person — `postedBy`
 * on the announcement records who actually did it.
 */
export const organisation = defineType({
  name: 'organisation',
  title: 'Organisation',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'verified',
      title: 'Verified',
      type: 'boolean',
      description: 'Only verified organisations may publish announcements.',
      initialValue: false,
    }),
    defineField({
      name: 'logo',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'about',
      type: 'text',
    }),
    defineField({
      name: 'members',
      title: 'Members',
      description:
        'Users who may post as this organisation. Their comments show an "Organiser" badge.',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'user'}]})],
    }),
  ],
  preview: {
    select: {title: 'name', media: 'logo', verified: 'verified'},
    prepare({title, media, verified}) {
      return {title, media, subtitle: verified ? 'Verified' : 'Unverified'}
    },
  },
})
