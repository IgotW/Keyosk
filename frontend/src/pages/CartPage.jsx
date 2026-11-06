import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../cart/cartContext'
import { CartLine } from '../components/CartLine'
import { OrderSummary } from '../components/OrderSummary'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/States'

export function CartPage() {
  const { items, totalCents, setQuantity, removeItem, clearCart } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add a few items from the menu to get started."
        action={
          <Button onClick={() => navigate('/')}>Browse the menu</Button>
        }
      />
    )
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-black tracking-[0.2em] text-orange-600 uppercase">
          Step 1 of 2
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
          Your cart
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-500">
              {items.length} {items.length === 1 ? 'product' : 'products'}
            </p>
            <button
              type="button"
              onClick={clearCart}
              className="text-sm font-semibold text-slate-500 transition hover:text-red-600"
            >
              Clear cart
            </button>
          </div>
          <div className="mt-2">
            {items.map((item) => (
              <CartLine
                key={item.productId}
                item={item}
                onQuantityChange={setQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-24">
          <OrderSummary items={items} totalCents={totalCents}>
            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={() => navigate('/checkout')}
            >
              Go to checkout
            </Button>
          </OrderSummary>
          <Link
            to="/"
            className="block text-center text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
