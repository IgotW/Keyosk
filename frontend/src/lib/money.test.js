import { describe, expect, it } from 'vitest'
import {
  cartTotals,
  centsToDollars,
  dollarsToCents,
  formatMoney,
  getCurrency,
  setCurrency,
} from './money'

describe('formatMoney', () => {
  it('formats integer cents in the requested currency', () => {
    expect(formatMoney(850, 'USD')).toMatch(/8\.50/)
    expect(formatMoney(0, 'USD')).toMatch(/0\.00/)
  })

  it('falls back to zero for non-numeric input', () => {
    expect(formatMoney('not-a-number', 'USD')).toMatch(/0\.00/)
    expect(formatMoney(undefined, 'USD')).toMatch(/0\.00/)
  })
})

describe('dollarsToCents', () => {
  it('parses valid decimal strings', () => {
    expect(dollarsToCents('8.50')).toBe(850)
    expect(dollarsToCents('8.5')).toBe(850)
    expect(dollarsToCents('0.99')).toBe(99)
    expect(dollarsToCents('10')).toBe(1000)
    expect(dollarsToCents(' 4.20 ')).toBe(420)
  })

  it('rejects invalid input', () => {
    expect(dollarsToCents('')).toBeNull()
    expect(dollarsToCents('abc')).toBeNull()
    expect(dollarsToCents('-1')).toBeNull()
    expect(dollarsToCents('1.999')).toBeNull()
    expect(dollarsToCents('1,5')).toBeNull()
  })
})

describe('centsToDollars', () => {
  it('renders two decimal places', () => {
    expect(centsToDollars(850)).toBe('8.50')
    expect(centsToDollars(0)).toBe('0.00')
    expect(centsToDollars(null)).toBe('0.00')
  })
})

describe('cartTotals', () => {
  it('sums quantity and line totals', () => {
    expect(
      cartTotals([
        { price_cents: 850, quantity: 2 },
        { price_cents: 350, quantity: 1 },
      ]),
    ).toEqual({ count: 3, totalCents: 2050 })
  })

  it('returns zero for an empty cart', () => {
    expect(cartTotals([])).toEqual({ count: 0, totalCents: 0 })
  })
})

describe('currency storage', () => {
  it('defaults to USD and persists a configured currency', () => {
    expect(getCurrency()).toBe('USD')

    setCurrency('EUR')
    expect(getCurrency()).toBe('EUR')
  })
})
