/**
 * Correo de recuperacion de contrasena, via la API HTTP de Resend (sin SDK),
 * igual que vendor-verification-email.ts.
 *
 * El diseno replica la plantilla de marca del frontend ("Runmax | Template
 * mail" en Figma, `BrandEmailLayout` en runmaxshop-frontend): header negro con
 * el logo blanco, cuerpo sobre bg.page, boton negro a todo el ancho y pie
 * legal. Los clientes de correo no leen variables CSS, asi que los tokens van
 * como literales — si cambian en @runmaxshop/tokens, hay que copiarlos aca.
 *
 * Requiere en el entorno:
 * - RESEND_API_KEY: API key de Resend
 * - RESEND_FROM_EMAIL (opcional): remitente
 * - FRONTEND_URL (opcional): base del frontend para el enlace
 */

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "RunMax Shop <onboarding@resend.dev>"
const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://www.runmaxshop.com"
).replace(/\/$/, "")

// Imagenes y enlaces del pie apuntan siempre al sitio publico: el correo se
// lee lejos de cualquier ambiente de pruebas.
const SITE_URL = "https://www.runmaxshop.com"

/** Lo que dura el token que genera Medusa (generate-reset-password-token). */
export const RESET_TOKEN_TTL_MINUTES = 15

const color = {
  bgCanvas: "#FFFFFF",
  bgPage: "#F3F2F0",
  bgInverse: "#1B1B1B",
  textPrimary: "#1B1B1B",
  textSecondary: "#45423D",
  textInverse: "#FFFFFF",
  borderSubtle: "#CFCCC6",
}

const font = {
  display: "'Barlow Condensed', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  body: "Barlow, 'Helvetica Neue', Helvetica, Arial, sans-serif",
}

const COMPANY = {
  legalName: "RUNMAX SHOP S.A.S.",
  taxId: "902.095.084-8",
  city: "Cali, Valle del Cauca",
}

/** Actores de Medusa que tienen pantalla de recuperacion en el frontend. */
export type ResettableActor = "customer" | "vendor"

export function isResettableActor(actor: string): actor is ResettableActor {
  return actor === "customer" || actor === "vendor"
}

/**
 * El token solo lo acepta `/auth/<actor_type>/emailpass/update` del MISMO
 * actor con el que se genero, asi que el enlace tiene que decirle al frontend
 * contra cual confirmar. Clientes es el caso por defecto y va sin parametro.
 */
export function buildPasswordResetUrl(actor: ResettableActor, token: string): string {
  const url = new URL(`${FRONTEND_URL}/recuperar/confirmar`)
  url.searchParams.set("token", token)
  if (actor === "vendor") url.searchParams.set("actor", "vendor")
  return url.toString()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const SUBJECT = "Restablece tu contraseña de Runmax Shop"
const PREHEADER = `Crea una contraseña nueva. El enlace vence en ${RESET_TOKEN_TTL_MINUTES} minutos.`

export function buildPasswordResetHtml(resetUrl: string): string {
  const href = escapeHtml(resetUrl)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background-color:${color.bgCanvas};font-family:${font.body};color:${color.textPrimary};">
  <div style="display:none;max-height:0;overflow:hidden;">${PREHEADER}</div>
  <div style="width:100%;max-width:600px;margin:0 auto;background-color:${color.bgPage};">

    <div style="background-color:${color.bgInverse};padding:30px 0;text-align:center;">
      <a href="${SITE_URL}">
        <img src="${SITE_URL}/email/logo-white.png" width="220" height="44" alt="Runmax" style="display:block;margin:0 auto;border:0;">
      </a>
    </div>

    <div style="padding:40px 32px;">
      <h1 style="margin:0 0 16px;font-family:${font.display};font-size:32px;line-height:1.1;font-weight:700;text-transform:uppercase;color:${color.textPrimary};">
        Crea una contraseña nueva
      </h1>
      <p style="margin:0;font-size:16px;line-height:1.5;color:${color.textSecondary};">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta en Runmax Shop.
        Haz clic en el botón de abajo para configurarla.
      </p>

      <div style="padding:24px 0;">
        <a href="${href}" style="display:block;padding:14px 16px;background-color:${color.bgInverse};color:${color.textInverse};font-family:${font.display};font-size:16px;font-weight:500;letter-spacing:0.02em;text-transform:uppercase;text-align:center;text-decoration:none;">
          Restablecer contraseña
        </a>
      </div>

      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:${color.textSecondary};">
        El enlace vence en ${RESET_TOKEN_TTL_MINUTES} minutos. Si ya venció, pide uno nuevo desde
        “¿Olvidaste tu contraseña?”.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:${color.textSecondary};">
        Si no pediste este cambio, ignora este correo: tu contraseña sigue siendo la misma.
      </p>
    </div>

    <div style="border-top:2px solid ${color.borderSubtle};padding:24px 32px;font-size:12px;line-height:1.5;color:${color.textSecondary};">
      <p style="margin:0 0 8px;">
        Recibes este correo porque se pidió restablecer la contraseña de una cuenta de Runmax Shop con esta dirección.
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

/** Version en texto plano; empieza con el preheader, como en el frontend. */
export function buildPasswordResetText(resetUrl: string): string {
  return [
    PREHEADER,
    "",
    "Recibimos una solicitud para restablecer la contraseña de tu cuenta en Runmax Shop.",
    "Abre este enlace para configurarla:",
    resetUrl,
    "",
    `El enlace vence en ${RESET_TOKEN_TTL_MINUTES} minutos. Si ya venció, pide uno nuevo desde “¿Olvidaste tu contraseña?”.`,
    "",
    "Si no pediste este cambio, ignora este correo: tu contraseña sigue siendo la misma.",
    "",
    `${COMPANY.legalName} · NIT ${COMPANY.taxId} · ${COMPANY.city}`,
  ].join("\n")
}

/**
 * No lanza: si Resend no esta configurado o falla, devuelve false y loguea.
 * Nunca loguea el enlace — lleva el token, y con el una cuenta se toma.
 */
export async function sendPasswordResetEmail(params: {
  to: string
  resetUrl: string
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      "[password-reset-email] RESEND_API_KEY no configurada — no se envio el correo de recuperacion"
    )
    return false
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: params.to,
        subject: SUBJECT,
        html: buildPasswordResetHtml(params.resetUrl),
        text: buildPasswordResetText(params.resetUrl),
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[password-reset-email] Resend respondio", res.status, body)
      return false
    }

    return true
  } catch (e) {
    console.error("[password-reset-email] Error enviando correo:", e)
    return false
  }
}
