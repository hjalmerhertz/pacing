# Putting Pacing online

Pacing runs on your own machine with no setup beyond a Riot key. This
document is about the other mode: hosting it publicly, which is what a Riot
**Production** key application requires — the reviewer has to be able to
open your product and use it.

Two accounts are needed, both free: **Supabase** (the database) and
**Vercel** (the hosting). Neither step can be done for you, because both
need you to sign in.

---

## Why a database is required when hosted

Running locally, Pacing saves downloaded matches into a `.cache` folder and
focus goals into `data/focus.json`. A hosted server has no writable disk
that survives between requests, so both would silently stop working — and
without a cache, every analysis re-downloads all its matches and exhausts
the rate limit almost immediately.

Hosting actually makes the cache *better*. A match is identical for
everyone who looks at it, so one player's download serves every later
visitor who opens the same game.

You do not need any of this to run Pacing locally. Leave the Supabase
variables blank and it uses the disk, exactly as before.

---

## 1. Create the database

1. Go to <https://supabase.com> and sign in with GitHub.
2. **New project**. Pick any name, any region close to you, and let it
   generate a database password (you will not need it for this).
3. Wait for it to finish setting up — a minute or two.
4. Open **SQL Editor** in the left sidebar, click **New query**, paste in
   the whole of [`supabase/schema.sql`](supabase/schema.sql) from this
   repo, and press **Run**. It creates two tables, `cache` and `focus`.
5. Open **Project Settings → API** and copy two values:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role** secret key → this is `SUPABASE_SERVICE_ROLE_KEY`

> **The service role key is a secret.** It bypasses database security
> rules. Pacing only ever reads it on the server and never sends it to the
> browser. Do not commit it, and do not paste it into a chat window.

### Trying the database locally first

Put both values into your `.env.local` and restart the dev server. Pacing
will switch from the disk to the database. Run an analysis, then check
**Table Editor → cache** in Supabase — you should see rows appear. Once
that works, hosting will work.

---

## 2. Deploy

1. Go to <https://vercel.com> and sign in with GitHub.
2. **Add New → Project**, and import `hjalmerhertz/pacing`.
3. Leave every build setting alone. Vercel detects Next.js by itself.
4. Before deploying, open **Environment Variables** and add three:

   | Name | Value |
   | --- | --- |
   | `RIOT_API_KEY` | your key |
   | `SUPABASE_URL` | from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |

5. **Deploy.** You get a URL like `pacing.vercel.app`.

When your Riot key expires, update it in **Vercel → Settings →
Environment Variables** and redeploy. The hosted app cannot read your
local `.env.local`.

---

## What changes when hosted

**The sample size defaults to 20 games.** That is about 42 requests, which
finishes in seconds. Fifty games is 102 requests, which crosses the
100-per-two-minutes development limit and forces a two-minute wait — fine
on your own machine, far too slow for someone trying the app.

**Building a reference set is disabled.** That job is around 130 requests
over several minutes, longer than a hosted request is allowed to run. The
button is hidden and the API refuses it.

To build one anyway: set the Supabase variables in your **local**
`.env.local`, run Pacing locally, and press the button there. It writes to
the same shared database, so everyone using the hosted app gets it. There
is no timeout on your own machine.

**The live companion (`/live`) only works locally.** It reads the League
client on `127.0.0.1:2999`, which by definition means the computer running
the game. On the hosted app it will simply report no game found. That is
expected, not a bug.

---

## Before applying for a Production key

Riot reviews the working product, not a description. Check each of these
yourself on the deployed URL:

- [ ] A stranger can enter a Riot ID and get a report, without installing
      anything or supplying their own API key
- [ ] The "not endorsed by Riot Games" disclaimer is visible — it is in the
      footer of every page
- [ ] No API key is ever exposed to the browser (open DevTools → Network
      and confirm nothing contains `RGAPI-`)
- [ ] Rate limits are respected — the limiter in `src/lib/limiter.ts`
      handles this per instance, and the shared cache keeps request volume
      down
- [ ] The app works on a phone-sized screen

One known limitation worth being aware of: the rate limiter holds its
state in memory, so several hosted instances do not coordinate with each
other. With the shared cache most requests never reach Riot at all, but if
real traffic ever arrives this needs moving into the database too.
