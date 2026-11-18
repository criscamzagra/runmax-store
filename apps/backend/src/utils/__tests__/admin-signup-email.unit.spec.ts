import {
  adminRecipients,
  buildNewCustomerEmail,
  buildNewVendorEmail,
} from "../admin-signup-email"
import { escapeHtml } from "../brand-email"

describe("adminRecipients", () => {
  it("usa el buzon del equipo si no hay variable", () => {
    expect(adminRecipients(undefined)).toEqual(["runmaxshop@gmail.com"])
    expect(adminRecipients(" , ")).toEqual(["runmaxshop@gmail.com"])
  })

  it("acepta varias direcciones separadas por coma", () => {
    expect(adminRecipients("a@x.co, b@x.co")).toEqual(["a@x.co", "b@x.co"])
  })
})

describe("buildNewCustomerEmail", () => {
  it("usa el nombre en el asunto y enlaza al cliente en el admin", () => {
    const email = buildNewCustomerEmail({ id: "cus_1", email: "ana@x.co", first_name: "Ana", last_name: "Ruiz" })
    expect(email.subject).toBe("Nuevo cliente: Ana Ruiz")
    expect(email.html).toContain("/app/customers/cus_1")
    expect(email.text.startsWith("Ana Ruiz creó una cuenta")).toBe(true)
  })

  it("sin nombre usa el correo", () => {
    expect(buildNewCustomerEmail({ id: "cus_2", email: "sin@x.co" }).subject).toBe("Nuevo cliente: sin@x.co")
  })

  it("escapa lo que escribe el usuario", () => {
    const email = buildNewCustomerEmail({ id: "cus_3", email: "x@x.co", first_name: "<script>alert(1)</script>" })
    expect(email.html).not.toContain("<script>")
    expect(email.html).toContain("&lt;script&gt;")
  })
})

describe("buildNewVendorEmail", () => {
  const vendor = {
    id: "v1",
    company_name: "Tienda\r\nBcc: otro@x.co",
    nit: "123",
    contact_name: "Luis",
    contact_email: "luis@x.co",
    pickup_city: "Cali",
  }

  it("no deja saltos de linea en el asunto", () => {
    expect(buildNewVendorEmail(vendor).subject).not.toMatch(/[\r\n]/)
  })

  it("muestra los campos vacios como guion y enlaza a vendedores", () => {
    const email = buildNewVendorEmail(vendor)
    expect(email.text).toContain("Teléfono: —")
    expect(email.html).toContain("/app/vendors")
  })
})

describe("escapeHtml", () => {
  it("escapa comillas y signos", () => {
    expect(escapeHtml(`"a" & 'b' <c>`)).toBe("&quot;a&quot; &amp; &#39;b&#39; &lt;c&gt;")
  })
})
