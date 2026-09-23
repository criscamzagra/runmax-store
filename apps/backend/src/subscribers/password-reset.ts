import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  buildPasswordResetUrl,
  isResettableActor,
  sendPasswordResetEmail,
} from "../utils/password-reset-email"

/**
 * Medusa emite `auth.password_reset` cuando alguien pide
 * `POST /auth/<actor_type>/emailpass/reset-password` y el correo SI tiene
 * identidad emailpass (si no, no emite nada: por eso el endpoint puede
 * responder igual exista o no la cuenta). Medusa genera el token pero no
 * manda ningun correo por su cuenta — sin este subscriber el token se pierde
 * y el usuario nunca recibe nada.
 *
 * `entity_id` es el correo con el que se registro la identidad emailpass.
 */
export default async function passwordResetHandler({
  event: { data },
}: SubscriberArgs<{ entity_id: string; actor_type: string; token: string }>) {
  const { entity_id: email, actor_type, token } = data

  // `user` (admins del panel de Medusa) no tiene pantalla en el frontend.
  if (!isResettableActor(actor_type)) {
    console.warn(
      `[password-reset] Reseteo pedido para actor_type "${actor_type}", sin pantalla de recuperacion — no se envia correo`
    )
    return
  }

  await sendPasswordResetEmail({
    to: email,
    resetUrl: buildPasswordResetUrl(actor_type, token),
  })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
