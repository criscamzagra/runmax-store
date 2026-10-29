/**
 * Remitente y buzon de respuestas de los correos del backend. Mismo criterio
 * que `src/infrastructure/email/sender.ts` del frontend.
 *
 * `runmaxshop.com` NO recibe correo (no tiene registros MX): responder al
 * remitente rebota. Por eso cada correo lleva `reply_to` al buzon del equipo.
 */
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Runmax Shop <onboarding@resend.dev>"

/** El que publican el pie de los correos y la politica de privacidad. */
export const TEAM_INBOX = process.env.CONTACT_INBOX_EMAIL || "info@runmax.com.co"
