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
| `/` | The explainer (public edition, ~1.3 MB, ~290 KB gzipped) |
| `/full` | The full edition with the sensitivity sections (~5 MB, ~1.1 MB gzipped) |
| `/writeup`, `/writeup-full` | The written versions |
| `/media/...` | The MP4, GIF and stills |

`server.js` gzips HTML, Markdown, JSON and Python on the way out, which is
what keeps the pages reasonable over cellular — they are large because the
entire simulation trace is inlined rather than fetched.

## Updating it later

Change an assumption, rerun the model, rebuild the pages, commit, push.
Railway redeploys on push.

```
python3 model/analyze.py
python3 model/make_trace.py
python3 model/refresh_data.py
python3 model/build_pages.py
git commit -am "..." && git push
```

Note that `build_pages.py` writes to `road_diet_weaving_public.html` and
`road_diet_weaving_complex.html`; copy those over `index.html` and `full.html`,
or edit the output paths at the bottom of that script to write them directly.
