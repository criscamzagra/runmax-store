/**
 * Plantilla de marca para los correos que manda el backend.
 *
 * Es la misma plantilla "Runmax | Template mail" del frontend
 * (src/infrastructure/email/templates/brand/ en el repo del frontend), escrita
 * como HTML porque aqui no hay React Email. Los colores y medidas son copia
 * literal de su theme.ts: si cambian alla, hay que cambiarlos aca.
 *
 * Solo cubre la variante `internal` (correos que el equipo se manda a si
 * mismo): header negro con el logo, contenido y sin pie legal.
 */

const SITE_URL = "https://www.runmaxshop.com"
const ASSETS_URL = `${SITE_URL}/email`

const color = {
  bgCanvas: "#FFFFFF",
  bgPage: "#F3F2F0",
  bgInverse: "#1B1B1B",
  textPrimary: "#1B1B1B",
  textSecondary: "#45423D",
  textInverse: "#FFFFFF",
  borderStrong: "#1B1B1B",
  borderSubtle: "#CFCCC6",
}

const font = {
  display: "'Barlow Condensed', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  body: "Barlow, 'Helvetica Neue', Helvetica, Arial, sans-serif",
}

const FONT_FACES = `
@font-face { font-family: 'Barlow Condensed'; font-style: normal; font-weight: 500; mso-font-alt: 'Arial';
  src: url(https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B4-Lwz3bWuYMBYro.woff2) format('woff2'); }
@font-face { font-family: 'Barlow Condensed'; font-style: normal; font-weight: 700; mso-font-alt: 'Arial';
  src: url(https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B46r2z3bWuYMBYro.woff2) format('woff2'); }
@font-face { font-family: 'Barlow'; font-style: normal; font-weight: 400; mso-font-alt: 'Helvetica';
  src: url(https://fonts.gstatic.com/s/barlow/v13/7cHpv4kjgoGqM7E_DMs5ynghnQ.woff2) format('woff2'); }
@font-face { font-family: 'Barlow'; font-style: normal; font-weight: 700; mso-font-alt: 'Helvetica';
  src: url(https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3t-4s51ostz0rdg.woff2) format('woff2'); }`

/** Todo valor que venga de un usuario pasa por aqui antes de ir al HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export type EmailRow = { label: string; value: string | null | undefined }

export type InternalEmail = {
  /** Texto que la bandeja muestra junto al asunto. */
  preview: string
  /** Etiqueta corta sobre el titulo, ej. "Nuevo registro". */
  eyebrow: string
  title: string
  intro: string
  /** Pares etiqueta/valor; los vacios se muestran como "—". */
  rows: EmailRow[]
  cta?: { href: string; label: string }
}

function rowsHtml(rows: EmailRow[]): string {
  return rows
    .map(
      (row, i) => `
        <tr>
          <td style="padding:12px 0;${i ? `border-top:1px solid ${color.borderSubtle};` : ""}width:40%;vertical-align:top;font-family:${font.display};font-size:14px;line-height:20px;font-weight:500;color:${color.textSecondary};">${escapeHtml(row.label)}</td>
          <td style="padding:12px 0;${i ? `border-top:1px solid ${color.borderSubtle};` : ""}vertical-align:top;font-family:${font.body};font-size:15px;line-height:20px;color:${color.textPrimary};word-break:break-word;">${row.value ? escapeHtml(row.value) : "—"}</td>
        </tr>`
    )
    .join("")
}

export function renderInternalEmail(email: InternalEmail): { html: string; text: string } {
  const cta = email.cta
    ? `
      <tr><td colspan="2" style="padding:24px 0 0;">
        <a href="${escapeHtml(email.cta.href)}" style="display:block;box-sizing:border-box;width:100%;padding:14px 16px;background-color:${color.bgInverse};color:${color.textInverse};font-family:${font.display};font-size:16px;line-height:20px;font-weight:500;text-align:center;text-decoration:none;">${escapeHtml(email.cta.label)}</a>
      </td></tr>`
    : ""

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${FONT_FACES}</style>
</head>
<body style="margin:0;padding:0;background-color:${color.bgCanvas};font-family:${font.body};color:${color.textPrimary};">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(email.preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:${color.bgPage};">
        <tr><td style="background-color:${color.bgInverse};padding:30px 0;text-align:center;">
          <a href="${SITE_URL}"><img src="${ASSETS_URL}/logo-white.png" width="220" height="44" alt="Runmax" style="display:block;margin:0 auto;border:0;"></a>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="font-family:${font.display};font-size:14px;line-height:16px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${color.textSecondary};">${escapeHtml(email.eyebrow)}</td></tr>
            <tr><td style="padding:8px 0 0;font-family:${font.display};font-size:32px;line-height:36px;font-weight:700;color:${color.textPrimary};">${escapeHtml(email.title)}</td></tr>
            <tr><td style="padding:16px 0 0;font-family:${font.body};font-size:16px;line-height:24px;color:${color.textPrimary};">${escapeHtml(email.intro)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 32px 40px;border-top:2px solid ${color.borderStrong};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml(email.rows)}${cta}
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  // El texto plano empieza con el preview: es lo que muestran las notificaciones del celular.
  const text = [
    email.preview,
    "",
    email.title,
    email.intro,
    "",
    ...email.rows.map((row) => `${row.label}: ${row.value || "—"}`),
    ...(email.cta ? ["", `${email.cta.label}: ${email.cta.href}`] : []),
  ].join("\n")

  return { html, text }
}
