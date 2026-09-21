# Pacing

**Find the beat you're missing.**

Reads the **minute-by-minute timeline** of your recent League games and works
out where you lose the lead and what your build missed.

## The brand

| | |
| --- | --- |
| **Name** | Pacing |
| **Domain** | `pacing.gg` (checked as unregistered - confirm at a registrar) |
| **Tagline** | Find the beat you're missing. |
| **One-liner** | Pacing reads the timeline, not the scoreboard. |

**Why the name.** Every useful thing this app has found is a question of
rhythm: the five-minute window where the lead evaporates, items arriving a
minute late, arriving at the pit after the objective has already fallen.
That is pacing. It also stays true if the app ever covers more than jungle,
which a name like "Fullclear" would not.

**The mark** is a tempo line - the same shape as the gold-difference curve the
whole app is built around. It rises, dips, and one beat is marked. The logo
and the hero chart are deliberately the same drawing. It lives in
`src/components/Logo.tsx` and `src/app/icon.svg`.

**Voice.** Plain and measured, never hype. Name a number, say what it costs,
and admit when a sample is too small to mean anything. Never say something
that is true by definition.

**Colour** is the existing blue-to-green gradient. The data colours are
validated for colour-blind separation and should not be changed casually.

This is deliberately not a stats page. Anything you can read off op.gg is in a
collapsed "Reference numbers" section at the bottom. The findings up top all
follow two rules:

1. **Nothing true by definition.** "You die more in games you lose" is true for
   every player who has ever lived and cannot be acted on. Every finding is
   measured either against *your actual lane opponent* or against *another
   phase of your own game*.
2. **Everything has a size.** Each finding carries an estimated cost in gold
   per game, and the list is sorted by it, so you know what to fix first.

## What it measures

- **Gold, CS and XP against your real lane opponent**, every minute, averaged
  across every game.
- **The five-minute window where you lose the most ground** - the timestamp
  worth opening a replay at.
- **When your first, second and third items come online**, against when your
  opponent's did.
- **Whether you itemised against the actual threat**: magic resist against
  teams that dealt magic damage, armour against teams that dealt physical, and
  Grievous Wounds against the teams that actually healed. All judged from the
  damage and healing recorded in that specific game, never guessed from
  champion names.
- **Phase-by-phase gold swing, farming rate and deaths**, so a laning problem
  and a mid-game problem do not get averaged into each other.

## Getting a permanent Riot API key

The 24-hour development key works, but re-pasting it every session is the
thing most likely to make you stop using this. Riot issues **Personal API
Keys** that do not expire. It is a form, not code.

1. Go to <https://developer.riotgames.com> and sign in.
2. Open **Register Product** (top right, under your name) and choose
   **Personal API Key**.
3. Fill in the form. Copy these in:
   - **Product name**: `Pacing`
   - **Product URL**: your GitHub repo for this project. If it is not on
     GitHub yet, push it first - a dead link is the most common rejection.
   - **Product description**:

     > Pacing is a personal, non-commercial web app that I run locally on my
     > own computer to review my own ranked games. It reads my match history
     > and match timelines and summarises where I lose tempo as a jungler:
     > gold and CS against the enemy jungler minute by minute, clear speed,
     > objective presence, and item timings. It is a single-user tool with no
     > accounts, no hosting, and no sharing or resale of any data. Everything
     > downloaded is cached locally to stay well inside the rate limits.
     > Endpoints used: ACCOUNT-V1, MATCH-V5, LEAGUE-V4, SUMMONER-V4, and Data
     > Dragon for static item and champion data.

   - **Which APIs**: Account, Match, League, Summoner.
4. Tick the boxes confirming you have read the policies, and submit.

Approval is manual and usually takes a few days to a couple of weeks. You
keep using the development key in the meantime - nothing in the project
changes, you just paste the new key into the same place when it arrives.

Two things that get applications rejected: a description that sounds like a
commercial product when it is not, and a dead product URL. Keep it honest
and make the link work.

## Getting a development key (works today)

The app reads your match history from Riot's servers, and Riot requires a key.
It is free.

1. Go to <https://developer.riotgames.com> and sign in with your normal Riot
   account (the one you play on).
2. Accept the terms if it asks.
3. On the dashboard you will see a box called **DEVELOPMENT API KEY** with a
   value starting `RGAPI-`. Click the copy button.
4. Make a copy of `.env.local.example` and name the copy `.env.local`.
5. Replace `RGAPI-paste-your-key-here` with the key you copied, and save.

**Development keys expire after 24 hours.** When the app says the key was
refused, paste in a fresh one. You do **not** need to restart - Next.js
notices the file changed and reloads it by itself.

`.env.local` is in `.gitignore`, so your key never gets committed. The key
goes in that file only, never in the Riot ID box on the page.

## Running it

```powershell
cd "C:\Users\Hjalm\Documents\Claude - Projekter\lol-post-game-analysis"; npm.cmd run dev
```

Then open <http://localhost:3000> and enter your Riot ID - the name and tag you
see in the client, for example `louder than you#lty`.

`npm.cmd` rather than `npm` is a Windows PowerShell thing, explained under
troubleshooting below.

## Why the first run is slow

Each game needs **two** requests to Riot: the scoreboard and the timeline. A
free development key allows **100 requests every two minutes**, so 50 games
(about 102 requests) takes a couple of minutes the first time. A progress bar
shows how far along it is.

Every downloaded game is then saved in a `.cache` folder, which git ignores.
Re-running the same analysis takes seconds, and adding more games only pays
for the ones you have not seen before.

## When something goes wrong

**`npm run dev` fails with "npm.ps1 cannot be loaded ... running scripts is
disabled".** That is a Windows security setting, not a problem with this
project. Use `npm.cmd run dev` instead - same program, different file type, so
the block does not apply. To lift it permanently for your account, run
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` yourself and answer `Y`.

**"Port 3000 is already in use".** A copy is already running. Either open
<http://localhost:3000> and use it, or free the port with `npx kill-port 3000`.

**"Riot refused the API key".** It expired - they last 24 hours. Paste a fresh
one into `.env.local`; no restart needed.

**A chart says there is not enough data.** Tempo comparisons need a lane
opponent, which only exists on Summoner's Rift. ARAM and Arena games are
counted in the reference numbers but cannot be used for tempo.

## The pages

| Page | What is on it |
| --- | --- |
| Overview | Your biggest problem, then five scores out of 100 - one per area of the game. |
| Focus | Pick one thing to work on. The app remembers where you started and tracks whether it moves. |
| Map | Your first-clear routes, a death heatmap, where you spend the early game, and whether you were near the pit when objectives fell. |
| Tempo | Gold, CS and XP against the enemy player in your role, minute by minute, plus the phase breakdown. |
| Jungle | Clear speed, counter-jungling, scuttle, vision and objective control against the enemy jungler. Only appears if you play jungle. |
| Builds | Item timings against your opponent, reactive itemisation, and which first item actually wins for you. |
| Benchmarks | Your best games against your worst, and a reference set built from real ladder players above your rank. |
| Matches | Every game, filterable by result and champion. |
| One match | A page per game: the score, that game's own gold curve with your deaths marked, a minute-by-minute story of what happened, both build orders side by side, and what the enemy team was made of. |
| `/live` | A second screen for while you are playing. Reads the game from the League client on this computer - no API key, no rate limit. |

Every reference to a game anywhere in the app links to that game's page.
"That Lee Sin game" is not an identifier when you play Lee Sin thirty times,
so findings always carry the date, the opponent and the result.

The scores are measured **against the opponents you actually played**, not
against a rank. 50 means level with them. The real measurement is always
printed next to the score.

## How it is put together

| File | What it does |
| --- | --- |
| `src/app/page.tsx` | Front page with the search box. |
| `src/app/analyse/page.tsx` | Thin wrapper - all the work happens in the API route. |
| `src/app/api/analyse/route.ts` | Runs the analysis and streams progress line by line. |
| `src/lib/riot.ts` | Talks to Riot. Server-side only, so the key stays secret. |
| `src/lib/limiter.ts` | Keeps us inside Riot's 20/second and 100/2-minutes limits. |
| `src/lib/cache.ts` | Saves downloaded games to disk; finished matches never change. |
| `src/lib/timeline.ts` | Reads the minute-by-minute frames and events. |
| `src/lib/tempo.ts` | Gold/CS/XP against your opponent, phases, worst window. |
| `src/lib/builds.ts` | Item timings and whether your build answered the enemy. |
| `src/lib/ddragon.ts` | Riot's free item database - what each item actually gives. |
| `src/lib/coach.ts` | Turns all of the above into the ranked list of problems. |
| `src/lib/scores.ts` | The five area scores on the overview. |
| `src/app/analyse/layout.tsx` | The shell. Runs the analysis once and keeps it while you switch tabs. |
| `src/lib/reportContext.tsx` | Shares the finished report with every page. |
| `src/components/Art.tsx` | The icons and spot illustrations, drawn inline as SVG so they follow the colour tokens. |
| `src/components/` | The rest of the visual pieces. |

Built with Next.js, TypeScript and Tailwind CSS. Charts use Recharts.

### Two things the analysis is careful about

**Survivorship bias.** Losses run longer than wins, so at minute 30 the only
games left are disproportionately losses, and the average gold line drifts
down for reasons that have nothing to do with how you played. The curve
therefore stops once fewer than 60% of games are still running, and the
"biggest drop" window is only searched where at least 70% are.

**Colour is never the only signal.** Wins are blue and losses orange rather
than green and red, because roughly 1 in 12 men cannot reliably separate green
from red. Every value is also written out in text.

## Not affiliated with Riot

**Pacing** is not endorsed by Riot Games and does not reflect the views or
opinions of Riot Games or anyone officially involved in producing or managing
League of Legends.
