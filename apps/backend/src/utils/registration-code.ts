import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Verificacion del codigo de 6 digitos que el frontend manda por correo al
 * registrarse (`src/infrastructure/auth/otp.ts` en runmaxshop-frontend).
 *
 * El frontend no guarda el codigo: lo FIRMA con `AUTH_OTP_SECRET` y el
 * navegador devuelve codigo + expiracion + firma. Aca se recalcula la misma
 * firma con el mismo secreto, asi que las dos variables tienen que tener el
 * mismo valor en Vercel y en Railway. Si cambia el formato de lo firmado en
 * el frontend, hay que cambiarlo aca tambien.
 */

export interface RegistrationCodeProof {
  code: string
  expiresAt: number
  signature: string
}

function sign(secret: string, email: string, code: string, expiresAt: number): string {
  return createHmac("sha256", secret)
    .update(`${email.trim().toLowerCase()}:${code}:${expiresAt}`)
    .digest("hex")
}

export function verifyRegistrationCode(
  secret: string,
  email: string,
  proof: RegistrationCodeProof,
  now: number = Date.now()
): boolean {
  if (now > proof.expiresAt) return false

  const expected = Buffer.from(sign(secret, email, proof.code, proof.expiresAt))
  const received = Buffer.from(proof.signature)
  if (expected.length !== received.length) return false

  return timingSafeEqual(expected, received)
}

/** Lee la prueba del cuerpo de la peticion; null si falta o esta mal formada. */
export function readRegistrationCodeProof(body: unknown): RegistrationCodeProof | null {
  const { code, expiresAt, signature } = (body ?? {}) as Record<string, unknown>
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return null
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return null
  if (typeof signature !== "string" || !signature) return null
  return { code, expiresAt, signature }
}
