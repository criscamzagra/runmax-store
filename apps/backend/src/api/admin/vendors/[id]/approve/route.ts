import { randomBytes } from "node:crypto"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IAuthModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { generateResetPasswordTokenWorkflow } from "@medusajs/core-flows"
import VendorModuleService from "../../../../../modules/vendor/service"
import { VENDOR_MODULE } from "../../../../../modules/vendor"
import { VENDOR_ACTIVATION_PURPOSE } from "../../../../../utils/vendor-activation-email"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const { id } = req.params
  const { fee_pct } = req.body as { fee_pct?: number }

  const updateData: Record<string, unknown> = { status: "approved" }
  if (fee_pct !== undefined) {
    updateData.fee_pct = fee_pct
  }

  const vendor = await vendorService.updateVendors({ id, ...updateData })

  let activation: "sent" | "not_needed" | "failed" = "not_needed"
  try {
    activation = (await activateApplicationVendor(req, vendor)) ? "sent" : "not_needed"
  } catch (e) {
    // La aprobacion ya quedo: si la cuenta no se pudo crear, la tienda puede
    // usar "¿Olvidaste tu contraseña?" una vez exista, o se reintenta aprobando.
    console.error("[vendor-approve] No se pudo crear la cuenta de la tienda:", e)
    activation = "failed"
  }

  res.json({ vendor, activation })
}

/**
 * Una tienda que llego por la solicitud sin contraseña (/store/vendors/apply)
 * no tiene con que entrar al panel. Al aprobarla se le crea la identidad
 * emailpass con una contraseña al azar que nadie conoce, y se le manda el
 * enlace para crear la suya (subscribers/password-reset.ts).
 *
 * Si el correo ya tiene identidad (por ejemplo, la persona tambien es
 * cliente), se le agrega el vendor_id a esa misma identidad en vez de crear
 * otra: Medusa no admite dos identidades emailpass con el mismo correo.
 *
 * Devuelve false si el vendedor no vino de la solicitud o ya se activo.
 */
async function activateApplicationVendor(
  req: MedusaRequest,
  vendor: { id: string; company_name: string; contact_email: string; metadata?: Record<string, unknown> | null }
): Promise<boolean> {
  const metadata = (vendor.metadata ?? {}) as Record<string, unknown>
  if (!metadata.application || metadata.account_created_at) return false

  const authService: IAuthModuleService = req.scope.resolve(Modules.AUTH)
  const email = vendor.contact_email

  const [existing] = await authService.listProviderIdentities(
    { entity_id: email, provider: "emailpass" },
    { relations: ["auth_identity"] }
  )

  let authIdentityId: string
  let appMetadata: Record<string, unknown> = {}
  if (existing?.auth_identity_id) {
    authIdentityId = existing.auth_identity_id
    appMetadata = ((existing as any).auth_identity?.app_metadata ?? {}) as Record<string, unknown>
  } else {
    const result = await authService.register("emailpass", {
      body: { email, password: randomBytes(32).toString("base64url") },
    } as any)
    if (!result.success || !result.authIdentity) {
      throw new Error(result.error ?? "No se pudo crear la identidad")
    }
    authIdentityId = result.authIdentity.id
  }

  await authService.updateAuthIdentities([
    { id: authIdentityId, app_metadata: { ...appMetadata, vendor_id: vendor.id } },
  ])

  const config = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const { http } = config.projectConfig
  await generateResetPasswordTokenWorkflow(req.scope).run({
    input: {
      entityId: email,
      actorType: "vendor",
      provider: "emailpass",
      secret: http.jwtSecret as string,
      jwtOptions: http.jwtOptions,
      metadata: { purpose: VENDOR_ACTIVATION_PURPOSE, company_name: vendor.company_name },
    } as any,
  })

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  await vendorService.updateVendors({
    id: vendor.id,
    metadata: { ...metadata, account_created_at: new Date().toISOString() },
  })

  return true
}
