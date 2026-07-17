/**
 * Envio del correo de bienvenida + verificacion de email para vendedores,
 * usando la API HTTP de Resend (sin SDK).
 *
 * Requiere en el entorno:
 * - RESEND_API_KEY: API key de Resend
 * - RESEND_FROM_EMAIL (opcional): remitente, ej. "RunMax Shop <hola@runmaxshop.com>"
 * - FRONTEND_URL (opcional): base del frontend para el enlace de verificacion
 */

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "RunMax Shop <onboarding@resend.dev>"
const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.runmaxshop.com"

function buildEmailHtml(companyName: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="background-color:#1A1A1A;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-0.02em;">
        <span style="color:#FFFFFF;">RUNMAX</span><span style="color:#C5E500;">SHOP</span>
      </h1>
    </div>

    <!-- Body -->
    <div style="background-color:#FFFFFF;padding:40px 32px;border-radius:0 0 16px 16px;">

      <h2 style="text-align:center;font-size:24px;font-weight:800;color:#09090B;margin:0 0 8px;">
        Bienvenido a RunMax Shop
      </h2>
      <p style="text-align:center;font-size:15px;color:#71717A;margin:0 0 24px;">
        Hola <strong style="color:#09090B;">${companyName}</strong>, recibimos tu solicitud
        para vender en RunMax Shop.
      </p>

      <div style="background-color:#FAFFEB;border:1px solid #D9F99D;border-radius:12px;padding:20px;margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#09090B;">
          Confirma tu correo electronico
        </p>
        <p style="margin:0;font-size:14px;color:#71717A;line-height:1.6;">
          Para continuar con el proceso necesitamos verificar que este correo te pertenece.
          Haz clic en el boton y listo.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${verifyUrl}"
           style="display:inline-block;padding:16px 40px;background-color:#09090B;color:#FAFAFA;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">
          Verificar mi correo
        </a>
      </div>

      <p style="text-align:center;font-size:13px;color:#A1A1AA;margin:24px 0 0;line-height:1.6;">
        El enlace vence en 48 horas. Despues de verificar tu correo, nuestro equipo
        revisara tu solicitud y te avisaremos cuando sea aprobada (24-48 horas).
      </p>
      <p style="text-align:center;font-size:12px;color:#A1A1AA;margin:16px 0 0;">
        Si no solicitaste este registro, puedes ignorar este correo.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px;font-size:12px;color:#A1A1AA;">
      <p style="margin:0 0 4px;">RunMax Shop — Tu tienda deportiva</p>
      <p style="margin:0;">www.runmaxshop.com</p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Envia el correo de bienvenida con enlace de verificacion.
 * No lanza: si Resend no esta configurado o falla, devuelve false y loguea,
 * para que el registro del vendedor nunca se caiga por el correo.
 */
export async function sendVendorVerificationEmail(params: {
  to: string
  companyName: string
  token: string
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      "[vendor-email] RESEND_API_KEY no configurada — no se envio el correo de verificacion a",
      params.to
    )
    return false
  }

  const verifyUrl = `${FRONTEND_URL}/registro/vendedor/verificar?token=${params.token}`

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: params.to,
        subject: "Bienvenido a RunMax Shop — confirma tu correo",
        html: buildEmailHtml(params.companyName, verifyUrl),
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[vendor-email] Resend respondio", res.status, body)
      return false
    }

    console.log("[vendor-email] Correo de verificacion enviado a", params.to)
    return true
  } catch (e) {
    console.error("[vendor-email] Error enviando correo:", e)
    return false
  }
}
