/**
 * Correo de recuperacion de contrasena, via la API HTTP de Resend (sin SDK).
 *
 * El diseno es la plantilla de marca compartida (`brand-email.ts`).
 *
 * Requiere en el entorno:
 * - RESEND_API_KEY: API key de Resend
 * - RESEND_FROM_EMAIL (opcional): remitente
 * - FRONTEND_URL (opcional): base del frontend para el enlace
 */

import {
  COMPANY,
  brandEmailHtml,
  color,
  emailButton,
  emailSection,
  escapeHtml,
  font,
  sendResendEmail,
} from "./brand-email"

const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://www.runmaxshop.com"
).replace(/\/$/, "")

/** Lo que dura el token que genera Medusa (generate-reset-password-token). */
export const RESET_TOKEN_TTL_MINUTES = 15

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

const SUBJECT = "Restablece tu contraseña de Runmax Shop"
const PREHEADER = `Crea una contraseña nueva. El enlace vence en ${RESET_TOKEN_TTL_MINUTES} minutos.`

export function buildPasswordResetHtml(resetUrl: string): string {
  const href = escapeHtml(resetUrl)

  return brandEmailHtml({
    title: SUBJECT,
    preheader: PREHEADER,
    body: emailSection(`
      <h1 style="margin:0 0 16px;font-family:${font.display};font-size:32px;line-height:1.1;font-weight:700;color:${color.textPrimary};">
        Crea una contraseña nueva
      </h1>
      <p style="margin:0;font-size:16px;line-height:1.5;color:${color.textSecondary};">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta en Runmax Shop.
        Haz clic en el botón de abajo para configurarla.
      </p>

      <div style="padding:24px 0;">
        ${emailButton(href, "Restablecer contraseña")}
      </div>

      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:${color.textSecondary};">
        El enlace vence en ${RESET_TOKEN_TTL_MINUTES} minutos. Si ya venció, pide uno nuevo desde
        “¿Olvidaste tu contraseña?”.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:${color.textSecondary};">
        Si no pediste este cambio, ignora este correo: tu contraseña sigue siendo la misma.
      </p>
    `),
    footerNotice:
      "Recibes este correo porque se pidió restablecer la contraseña de una cuenta de Runmax Shop con esta dirección.",
  })
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
  return sendResendEmail("password-reset-email", {
    to: params.to,
    subject: SUBJECT,
    html: buildPasswordResetHtml(params.resetUrl),
    text: buildPasswordResetText(params.resetUrl),
  })
}
