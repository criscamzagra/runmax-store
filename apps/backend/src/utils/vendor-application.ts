/**
 * Solicitud para vender en Runmax ("quiero vender"). Antes vivia en la tabla
 * `seller_applications` de Neon, aparte de Medusa: una solicitud nunca se
 * volvia vendedor si nadie la miraba alla. Ahora crea el vendedor en Medusa,
 * en estado `pending`, y se aprueba en el admin como cualquier otro.
 *
 * La solicitud no pide contraseña: la cuenta se crea al aprobarla (ver
 * api/admin/vendors/[id]/approve). Los campos son los mismos de la tabla de
 * Neon, para que el formulario del frontend solo cambie de endpoint.
 */

export type VendorApplication = {
  seller_type: string
  legal_name: string
  tax_id: string
  contact_name: string
  email: string
  phone: string
  city: string
  categories: string[]
  sports: string[]
  relationship: string
  catalog_size: string
  channels: string[]
  website: string | null
  message: string | null
  marketing_opt_in: boolean
  source: string | null
}

const MAX_TEXT = 200
const MAX_MESSAGE = 2000
const MAX_LIST = 20

const REQUIRED_TEXT = [
  "seller_type",
  "legal_name",
  "tax_id",
  "contact_name",
  "email",
  "phone",
  "city",
  "relationship",
  "catalog_size",
] as const

const LABELS: Record<string, string> = {
  seller_type: "tipo de vendedor",
  legal_name: "razón social o nombre",
  tax_id: "NIT o documento",
  contact_name: "nombre de contacto",
  email: "correo",
  phone: "teléfono",
  city: "ciudad",
  relationship: "relación con la marca",
  catalog_size: "tamaño del catálogo",
  categories: "categorías",
}

function text(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((v) => text(v)).filter(Boolean))].slice(0, MAX_LIST)
}

export type ParseResult =
  | { ok: true; application: VendorApplication }
  | { ok: false; message: string }

export function parseVendorApplication(body: unknown): ParseResult {
  const b = (body ?? {}) as Record<string, unknown>

  const missing: string[] = REQUIRED_TEXT.filter((k) => !text(b[k]))
  const categories = list(b.categories)
  if (categories.length === 0) missing.push("categories")
  if (missing.length > 0) {
    return { ok: false, message: `Faltan campos: ${missing.map((k) => LABELS[k] ?? k).join(", ")}` }
  }

  const email = text(b.email).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "El correo no es válido" }
  }

  return {
    ok: true,
    application: {
      seller_type: text(b.seller_type),
      legal_name: text(b.legal_name),
      tax_id: text(b.tax_id),
      contact_name: text(b.contact_name),
      email,
      phone: text(b.phone),
      city: text(b.city),
      categories,
      sports: list(b.sports),
      relationship: text(b.relationship),
      catalog_size: text(b.catalog_size),
      channels: list(b.channels),
      website: text(b.website) || null,
      message: text(b.message, MAX_MESSAGE) || null,
      marketing_opt_in: b.marketing_opt_in === true,
      source: text(b.source) || null,
    },
  }
}

/** Lo que va a `vendor.metadata.application`: lo que el modelo no tiene como columna. */
export function applicationMetadata(a: VendorApplication, submittedAt = new Date()) {
  return {
    seller_type: a.seller_type,
    categories: a.categories,
    sports: a.sports,
    relationship: a.relationship,
    catalog_size: a.catalog_size,
    channels: a.channels,
    website: a.website,
    marketing_opt_in: a.marketing_opt_in,
    source: a.source,
    submitted_at: submittedAt.toISOString(),
  }
}
