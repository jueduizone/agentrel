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

// DB bundle names/descriptions can lose spaces when Chinese words are stripped
// from strings like "SuiTONStarkNetBase Skills". Restore readable spacing for
// known ecosystem names without changing normal prose.
export function formatBundleText(text: string | null | undefined): string {
  const stripped = stripChineseCharacters(text)
  if (!stripped) return ''
  const tokens = [
    'Ethereum', 'Solana', 'Aptos', 'Sui', 'TON', 'StarkNet', 'Starknet', 'Base',
    'Arbitrum', 'Optimism', 'Polygon', 'Monad', 'Mantle', 'Zama',
  ]
  let out = stripped
  for (const token of tokens) {
    out = out.replace(new RegExp(`(?<!^)(?=${token})`, 'g'), ' ')
    out = out.replace(new RegExp(`(?<=${token})(?=[A-Z0-9])`, 'g'), ' ')
  }
  return out.replace(/\s{2,}/g, ' ').trim()
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

// Remove YAML frontmatter block (--- ... ---) from the very start of a markdown
// document. Also strips the ---BEGIN--- / ---END--- envelope used by grant
// skills, which wraps a YAML frontmatter block in a sentinel pair.
export function stripFrontmatter(text: string | null | undefined): string {
  if (!text) return ''
  let out = text.replace(/^\s*---BEGIN---\r?\n/, '')
  out = out.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  out = out.replace(/\r?\n---END---\s*$/, '')
  return out
}

// Remove the first leading top-level markdown H1 (a line starting with a single
// `# ` — not `##` etc.) from the body. Used on the skill detail page where the
// page template already renders an <h1>, so the markdown body's own title would
// duplicate it.
export function stripLeadingH1(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/^\s*#\s+[^\n]*\n+/, '')
}

// Flatten short markdown snippets (bold/italic/inline-code/strike, frontmatter,
// stray newlines) into plain text suitable for card descriptions.
export function cleanSkillDescription(text: string | null | undefined): string {
  if (!text) return ''
  return stripFrontmatter(text)
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

// Copy text to clipboard with a document.execCommand fallback for non-secure
// contexts (HTTP, iframes) where navigator.clipboard throws a permission error.
// Returns true on success.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to execCommand fallback
  }
  if (typeof document === 'undefined') return false
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.top = '0'
  el.style.left = '0'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(el)
  return ok
}
