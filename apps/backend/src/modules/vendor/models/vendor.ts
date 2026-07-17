import { model } from "@medusajs/framework/utils"

const Vendor = model.define("vendor", {
  id: model.id().primaryKey(),
  company_name: model.text(),
  nit: model.text(),
  contact_name: model.text(),
  contact_email: model.text(),
  contact_phone: model.text().nullable(),
  pickup_address: model.text().nullable(),
  pickup_city: model.text().nullable(),
  email_verified: model.boolean().default(false),
  email_verification_token: model.text().nullable(),
  email_verification_expires_at: model.dateTime().nullable(),
  description: model.text().nullable(),
  logo_url: model.text().nullable(),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
  fee_pct: model.float().default(15),
  metadata: model.json().nullable(),
})

export default Vendor
