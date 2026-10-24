import {
  buildNewSaleHtml,
  buildNewSaleText,
  newSalePreheader,
  newSaleSubject,
  NewSaleEmailParams,
} from "../vendor-new-sale-email"

const SALE: NewSaleEmailParams = {
  companyName: "Tienda Ana",
  displayId: 1234,
  items: [
    { title: "Gel Maurten 100", quantity: 2, unit_price: 20000, variant: "Default variant", thumbnail: "https://cdn.example.com/gel.png" },
    { title: "Camiseta Trail", quantity: 1, unit_price: 89900, variant: "Talla M" },
  ],
  total: 129900,
  customerName: "Ana Ruiz",
  customerCity: "Cali",
}

describe("vendor new sale email", () => {
  it("names the order in the subject and counts units in the preheader", () => {
    expect(newSaleSubject(SALE)).toBe("Nueva venta: pedido #1234 en Runmax Shop")
    expect(newSalePreheader(SALE)).toBe("Vendiste 3 productos por $129.900. Prepara el pedido #1234 para el envío.")
  })

  it("uses the brand template, not the old hand-made header", () => {
    const html = buildNewSaleHtml(SALE)
    expect(html).toContain("https://www.runmaxshop.com/email/logo-white.png")
    expect(html).toContain("RUNMAX SHOP S.A.S.")
    expect(html).not.toContain("#C5E500")
    expect(html).not.toContain("RunMax")
  })

  it("lists each product with its line total and the sale total", () => {
    const html = buildNewSaleHtml(SALE)
    expect(html).toContain("Gel Maurten 100 × 2")
    expect(html).toContain("$40.000")
    expect(html).toContain("Talla M")
    expect(html).not.toContain("Default variant")
    expect(html).toContain("$129.900")
    expect(html).toContain('src="https://cdn.example.com/gel.png"')
  })

  it("links to the vendor orders panel", () => {
    expect(buildNewSaleHtml(SALE)).toContain('href="https://www.runmaxshop.com/vendedor/pedidos"')
  })

  it("escapes what buyers and vendors type", () => {
    const html = buildNewSaleHtml({
      ...SALE,
      companyName: "<b>Tienda</b>",
      customerName: '<img src=x onerror="alert(1)">',
      customerCity: "Cali<script>",
      items: [{ title: "<a href='https://evil.example'>Gel</a>", quantity: 1, unit_price: 1000 }],
    })
    expect(html).not.toContain("<img src=x")
    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<b>Tienda</b>")
    expect(html).not.toContain("<a href='https://evil.example'>")
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
  })

  it("drops a thumbnail that is not an http(s) URL", () => {
    const html = buildNewSaleHtml({ ...SALE, items: [{ ...SALE.items[0], thumbnail: "javascript:alert(1)" }] })
    expect(html).not.toContain("javascript:")
  })

  it("has a plain-text version that starts with the preheader", () => {
    const text = buildNewSaleText(SALE)
    expect(text.split("\n")[0]).toBe(newSalePreheader(SALE))
    expect(text).toContain("- Camiseta Trail (Talla M) × 1: $89.900")
    expect(text).toContain("https://www.runmaxshop.com/vendedor/pedidos")
  })
})
