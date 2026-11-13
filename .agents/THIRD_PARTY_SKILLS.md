# Skill di terze parti

Skill copiate nel repository (non installate tramite `npx skills`, quindi non presenti in `skills-lock.json`).
Le copie canoniche sono in `.agents/skills/`; `.claude/skills/` contiene link simbolici verso di esse per Claude Code.
Per aggiornarle, ricopiare i file dai commit più recenti dei repository sorgente.

## addyosmani/agent-skills

- Sorgente: https://github.com/addyosmani/agent-skills
- Commit: `aeac41d4d005999432bb7312f7ff06383a91d59d` (2026-10-13, v0.6.13)
- Licenza: MIT, Copyright (c) 2025 Addy Osmani — testo in `.agents/licenses/addyosmani-agent-skills.LICENSE`
- Copiato:
  - tutte le 25 skill di `skills/` in `.agents/skills/`
  - `references/` in `.agents/references/` (richiamate dalle skill come `../../references/`)
  - i subagent di `agents/` in `.claude/agents/`
- Non copiato:
  - `.claude/commands/` e `commands/`: richiamano le skill con il prefisso del plugin (`agent-skills:`) e `/plan` e `/review` oscurerebbero comandi di Claude Code; le skill si invocano direttamente (es. `/test-driven-development`)
  - `hooks/`, `scripts/`, `evals/`, `docs/`, manifest dei plugin

## vercel-labs/agent-skills

- Sorgente: https://github.com/vercel-labs/agent-skills
- Commit: `063bee94c3f4df8453406c830b0a7df0f2860278` (2026-08-28)
- Licenza: MIT (dichiarata nel README e nel frontmatter delle skill)
- Copiato, con il nome dichiarato nel frontmatter:
  - `skills/react-best-practices` → `.agents/skills/vercel-react-best-practices`
  - `skills/composition-patterns` → `.agents/skills/vercel-composition-patterns`
  - `skills/react-view-transitions` → `.agents/skills/vercel-react-view-transitions`
  - `skills/web-design-guidelines` → `.agents/skills/web-design-guidelines` (scarica le regole aggiornate da GitHub a ogni uso)
- Non copiato (non pertinenti a questa app Next.js su Firebase App Hosting):
  - `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize`: piattaforma Vercel; `deploy-to-vercel` caricherebbe il progetto sul servizio di Vercel
  - `react-native-skills`: React Native/Expo
  - `writing-guidelines`: manuale di stile della documentazione Vercel

## pbakaus/impeccable

- Sorgente: https://github.com/pbakaus/impeccable
- Commit: `c4cd1924c389f68d37c687d9c2bbf13f12547c41` (2026-11-12, skill v4.9.0)
- Licenza: Apache 2.0 — testo in `.agents/licenses/pbakaus-impeccable.LICENSE`, avvisi in `.agents/licenses/pbakaus-impeccable.NOTICE.md`
- Copiato:
  - la skill già compilata per Claude Code (`.claude/skills/impeccable/` del repository) in `.agents/skills/impeccable`
  - i 4 subagent `impeccable-*` di `.claude/agents/` in `.claude/agents/` (la skill li richiama)
- Al primo uso `scripts/impeccable` scarica il motore dalle release GitHub del progetto, lo verifica con `scripts/engine-checksums.txt` e lo conserva in `~/.impeccable` (fuori dal repository).
- Non copiato:
  - gli hook di `.claude/settings.json` (eseguirebbero il motore a ogni Edit/Write e a ogni fine turno): si possono aggiungere su richiesta
  - CLI, estensioni, plugin per altri editor, test, demo

## nextlevelbuilder/ui-ux-pro-max-skill

- Sorgente: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Commit: `6ae86f61f520d6ca229d2f40e070410638c908c5` (2026-11-10, v2.15.0)
- Licenza: MIT, Copyright (c) 2024 Next Level Builder — testo in `.agents/licenses/nextlevelbuilder-ui-ux-pro-max.LICENSE`
- Copiato: `.claude/skills/ui-ux-pro-max/` (SKILL.md, `references/`, `data/`, `scripts/` senza `scripts/tests/`) in `.agents/skills/ui-ux-pro-max`. Gli script Python lavorano solo sui CSV locali, senza rete.
- Non copiato: le skill aggiuntive del repository (`banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`), la CLI `uipro` e il resto del progetto
