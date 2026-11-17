import { guideLinkToken, isValidGuideLinkToken } from "../guide-link"

const SECRET = "un-secreto-de-verdad"

describe("guide link", () => {
  it("firma de forma estable por pedido", () => {
    const a = guideLinkToken("order_1", SECRET)
    expect(a).toHaveLength(32)
    expect(guideLinkToken("order_1", SECRET)).toBe(a)
    expect(guideLinkToken("order_2", SECRET)).not.toBe(a)
  })

  it("valida solo el token de ese pedido", () => {
    const token = guideLinkToken("order_1", SECRET)
    expect(isValidGuideLinkToken("order_1", token, SECRET)).toBe(true)
    expect(isValidGuideLinkToken("order_2", token, SECRET)).toBe(false)
    expect(isValidGuideLinkToken("order_1", "x", SECRET)).toBe(false)
    expect(isValidGuideLinkToken("order_1", undefined, SECRET)).toBe(false)
  })

  it("no firma con el secreto por defecto de Medusa", () => {
    expect(guideLinkToken("order_1", "supersecret")).toBeNull()
    expect(guideLinkToken("order_1", "")).toBeNull()
    expect(isValidGuideLinkToken("order_1", "a".repeat(32), "supersecret")).toBe(false)
  })
})
