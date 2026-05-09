/**
 * Base HTML email layout — clean, minimal, iClose branded.
 * All templates wrap their content in this shell.
 */
export function baseTemplate(opts: {
  previewText: string
  body: string
  footerNote?: string
}): string {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://iclose-admin.xlestates.com'
  const siteUrl = process.env.PUBLIC_SITE_ORIGIN ?? 'https://iclose.ae'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>iClose</title>
  <span style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${opts.previewText}</span>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:24px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:#1d1d1f;border-radius:10px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                <span style="color:white;font-size:16px;font-weight:700;line-height:32px;">iC</span>
              </td>
              <td style="padding-left:10px;font-size:17px;font-weight:600;color:#1d1d1f;letter-spacing:-0.02em;">iClose</td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          ${opts.body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;font-size:12px;color:#86868b;line-height:1.6;">
          ${opts.footerNote ?? ''}
          <br/>iClose · Dubai, UAE ·
          <a href="${siteUrl}" style="color:#86868b;text-decoration:underline;">iclose.ae</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

export function btn(label: string, href: string, color = '#0071e3'): string {
  return `<a href="${href}"
    style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;
           font-size:14px;font-weight:500;padding:12px 24px;border-radius:980px;
           letter-spacing:-0.01em;"
  >${label}</a>`
}

export function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#6e6e73;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:#1d1d1f;font-weight:500;">${value}</td>
  </tr>`
}

export function infoTable(rows: [string, string][]): string {
  return `<table style="width:100%;border-collapse:collapse;background:#f5f5f7;border-radius:10px;padding:16px;margin:20px 0;">
    <tbody style="padding:16px;">
      ${rows.map(([l, v]) => infoRow(l, v)).join('')}
    </tbody>
  </table>`
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e5e5ea;margin:24px 0;" />`
}

export function heading(text: string): string {
  return `<h1 style="font-size:22px;font-weight:600;color:#1d1d1f;margin:0 0 8px;letter-spacing:-0.03em;">${text}</h1>`
}

export function subheading(text: string): string {
  return `<p style="font-size:15px;color:#6e6e73;margin:0 0 24px;line-height:1.5;">${text}</p>`
}

export function para(text: string): string {
  return `<p style="font-size:15px;color:#1d1d1f;line-height:1.6;margin:0 0 16px;">${text}</p>`
}

export function smallNote(text: string): string {
  return `<p style="font-size:12px;color:#86868b;line-height:1.5;margin:20px 0 0;">${text}</p>`
}
