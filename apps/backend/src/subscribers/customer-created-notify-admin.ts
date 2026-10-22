import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { notifyAdminNewCustomer } from "../utils/admin-signup-email"

/**
 * Avisa al equipo cuando alguien crea una cuenta de cliente, venga del
 * registro con correo o del inicio de sesion con Google: los dos terminan
 * creando el cliente en Medusa.
 *
 * Los clientes invitados (los que compran sin cuenta) tambien disparan
 * `customer.created`, pero no son un registro: se ignoran.
 */
export default async function customerCreatedNotifyAdmin({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const customerService: ICustomerModuleService = container.resolve(Modules.CUSTOMER)
    const customer = await customerService.retrieveCustomer(data.id)
    if (!customer.has_account) return

    await notifyAdminNewCustomer(customer)
  } catch (e) {
    console.error("[customer-created-notify-admin] No se pudo avisar del registro:", e)
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
