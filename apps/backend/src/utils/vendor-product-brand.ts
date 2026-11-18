/**
 * Marca que manda el panel del vendedor al crear o editar un producto.
 *
 * Llega en `metadata.brand_name` (y se repite en `subtitle`). De la metadata
 * solo se toma la marca: el resto (`vendor_id`, `vendor_company_name`,
 * `rejection_reason`…) lo pone el servidor y el vendedor no lo puede tocar.
 *
 * - `undefined`: el cuerpo no trae marca, no se cambia.
 * - `null`: la borró.
 * - texto: la marca, sin espacios sobrantes y a lo sumo 80 caracteres.
 */
export function readBrandName(body: unknown): string | null | undefined {
  if (!body || typeof body !== "object") return undefined
  const metadata = (body as { metadata?: unknown }).metadata
  if (!metadata || typeof metadata !== "object" || !("brand_name" in metadata)) return undefined
  const raw = (metadata as { brand_name?: unknown }).brand_name
  if (raw === null) return null
  if (typeof raw !== "string") return undefined
  const brand = raw.trim().slice(0, 80)
  return brand || null
}
