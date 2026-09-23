import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IAuthModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/** Mismo minimo que pide el frontend (ChangePasswordModal, /recuperar/confirmar). */
const MIN_PASSWORD_LENGTH = 6

/**
 * Cambiar la contrasena con la sesion iniciada. Medusa no lo trae: su unico
 * camino (`/auth/customer/emailpass/update`) exige el token de reseteo que
 * llega por correo y rechaza el token de sesion.
 *
 * Pide la contrasena actual aunque el frontend ya la haya comprobado con un
 * login: un token de sesion robado no deberia bastar para quedarse con la
 * cuenta.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { current_password, new_password } = (req.body ?? {}) as {
    current_password?: unknown
    new_password?: unknown
  }

  if (typeof current_password !== "string" || !current_password) {
    res.status(400).json({ message: "Falta la contraseña actual" })
    return
  }
  if (typeof new_password !== "string" || new_password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({
      message: `La contraseña nueva debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    })
    return
  }

  const authService: IAuthModuleService = req.scope.resolve(Modules.AUTH)

  // El correo de la identidad emailpass, no el del cliente: es con el que se
  // hace login, y el cliente pudo cambiar su `email` de perfil despues.
  const authIdentity = await authService.retrieveAuthIdentity(
    req.auth_context.auth_identity_id,
    { relations: ["provider_identities"] }
  )
  const emailpass = authIdentity.provider_identities?.find(
    (identity) => identity.provider === "emailpass"
  )

  if (!emailpass) {
    res.status(400).json({
      message: "Tu cuenta inicia sesión con Google y no tiene contraseña que cambiar",
    })
    return
  }

  const check = await authService.authenticate("emailpass", {
    body: { email: emailpass.entity_id, password: current_password },
  })
  if (!check.success) {
    res.status(400).json({ message: "La contraseña actual no es correcta" })
    return
  }

  const update = await authService.updateProvider("emailpass", {
    entity_id: emailpass.entity_id,
    password: new_password,
  })
  if (!update.success) {
    console.error("[customer-password] No se pudo actualizar:", update.error)
    res.status(500).json({ message: "No pudimos actualizar tu contraseña" })
    return
  }

  res.json({ success: true })
}
