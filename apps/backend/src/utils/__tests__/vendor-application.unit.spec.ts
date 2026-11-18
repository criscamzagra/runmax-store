import { applicationMetadata, parseVendorApplication } from "../vendor-application"
import { buildNewVendorEmail } from "../admin-signup-email"
import { buildVendorActivationEmail } from "../vendor-activation-email"

const valid = {
  seller_type: "distribuidor",
  legal_name: "Neversecond Colombia",
  tax_id: "901.234.567-8",
  contact_name: "Laura Gómez",
  email: " Laura@Ejemplo.co ",
  phone: "3001234567",
  city: "Medellín",
  categories: ["nutricion", "nutricion", "hidratacion"],
  sports: ["running"],
  relationship: "distribuidor-oficial",
  catalog_size: "1-20",
  channels: ["tienda-online"],
  website: "https://never2colombia.com",
  marketing_opt_in: true,
}

describe("parseVendorApplication", () => {
  it("acepta una solicitud completa y normaliza correo y listas", () => {
    const r = parseVendorApplication(valid)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.application.email).toBe("laura@ejemplo.co")
    expect(r.application.categories).toEqual(["nutricion", "hidratacion"])
    expect(r.application.message).toBeNull()
  })

  it("dice qué campos faltan, en español", () => {
    const r = parseVendorApplication({ ...valid, tax_id: "", categories: [] })
    expect(r).toEqual({ ok: false, message: "Faltan campos: NIT o documento, categorías" })
  })

  it("rechaza un correo inválido", () => {
    expect(parseVendorApplication({ ...valid, email: "no-es-correo" }).ok).toBe(false)
  })

  it("ignora tipos raros y recorta textos largos", () => {
    const r = parseVendorApplication({ ...valid, sports: "running", marketing_opt_in: "true", message: "x".repeat(5000) })
    if (!r.ok) throw new Error(r.message)
    expect(r.application.sports).toEqual([])
    expect(r.application.marketing_opt_in).toBe(false)
    expect(r.application.message).toHaveLength(2000)
  })

  it("la metadata guarda lo que el modelo no tiene como columna", () => {
    const r = parseVendorApplication(valid)
    if (!r.ok) throw new Error(r.message)
    const meta = applicationMetadata(r.application, new Date("2026-10-22T00:00:00Z"))
    expect(meta).toMatchObject({ seller_type: "distribuidor", channels: ["tienda-online"], submitted_at: "2026-10-22T00:00:00.000Z" })
    expect(meta).not.toHaveProperty("email")
  })
})

describe("aviso de solicitud al equipo", () => {
  it("muestra los campos extra y explica que aún no tiene contraseña", () => {
    const r = parseVendorApplication(valid)
    if (!r.ok) throw new Error(r.message)
    const email = buildNewVendorEmail(
      { id: "v1", company_name: "Neversecond Colombia", nit: "901", contact_name: "Laura", contact_email: "laura@ejemplo.co" },
      r.application
    )
    expect(email.text).toContain("Categorías: nutricion, hidratacion")
    expect(email.text).toContain("todavía no tiene contraseña")
  })
})

describe("buildVendorActivationEmail", () => {
  it("lleva el enlace, el vencimiento y el pie legal", () => {
    const email = buildVendorActivationEmail({ companyName: "Tienda <b>", activationUrl: "https://www.runmaxshop.com/recuperar/confirmar?token=t&actor=vendor" })
    expect(email.html).toContain("token=t&amp;actor=vendor")
    expect(email.html).toContain("Tienda &lt;b&gt;")
    expect(email.html).toContain("RUNMAX SHOP S.A.S.")
    expect(email.text).toContain("vence en 15 minutos")
  })
})
