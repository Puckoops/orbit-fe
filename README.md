# orbit-fe

The web app for **Orbit**, a work console for services agencies, at https://orbit.puckoops.com. Next.js 16 (App Router) with the Camelot design system.

## How it talks to the backends

The browser only ever calls this app. Route handlers on the server talk to the two APIs, and the session token stays in an httpOnly cookie:

- **Accounts** come from [user-svc](https://github.com/Puckoops/user-svc), which every Puckoops product shares. `/api/auth/*` signs people up and in with `"type": "orbit"`, which adds Orbit to their account. Sign-up ends at the inbox: the account can sign in once its address is confirmed through the emailed link, which lands on `/verify`. "Sign in with Google" hands Google's credential to `/api/auth/google`, which exchanges it at user-svc's `/user/oauth`: the first Google sign-in creates the account, already confirmed.
- **Everything else** comes from [orbit-be](https://github.com/Puckoops/orbit-be): `/api/orbit/*` forwards each request with the session as a bearer token.

## Running it

```bash
cp .env.example .env.local    # the dev APIs; point them at local services if you run those
npm install
npm run dev                   # http://localhost:3000
```

| Variable | |
|---|---|
| `ORBIT_API_URL` | orbit-be's API base, e.g. `https://api.dev.puckoops.com/orbit-be/api/v1` |
| `USER_SVC_URL` | user-svc's API base, e.g. `https://api.dev.puckoops.com/user-svc-smm/api/v1` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | The Google OAuth client user-svc's `GOOGLE_CLIENT_ID` names. Empty hides the Google button. |

The two API bases are read on the server at request time and never reach the browser. The Google client ID is
public and is built into the bundle, so changing it takes a new build; its client must list this app's origin,
`http://localhost:3000` included, under authorised JavaScript origins.

`npm run lint` and `npm run build` check the app. After orbit-be's API changes, regenerate its types with `node scripts/gen-api-types.mjs` (it reads `../orbit-be/docs/swagger.json`).

## Camelot

`@puckoops/camelot` is installed from `vendor/puckoops-camelot-0.2.0.tgz`, a packed build of the [Camelot](https://github.com/Puckoops/camelot) package. To take a newer Camelot, pack it there, replace the tarball here and run `npm install`.

## Deployment

Vercel builds the repo as a Next.js project from its root, with `ORBIT_API_URL`, `USER_SVC_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set for Production and Preview. Google accepts only the origins listed on its client, so the Google button works on `orbit.puckoops.com` and not on preview URLs. `orbit.puckoops.com` is a CNAME to the target Vercel gives for the domain.
