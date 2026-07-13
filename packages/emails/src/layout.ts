import process from 'node:process'

function companyFooter(): string {
  const name = process.env.COMPANY_NAME?.trim()
  const street = process.env.COMPANY_STREET?.trim()
  const zip = process.env.COMPANY_ZIP?.trim()
  const city = process.env.COMPANY_CITY?.trim()
  const address = [street, [zip, city].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
  return [name, address]
    .filter((value): value is string => Boolean(value))
    .map(escapeHtml)
    .join(' · ')
}

function companyName(): string {
  return escapeHtml(process.env.COMPANY_NAME?.trim() || 'Print Shop')
}

/** Minimal, mail-client-safe HTML layout (dark brand header, light body). */
export function emailLayout(title: string, bodyHtml: string): string {
  const footer = companyFooter()
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f3ec;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#000000;">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="background:#171717;border-radius:10px 10px 0 0;padding:20px 24px;">
        <span style="color:#31a871;font-weight:600;font-size:18px;">● ${companyName()}</span>
      </div>
      <div style="background:#ffffff;border-radius:0 0 10px 10px;padding:24px;">
        <h1 style="font-size:22px;font-weight:600;margin:0 0 16px 0;">${title}</h1>
        ${bodyHtml}
        ${
          footer
            ? `<p style="color:#5e5e5e;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:12px;">${footer}</p>`
            : ''
        }
      </div>
    </div>
  </body>
</html>`
}

export function paragraph(text: string): string {
  return `<p style="font-size:14px;line-height:1.5;margin:0 0 12px 0;">${text}</p>`
}

export function button(href: string, label: string): string {
  return `<p style="margin:20px 0;"><a href="${href}" style="background:#31a871;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:400px;font-weight:600;display:inline-block;">${label}</a></p>`
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
