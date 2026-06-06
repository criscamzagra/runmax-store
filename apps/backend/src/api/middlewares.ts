import { defineMiddlewares, authenticate } from "@medusajs/medusa"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/vendors/me*",
      middlewares: [authenticate("vendor", ["bearer", "session"])],
    },
  ],
})
