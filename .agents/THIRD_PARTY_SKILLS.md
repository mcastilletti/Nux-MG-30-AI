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
