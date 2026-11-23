/**
 * Clasificación que manda el panel del vendedor al crear o editar un
 * producto: lo que la tienda y Max necesitan para ponerlo en su repisa y
 * recomendarlo (categoría, deportes, para quién es, cuándo se usa y, en
 * nutrición, cuánto trae por porción).
 *
 * Igual que la marca (`vendor-product-brand.ts`), de la metadata solo se
 * toman estas claves, validadas: el resto lo pone el servidor.
 *
 * Por cada clave:
 * - ausente: no se cambia.
 * - `null` (o vacío): el vendedor la borró.
 * - valor válido: se guarda. Uno inválido se ignora, como si no viniera.
 */

/** Ids de deporte del catálogo (los mismos de `metadata.sports` y los filtros de Tienda). */
export const CATALOG_SPORTS = [
  "running",
  "trail",
  "ciclismo",
  "triatlon",
  "natacion",
  "hyrox",
  "fitness",
] as const

export const PRODUCT_GENDERS = ["unisex", "hombre", "mujer"] as const

/** Cuándo se usa el producto (puede ser más de uno): es como Max arma un kit. */
export const RACE_MOMENTS = ["antes", "durante", "despues", "equipo"] as const

/** Claves de metadata que el vendedor puede escribir, además de `brand_name`. */
export const CLASSIFICATION_KEYS = [
  "sports",
  "gender",
  "race_moment",
  "nutrition_serving",
  "nutrition_carbs_g",
  "nutrition_sodium_mg",
  "nutrition_caffeine_mg",
] as const

export type ClassificationKey = (typeof CLASSIFICATION_KEYS)[number]

/** Lo que hay que escribir en la metadata: `null` borra la clave. */
export type ClassificationPatch = Partial<Record<ClassificationKey, string | number | null>>

const MAX_CATEGORIES = 3

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/** `undefined` si no vino o no sirve, `null` si se borró, la lista si es válida. */
function readList(raw: unknown, allowed: readonly string[]): string | null | undefined {
  if (raw === null || raw === "") return null
  const items = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : undefined
  if (!items) return undefined
  const valid = [
    ...new Set(
      items
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => allowed.includes(item))
    ),
  ]
  if (valid.length === 0) return items.length === 0 ? null : undefined
  return valid.join(",")
}

function readText(raw: unknown, max: number): string | null | undefined {
  if (raw === null) return null
  if (typeof raw !== "string") return undefined
  return raw.trim().slice(0, max) || null
}

/** Una cifra por porción: entera o con decimales, de 0 a `max`. */
function readAmount(raw: unknown, max: number): number | null | undefined {
  if (raw === null || raw === "") return null
  const value = typeof raw === "string" ? Number(raw.replace(",", ".")) : raw
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) return undefined
  return Math.round(value * 10) / 10
}

/** Las claves de clasificación que trae `body.metadata`, ya validadas. */
export function readClassification(body: unknown): ClassificationPatch {
  if (!isObject(body) || !isObject(body.metadata)) return {}
  const metadata = body.metadata
  const patch: ClassificationPatch = {}

  const read: Record<ClassificationKey, (raw: unknown) => string | number | null | undefined> = {
    sports: (raw) => readList(raw, CATALOG_SPORTS),
    gender: (raw) => readList(raw, PRODUCT_GENDERS),
    race_moment: (raw) => readList(raw, RACE_MOMENTS),
    nutrition_serving: (raw) => readText(raw, 30),
    nutrition_carbs_g: (raw) => readAmount(raw, 500),
    nutrition_sodium_mg: (raw) => readAmount(raw, 5000),
    nutrition_caffeine_mg: (raw) => readAmount(raw, 1000),
  }

  for (const key of CLASSIFICATION_KEYS) {
    if (!(key in metadata)) continue
    const value = read[key](metadata[key])
    if (value !== undefined) patch[key] = value
  }
  return patch
}

/** Aplica el parche: escribe los valores y quita las claves en `null`. */
export function applyClassification(
  metadata: Record<string, unknown>,
  patch: ClassificationPatch
): Record<string, unknown> {
  const next = { ...metadata }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete next[key]
    else next[key] = value
  }
  return next
}

/**
 * Las categorías que eligió el vendedor (`body.category_ids`).
 *
 * - `undefined`: no vino, no se cambian.
 * - lista (puede ser vacía): ids sin repetir, a lo sumo 3. Que existan lo
 *   comprueba la ruta contra Medusa.
 */
export function readCategoryIds(body: unknown): string[] | undefined {
  if (!isObject(body) || !("category_ids" in body)) return undefined
  const raw = body.category_ids
  if (raw === null) return []
  if (!Array.isArray(raw)) return undefined
  return [
    ...new Set(
      raw
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => /^pcat_[A-Za-z0-9]+$/.test(id))
    ),
  ].slice(0, MAX_CATEGORIES)
}
