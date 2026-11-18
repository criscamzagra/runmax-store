import { requireApprovedVendor } from "../require-approved-vendor"

function setup(vendorId: string | undefined, retrieve: () => Promise<{ status: string }>) {
  const req = {
    auth_context: { app_metadata: vendorId ? { vendor_id: vendorId } : {} },
    scope: { resolve: () => ({ retrieveVendor: retrieve }) },
  } as any
  const json = jest.fn()
  const res = { status: jest.fn(() => ({ json })) } as any
  const next = jest.fn()
  return { req, res, next, json }
}

describe("requireApprovedVendor", () => {
  it("deja pasar a un vendedor aprobado", async () => {
    const { req, res, next } = setup("v1", async () => ({ status: "approved" }))
    await requireApprovedVendor(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it.each(["pending", "rejected"])("bloquea con 403 a un vendedor %s", async (status) => {
    const { req, res, next } = setup("v1", async () => ({ status }))
    await requireApprovedVendor(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it("responde 401 sin vendor_id en la sesion", async () => {
    const { req, res, next } = setup(undefined, async () => ({ status: "approved" }))
    await requireApprovedVendor(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("responde 401 si el vendedor ya no existe", async () => {
    const { req, res, next } = setup("v1", async () => {
      throw new Error("not found")
    })
    await requireApprovedVendor(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
