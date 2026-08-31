import {defineType, defineField} from 'sanity'

/**
 * A free service laid on for a shift. Embedded on the announcement rather than
 * referenced — a bus has no meaning outside the announcement it serves.
 */
export const bus = defineType({
  name: 'bus',
  title: 'Bus',
  type: 'object',
  fields: [
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: {
        list: [
          {title: 'Regular bus', value: 'bus'},
          {title: 'Minibus', value: 'minibus'},
        ],
        layout: 'radio',
      },
      initialValue: 'bus',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'number',
      title: 'Route number',
      type: 'string',
      description: 'Shown large, e.g. "4", "11", "R1".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'stop',
      title: 'Pickup point',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'note',
      title: 'Note',
      type: 'string',
      description: 'e.g. "Was Bekat Sq. until Wednesday", "Direct, no stops".',
    }),
    defineField({
      name: 'departsAt',
      title: 'Departs at',
      type: 'string',
      description: 'Free text so "On call" is expressible, e.g. "08:10".',
    }),
    defineField({
      name: 'seatsTotal',
      title: 'Seats total',
      type: 'number',
      description: 'Capacity of the vehicle. Shown on the announcement as "N seats".',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'seatsLeft',
      title: 'Seats left (retired)',
      type: 'number',
      readOnly: true,
      hidden: ({value}) => value === undefined,
      description:
        'No longer read by the app. Nothing ever decremented this — there is no ' +
        'seat reservation anywhere, and joining a shift only creates an ' +
        'attendance document — so whatever was typed here stayed put while the ' +
        'announcement page rendered it as a live countdown, down to a "Full" ' +
        'state. A volunteer could read "2 of 40 left" and find an empty bus. ' +
        'Kept, read-only, so no existing value is destroyed, and hidden on ' +
        'documents that never had one. Delete the field once the remaining ' +
        'values have been cleared.',
      validation: (rule) => rule.min(0),
    }),
  ],
  preview: {
    select: {number: 'number', stop: 'stop', kind: 'kind'},
    prepare({number, stop, kind}) {
      return {
        title: `${kind === 'minibus' ? 'Minibus' : 'Bus'} ${number ?? ''}`.trim(),
        subtitle: stop,
      }
    },
  },
})
