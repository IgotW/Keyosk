import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchProducts } from '../api/endpoints'
import { useCart } from '../cart/cartContext'
import { Price } from '../components/Price'
import { ProductCard } from '../components/ProductCard'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { toApiError } from '../lib/apiError'
import { getCurrency, setCurrency } from '../lib/money'

export function StorefrontPage() {
  const [products, setProducts] = useState([])
  const [currency, setCurrencyState] = useState(getCurrency())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { items, count, totalCents, addItem } = useCart()
  const navigate = useNavigate()

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const payload = await fetchProducts()
      setProducts(payload.data ?? [])

      const nextCurrency = payload.meta?.currency

      if (nextCurrency) {
        setCurrency(nextCurrency)
        setCurrencyState(nextCurrency)
      }
    } catch (requestError) {
      setError(toApiError(requestError).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const quantityFor = (productId) =>
    items.find((item) => item.productId === productId)?.quantity ?? 0

  return (
    <div>
      <section className="mb-10 grid gap-6 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-10 lg:grid-cols-[1.5fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-black tracking-[0.25em] text-orange-400 uppercase">
            Order ahead
          </p>
          <h1 className="mt-3 text-3xl leading-tight font-black tracking-tight sm:text-5xl">
            Fresh food,
            <br />
            no waiting in line.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
            Build your order, choose cash or a simulated online payment, and
            pick up your receipt with a single order number.
          </p>
          <Button
            size="lg"
            className="mt-6"
            onClick={() =>
              document.getElementById('menu')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }
          >
            Start an order
          </Button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
          <p className="text-xs font-bold tracking-wider text-slate-300 uppercase">
            Your cart
          </p>
          <p className="mt-2 text-3xl font-black">
            {count} {count === 1 ? 'item' : 'items'}
          </p>
          <div className="mt-1 flex items-center justify-between text-sm text-slate-300">
            <span>Total</span>
            <Price cents={totalCents} currency={currency} className="font-bold text-white" />
          </div>
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => navigate('/cart')}
          >
            {count > 0 ? 'Review cart' : 'View cart'}
          </Button>
          {count > 0 ? (
            <Link
              to="/checkout"
              className="mt-2 block text-center text-xs font-semibold text-orange-300 hover:text-orange-200"
            >
              Go straight to checkout
            </Link>
          ) : null}
        </div>
      </section>

      <div id="menu" className="scroll-mt-24">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-orange-600 uppercase">
              Menu
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Pick your favourites
            </h2>
          </div>
          {!loading && !error ? (
            <p className="text-sm text-slate-500">
              {products.length} {products.length === 1 ? 'item' : 'items'}{' '}
              available
            </p>
          ) : null}
        </div>

        {loading ? <LoadingState label="Loading the menu..." /> : null}

        {!loading && error ? (
          <ErrorState message={error} onRetry={loadProducts} />
        ) : null}

        {!loading && !error && products.length === 0 ? (
          <EmptyState
            title="The menu is empty"
            description="No products are available right now. Please check back shortly."
          />
        ) : null}

        {!loading && !error && products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={(item) => addItem(item)}
                quantityInCart={quantityFor(product.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
