import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.runmaxshop.com"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actor = (req.query.actor as string) || "customer"

  const backendUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "http://localhost:9000"

  const callbackUrl = `${backendUrl}/custom/auth/google/callback`

  try {
    const authModule = req.scope.resolve(Modules.AUTH)

    const result = await authModule.authenticate("google", {
      actor_type: actor,
      url: req.url,
      headers: req.headers as Record<string, string>,
      query: req.query as Record<string, string>,
      body: { callback_url: callbackUrl },
      protocol: req.protocol,
    } as any)

    if ((result as any).location) {
      const googleUrl = new URL((result as any).location)
      const originalState = googleUrl.searchParams.get("state") || ""
      googleUrl.searchParams.set("state", `${actor}__${originalState}`)
      return res.redirect(googleUrl.toString())
    }

    return res.redirect(
      `${FRONTEND_URL}/auth/google/callback?error=no_redirect`
    )
  } catch (e: any) {
    return res.redirect(
      `${FRONTEND_URL}/auth/google/callback?error=${encodeURIComponent(e.message || "start_failed")}`
    )
  }
}
