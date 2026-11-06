import { describe, expect, it } from 'vitest'
import { cartReducer } from './cartReducer'
import { MAX_CART_QUANTITY } from '../lib/storage'

const burger = {
  id: 1,
  name: 'Burger',
  price_cents: 850,
  image_url: 'https://example.com/burger.jpg',
}

const fries = {
  id: 2,
  name: 'Fries',
  price_cents: 350,
  image_url: null,
}

describe('cartReducer', () => {
  it('adds a new product with a price snapshot', () => {
    const next = cartReducer([], { type: 'add', product: burger })

    expect(next).toEqual([
      {
        productId: 1,
        name: 'Burger',
        price_cents: 850,
        image_url: 'https://example.com/burger.jpg',
        quantity: 1,
      },
    ])
  })

  it('honours the requested quantity when adding a new product', () => {
    const next = cartReducer([], {
      type: 'add',
      product: burger,
      quantity: 4,
    })

    expect(next[0].quantity).toBe(4)
  })

  it('increments an existing product and caps at the maximum', () => {
    const once = cartReducer([], { type: 'add', product: burger })
    const twice = cartReducer(once, { type: 'add', product: burger })

    expect(twice[0].quantity).toBe(2)

    const full = [
      { ...once[0], quantity: MAX_CART_QUANTITY },
    ]

    expect(
      cartReducer(full, { type: 'add', product: burger })[0].quantity,
    ).toBe(MAX_CART_QUANTITY)
  })

  it('sets a quantity and clamps it', () => {
    const start = cartReducer(
      cartReducer([], { type: 'add', product: burger }),
      { type: 'add', product: fries },
    )

    const updated = cartReducer(start, {
      type: 'setQuantity',
      productId: 1,
      quantity: 5,
    })

    expect(updated[0].quantity).toBe(5)

    const capped = cartReducer(updated, {
      type: 'setQuantity',
      productId: 1,
      quantity: 500,
    })

    expect(capped[0].quantity).toBe(MAX_CART_QUANTITY)
  })

  it('removes a product when the quantity drops below one', () => {
    const start = cartReducer([], { type: 'add', product: burger })

    expect(updatedQuantity(start, 0)).toEqual([])
    expect(updatedQuantity(start, -3)).toEqual([])
  })

  it('removes a product by id', () => {
    const start = cartReducer(
      cartReducer([], { type: 'add', product: burger }),
      { type: 'add', product: fries },
    )

    expect(
      cartReducer(start, { type: 'remove', productId: 1 }),
    ).toEqual([start[1]])
  })

  it('clears the cart', () => {
    const start = cartReducer([], { type: 'add', product: burger })

    expect(cartReducer(start, { type: 'clear' })).toEqual([])
  })

  it('replaces the cart only with an array', () => {
    const start = cartReducer([], { type: 'add', product: burger })
    const replacement = [
      {
        productId: 2,
        name: 'Fries',
        price_cents: 350,
        image_url: null,
        quantity: 3,
      },
    ]

    expect(
      cartReducer(start, { type: 'replace', items: replacement }),
    ).toEqual(replacement)
    expect(cartReducer(start, { type: 'replace', items: null })).toEqual(start)
  })

  it('returns the current state for unknown actions', () => {
    const start = cartReducer([], { type: 'add', product: burger })

    expect(cartReducer(start, { type: 'unknown' })).toBe(start)
  })
})

function updatedQuantity(items, quantity) {
  return cartReducer(items, {
    type: 'setQuantity',
    productId: 1,
    quantity,
  })
}
