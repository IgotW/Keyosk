import { Card } from './ui/Card'
import { Price } from './Price'

export function OrderSummary({ items, totalCents, currency, children }) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-bold text-slate-900">Order summary</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <span className="min-w-0 text-slate-600">
              <span className="font-semibold text-slate-900">
                {item.quantity}x
              </span>{' '}
              {item.name}
            </span>
            <Price
              cents={item.price_cents * item.quantity}
              currency={currency}
              className="shrink-0 font-semibold text-slate-900"
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="font-bold text-slate-900">Total</span>
        <Price
          cents={totalCents}
          currency={currency}
          className="text-xl font-black text-slate-900"
        />
      </div>
      {children}
    </Card>
  )
}
