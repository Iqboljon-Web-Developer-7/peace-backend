import {documentEventHandler} from '@sanity/functions'

/**
 * Deliberately thin.
 *
 * The two repositories are separate, so this function cannot import the
 * notification engine from the Next app. Rather than duplicate the audience
 * rules — which would guarantee the two copies drift — it hands the id to the
 * one endpoint that owns them. Everything this file knows is where to POST.
 */
export const handler = documentEventHandler<{_id: string}>(async ({context, event}) => {
  const url = process.env.PEACE_NOTIFY_URL
  const secret = process.env.PEACE_NOTIFY_SECRET
  if (!url || !secret) {
    throw new Error('PEACE_NOTIFY_URL and PEACE_NOTIFY_SECRET must both be set')
  }

  // `sanity functions test` runs locally, where the app is usually on
  // localhost and unreachable from Sanity's cloud anyway.
  if (context.local) {
    console.log('local run — would notify for', event.data._id)
    return
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json', authorization: `Bearer ${secret}`},
    body: JSON.stringify({announcementId: event.data._id}),
  })
  console.log(`${res.status} ${await res.text()}`)
})
