export const CART_STORAGE_KEY = 'keyosk.cart.v1'
export const MAX_CART_QUANTITY = 99

function sanitizeItem(item) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const productId = Number(item.productId)
  const priceCents = Number(item.price_cents)
  const quantity = Math.trunc(Number(item.quantity))

  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    typeof item.name !== 'string' ||
    item.name.trim() === '' ||
    !Number.isInteger(priceCents) ||
    priceCents < 0 ||
    !Number.isInteger(quantity)
  ) {
    return null
  }

  return {
    productId,
    name: item.name,
    price_cents: priceCents,
    image_url: typeof item.image_url === 'string' ? item.image_url : null,
    quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, quantity)),
  }
}

export function parseCartItems(raw) {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    const seen = new Set()
    const items = []

    for (const candidate of parsed) {
      const item = sanitizeItem(candidate)

      if (item && !seen.has(item.productId)) {
        seen.add(item.productId)
        items.push(item)
      }
    }

    return items
  } catch {
    return []
  }
}

export function loadCartItems() {
  return parseCartItems(window.localStorage.getItem(CART_STORAGE_KEY))
}

export function saveCartItems(items) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage can be unavailable; the in-memory cart still works.
  }
}
