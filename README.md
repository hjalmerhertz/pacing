# LoL Post-Game Analysis

Looks at your last 20 League of Legends games at once and shows what they have
in common, instead of one scoreboard at a time.

## Getting a Riot API key

The app reads your match history from Riot's own servers, and Riot requires a
key to do that. It is free.

1. Go to <https://developer.riotgames.com> and sign in with your normal Riot
   account (the one you play on).
2. Accept the terms if it asks.
3. On the dashboard you will see a box called **DEVELOPMENT API KEY** with a
   value starting `RGAPI-`. Click the copy button next to it.
4. In this project folder, make a copy of `.env.local.example` and name the
   copy `.env.local`.
5. Open `.env.local` and replace `RGAPI-paste-your-key-here` with the key you
   copied. Save the file.
6. If the app is already running, stop it and start it again - it only reads
   the key on startup.

**These development keys expire after 24 hours.** When the app tells you the
key was refused, go back to step 1, copy the new key, and paste it in. (A
permanent key requires registering the app with Riot, which is only worth doing
once you want other people to use it.)

`.env.local` is listed in `.gitignore`, so your key is never committed.

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000> and enter your Riot ID - the name and tag you
see in the client, for example `Hide on bush#KR1`.

Without a key you can still click **See an example report** on the front page.
It uses made-up games and never touches the network, so it works straight away.

## How it is put together

| Folder / file | What it does |
| --- | --- |
| `src/app/page.tsx` | The front page with the search box. |
| `src/app/analyse/page.tsx` | The results page. Fetches the data and lays out the report. |
| `src/lib/riot.ts` | Talks to the Riot API. Server-side only, so the key stays secret. |
| `src/lib/regions.ts` | Maps your server (EUW, NA...) to Riot's routing clusters. |
| `src/lib/analysis.ts` | Pure maths: turns raw matches into per-game numbers and averages. |
| `src/lib/insights.ts` | The rules that turn those numbers into sentences. |
| `src/components/` | The visual pieces: cards, charts, tables. |

Built with Next.js, TypeScript and Tailwind CSS. Charts use Recharts.

### A note on the colours

Wins are blue and losses are orange rather than the obvious green and red.
Green and red are nearly identical for the roughly 1 in 12 men with red-green
colour blindness; blue and orange stay distinguishable for everyone. Every
chart also labels its values in text, so colour is never the only clue.

## Not affiliated with Riot

This project is not endorsed by Riot Games and does not reflect the views or
opinions of Riot Games or anyone officially involved in producing or managing
League of Legends.
