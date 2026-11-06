import { describe, expect, it } from 'vitest'
import {
  CART_STORAGE_KEY,
  MAX_CART_QUANTITY,
  loadCartItems,
  parseCartItems,
  saveCartItems,
} from './storage'

const validItem = {
  productId: 1,
  name: 'Burger',
  price_cents: 850,
  image_url: null,
  quantity: 2,
}

describe('parseCartItems', () => {
  it('returns an empty array for missing or malformed data', () => {
    expect(parseCartItems(null)).toEqual([])
    expect(parseCartItems('')).toEqual([])
    expect(parseCartItems('not json')).toEqual([])
    expect(parseCartItems('{"productId":1}')).toEqual([])
  })

  it('keeps valid items and drops malformed entries', () => {
    const parsed = parseCartItems(
      JSON.stringify([
        validItem,
        { ...validItem, productId: 0, name: 'Bad id' },
        { ...validItem, productId: 2, name: '   ' },
        { ...validItem, productId: 3, price_cents: -1 },
        { ...validItem, productId: 4, quantity: 'nope' },
        null,
      ]),
    )

    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toEqual(validItem)
  })

  it('removes duplicate products', () => {
    const parsed = parseCartItems(
      JSON.stringify([
        validItem,
        { ...validItem, quantity: 5 },
        { ...validItem, productId: 2, name: 'Fries' },
      ]),
    )

    expect(parsed.map((item) => item.productId)).toEqual([1, 2])
    expect(parsed[0].quantity).toBe(2)
  })

  it('clamps quantities into the supported range', () => {
    const parsed = parseCartItems(
      JSON.stringify([
        { ...validItem, productId: 1, quantity: 0 },
        { ...validItem, productId: 2, quantity: -4 },
        { ...validItem, productId: 3, quantity: 1000 },
      ]),
    )

    expect(parsed[0].quantity).toBe(1)
    expect(parsed[1].quantity).toBe(1)
    expect(parsed[2].quantity).toBe(MAX_CART_QUANTITY)
  })
})

describe('cart persistence', () => {
  it('saves and loads the cart', () => {
    saveCartItems([validItem])

    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY))).toEqual([
      validItem,
    ])
    expect(loadCartItems()).toEqual([validItem])
  })

  it('returns an empty array when storage holds garbage', () => {
    window.localStorage.setItem(CART_STORAGE_KEY, 'garbage')

    expect(loadCartItems()).toEqual([])
  })
})
