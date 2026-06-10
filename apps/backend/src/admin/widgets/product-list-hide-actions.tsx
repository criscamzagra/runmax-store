import { defineWidgetConfig } from "@medusajs/admin-sdk"

const ProductListHideActions = () => {
  return (
    <style>{`
      table th:last-child,
      table td:last-child {
        display: none !important;
      }
    `}</style>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default ProductListHideActions
