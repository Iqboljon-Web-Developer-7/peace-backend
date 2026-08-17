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
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'seatsLeft',
      title: 'Seats left',
      type: 'number',
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
