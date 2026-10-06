import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Container, Heading, Table, Badge, Button, Text, Drawer, Input, Label, toast } from "@medusajs/ui"
import { useEffect, useState, useCallback } from "react"

type Vendor = {
  id: string
  company_name: string
  nit: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  pickup_address: string | null
  pickup_city: string | null
  pickup_neighborhood: string | null
  pickup_reference: string | null
  description: string | null
  status: "pending" | "approved" | "rejected"
  email_verified: boolean
  fee_pct: number
  created_at: string
}

type PickupForm = {
  pickup_address: string
  pickup_city: string
  pickup_neighborhood: string
  pickup_reference: string
  contact_phone: string
}

const EMPTY_FORM: PickupForm = {
  pickup_address: "",
  pickup_city: "",
  pickup_neighborhood: "",
  pickup_reference: "",
  contact_phone: "",
}

const PICKUP_FIELDS: Array<{ key: keyof PickupForm; label: string; placeholder: string }> = [
  { key: "pickup_address", label: "Dirección", placeholder: "Calle 13A #76-21" },
  { key: "pickup_city", label: "Ciudad", placeholder: "Cali" },
  { key: "pickup_neighborhood", label: "Barrio", placeholder: "Centro" },
  { key: "pickup_reference", label: "Referencia para el mensajero", placeholder: "Bodega 2, timbre azul" },
  { key: "contact_phone", label: "Teléfono de contacto", placeholder: "3001234567" },
]

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("")
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState<PickupForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchVendors = useCallback(async () => {
    try {
      const params = filter ? `?status=${filter}` : ""
      const res = await fetch(`/admin/vendors${params}`, {
        credentials: "include",
      })
      const data = await res.json()
      setVendors(data.vendors ?? [])
    } catch {
      toast.error("Error", { description: "No se pudieron cargar los vendedores" })
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/admin/vendors/${id}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      toast.success("Vendedor aprobado")
      fetchVendors()
    } catch {
      toast.error("Error al aprobar")
    }
  }

  const handleReject = async (id: string) => {
    try {
      await fetch(`/admin/vendors/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Rechazado por admin" }),
      })
      toast.success("Vendedor rechazado")
      fetchVendors()
    } catch {
      toast.error("Error al rechazar")
    }
  }

  const openEdit = (vendor: Vendor) => {
    setEditing(vendor)
    setForm({
      pickup_address: vendor.pickup_address ?? "",
      pickup_city: vendor.pickup_city ?? "",
      pickup_neighborhood: vendor.pickup_neighborhood ?? "",
      pickup_reference: vendor.pickup_reference ?? "",
      contact_phone: vendor.contact_phone ?? "",
    })
  }

  // Skydropx y Mensajeros Urbanos recogen en esta direccion. Un campo vacio
  // se guarda como null para que el frontend vuelva al origen por defecto.
  const handleSavePickup = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/admin/vendors/${editing.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(
            PICKUP_FIELDS.map(({ key }) => [key, form[key].trim() || null])
          )
        ),
      })
      if (!res.ok) throw new Error()
      toast.success("Dirección de recogida guardada")
      setEditing(null)
      fetchVendors()
    } catch {
      toast.error("Error", { description: "No se pudo guardar la dirección de recogida" })
    } finally {
      setSaving(false)
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge color="green">Aprobado</Badge>
      case "rejected":
        return <Badge color="red">Rechazado</Badge>
      default:
        return <Badge color="orange">Pendiente</Badge>
    }
  }

  const verifiedBadge = (verified: boolean) => {
    return verified ? (
      <Badge color="green">Verificado</Badge>
    ) : (
      <Badge color="grey">Sin verificar</Badge>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <Container>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <Heading level="h1">Vendedores</Heading>
          <Text size="small" style={{ color: "#6B7280", marginTop: "4px" }}>
            {vendors.length} vendedor{vendors.length !== 1 ? "es" : ""} registrado{vendors.length !== 1 ? "s" : ""}
          </Text>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant={filter === "" ? "primary" : "secondary"} size="small" onClick={() => setFilter("")}>
            Todos
          </Button>
          <Button variant={filter === "pending" ? "primary" : "secondary"} size="small" onClick={() => setFilter("pending")}>
            Pendientes
          </Button>
          <Button variant={filter === "approved" ? "primary" : "secondary"} size="small" onClick={() => setFilter("approved")}>
            Aprobados
          </Button>
          <Button variant={filter === "rejected" ? "primary" : "secondary"} size="small" onClick={() => setFilter("rejected")}>
            Rechazados
          </Button>
        </div>
      </div>

      {loading ? (
        <Text>Cargando...</Text>
      ) : vendors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Text size="large" style={{ color: "#9CA3AF" }}>
            No hay vendedores {filter ? `con estado "${filter}"` : "registrados"}
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Empresa</Table.HeaderCell>
              <Table.HeaderCell>NIT</Table.HeaderCell>
              <Table.HeaderCell>Contacto</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Email verificado</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>Dirección de recogida</Table.HeaderCell>
              <Table.HeaderCell>Fee %</Table.HeaderCell>
              <Table.HeaderCell>Fecha</Table.HeaderCell>
              <Table.HeaderCell>Acciones</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {vendors.map((vendor) => (
              <Table.Row key={vendor.id}>
                <Table.Cell>
                  <Text weight="plus">{vendor.company_name}</Text>
                </Table.Cell>
                <Table.Cell>{vendor.nit}</Table.Cell>
                <Table.Cell>{vendor.contact_name}</Table.Cell>
                <Table.Cell>{vendor.contact_email}</Table.Cell>
                <Table.Cell>{verifiedBadge(vendor.email_verified)}</Table.Cell>
                <Table.Cell>{statusBadge(vendor.status)}</Table.Cell>
                <Table.Cell>
                  {vendor.pickup_address && vendor.pickup_city ? (
                    <Text size="small">
                      {vendor.pickup_address}
                      {vendor.pickup_neighborhood ? `, ${vendor.pickup_neighborhood}` : ""}, {vendor.pickup_city}
                    </Text>
                  ) : (
                    <Badge color="orange">Sin dirección</Badge>
                  )}
                </Table.Cell>
                <Table.Cell>{vendor.fee_pct}%</Table.Cell>
                <Table.Cell>{formatDate(vendor.created_at)}</Table.Cell>
                <Table.Cell>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <Button variant="secondary" size="small" onClick={() => openEdit(vendor)}>
                      Editar recogida
                    </Button>
                    {vendor.status === "pending" && (
                      <>
                      <Button variant="primary" size="small" onClick={() => handleApprove(vendor.id)}>
                        Aprobar
                      </Button>
                      <Button variant="danger" size="small" onClick={() => handleReject(vendor.id)}>
                        Rechazar
                      </Button>
                      </>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <Drawer open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Dirección de recogida</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Text size="small" style={{ color: "#6B7280" }}>
                {editing?.company_name}. Skydropx y Mensajeros Urbanos recogen los pedidos en esta dirección.
              </Text>
              {PICKUP_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" size="small">Cancelar</Button>
            </Drawer.Close>
            <Button size="small" isLoading={saving} onClick={handleSavePickup}>
              Guardar
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Vendedores",
  icon: BuildingStorefront,
})

export default VendorsPage
