import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IAuthModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { readRegistrationCodeProof, verifyRegistrationCode } from "./registration-code"

// Cinco intentos por codigo alcanzan para errores de tipeo. En memoria, igual
// que el limitador del frontend: frena el caso comun, no un ataque repartido.
const MAX_ATTEMPTS_PER_CODE = 5
const attempts = new Map<string, { count: number; resetAt: number }>()

function allowAttempt(signature: string, expiresAt: number, now: number): boolean {
  for (const [key, entry] of attempts) {
    if (now >= entry.resetAt) attempts.delete(key)
  }
  const entry = attempts.get(signature)
  if (!entry) {
    attempts.set(signature, { count: 1, resetAt: expiresAt })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS_PER_CODE) return false
  entry.count += 1
  return true
}

/**
 * `POST /auth/customer/emailpass/register` es publico en Medusa: cualquiera
 * podia crear una cuenta con un correo ajeno llamandolo directo, sin pasar
 * por el codigo que /login manda por correo. Ahora solo se acepta si el
 * cuerpo trae un codigo valido para ESE correo. El proveedor emailpass ignora
 * los campos de mas, asi que viajan en el mismo cuerpo.
 *
 * Falla cerrado: sin `AUTH_OTP_SECRET` no se registra nadie, y el log lo dice.
 */
export function requireRegistrationCode(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const secret = process.env.AUTH_OTP_SECRET
  if (!secret) {
    console.error("[registration] AUTH_OTP_SECRET no configurada — se rechaza el registro de clientes")
    res.status(503).json({ message: "El registro no esta disponible en este momento" })
    return
  }

  const { email } = (req.body ?? {}) as { email?: unknown }
  const proof = readRegistrationCodeProof(req.body)
  if (typeof email !== "string" || !proof) {
    res.status(400).json({ message: "Falta el codigo de verificacion del correo" })
    return
  }

  const now = Date.now()
  if (!allowAttempt(proof.signature, proof.expiresAt, now)) {
    res.status(429).json({ message: "Demasiados intentos. Pide un codigo nuevo." })
    return
  }

  if (!verifyRegistrationCode(secret, email, proof, now)) {
    res.status(400).json({ message: "Codigo incorrecto o vencido" })
    return
  }

  next()
}

/**
 * El correo de un cliente nuevo tiene que ser el de su identidad: el que se
 * registro con contrasena (y ya paso por el codigo) o el que Google verifico
 * (auth-google rechaza cuentas sin `email_verified`). Antes el frontend lo
 * tomaba de la URL del callback de Google o de un campo de texto, asi que
 * bastaba con editarlo para crear un cliente con el correo de otra persona,
 * que despues no podia registrarse con el suyo.
 */
export async function requireIdentityEmail(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  // Sin identidad, o con cliente ya creado: la ruta de Medusa responde sola.
  const authIdentityId = req.auth_context?.auth_identity_id
  if (!authIdentityId || req.auth_context.actor_id) {
    next()
    return
  }

  const authService: IAuthModuleService = req.scope.resolve(Modules.AUTH)
  const identity = await authService.retrieveAuthIdentity(authIdentityId, {
    relations: ["provider_identities"],
  })

  const verifiedEmails = (identity.provider_identities ?? [])
    .map((provider) =>
      provider.provider === "emailpass"
        ? provider.entity_id
        : (provider.user_metadata as { email?: unknown } | null)?.email
    )
    .filter((email): email is string => typeof email === "string")
    .map((email) => email.trim().toLowerCase())

  const { email } = (req.body ?? {}) as { email?: unknown }
  const requested = typeof email === "string" ? email.trim().toLowerCase() : ""

  if (!requested || !verifiedEmails.includes(requested)) {
    res.status(400).json({
      message: "El correo de la cuenta tiene que ser el mismo con el que te registraste",
    })
    return
  }

  next()
}
