/**
 * Aviso interno al equipo de Runmax cada vez que alguien se registra: un
 * cliente con cuenta o una tienda.
 *
 * Requiere en el entorno:
 * - RESEND_API_KEY
 * - RESEND_FROM_EMAIL (opcional): remitente
 * - ADMIN_NOTIFICATION_EMAIL (opcional): a quien le llega; por defecto el
 *   buzon del equipo (runmaxshop@gmail.com). Acepta varias direcciones separadas por coma.
 */
import { renderInternalEmail, type EmailRow } from "./brand-email"
import type { VendorApplication } from "./vendor-application"

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "RunMax Shop <onboarding@resend.dev>"
const DEFAULT_RECIPIENT = "runmaxshop@gmail.com"
const ADMIN_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/app`
  : "https://runmax-backend-production.up.railway.app/app"

export function adminRecipients(raw = process.env.ADMIN_NOTIFICATION_EMAIL): string[] {
  const list = (raw ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
  return list.length > 0 ? list : [DEFAULT_RECIPIENT]
}

/** Fecha y hora de Colombia, que es la que lee el equipo. */
function bogotaTime(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date)
}

/** Un asunto no puede traer saltos de linea: se usarian para inyectar cabeceras. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 120)
}

async function send(subject: string, html: string, text: string, tag: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error(`[${tag}] RESEND_API_KEY no configurada — no se envio el aviso interno`)
    return false
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: adminRecipients(), subject, html, text }),
    })
    if (!res.ok) {
      console.error(`[${tag}] Resend respondio`, res.status, await res.text().catch(() => ""))
      return false
    }
    return true
  } catch (e) {
    console.error(`[${tag}] Error enviando el aviso interno:`, e)
    return false
  }
}

export type NewCustomer = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  created_at?: Date | string | null
}

export function buildNewCustomerEmail(c: NewCustomer) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim()
  const who = name || c.email
  const rows: EmailRow[] = [
    { label: "Nombre", value: name },
    { label: "Correo", value: c.email },
    { label: "Teléfono", value: c.phone },
    { label: "Fecha", value: bogotaTime(c.created_at ? new Date(c.created_at) : new Date()) },
  ]
  const { html, text } = renderInternalEmail({
    preview: `${who} creó una cuenta de cliente en Runmax.`,
    eyebrow: "Nuevo cliente",
    title: `${who} se registró`,
    intro: "Una persona acaba de crear su cuenta en la tienda. Su perfil deportivo se completa después del registro, así que puede que todavía no aparezca en el admin.",
    rows,
    cta: { href: `${ADMIN_URL}/customers/${encodeURIComponent(c.id)}`, label: "Ver cliente en el admin" },
  })
  return { subject: oneLine(`Nuevo cliente: ${who}`), html, text }
}

export type NewVendor = {
  id: string
  company_name: string
  nit: string
  contact_name: string
  contact_email: string
  contact_phone?: string | null
  pickup_address?: string | null
  pickup_city?: string | null
  description?: string | null
  created_at?: Date | string | null
}

/**
 * `application` viene solo de la solicitud sin contraseña (/store/vendors/apply):
 * trae lo que el registro normal no pide.
 */
export function buildNewVendorEmail(v: NewVendor, application?: VendorApplication) {
  const join = (items: string[]) => (items.length ? items.join(", ") : null)
  const extra: EmailRow[] = application
    ? [
        { label: "Tipo de vendedor", value: application.seller_type },
        { label: "Relación con la marca", value: application.relationship },
        { label: "Categorías", value: join(application.categories) },
        { label: "Deportes", value: join(application.sports) },
        { label: "Tamaño del catálogo", value: application.catalog_size },
        { label: "Dónde vende hoy", value: join(application.channels) },
        { label: "Sitio web", value: application.website },
      ]
    : []
  const rows: EmailRow[] = [
    { label: "Tienda", value: v.company_name },
    { label: "NIT / documento", value: v.nit },
    { label: "Contacto", value: v.contact_name },
    { label: "Correo", value: v.contact_email },
    { label: "Teléfono", value: v.contact_phone },
    { label: "Ciudad", value: v.pickup_city },
    { label: "Dirección de recogida", value: v.pickup_address },
    ...extra,
    { label: application ? "Mensaje" : "Qué vende", value: v.description },
    { label: "Fecha", value: bogotaTime(v.created_at ? new Date(v.created_at) : new Date()) },
  ]
  const { html, text } = renderInternalEmail({
    preview: `${v.company_name} ${application ? "envió una solicitud para vender" : "se registró como vendedor"} y espera aprobación.`,
    eyebrow: application ? "Nueva solicitud de tienda" : "Nueva tienda",
    title: `${v.company_name} quiere vender en Runmax`,
    intro: application
      ? "Llegó por el formulario de solicitud: todavía no tiene contraseña. Al aprobarla en el admin, le llega un correo para crear su cuenta."
      : "La tienda quedó en estado pendiente: no puede subir productos hasta que la aprueben en el admin.",
    rows,
    cta: { href: `${ADMIN_URL}/vendors`, label: "Revisar y aprobar en el admin" },
  })
  return { subject: oneLine(`Nueva tienda por aprobar: ${v.company_name}`), html, text }
}

/** No lanza: un aviso interno nunca debe tumbar un registro. */
export async function notifyAdminNewCustomer(c: NewCustomer): Promise<boolean> {
  const { subject, html, text } = buildNewCustomerEmail(c)
  return send(subject, html, text, "admin-signup-email")
}

/** No lanza: un aviso interno nunca debe tumbar un registro. */
export async function notifyAdminNewVendor(v: NewVendor, application?: VendorApplication): Promise<boolean> {
  const { subject, html, text } = buildNewVendorEmail(v, application)
  return send(subject, html, text, "admin-signup-email")
}
