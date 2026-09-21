# Getting this onto GitHub and Railway

The repo is already initialized and committed on branch `main` — you only need
to point it at GitHub and push.

## 1. Create the empty repo

On github.com, **New repository** → name `stuck-behind-a-left-turn`, public,
and **do not** add a README, .gitignore or license. An empty repo makes the
first push clean.

## 2. Push

From this folder:

```
git remote add origin https://github.com/mikesmeets/stuck-behind-a-left-turn.git
git push -u origin main
```

If you use GitHub Desktop instead: File → Add local repository, point it at
this folder, then Publish repository.

## 3. Deploy on Railway

New Project → Deploy from GitHub repo → pick the repo. Railway detects Node,
runs `npm start`, and `server.js` serves the pages on the port it assigns.
Nothing to configure — no environment variables, no build command, no
database.

Then Settings → Networking → **Generate Domain** for a public URL, or add your
own domain.

### Skipping GitHub

If you would rather not use GitHub at all, the Railway CLI deploys this folder
directly:

```
npm i -g @railway/cli
railway login
railway init
railway up
```

## What gets served

| URL | Page |
|---|---|
| `/` | Take action: the case, the crash record, the petition and the letter |
| `/questions` | The FAQ hub (also `/faq`) |
| `/safety` | Crash record, FHWA evidence, the schools |
| `/traffic` | NYSDOT's finding, the replay, the corridor chart |
| `/parking` | Parking, funding, business (also `/business`) |
| `/what-drives-traffic` | AADT trend and the superintendent's-day count |
| `/simulation` | The build-up walk from 400 to 1,000 veh/h (~0.9 MB). Also `/buildup` |
| `/short` | The single-volume explainer (~1.3 MB, ~280 KB gzipped) |
| `/full` | The full edition with the sensitivity sections (~4.9 MB, ~1.1 MB gzipped) |
| `/writeup`, `/writeup-full` | The written versions |
| `/site/...`, `/media/...` | Styles, scripts, photos, the MP4 and stills |

`planning/`, `.claude/` and the repo's own Markdown notes are 404 on the site.

`server.js` gzips HTML, Markdown, JSON and Python on the way out, which is
what keeps the pages reasonable over cellular — they are large because the
entire simulation trace is inlined rather than fetched.

## Updating it later

Change an assumption, rerun the model, rebuild the pages, commit, push.
Railway redeploys on push. Editing the site pages themselves needs no build:
they are hand-written HTML plus `site/`.

```
python3 model/analyze.py
python3 model/make_trace.py
python3 model/queue_trace.py
python3 model/refresh_data.py
python3 model/build_pages.py
git commit -am "..." && git push
```

Note that `build_pages.py` writes to `road_diet_weaving_buildup.html`,
`road_diet_weaving_public.html` and `road_diet_weaving_complex.html`; copy those
over `simulation.html`, `short.html` and `full.html` respectively, or edit the output
paths at the bottom of that script to write them directly.
