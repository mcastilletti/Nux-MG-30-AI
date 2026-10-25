export type SectionType = "Intro" | "Verse" | "Chorus" | "Bridge" | "Strum" | "Out" | "Solo";

/** Colori delle sezioni del brano (lista, foglio nota, editor). */
export const SECTION_COLORS: Record<SectionType, { bg: string; text: string; border: string }> = {
  Intro: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/40" },
  Verse: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/40" },
  Chorus: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/40" },
  Bridge: { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/40" },
  Strum: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/40" },
  Out: { bg: "bg-gray-500/15", text: "text-gray-300", border: "border-gray-500/40" },
  Solo: { bg: "bg-orange-500/20", text: "text-orange-500", border: "border-orange-500/40" }
};
