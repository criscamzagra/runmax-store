/**
 * Correo "Nueva venta" para el vendedor: se envia cuando un cliente compra
 * productos de su tienda, con solo sus productos (ver
 * subscribers/order-placed-notify-vendors.ts).
 *
 * El diseno es la plantilla de marca compartida (`brand-email.ts`), con el
 * resumen de productos como el del correo de confirmacion del comprador.
 *
 * El nombre del comprador lo escribe el en el checkout, y los titulos y el
 * nombre de la tienda los escriben los vendedores: todo pasa por `escapeHtml`.
 */

import {
  brandEmailHtml,
  color,
  emailButton,
  emailSection,
  escapeHtml,
  font,
  formatCop,
  sendResendEmail,
} from "./brand-email"

const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://www.runmaxshop.com"
).replace(/\/$/, "")

export interface SoldItem {
  title: string
  quantity: number
  unit_price: number
  /** Talla, color… Vacio o "Default variant" no se muestra. */
  variant?: string | null
  thumbnail?: string | null
}

/**
 * Como pago el cliente, de `order.metadata.payment_method` (lo escribe el
 * checkout del frontend, `order-payment-method.ts`). Medusa no lo distingue:
 * los dos caminos usan `pp_system_default`.
 */
export type SalePaymentMethod = "epayco" | "cod"

export function parsePaymentMethod(value: unknown): SalePaymentMethod | null {
  return value === "epayco" || value === "cod" ? value : null
}

const PAYMENT_COPY: Record<SalePaymentMethod, { label: string; detail: string }> = {
  epayco: {
    label: "Pagado en línea",
    detail: "El pago ya está aprobado: puedes despachar el pedido.",
  },
  cod: {
    label: "Pago contra entrega",
    detail: "El cliente paga al recibir, así que todavía no está cobrado.",
  },
}

export interface NewSaleEmailParams {
  companyName: string
  /** Null en pedidos de antes de que el checkout lo guardara: no se muestra. */
  paymentMethod?: SalePaymentMethod | null
  displayId: string | number
  items: SoldItem[]
  total: number
  customerName: string
  customerCity: string
}

export function newSaleSubject({ displayId }: Pick<NewSaleEmailParams, "displayId">): string {
  return `Nueva venta: pedido #${displayId} en Runmax Shop`
}

function unitCount(items: SoldItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export function newSalePreheader({ displayId, items, total, paymentMethod }: NewSaleEmailParams): string {
  const units = unitCount(items)
  const payment = paymentMethod ? ` ${PAYMENT_COPY[paymentMethod].label}.` : ""
  return `Vendiste ${units} ${units === 1 ? "producto" : "productos"} por ${formatCop(total)}.${payment} Prepara el pedido #${displayId} para el envío.`
}

function variantLabel(item: SoldItem): string | null {
  const variant = item.variant?.trim()
  return variant && variant !== "Default variant" ? variant : null
}

/** Solo URLs http(s): una imagen con otro esquema no se pinta. */
function safeImageUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? escapeHtml(url) : null
}

const text = (style: string) =>
  `margin:0;font-family:${font.body};font-size:16px;line-height:24px;color:${color.textPrimary};${style}`

const headingStyle = `margin:0 0 8px;font-family:${font.display};font-size:24px;line-height:1.2;font-weight:700;text-transform:uppercase;color:${color.textPrimary};`

function itemRow(item: SoldItem, first: boolean): string {
  const image = safeImageUrl(item.thumbnail)
  const imageCell = image
    ? `<img src="${image}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:contain;background-color:${color.bgCanvas};border:1px solid ${color.borderSubtle};">`
    : `<div style="width:64px;height:64px;background-color:${color.bgCanvas};border:1px solid ${color.borderSubtle};"></div>`
  const variant = variantLabel(item)
  const border = first ? "" : `border-top:1px solid ${color.borderSubtle};`

  return `
        <tr>
          <td style="width:80px;padding:16px 0;vertical-align:top;${border}">${imageCell}</td>
          <td style="padding:16px 12px 16px 0;vertical-align:top;${border}">
            <p style="${text("font-weight:700;")}">${escapeHtml(item.title)} × ${item.quantity}</p>
            ${variant ? `<p style="${text(`margin-top:4px;font-size:14px;line-height:20px;color:${color.textSecondary};`)}">${escapeHtml(variant)}</p>` : ""}
          </td>
          <td style="width:110px;padding:16px 0;vertical-align:top;text-align:right;${border}">
            <p style="${text("font-weight:700;")}">${formatCop(item.unit_price * item.quantity)}</p>
          </td>
        </tr>`
}

/** Como pago, en una caja blanca bajo los datos del comprador. Sin el dato, nada. */
function paymentBlock(method: SalePaymentMethod | null | undefined): string {
  if (!method) return ""
  const { label, detail } = PAYMENT_COPY[method]
  return `
      <div style="margin-top:16px;padding:16px;background-color:${color.bgCanvas};border:1px solid ${color.borderSubtle};">
        <p style="${text("font-weight:700;")}">${label}</p>
        <p style="${text(`margin-top:4px;font-size:14px;line-height:20px;color:${color.textSecondary};`)}">${detail}</p>
      </div>`
}

export function buildNewSaleHtml(params: NewSaleEmailParams): string {
  const ordersUrl = escapeHtml(`${FRONTEND_URL}/vendedor/pedidos`)

  const intro = emailSection(`
      <p style="margin:0 0 12px;font-family:${font.display};font-size:14px;line-height:18px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${color.textSecondary};">
        Pedido #${escapeHtml(String(params.displayId))}
      </p>
      <h1 style="margin:0 0 16px;font-family:${font.display};font-size:32px;line-height:1.1;font-weight:700;text-transform:uppercase;color:${color.textPrimary};">
        Tienes una venta nueva
      </h1>
      <p style="margin:0;font-size:16px;line-height:1.5;color:${color.textSecondary};">
        Hola, ${escapeHtml(params.companyName)}. Un cliente compró productos de tu tienda.
        Prepara el pedido cuanto antes para que el envío no se demore.
      </p>

      <div style="padding:24px 0 0;">
        ${emailButton(ordersUrl, "Gestionar pedido")}
      </div>
    `)

  const summary = emailSection(
    `
      <h2 style="${headingStyle}">Lo que vendiste</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${params.items.map((item, i) => itemRow(item, i === 0)).join("")}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px;border-top:2px solid ${color.borderStrong};">
        <tr>
          <td style="padding-top:16px;"><p style="${text(`line-height:40px;color:${color.textSecondary};`)}">Total de tu venta</p></td>
          <td style="padding-top:16px;text-align:right;"><p style="${text(`font-family:${font.display};font-size:32px;line-height:40px;font-weight:700;`)}">${formatCop(params.total)}</p></td>
        </tr>
      </table>
    `,
    { variant: "subgroup", dividerTop: true }
  )

  const buyer = emailSection(
    `
      <h2 style="${headingStyle}">Comprador</h2>
      <p style="${text("")}">${escapeHtml(params.customerName)}</p>
      <p style="${text(`color:${color.textSecondary};`)}">${escapeHtml(params.customerCity)}</p>
${paymentBlock(params.paymentMethod)}
      <p style="${text(`margin-top:16px;font-size:14px;line-height:20px;color:${color.textSecondary};`)}">
        Desde tu panel puedes marcar el pedido como preparado, enviado y entregado.
      </p>
    `,
    { variant: "subgroup", dividerTop: true }
  )

  return brandEmailHtml({
    title: escapeHtml(newSaleSubject(params)),
    preheader: escapeHtml(newSalePreheader(params)),
    body: [intro, summary, buyer].join("\n\n    "),
    footerNotice: "Recibes este correo porque vendes en Runmax Shop y este pedido incluye productos de tu tienda.",
  })
}

/** Version en texto plano; empieza con el preheader, como en el frontend. */
export function buildNewSaleText(params: NewSaleEmailParams): string {
  return [
    newSalePreheader(params),
    "",
    `Hola, ${params.companyName}. Un cliente compró productos de tu tienda en el pedido #${params.displayId}.`,
    ...(params.paymentMethod
      ? [`${PAYMENT_COPY[params.paymentMethod].label}. ${PAYMENT_COPY[params.paymentMethod].detail}`]
      : []),
    "",
    "Lo que vendiste:",
    ...params.items.map((item) => {
      const variant = variantLabel(item)
      return `- ${item.title}${variant ? ` (${variant})` : ""} × ${item.quantity}: ${formatCop(item.unit_price * item.quantity)}`
    }),
    `Total de tu venta: ${formatCop(params.total)}`,
    "",
    `Comprador: ${params.customerName}, ${params.customerCity}`,
    "",
    `Gestiona el pedido desde tu panel: ${FRONTEND_URL}/vendedor/pedidos`,
  ].join("\n")
}

/**
 * Envia el correo de nueva venta al vendedor. No lanza: si Resend falla,
 * loguea y devuelve false para no romper el flujo del pedido.
 */
export async function sendVendorNewSaleEmail(params: NewSaleEmailParams & { to: string }): Promise<boolean> {
  const sent = await sendResendEmail("vendor-sale-email", {
    to: params.to,
    subject: newSaleSubject(params),
    html: buildNewSaleHtml(params),
    text: buildNewSaleText(params),
  })
  if (sent) console.log("[vendor-sale-email] Notificacion de venta enviada a", params.to)
  return sent
}
