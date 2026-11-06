const CURRENCY_KEY = 'keyosk.currency'

export function getCurrency() {
  return window.localStorage.getItem(CURRENCY_KEY) || 'USD'
}

export function setCurrency(currency) {
  if (currency) {
    window.localStorage.setItem(CURRENCY_KEY, currency)
  }
}

export function formatMoney(cents, currency = getCurrency()) {
  const value = Number.isFinite(Number(cents)) ? Number(cents) : 0

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(value / 100)
}

export function dollarsToCents(value) {
  const normalized = String(value).trim()

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null
  }

  const [whole, fraction = ''] = normalized.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))

  return Number.isSafeInteger(cents) ? cents : null
}

export function centsToDollars(cents) {
  return (Number(cents || 0) / 100).toFixed(2)
}

export function cartTotals(items) {
  return items.reduce(
    (totals, item) => ({
      count: totals.count + item.quantity,
      totalCents: totals.totalCents + item.price_cents * item.quantity,
    }),
    { count: 0, totalCents: 0 },
  )
}
