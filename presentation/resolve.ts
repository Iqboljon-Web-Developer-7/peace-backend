import {defineLocations, type PresentationPluginOptions} from 'sanity/presentation'

export const resolve: PresentationPluginOptions['resolve'] = {
  locations: {
    announcement: defineLocations({
      select: {title: 'title', slug: 'slug.current'},
      resolve: (doc) => ({
        locations: [
          {title: doc?.title || 'Untitled', href: `/announcements/${doc?.slug}`},
          {title: 'Announcements index', href: `/announcements`},
        ],
      }),
    }),
  },
}
