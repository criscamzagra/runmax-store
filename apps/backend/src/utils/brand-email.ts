/**
 * Plantilla de marca de los correos del backend, en HTML escrito a mano.
 *
 * Replica la del frontend ("Runmax | Template mail" en Figma, `BrandEmailLayout`
 * en runmaxshop-frontend): header negro con el logo blanco, cuerpo sobre
 * bg.page, botón negro a todo el ancho y pie legal. Los clientes de correo no
 * leen variables CSS, así que los tokens van como literales — si cambian en
 * @runmaxshop/tokens, hay que copiarlos acá.
 *
 * Todo valor que venga de afuera (nombres, títulos de producto, direcciones)
 * pasa por `escapeHtml` antes de ir al HTML.
 */

// Imagenes y enlaces del pie apuntan siempre al sitio publico: el correo se
// lee lejos de cualquier ambiente de pruebas.
export const SITE_URL = "https://www.runmaxshop.com"

export const color = {
  bgCanvas: "#FFFFFF",
  bgPage: "#F3F2F0",
  bgInverse: "#1B1B1B",
  textPrimary: "#1B1B1B",
  textSecondary: "#45423D",
  textInverse: "#FFFFFF",
  borderStrong: "#1B1B1B",
  borderSubtle: "#CFCCC6",
}

export const font = {
  display: "'Barlow Condensed', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  body: "Barlow, 'Helvetica Neue', Helvetica, Arial, sans-serif",
}

export const COMPANY = {
  legalName: "RUNMAX SHOP S.A.S.",
  taxId: "902.095.084-8",
  city: "Cali, Valle del Cauca",
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Pesos sin decimales: "$129.900". */
export function formatCop(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`
}

/**
 * Un bloque del cuerpo: `container` (40px vertical) o `subgroup` (24px),
 * siempre 32px a los lados. `dividerTop` pinta la raya de 2px que separa
 * bloques, como `EmailSection` del frontend.
 */
export function emailSection(
  content: string,
  { variant = "container", dividerTop = false }: { variant?: "container" | "subgroup"; dividerTop?: boolean } = {}
): string {
  const paddingY = variant === "container" ? 40 : 24
  const border = dividerTop ? `border-top:2px solid ${color.borderStrong};` : ""
  return `<div style="padding:${paddingY}px 32px;${border}">${content}</div>`
}

/** La acción primaria: negra y a todo el ancho. `href` ya escapado. */
export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:block;padding:14px 16px;background-color:${color.bgInverse};color:${color.textInverse};font-family:${font.display};font-size:16px;font-weight:500;letter-spacing:0.02em;text-transform:uppercase;text-align:center;text-decoration:none;">
          ${label}
        </a>`
}

/**
 * El documento completo. `title` y `preheader` van tal cual (son textos
 * nuestros); `body` es el HTML de los bloques, y `footerNotice` explica por
 * qué llega el correo.
 */
export function brandEmailHtml(params: {
  title: string
  preheader: string
  body: string
  footerNotice: string
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${params.title}</title>
</head>
<body style="margin:0;padding:0;background-color:${color.bgCanvas};font-family:${font.body};color:${color.textPrimary};">
  <div style="display:none;max-height:0;overflow:hidden;">${params.preheader}</div>
  <div style="width:100%;max-width:600px;margin:0 auto;background-color:${color.bgPage};">

    <div style="background-color:${color.bgInverse};padding:30px 0;text-align:center;">
      <a href="${SITE_URL}">
        <img src="${SITE_URL}/email/logo-white.png" width="220" height="44" alt="Runmax" style="display:block;margin:0 auto;border:0;">
      </a>
    </div>

    ${params.body}

    <div style="border-top:2px solid ${color.borderSubtle};padding:24px 32px;font-size:12px;line-height:1.5;color:${color.textSecondary};">
      <p style="margin:0 0 8px;">
        ${params.footerNotice}
      </p>
      <p style="margin:0 0 8px;">${COMPANY.legalName} · NIT ${COMPANY.taxId} · ${COMPANY.city}</p>
      <p style="margin:0;">
        <a href="${SITE_URL}/privacidad" style="color:${color.textSecondary};">Política de privacidad</a> ·
        <a href="${SITE_URL}/terminos" style="color:${color.textSecondary};">Términos y condiciones</a>
      </p>
    </div>

  </div>
</body>
</html>`
}

/**
 * Envía por la API HTTP de Resend (sin SDK). No lanza: si Resend no está
 * configurado o falla, loguea con `tag` y devuelve false, para no romper el
 * flujo que lo llamó.
 */
export async function sendResendEmail(
  tag: string,
  email: { to: string; subject: string; html: string; text: string }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error(`[${tag}] RESEND_API_KEY no configurada — no se envio el correo`)
    return false
  }

  const from = process.env.RESEND_FROM_EMAIL || "Runmax Shop <onboarding@resend.dev>"
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, ...email }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error(`[${tag}] Resend respondio`, res.status, body)
      return false
    }
    return true
  } catch (e) {
    console.error(`[${tag}] Error enviando correo:`, e)
    return false
  }
}
