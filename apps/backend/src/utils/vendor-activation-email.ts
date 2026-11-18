/**
 * Correo a una tienda que llego por la solicitud sin contraseña cuando la
 * aprueban: le da el enlace para crear la contraseña y entrar a su panel.
 *
 * El enlace es el mismo de "restablecer contraseña" (lo genera Medusa y vence
 * a los 15 minutos), pero el texto es otro: para la tienda es crear la
 * cuenta, no recuperarla. Si se le vence, "¿Olvidaste tu contraseña?" en el
 * inicio de sesion de vendedores le genera uno nuevo.
 */
import { renderInternalEmail } from "./brand-email"
import { RESET_TOKEN_TTL_MINUTES } from "./password-reset-email"

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "RunMax Shop <onboarding@resend.dev>"

/** Lo que viaja en `metadata` del evento `auth.password_reset` para distinguirlo. */
export const VENDOR_ACTIVATION_PURPOSE = "vendor_activation"

export function buildVendorActivationEmail(params: { companyName: string; activationUrl: string }) {
  const { html, text } = renderInternalEmail({
    kind: "transactional",
    preview: `Tu tienda fue aprobada. Crea tu contraseña para entrar al panel de vendedor.`,
    eyebrow: "Tienda aprobada",
    title: `Te damos la bienvenida, ${params.companyName}`,
    intro:
      "Revisamos tu solicitud y ya puedes vender en Runmax. Crea tu contraseña para entrar a tu panel de vendedor y subir tus productos.",
    rows: [
      { label: "Tu tienda", value: params.companyName },
      { label: "Siguiente paso", value: "Crear tu contraseña y subir tu catálogo" },
    ],
    cta: { href: params.activationUrl, label: "Crear mi contraseña" },
    note: `El enlace vence en ${RESET_TOKEN_TTL_MINUTES} minutos. Si se te vence, entra al panel de vendedor y usa "¿Olvidaste tu contraseña?" con este mismo correo.`,
    footerNotice: "Recibes este correo porque solicitaste vender en Runmax y tu solicitud fue aprobada.",
  })
  return { subject: "Tu tienda fue aprobada en Runmax — crea tu contraseña", html, text }
}

/** No lanza. Nunca loguea el enlace: lleva el token. */
export async function sendVendorActivationEmail(params: {
  to: string
  companyName: string
  activationUrl: string
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error("[vendor-activation-email] RESEND_API_KEY no configurada — no se envio el correo")
    return false
  }
  const { subject, html, text } = buildVendorActivationEmail(params)
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: params.to, subject, html, text }),
    })
    if (!res.ok) {
      console.error("[vendor-activation-email] Resend respondio", res.status, await res.text().catch(() => ""))
      return false
    }
    return true
  } catch (e) {
    console.error("[vendor-activation-email] Error enviando correo:", e)
    return false
  }
}
