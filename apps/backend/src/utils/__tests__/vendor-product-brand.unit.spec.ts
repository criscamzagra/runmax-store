import { readBrandName } from "../vendor-product-brand"

describe("readBrandName", () => {
  it("toma la marca de metadata.brand_name", () => {
    expect(readBrandName({ metadata: { brand_name: "  SaltStick " } })).toBe("SaltStick")
  })

  it("null o vacío significa que la borró", () => {
    expect(readBrandName({ metadata: { brand_name: null } })).toBeNull()
    expect(readBrandName({ metadata: { brand_name: "   " } })).toBeNull()
  })

  it("sin marca en el cuerpo no cambia nada", () => {
    expect(readBrandName({ title: "x" })).toBeUndefined()
    expect(readBrandName({ metadata: { vendor_id: "otro" } })).toBeUndefined()
    expect(readBrandName({ metadata: { brand_name: 42 } })).toBeUndefined()
    expect(readBrandName(null)).toBeUndefined()
  })
})
