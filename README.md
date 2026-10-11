# orbit-fe

The web app for **Orbit**, a work console for services agencies, at https://orbit.puckoops.com. Next.js 16 (App Router) with the Camelot design system.

## How it talks to the backends

The browser only ever calls this app. Route handlers on the server talk to the two APIs, and the session token stays in an httpOnly cookie:

- **Accounts** come from [user-svc](https://github.com/Puckoops/user-svc), which every Puckoops product shares. `/api/auth/*` signs people up and in with `"type": "orbit"`, which adds Orbit to their account. Sign-up ends at the inbox: the account can sign in once its address is confirmed through the emailed link, which lands on `/verify`.
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

Both are read on the server at request time; neither reaches the browser.

`npm run lint` and `npm run build` check the app. After orbit-be's API changes, regenerate its types with `node scripts/gen-api-types.mjs` (it reads `../orbit-be/docs/swagger.json`).

## Camelot

`@puckoops/camelot` is installed from `vendor/puckoops-camelot-0.1.0.tgz`, a packed build of the [Camelot](https://github.com/Puckoops/camelot) package. To take a newer Camelot, pack it there, replace the tarball here and run `npm install`.

## Deployment

Vercel builds the repo as a Next.js project from its root, with `ORBIT_API_URL` and `USER_SVC_URL` set for Production and Preview. `orbit.puckoops.com` is a CNAME to the target Vercel gives for the domain.
