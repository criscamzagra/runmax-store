import { buildPasswordResetHtml, buildPasswordResetUrl } from "../password-reset-email"

describe("password reset email", () => {
  it("keeps the brand template and escapes the link", () => {
    const html = buildPasswordResetHtml('https://www.runmaxshop.com/recuperar/confirmar?token=a"b&actor=vendor')
    expect(html).toContain("https://www.runmaxshop.com/email/logo-white.png")
    expect(html).toContain('href="https://www.runmaxshop.com/recuperar/confirmar?token=a&quot;b&amp;actor=vendor"')
    expect(html).toContain("Restablecer contraseña")
  })

  it("tells the frontend which actor the token belongs to", () => {
    expect(buildPasswordResetUrl("vendor", "t")).toContain("actor=vendor")
    expect(buildPasswordResetUrl("customer", "t")).not.toContain("actor=")
  })
})
