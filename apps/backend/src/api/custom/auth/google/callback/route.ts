import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.runmaxshop.com"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const code = req.query.code as string
  const combinedState = (req.query.state as string) || ""

  if (!code) {
    return res.redirect(
      `${FRONTEND_URL}/auth/google/callback?error=missing_code`
    )
  }

  const separatorIndex = combinedState.indexOf("__")
  const actor =
    separatorIndex > -1
      ? combinedState.substring(0, separatorIndex)
      : "customer"
  const originalState =
    separatorIndex > -1
      ? combinedState.substring(separatorIndex + 2)
      : combinedState

  try {
    const authModule = req.scope.resolve(Modules.AUTH)
    const config = req.scope.resolve(
      ContainerRegistrationKeys.CONFIG_MODULE
    ) as any

    const authResult = (await authModule.validateCallback("google", {
      actor_type: actor,
      url: req.url,
      headers: req.headers as Record<string, string>,
      query: { code, state: originalState } as Record<string, string>,
      body: {},
      protocol: req.protocol,
    } as any)) as any

    if (!authResult.success || !authResult.authIdentity) {
      return res.redirect(
        `${FRONTEND_URL}/auth/google/callback?error=${encodeURIComponent(authResult.error || "auth_failed")}`
      )
    }

    const { http } = config.projectConfig
    const entityIdKey = `${actor}_id`
    const entityId = authResult.authIdentity?.app_metadata?.[entityIdKey] || ""

    const providerIdentity = authResult.authIdentity.provider_identities?.find(
      (p: any) => p.provider === "google"
    )

    const token = jwt.sign(
      {
        actor_id: entityId,
        actor_type: actor,
        auth_identity_id: authResult.authIdentity.id,
        auth_provider: "google",
        app_metadata: {
          ...(authResult.authIdentity.app_metadata ?? {}),
          [entityIdKey]: entityId,
        },
        user_metadata: providerIdentity?.user_metadata ?? {},
      },
      http.jwtSecret,
      { expiresIn: http.jwtExpiresIn || "24h" }
    )

    return res.redirect(
      `${FRONTEND_URL}/auth/google/callback?access_token=${token}`
    )
  } catch (e: any) {
    return res.redirect(
      `${FRONTEND_URL}/auth/google/callback?error=${encodeURIComponent(e.message || "server_error")}`
    )
  }
}
