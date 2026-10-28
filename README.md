# 🇮🇹 Italiano Vero

**Real Italian, curated by an actual native speaker. No owls, no hearts, no ads.**

A free learning site for real Italian — flashcards and quizzes with the *modi di dire*, the slang, and the tips no textbook will tell you (like why you never answer *"grazie"* to *"in bocca al lupo"*). Built by a native speaker, for one very specific learner first (ciao, amore 💘) and for everyone else second.

**🎓 Use it here:** [https://ctrlaltbeard.github.io/italian-vero/](https://ctrlaltbeard.github.io/italiano-vero/)

No install, no account, no app store. Bookmark the link and you're learning.

## Using the site

- **Pick a category** — Saluti, Numeri, Cibo, Verbi, Modi di dire, Nazionalità e Paesi, In Classe, Amore… or *Tutto* for the full shuffle
- **Pick a level** — filter any category by CEFR level (A1, A2, B1…); new level chips appear automatically as the data grows
- **Flashcards** — tap to flip, mark cards *La so* (mastered) or *Da rivedere* (needs practice), hide mastered cards while drilling
- **Quizzes** — choose your length: 10, 20, 50, or the 100-question *mega quiz*; mixed Italian → English and English → Italian; click-to-advance feedback so the native tips actually stay on screen
- **Native tips** — cultural context, register, and what real people actually say
- Progress and dark mode are saved locally in your browser. No accounts, no tracking — we keep less data than a barista remembers about regulars.

## Contributing — one good website, together

The site is the product. Rather than everyone forking their own copy into oblivion, let's unify efforts here. Two ways to help:

- **Issues** — found a mistake, a missing word, or a *modo di dire* that deserves its place? [Open an issue](https://github.com/CtrlAltBeard/italiano-vero/issues). Vocabulary suggestions from native speakers are especially welcome.
- **Pull requests** — fixing a word or adding entries to an existing `data/` file? A PR is perfect. Bigger changes (new features, redesigns)? Open an issue first so we can talk it through.

Vocabulary accuracy is this project's whole point, so corrections always beat volume.

## How the data is organised

One JSON file per topic, listed in `data/manifest.json` (the manifest's order is the home grid's order):

```
data/
├── manifest.json     ← the list of topic files
├── saluti.json       ← each file: metadata + entries
├── numeri.json
└── ...
```

Two rules keep it scalable to a whole language:

1. **Topics, not levels.** Files are organised by *topic* (cibo, saluti, viaggi); the difficulty level lives on each entry, not on the file. "A1 Food" as a separate file would be a trap — with levels on entries, the level filter can draw A1 words from every topic at once.
2. **Files stay small.** A topic file with 20–60 entries is comfortable. When one outgrows that, split it (`cibo.json` → `cibo.json` + `ristorante.json`) — one new file, one new manifest line, nothing else changes.

Each entry carries a CEFR `level` (required), the `it`/`en` pair, optional `ex`/`exEn` example sentences, and an optional `note` — the native-speaker tip shown on flashcards and quiz feedback. IDs are prefixed per topic (`sal_`, `cib_`, `ver_`, `mod_`, `amo_`, `naz_`, `cla_`…) and unique across the whole site. One language today; if a second ever joins, it gets its own `data/` subfolder — nothing here blocks it.

## Adding vocabulary (no coding, no installs)

Everything below happens in the browser, on github.com:

1. Open the topic's file (e.g. `data/cibo.json`) → click the ✏️ pencil.
2. Add entries following an existing entry's shape — copy one, edit it, done. That's the whole trick.
3. Commit. The site rebuilds itself in about a minute.

New topic? Create `data/<id>.json`, then add its filename to `data/manifest.json`. No code changes — the app discovers everything from the manifest.

If a JSON typo slips in, the site shows a friendly red *"Mamma mia — no data!"* card instead of a silent white screen, and every commit can be reverted in one click from GitHub's history. Fixing a mistake is cheaper than fearing one.

## For developers (optional reading)

Static site, no build step: markup, one stylesheet, one script, JSON data fetched at runtime. To preview locally you'd need a tiny server (browsers block `fetch()` on `file://`):

```bash
git clone https://github.com/CtrlAltBeard/italiano-vero.git
cd italiano-vero
python3 -m http.server 8000   # → http://localhost:8000
```

Or skip all that — the live site *is* the demo.

## Roadmap

- [x] Flashcards, mastery tracking, dark mode, click-to-advance quizzes
- [x] Level filter (A1–B1) + quiz length (10 / 20 / 50 / 100)
- [x] Modular structure: markup / css / js / JSON data split
- [ ] Spaced repetition scheduling
- [ ] Audio pronunciation (recorded by a native speaker)
- [ ] Streaks & session analytics
- [ ] Regional variations (Rome vs Milan vs Palermo — the good fights)

## License

MIT — do what you like, just don't put pineapple on it. 🍕
