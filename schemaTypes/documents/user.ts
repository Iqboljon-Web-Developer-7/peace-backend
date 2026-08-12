import {defineType, defineField} from 'sanity'
import {UsersIcon} from '@sanity/icons/Users'

export const user = defineType({
  name: 'user',
  title: 'User',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'auth0Id',
      title: 'Auth0 ID',
      type: 'string',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'name',
      type: 'string',
    }),
    defineField({
      name: 'email',
      type: 'string',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'picture',
      type: 'url',
    }),
    defineField({
      name: 'lastLoginAt',
      type: 'datetime',
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'email'},
  },
})
