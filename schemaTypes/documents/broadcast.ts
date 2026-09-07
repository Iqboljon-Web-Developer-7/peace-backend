import {defineType, defineField} from 'sanity'
// `Publish`, not `Bell`: the bell is already `notification` and
// `pushSubscription`, and this is the thing that *causes* those rather than
// another of them. (`@sanity/icons` has no megaphone in this version.)
import {PublishIcon} from '@sanity/icons/Publish'

/**
 * One message an operator sent to volunteers.
 *
 * ## Why this is not an announcement
 *
 * `announcement` is editorial: it has a slug, a byline, an image, a place and a
 * time, it is written in the Studio, and it is addressable at a URL. A
 * broadcast is none of those. It is an operational act — "the water is off at
 * Chorsu tomorrow" — that goes to phones and nowhere else, is not editable
 * after the fact, and has no page. Modelling it as an announcement with most of
 * its fields empty would put it on the public feed, which is precisely what it
 * must not do.
 *
 * ## Why the app writes this and the Studio does not
 *
 * Same reason as `notification` and `pushSubscription` above it in
 * `schemaTypes/index.ts`, and the fields are `readOnly` for the same reason:
 * the row is a *record of something that already happened*. Editing the title
 * afterwards would not change a single push that has already left, so the
 * Studio would be offering to rewrite history.
 *
 * The one thing that is *not* a record is the send itself, and that is
 * deliberately not expressible here: there is no "resend" and no `status` to
 * flip. Delivery state lives on the `notification` rows this produced.
 *
 * ## `recipientCount` is stored, not counted
 *
 * It is how many people the audience resolved to **at the moment of sending**,
 * which is not the same as how many rows exist now (a row can be pruned) nor as
 * how many `notification` documents point back here. Recomputing it later would
 * quietly answer a different question, so the number is frozen with the send —
 * the same reasoning that freezes `title`/`body`/`url` on `notification`.
 */
export const broadcast = defineType({
  name: 'broadcast',
  title: 'Broadcast',
  type: 'document',
  icon: PublishIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'The push heading. Frozen — this is a record of what was sent.',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      type: 'text',
      rows: 4,
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'audience',
      type: 'string',
      description:
        'Which group this was addressed to. Both audiences exclude closed ' +
        'accounts and anyone who turned `notify.everything` off — the opt-out ' +
        'is applied in the query, so it cannot be bypassed from here.',
      options: {
        list: [
          {title: 'Everyone', value: 'everyone'},
          {title: 'Active volunteers', value: 'active'},
        ],
        layout: 'radio',
      },
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sentBy',
      title: 'Sent by',
      type: 'reference',
      to: [{type: 'user'}],
      // Weak, like `attendance.turnoutBy`: the record of who sent a message
      // must never be the reason an operator's account cannot be deleted.
      weak: true,
      readOnly: true,
    }),
    defineField({
      name: 'recipientCount',
      title: 'Recipients',
      type: 'number',
      description:
        'How many people the audience resolved to when this was sent. See the ' +
        'note above for why it is stored rather than recomputed.',
      readOnly: true,
    }),
    defineField({
      name: 'createdAt',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'audience', count: 'recipientCount'},
    prepare: ({title, subtitle, count}) => ({
      title,
      subtitle: `${subtitle ?? 'unknown audience'} · ${count ?? 0} recipients`,
    }),
  },
})
