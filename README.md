# LvlUpLife

A modern, single-player, local-first rebuild of the original LvlUpLife idea: do something real, record it honestly, and receive visible RPG-style progress.

## Included now

- Complete import of the supplied backup: 538 challenges across 18 categories
- Quest search and category filtering
- Active quests and saved-for-later bookmarks
- Completion notes and private activity chronicle
- XP, levels, six original life stats, and streaks
- Browser-local persistence with no account required
- Responsive modern RPG interface

## Run locally

```bash
npm install
npm run dev
```

## Source preservation and research

- Exact exported challenge backup: `data/original-challenges.txt`
- Generated application data: `src/data/challenges.json`
- Regenerate data: `node scripts/generate-challenges.mjs`
- Original product architecture: `docs/original-architecture.md`
- Archived UI screenshots: `docs/research/screenshots/`

Progress is currently stored only in the browser's local storage under `lvluplife-save-v1`.
