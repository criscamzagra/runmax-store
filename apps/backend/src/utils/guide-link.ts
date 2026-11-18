import { createHmac, timingSafeEqual } from "crypto"

/**
 * Enlace firmado a la guía de un pedido («Ver e imprimir la guía» del correo
 * de nueva venta). Lo abre el vendedor sin iniciar sesión, así que el enlace
 * tiene que ser imposible de adivinar para otro pedido.
 *
 * La firma es un HMAC del id del pedido con una llave derivada de
 * `JWT_SECRET`, el mismo secreto que ya firma las sesiones de Medusa: no hace
 * falta ninguna variable nueva. El frontend no conoce la llave; para validar
 * un enlace le pregunta al backend (`GET /store/orders/:id/guide-access`).
 *
 * Sin un secreto real (vacío o el "supersecret" por defecto de Medusa) no se
 * firma nada: cualquiera podría calcular el enlace.
 */

const DEFAULT_SECRETS = new Set(["", "supersecret"])

function linkKey(secret = process.env.JWT_SECRET ?? ""): Buffer | null {
  if (DEFAULT_SECRETS.has(secret)) return null
  return createHmac("sha256", secret).update("runmax-guide-link-v1").digest()
}

export function guideLinkToken(orderId: string, secret?: string): string | null {
  const key = linkKey(secret)
  if (!key || !orderId) return null
  return createHmac("sha256", key).update(orderId).digest("base64url").slice(0, 32)
}

export function isValidGuideLinkToken(orderId: string, token: unknown, secret?: string): boolean {
  if (typeof token !== "string") return false
  const expected = guideLinkToken(orderId, secret)
  if (!expected || token.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}
