/**
 * Correo "Nueva venta" para el vendedor: se envia cuando un cliente
 * compra productos de su tienda. Usa la API HTTP de Resend.
 */

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "RunMax Shop <onboarding@resend.dev>"
const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.runmaxshop.com"

export interface SoldItem {
  title: string
  quantity: number
  unit_price: number
}

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n)

function buildEmailHtml(params: {
  companyName: string
  displayId: string | number
  items: SoldItem[]
  total: number
  customerName: string
  customerCity: string
}): string {
  const itemsHtml = params.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #F4F4F5;font-size:14px;color:#09090B;">
          ${item.title}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #F4F4F5;font-size:14px;color:#71717A;text-align:center;">
          ${item.quantity}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #F4F4F5;font-size:14px;color:#09090B;text-align:right;font-weight:600;">
          ${COP(item.unit_price * item.quantity)}
        </td>
      </tr>`
    )
    .join("")

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

      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:6px 16px;border-radius:999px;background-color:#F0FFC0;color:#4D7C0F;font-size:13px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
          &#128176; Nueva venta
        </span>
      </div>

      <h2 style="text-align:center;font-size:24px;font-weight:800;color:#09090B;margin:0 0 8px;">
        Acaban de comprar en tu tienda
      </h2>
      <p style="text-align:center;font-size:15px;color:#71717A;margin:0 0 24px;line-height:1.6;">
        Hola <strong style="color:#09090B;">${params.companyName}</strong>,
        el pedido <strong style="color:#16A34A;">#${params.displayId}</strong> incluye productos tuyos.
        Gestionalo cuanto antes para no demorar el envio.
      </p>

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <thead>
          <tr style="background-color:#F9FAFB;">
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Producto</th>
            <th style="padding:12px 16px;text-align:center;font-size:12px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Cant.</th>
            <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:16px;font-size:16px;font-weight:800;color:#09090B;text-align:right;">Total de tu venta</td>
            <td style="padding:16px;font-size:16px;font-weight:800;color:#09090B;text-align:right;">${COP(params.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="background-color:#F4F4F5;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#09090B;">Comprador</p>
        <p style="margin:0;font-size:14px;color:#71717A;line-height:1.6;">
          ${params.customerName}<br>
          ${params.customerCity}
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0 8px;">
        <a href="${FRONTEND_URL}/vendedor/pedidos"
           style="display:inline-block;padding:16px 40px;background-color:#09090B;color:#FAFAFA;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">
          Gestionar pedido
        </a>
      </div>
      <p style="text-align:center;font-size:12px;color:#A1A1AA;margin:16px 0 0;">
        Desde tu panel puedes marcar el pedido como preparado, enviado y entregado.
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
 * Envia el correo de nueva venta al vendedor. No lanza: si Resend falla,
 * loguea y devuelve false para no romper el flujo del pedido.
 */
export async function sendVendorNewSaleEmail(params: {
  to: string
  companyName: string
  displayId: string | number
  items: SoldItem[]
  total: number
  customerName: string
  customerCity: string
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      "[vendor-sale-email] RESEND_API_KEY no configurada — no se notifico la venta a",
      params.to
    )
    return false
  }

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
        subject: `Nueva venta — pedido #${params.displayId} en RunMax Shop`,
        html: buildEmailHtml(params),
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[vendor-sale-email] Resend respondio", res.status, body)
      return false
    }

    console.log("[vendor-sale-email] Notificacion de venta enviada a", params.to)
    return true
  } catch (e) {
    console.error("[vendor-sale-email] Error enviando correo:", e)
    return false
  }
}
