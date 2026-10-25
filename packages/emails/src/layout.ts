import process from 'node:process'

/**
 * Shop world "Die Ringscheibe" (apps/web/app/assets/css/shop.css), light theme —
 * mail clients can't follow the site's theme toggle. Archivo isn't loaded (no
 * remote fonts in mail), so the stack falls back to the system sans.
 */
const kb = {
  paper: '#f3f1ea',
  paperRaised: '#fbfaf6',
  ink: '#121417',
  ink2: '#4a4f57',
  rule: '#d3cec1',
  hit: '#c2410c',
  onHit: '#ffffff',
  font: "'Archivo',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif",
}

function companyFooter(): string {
  const name = process.env.COMPANY_NAME?.trim() || 'Print Shop GmbH'
  const street = process.env.COMPANY_STREET?.trim()
  const zip = process.env.COMPANY_ZIP?.trim()
  const city = process.env.COMPANY_CITY?.trim()
  const address = [street, [zip, city].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
  return [name, address]
    .filter((value): value is string => Boolean(value))
    .map(escapeHtml)
    .join(' · ')
}

/** Text version of the site's ShopMark (inline SVG is stripped by Gmail/Outlook). */
function wordmark(): string {
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${kb.hit};vertical-align:middle;margin-right:8px;"></span><span style="font-size:20px;line-height:1;letter-spacing:-0.01em;vertical-align:middle;"><span style="font-weight:800;">kaliber</span><span style="font-weight:400;">box</span><span style="font-weight:400;color:${kb.ink2};">.de</span></span>`
}

/** Mail-client-safe HTML layout: paper page, hairline-ruled card, square corners. */
export function emailLayout(title: string, bodyHtml: string): string {
  const footer = companyFooter()
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${kb.paper};font-family:${kb.font};color:${kb.ink};">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="padding:8px 0 16px 0;color:${kb.ink};">${wordmark()}</div>
      <div style="background:${kb.paperRaised};border:1px solid ${kb.rule};border-radius:2px;padding:24px;">
        <h1 style="font-size:24px;line-height:1.1;font-weight:700;letter-spacing:-0.01em;margin:0 0 16px 0;">${title}</h1>
        ${bodyHtml}
      </div>
      ${
        footer
          ? `<p style="color:${kb.ink2};font-size:12px;line-height:1.5;margin:16px 0 0 0;">${footer}</p>`
          : ''
      }
    </div>
  </body>
</html>`
}

export function paragraph(text: string): string {
  return `<p style="font-size:16px;line-height:1.5;margin:0 0 12px 0;">${text}</p>`
}

export function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="background:${kb.hit};color:${kb.onHit};text-decoration:none;padding:14px 20px;border-radius:2px;font-weight:700;display:inline-block;">${label}</a></p>`
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
