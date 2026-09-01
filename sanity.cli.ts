import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'ysi42gxq',
    dataset: 'production'
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     *
     * Keep the local `sanity` and `@sanity/vision` versions in step with the
     * runtime this serves. With auto-updates on, the deployed Studio runs
     * whatever Sanity currently ships, so a bundle built against an older
     * local version is running against a newer one — `sanity deploy` warns
     * about exactly that. Both were bumped 6.9.1 -> 6.11.0 before the first
     * deploy to close that gap.
     */
    autoUpdates: true,
    /**
     * The deployed Studio at https://peaceapp.sanity.studio
     *
     * Recorded here so redeploys are unattended — without it the CLI prompts
     * for an application id every time, which makes `sanity deploy` impossible
     * to run from CI or a script.
     */
    appId: 'wi805f97c020ain4mpk0k1z0',
  },
  typegen: {
    enabled: true,
    path: '../peace-front/{app,sanity}/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../peace-front/sanity.types.ts',
    overloadClientMethods: true,
  },
})
