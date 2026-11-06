import { Button } from './ui/Button'
import { Price } from './Price'

export function ProductCard({ product, onAdd, quantityInCart = 0 }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-5xl font-black text-orange-300">
            {product.name.charAt(0)}
          </div>
        )}
        {quantityInCart > 0 ? (
          <span className="absolute top-3 right-3 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs font-bold text-white">
            {quantityInCart} in cart
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">
            {product.name}
          </h3>
          <Price
            cents={product.price_cents}
            className="shrink-0 text-base font-black text-orange-700"
          />
        </div>
        <p className="line-clamp-2 text-sm text-slate-500">
          {product.description || 'Freshly prepared to order.'}
        </p>
        <div className="mt-auto pt-3">
          <Button className="w-full" onClick={() => onAdd(product)}>
            Add to cart
          </Button>
        </div>
      </div>
    </article>
  )
}
