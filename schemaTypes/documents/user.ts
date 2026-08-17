import {defineType, defineField, defineArrayMember} from 'sanity'
import {UsersIcon} from '@sanity/icons/Users'

/** 7 days x 4 slots. Kept in one place so the frontend can validate against it. */
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const SLOTS = ['morn', 'mid', 'aft', 'eve']
export const AVAILABILITY_SLOTS = DAYS.flatMap((d) => SLOTS.map((s) => `${d}-${s}`))

/**
 * A volunteer.
 *
 * Two kinds of field live here and they must not be confused:
 *
 *  - Identity from Auth0 (`auth0Id`, `email`, `picture`) — overwritten on every
 *    login by `syncUserToSanity`.
 *  - Everything the volunteer sets themselves on /profile — `name` included,
 *    which is why the sync only ever `setIfMissing`s it.
 */
export const user = defineType({
  name: 'user',
  title: 'User',
  type: 'document',
  icon: UsersIcon,
  groups: [
    {name: 'profile', title: 'Profile', default: true},
    {name: 'preferences', title: 'Preferences'},
    {name: 'account', title: 'Account'},
  ],
  fields: [
    defineField({
      name: 'auth0Id',
      title: 'Auth0 ID',
      type: 'string',
      group: 'account',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'name',
      type: 'string',
      group: 'profile',
      description: 'Volunteer-owned. The login sync seeds it once, then never touches it.',
      validation: (rule) => rule.max(80),
    }),
    defineField({
      name: 'email',
      type: 'string',
      group: 'account',
      readOnly: true,
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'picture',
      title: 'Picture (from Auth0)',
      type: 'url',
      group: 'account',
      readOnly: true,
      description: 'The photo from the login provider. `avatar` below wins when set.',
    }),
    defineField({
      name: 'avatar',
      title: 'Avatar (uploaded)',
      type: 'image',
      group: 'profile',
      options: {hotspot: true},
      description: 'Set by the volunteer on /profile. Never touched by the login sync.',
    }),
    defineField({
      name: 'phone',
      type: 'string',
      group: 'profile',
      description: 'Shown only to staff of the organisation the volunteer signs up with.',
      validation: (rule) => rule.max(24),
    }),
    defineField({
      name: 'neighbourhood',
      type: 'string',
      group: 'profile',
      description: 'Free text. Deliberately not geocoded.',
      validation: (rule) => rule.max(80),
    }),
    defineField({
      name: 'travelRadius',
      title: 'How far they will travel',
      type: 'string',
      group: 'profile',
      description: 'A stated preference. Nothing filters on it yet.',
      options: {
        list: [
          {title: 'Walking distance', value: 'walk'},
          {title: 'Up to 3 km', value: '3km'},
          {title: 'Up to 8 km', value: '8km'},
          {title: 'Across the city', value: 'city'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'interests',
      title: 'What they want to be asked for',
      type: 'array',
      group: 'preferences',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'category'}],
          options: {filter: 'kind == "interest"'},
        }),
      ],
      validation: (rule) => rule.max(20).unique(),
    }),
    defineField({
      name: 'availability',
      title: 'When they are usually free',
      type: 'array',
      group: 'preferences',
      of: [defineArrayMember({type: 'string'})],
      options: {list: AVAILABILITY_SLOTS},
      description: '7 days x 4 slots. Private to the volunteer.',
    }),
    defineField({
      name: 'notify',
      title: 'Notification preferences',
      type: 'object',
      group: 'preferences',
      description: 'STORED ONLY — nothing sends notifications yet.',
      options: {collapsible: true, collapsed: false},
      fields: [
        defineField({name: 'matches', title: 'Shifts that match me', type: 'boolean'}),
        defineField({name: 'reminders', title: 'Shift reminders', type: 'boolean'}),
        defineField({name: 'cleanings', title: 'General cleaning days', type: 'boolean'}),
        defineField({name: 'seasonal', title: 'Ramadan and Eid rotas', type: 'boolean'}),
      ],
    }),
    defineField({
      name: 'anonymousFeedback',
      title: 'Send feedback anonymously',
      type: 'boolean',
      group: 'preferences',
    }),
    defineField({
      name: 'referralCode',
      type: 'string',
      group: 'account',
      readOnly: true,
      description: 'Minted on creation. Powers /j/<code>.',
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: 'referredBy',
      type: 'reference',
      to: [{type: 'user'}],
      group: 'account',
      readOnly: true,
      // Weak: closing an account must never be blocked by someone they invited.
      weak: true,
    }),
    defineField({
      name: 'referredAt',
      type: 'datetime',
      group: 'account',
      readOnly: true,
    }),
    defineField({
      name: 'status',
      type: 'string',
      group: 'account',
      initialValue: 'active',
      options: {
        list: [
          {title: 'Active', value: 'active'},
          {title: 'Closed', value: 'closed'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'closedAt',
      type: 'datetime',
      group: 'account',
      readOnly: true,
    }),
    defineField({
      name: 'profileUpdatedAt',
      type: 'datetime',
      group: 'account',
      readOnly: true,
    }),
    defineField({
      name: 'lastLoginAt',
      type: 'datetime',
      group: 'account',
      readOnly: true,
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'email', media: 'avatar', status: 'status'},
    prepare({title, subtitle, media, status}) {
      return {
        title: title ?? 'Someone',
        subtitle: status === 'closed' ? 'Closed account' : subtitle,
        media,
      }
    },
  },
})
