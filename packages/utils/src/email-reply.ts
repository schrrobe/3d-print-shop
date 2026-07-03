/**
 * Inbound ticket e-mail helpers: map a reply address back to a ticket token,
 * strip quoted history from reply bodies, and detect auto-responders.
 */

/**
 * Extracts the ticket access token from a `ticket+<token>@<replyDomain>`
 * recipient. Lenient: handles "Name <addr>" forms, scans all recipients,
 * compares the domain case-insensitively and preserves the token's case.
 */
export function parseTicketReplyAddress(to: string[], replyDomain: string): string | null {
  const domain = replyDomain.trim().toLowerCase()
  if (!domain) return null
  for (const entry of to) {
    const angle = /<([^<>]+)>/.exec(entry)
    const address = (angle?.[1] ?? entry).trim()
    const at = address.lastIndexOf('@')
    if (at < 1) continue
    if (address.slice(at + 1).toLowerCase() !== domain) continue
    const match = /^ticket\+(.+)$/i.exec(address.slice(0, at))
    if (match?.[1]) return match[1]
  }
  return null
}

/** Line markers after which everything is quoted history. */
const CUT_MARKERS: RegExp[] = [
  /^On .{0,200} wrote:\s*$/,
  /^Am .{0,200} schrieb .{0,200}:\s*$/,
  /^Am .{0,200} schrieb:\s*$/,
  /^-{3,}\s*(Original Message|Ursprüngliche Nachricht)\s*-{3,}$/i,
  /^_{10,}\s*$/,
  /^-- ?$/,
]

/** Outlook-style top-quote block: a From/Von line followed shortly by Sent/Gesendet. */
function isOutlookQuoteStart(lines: string[], index: number): boolean {
  if (!/^(Von|From):\s.+$/.test(lines[index] ?? '')) return false
  for (let i = index + 1; i <= index + 3 && i < lines.length; i++) {
    if (/^(Gesendet|Sent|Datum|Date):\s.+$/.test(lines[i] ?? '')) return true
  }
  return false
}

/**
 * Strips quoted history and signatures from a plain-text reply.
 * Returns null when nothing meaningful remains.
 */
export function extractReplyText(text: string): string | null {
  const lines = text.replace(/\r\n/g, '\n').split('\n')

  let cut = lines.length
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trimEnd()
    if (CUT_MARKERS.some((re) => re.test(line)) || isOutlookQuoteStart(lines, i)) {
      cut = i
      break
    }
  }

  const kept = lines
    .slice(0, cut)
    .filter((line) => !line.trimStart().startsWith('>'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return kept.length > 0 ? kept : null
}

/**
 * True when headers mark the mail as an auto-reply/bounce (loop protection).
 * Header names are matched case-insensitively.
 */
export function isAutoReply(headers: Record<string, string>): boolean {
  const lower = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v.toLowerCase()]))
  const autoSubmitted = lower.get('auto-submitted')
  if (autoSubmitted && autoSubmitted !== 'no') return true
  const precedence = lower.get('precedence')
  if (precedence && ['bulk', 'junk', 'auto_reply', 'auto-reply'].includes(precedence)) return true
  return lower.has('x-autoreply') || lower.has('x-autorespond')
}
