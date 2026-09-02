---
name: design-taste-frontend
description: Standard estetici Anti-Slop e regole di UI/UX per la generazione di codice frontend professionale. Usa questa skill quando crei layout, componenti visivi e interfacce.
---

# Frontend Design & Taste Guidelines

## Anti-Slop Rules (Regole da NON violare)
1. NO 3-Column Card Layouts: Vietate le griglie standard a 3 schede orizzontali identiche. Usa layout asimmetrici o bento-grid con elementi di pesi visivi diversi.
2. NO Pure Black: Mai usare `#000000`. Usa toni sofisticati come Slate-950, Zinc-950 o Dark Charcoal.
3. NO Inter Font: Evita il font Inter standard. Preferisci Geist, Satoshi, Cabinet Grotesk o Outfit per un'estetica moderna ed editoriale.
4. NO Oversized Hero Text: Il titolo H1 non deve mai andare a capo su 5-6 righe. Mantieni `max-w` ampio per contenere il testo in 2-3 righe.
5. NO Generic Glassmorphism: Se usi l'effetto vetro, aggiungi sempre un bordo trasparente (`border-white/10`) e un'ombra interna per simulare la rifrazione del vetro.

## Layout, Spazio e Tipografia
- Spaziatura Generosa: Mantieni padding ampi (`py-20` o `py-28`) tra le sezioni per far respirare il design.
- Fluidità Mobile: Usa `min-h-[100dvh]` invece di `h-screen` per evitare scatti su browser mobile.
- CSS Grid over Flex-Math: Per le strutture responsive usa CSS Grid (`grid grid-cols-1 md:grid-cols-2 gap-8`) al posto di calcoli percentuali manuali su Flexbox.

## Animazioni e Micro-interazioni
- Spring Physics: Usa Framer Motion o Tailwind Animate con fisica a molla (`stiffness: 100, damping: 20`) per tutti gli elementi interattivi.
- Staggered Reveal: Fa apparire le liste in sequenza (`staggerChildren`) invece che istantaneamente.