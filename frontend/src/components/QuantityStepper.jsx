export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label = 'Quantity',
}) {
  return (
    <div
      className="inline-flex items-center rounded-xl border border-slate-200 bg-white shadow-sm"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-l-xl text-lg font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        -
      </button>
      <span className="min-w-9 text-center text-sm font-bold text-slate-900">
        {value}
      </span>
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-r-xl text-lg font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
