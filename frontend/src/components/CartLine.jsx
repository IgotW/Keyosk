import { Price } from './Price'
import { QuantityStepper } from './QuantityStepper'

export function CartLine({ item, onQuantityChange, onRemove }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-xl font-black text-orange-300">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            item.name.charAt(0)
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-bold text-slate-900">{item.name}</h3>
          <Price
            cents={item.price_cents}
            className="text-sm text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <QuantityStepper
          value={item.quantity}
          onChange={(quantity) => onQuantityChange(item.productId, quantity)}
          label={`Quantity for ${item.name}`}
        />
        <Price
          cents={item.price_cents * item.quantity}
          className="w-20 text-right font-bold text-slate-900"
        />
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          className="text-sm font-semibold text-red-600 transition hover:text-red-500"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
