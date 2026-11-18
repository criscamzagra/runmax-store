import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  buildPasswordResetUrl,
  isResettableActor,
  sendPasswordResetEmail,
} from "../utils/password-reset-email"
import {
  sendVendorActivationEmail,
  VENDOR_ACTIVATION_PURPOSE,
} from "../utils/vendor-activation-email"

/**
 * Medusa emite `auth.password_reset` cuando alguien pide
 * `POST /auth/<actor_type>/emailpass/reset-password` y el correo SI tiene
 * identidad emailpass (si no, no emite nada: por eso el endpoint puede
 * responder igual exista o no la cuenta). Medusa genera el token pero no
 * manda ningun correo por su cuenta — sin este subscriber el token se pierde
 * y el usuario nunca recibe nada.
 *
 * Tambien lo emite la aprobacion de una tienda que llego por la solicitud sin
 * contraseña, con `metadata.purpose = vendor_activation`: ahi el correo es
 * "crea tu contraseña", no "recupérala".
 *
 * `entity_id` es el correo con el que se registro la identidad emailpass.
 */
export default async function passwordResetHandler({
  event: { data },
}: SubscriberArgs<{
  entity_id: string
  actor_type: string
  token: string
  metadata?: { purpose?: string; company_name?: string }
}>) {
  const { entity_id: email, actor_type, token, metadata } = data

  // `user` (admins del panel de Medusa) no tiene pantalla en el frontend.
  if (!isResettableActor(actor_type)) {
    console.warn(
      `[password-reset] Reseteo pedido para actor_type "${actor_type}", sin pantalla de recuperacion — no se envia correo`
    )
    return
  }

  const resetUrl = buildPasswordResetUrl(actor_type, token)

  if (actor_type === "vendor" && metadata?.purpose === VENDOR_ACTIVATION_PURPOSE) {
    await sendVendorActivationEmail({
      to: email,
      companyName: metadata.company_name || "tu tienda",
      activationUrl: resetUrl,
    })
    return
  }

  await sendPasswordResetEmail({ to: email, resetUrl })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
