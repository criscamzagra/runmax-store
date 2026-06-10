import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Button, Textarea, Badge, Text, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"

const ProductReviewWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [vendorName, setVendorName] = useState<string | null>(null)

  const metadata = (data.metadata ?? {}) as Record<string, unknown>
  const vendorId = metadata.vendor_id as string | undefined
  const existingReason = metadata.rejection_reason as string | undefined
  const storedVendorName = metadata.vendor_company_name as string | undefined

  useEffect(() => {
    if (!vendorId) return

    if (storedVendorName) {
      setVendorName(storedVendorName)
      return
    }

    fetch(`/admin/vendors/${vendorId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((d) => setVendorName(d.vendor?.company_name ?? null))
      .catch(() => {})
  }, [vendorId, storedVendorName])

  useEffect(() => {
    if (!vendorId) return

    function hideHeaderActions() {
      document
        .querySelectorAll<HTMLButtonElement>('button[aria-haspopup="menu"]')
        .forEach((btn) => {
          if (btn.closest("[data-vendor-review]")) return
          if (btn.closest(".shadow-elevation-card-rest")) return
          btn.style.setProperty("display", "none", "important")
        })
    }

    hideHeaderActions()
    const observer = new MutationObserver(hideHeaderActions)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [vendorId])

  if (!vendorId) return null

  const updateProductStatus = async (status: string, reason?: string) => {
    setLoading(true)
    try {
      const newMetadata: Record<string, unknown> = { ...metadata }

      if (status === "rejected" && reason) {
        newMetadata.rejection_reason = reason
        newMetadata.rejected_at = new Date().toISOString()
      }

      if (status === "published") {
        delete newMetadata.rejection_reason
        delete newMetadata.rejected_at
      }

      const res = await fetch(`/admin/products/${data.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, metadata: newMetadata }),
      })

      if (!res.ok) throw new Error("Error al actualizar")

      toast.success(
        status === "published"
          ? "Producto aprobado y publicado"
          : status === "rejected"
            ? "Producto rechazado. El vendedor vera el motivo."
            : "Producto movido a borrador"
      )

      setShowRejectForm(false)
      setRejectionReason("")

      setTimeout(() => window.location.reload(), 800)
    } catch {
      toast.error("Error al actualizar el producto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container data-vendor-review>
      <div style={{ marginBottom: 16 }}>
        <Heading level="h2">Revision de producto</Heading>
        <Text size="small" style={{ color: "#6B7280", marginTop: 4 }}>
          Producto de vendedor — requiere aprobacion.
        </Text>
        {vendorName && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor: "#F0FDF4",
              border: "1px solid #BBF7D0",
            }}
          >
            <Text size="small" style={{ color: "#166534" }}>
              <strong>Tienda:</strong> {vendorName}
            </Text>
          </div>
        )}
      </div>

      {data.status === "rejected" && existingReason && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 8,
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          marginBottom: 16,
        }}>
          <Text size="small" weight="plus" style={{ color: "#991B1B", marginBottom: 4 }}>
            Motivo de rechazo:
          </Text>
          <Text size="small" style={{ color: "#7F1D1D" }}>
            {existingReason}
          </Text>
        </div>
      )}

      {data.status === "draft" && !showRejectForm && (
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="primary"
            size="small"
            disabled={loading}
            onClick={() => updateProductStatus("published")}
          >
            Aprobar y publicar
          </Button>
          <Button
            variant="danger"
            size="small"
            disabled={loading}
            onClick={() => setShowRejectForm(true)}
          >
            Rechazar
          </Button>
        </div>
      )}

      {showRejectForm && (
        <div>
          <Text size="small" weight="plus" style={{ marginBottom: 8 }}>
            Motivo del rechazo (el vendedor lo vera):
          </Text>
          <Textarea
            placeholder="Ej: La imagen no cumple con los estandares de calidad. Por favor suba fotos con fondo blanco y buena resolucion."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="danger"
              size="small"
              disabled={loading || !rejectionReason.trim()}
              onClick={() => updateProductStatus("rejected", rejectionReason.trim())}
            >
              Confirmar rechazo
            </Button>
            <Button
              variant="secondary"
              size="small"
              disabled={loading}
              onClick={() => { setShowRejectForm(false); setRejectionReason("") }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {data.status === "rejected" && (
        <div style={{ display: "flex", gap: 8, marginTop: existingReason ? 0 : undefined }}>
          <Button
            variant="primary"
            size="small"
            disabled={loading}
            onClick={() => updateProductStatus("published")}
          >
            Aprobar y publicar
          </Button>
          <Button
            variant="secondary"
            size="small"
            disabled={loading}
            onClick={() => updateProductStatus("draft")}
          >
            Mover a borrador
          </Button>
        </div>
      )}

      {data.status === "published" && (
        <div style={{ display: "flex", gap: 8 }}>
          <Badge color="green">Publicado</Badge>
          <Button
            variant="secondary"
            size="small"
            disabled={loading}
            onClick={() => updateProductStatus("draft")}
          >
            Despublicar
          </Button>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductReviewWidget
