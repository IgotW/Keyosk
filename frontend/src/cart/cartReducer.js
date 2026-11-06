import { MAX_CART_QUANTITY } from '../lib/storage'

function clampQuantity(quantity) {
  return Math.min(
    MAX_CART_QUANTITY,
    Math.max(1, Math.trunc(Number(quantity) || 1)),
  )
}

export function cartReducer(items, action) {
  switch (action.type) {
    case 'add': {
      const existing = items.find(
        (item) => item.productId === action.product.id,
      )

      if (existing) {
        return items.map((item) =>
          item.productId === action.product.id
            ? {
                ...item,
                quantity: Math.min(
                  MAX_CART_QUANTITY,
                  item.quantity + (action.quantity ?? 1),
                ),
              }
            : item,
        )
      }

      return [
        ...items,
        {
          productId: action.product.id,
          name: action.product.name,
          price_cents: action.product.price_cents,
          image_url: action.product.image_url ?? null,
          quantity: clampQuantity(action.quantity ?? 1),
        },
      ]
    }

    case 'setQuantity': {
      if (action.quantity < 1) {
        return items.filter((item) => item.productId !== action.productId)
      }

      return items.map((item) =>
        item.productId === action.productId
          ? { ...item, quantity: clampQuantity(action.quantity) }
          : item,
      )
    }

    case 'remove':
      return items.filter((item) => item.productId !== action.productId)

    case 'clear':
      return []

    case 'replace':
      return Array.isArray(action.items) ? action.items : items

    default:
      return items
  }
}
