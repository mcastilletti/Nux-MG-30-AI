import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Le dimensioni personalizzate (tailwind.config.ts → fontSize) devono essere
// riconosciute come font-size, altrimenti tailwind-merge le tratta come colori
// e le scarta insieme a classi come `text-primary`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['micro', 'label', 'caption', 'body-sm'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
