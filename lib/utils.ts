import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strip Chinese characters and any wrapping punctuation (parens, brackets,
// dashes) from mixed-language strings. Used for bundle name/description
// fields where DB data sometimes contains a parenthetical zh translation.
export function stripChineseCharacters(text: string | null | undefined): string {
  if (!text) return ''
  return text
    // remove «（中文）» / «(中文)» / «「中文」» / «【中文】» wrappers
    .replace(/[（(［\[「【][^（()）「」【】\[\]]*?[\u4e00-\u9fff][^（()）「」【】\[\]]*?[）)］\]」】]/g, '')
    // remove leftover stretches of Chinese (and adjacent zh punctuation)
    .replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g, '')
    // normalize lonely separators left behind ( "  -  " → " - " )
    .replace(/\s*[—–\-·]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Map raw `source` values from the DB to the canonical four-tier badge keys.
// Legacy import scripts have used "grant" / "auto" / "auto-generated" — all of
// which represent AI-generated content but rendered as the raw string before.
export function normalizeSkillSource(source: string | null | undefined): string {
  if (!source) return 'community'
  const s = source.toLowerCase().trim()
  if (s === 'official' || s === 'official-docs') return 'official'
  if (s === 'verified') return 'verified'
  if (s === 'ai-generated' || s === 'auto' || s === 'auto-generated' || s === 'grant' || s === 'grant-auto') return 'ai-generated'
  return 'community'
}

// Strip leading markdown heading marks (`# `, `## `, etc.) from a title string.
// DB-stored skill names sometimes include the H1 prefix from the source .md file.
export function cleanSkillName(name: string | null | undefined): string {
  if (!name) return ''
  return name.replace(/^#+\s*/, '').trim()
}

// Flatten short markdown snippets (bold/italic/inline-code/strike, frontmatter,
// stray newlines) into plain text suitable for card descriptions.
export function cleanSkillDescription(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/^---[\s\S]*?---\s*/m, '')   // YAML frontmatter
    .replace(/`([^`]*)`/g, '$1')           // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // bold
    .replace(/\*([^*]+)\*/g, '$1')         // italic
    .replace(/__([^_]+)__/g, '$1')         // bold _
    .replace(/_([^_]+)_/g, '$1')           // italic _
    .replace(/~~([^~]+)~~/g, '$1')         // strikethrough
    .replace(/#{1,6}\s/g, '')              // heading marks
    .replace(/\n+/g, ' ')                  // newlines → space
    .replace(/\s{2,}/g, ' ')               // collapse spaces
    .trim()
}
