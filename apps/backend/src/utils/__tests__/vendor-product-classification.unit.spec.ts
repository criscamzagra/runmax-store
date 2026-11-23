import {
  applyClassification,
  readCategoryIds,
  readClassification,
} from "../vendor-product-classification"

describe("readClassification", () => {
  it("toma deportes, género, momento y nutrición validados", () => {
    expect(
      readClassification({
        metadata: {
          sports: ["running", "Ciclismo", "triatlon", "running"],
          gender: "unisex",
          race_moment: "durante",
          nutrition_serving: " gel ",
          nutrition_carbs_g: "50",
          nutrition_sodium_mg: 450,
          nutrition_caffeine_mg: 0,
        },
      })
    ).toEqual({
      sports: "running,ciclismo,triatlon",
      gender: "unisex",
      race_moment: "durante",
      nutrition_serving: "gel",
      nutrition_carbs_g: 50,
      nutrition_sodium_mg: 450,
      nutrition_caffeine_mg: 0,
    })
  })

  it("acepta varios momentos", () => {
    expect(readClassification({ metadata: { race_moment: ["antes", "durante", "siempre"] } })).toEqual({
      race_moment: "antes,durante",
    })
  })

  it("acepta los deportes también como texto separado por comas", () => {
    expect(readClassification({ metadata: { sports: "running, trail" } })).toEqual({ sports: "running,trail" })
  })

  it("ignora lo que no es válido y lo que el servidor pone", () => {
    expect(
      readClassification({
        metadata: {
          sports: ["futbol"],
          race_moment: "siempre",
          nutrition_carbs_g: -3,
          nutrition_sodium_mg: "mucho",
          vendor_id: "otro",
          rejection_reason: "x",
        },
      })
    ).toEqual({})
  })

  it("null o vacío significa que lo borró", () => {
    expect(
      readClassification({ metadata: { sports: [], gender: "", nutrition_carbs_g: null, nutrition_serving: "  " } })
    ).toEqual({ sports: null, gender: null, nutrition_carbs_g: null, nutrition_serving: null })
  })

  it("sin metadata no cambia nada", () => {
    expect(readClassification({ title: "x" })).toEqual({})
    expect(readClassification(null)).toEqual({})
  })
})

describe("applyClassification", () => {
  it("escribe los valores, borra los null y no toca el resto", () => {
    expect(
      applyClassification(
        { vendor_id: "v1", sports: "running", nutrition_carbs_g: 30 },
        { sports: "running,trail", nutrition_carbs_g: null }
      )
    ).toEqual({ vendor_id: "v1", sports: "running,trail" })
  })
})

describe("readCategoryIds", () => {
  it("toma ids de categoría sin repetir, a lo sumo 3", () => {
    expect(readCategoryIds({ category_ids: ["pcat_a", "pcat_a", "pcat_b", "pcat_c", "pcat_d"] })).toEqual([
      "pcat_a",
      "pcat_b",
      "pcat_c",
    ])
  })

  it("descarta lo que no parece un id", () => {
    expect(readCategoryIds({ category_ids: ["pcat_ok", "drop table", 3] })).toEqual(["pcat_ok"])
  })

  it("null o lista vacía quita las categorías; sin el campo no cambia", () => {
    expect(readCategoryIds({ category_ids: null })).toEqual([])
    expect(readCategoryIds({ category_ids: [] })).toEqual([])
    expect(readCategoryIds({ title: "x" })).toBeUndefined()
  })
})
