import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Container, Heading, Table, Badge, Button, Text, toast } from "@medusajs/ui"
import { useEffect, useState, useCallback } from "react"

type Vendor = {
  id: string
  company_name: string
  nit: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  description: string | null
  status: "pending" | "approved" | "rejected"
  email_verified: boolean
  fee_pct: number
  created_at: string
}

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("")

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
                <Table.Cell>{vendor.fee_pct}%</Table.Cell>
                <Table.Cell>{formatDate(vendor.created_at)}</Table.Cell>
                <Table.Cell>
                  {vendor.status === "pending" && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Button variant="primary" size="small" onClick={() => handleApprove(vendor.id)}>
                        Aprobar
                      </Button>
                      <Button variant="danger" size="small" onClick={() => handleReject(vendor.id)}>
                        Rechazar
                      </Button>
                    </div>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Vendedores",
  icon: BuildingStorefront,
})

export default VendorsPage
