import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { createOrder, fetchProducts } from '../api/endpoints'
import { useCart } from '../cart/cartContext'
import { OrderSummary } from '../components/OrderSummary'
import { PaymentMethodSelector } from '../components/PaymentMethodSelector'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/States'
import { toApiError } from '../lib/apiError'
import { getCurrency, setCurrency } from '../lib/money'

export function CheckoutPage() {
  const { items, removeItem, clearCart } = useCart()
  const [products, setProducts] = useState([])
  const [currency, setCurrencyState] = useState(getCurrency())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const navigate = useNavigate()

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    try {
      const payload = await fetchProducts()
      setProducts(payload.data ?? [])

      const nextCurrency = payload.meta?.currency

      if (nextCurrency) {
        setCurrency(nextCurrency)
        setCurrencyState(nextCurrency)
      }
    } catch (requestError) {
      setLoadError(toApiError(requestError).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  if (items.length === 0) {
    return <Navigate to="/cart" replace />
  }

  if (loading) {
    return <LoadingState label="Checking current prices..." />
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={loadProducts} />
  }

  const productMap = new Map(products.map((product) => [product.id, product]))
  const unavailable = items.filter((item) => {
    const product = productMap.get(item.productId)

    return !product || !product.is_available
  })
  const pricedItems = items.map((item) => {
    const product = productMap.get(item.productId)

    return product
      ? { ...item, name: product.name, price_cents: product.price_cents }
      : item
  })
  const latestTotal = items.reduce(
    (total, item) =>
      total + (productMap.get(item.productId)?.price_cents ?? item.price_cents) * item.quantity,
    0,
  )

  const removeUnavailable = () => {
    unavailable.forEach((item) => removeItem(item.productId))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (unavailable.length > 0) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const order = await createOrder({
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
      })

      clearCart()
      navigate(`/receipt/${order.receipt_token}`, { replace: true })
    } catch (requestError) {
      setSubmitError(toApiError(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-black tracking-[0.2em] text-orange-600 uppercase">
          Step 2 of 2
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
          Checkout
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Prices are confirmed by the kitchen when you place the order. No
          customer account is needed.
        </p>
      </div>

      {unavailable.length > 0 ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">
            Some items are no longer available:
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-red-700">
            {unavailable.map((item) => (
              <li key={item.productId}>{item.name}</li>
            ))}
          </ul>
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={removeUnavailable}
          >
            Remove unavailable items
          </Button>
        </div>
      ) : null}

      {submitError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {submitError.message}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start"
      >
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-900">
              How would you like to pay?
            </h2>
            <p className="mt-1 mb-4 text-sm text-slate-500">
              Cash is paid at the counter. Online payment is simulated and
              marked paid immediately.
            </p>
            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-900">
              Need to change something?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              You can still update quantities or remove items before placing
              the order.
            </p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => navigate('/cart')}
            >
              Edit cart
            </Button>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <OrderSummary
            items={pricedItems}
            totalCents={latestTotal}
            currency={currency}
          >
            <Button
              type="submit"
              size="lg"
              className="mt-4 w-full"
              disabled={submitting || unavailable.length > 0}
            >
              {submitting ? 'Placing order...' : 'Place order'}
            </Button>
          </OrderSummary>
          <p className="text-center text-xs leading-relaxed text-slate-500">
            The order and receipt share one order number. Online payment is a
            mock and no real charge is made.
          </p>
        </div>
      </form>
    </div>
  )
}
