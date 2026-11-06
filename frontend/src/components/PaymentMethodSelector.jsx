const options = [
  {
    value: 'cash',
    title: 'Pay at counter',
    description: 'Reserve your order now and pay cash when you collect it.',
    icon: 'Cash',
  },
  {
    value: 'online',
    title: 'Online payment (mock)',
    description: 'Simulates a successful payment. No real card is charged.',
    icon: 'Mock',
  },
]

export function PaymentMethodSelector({ value, onChange }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-bold text-slate-900">
        Payment method
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value

          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                selected
                  ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-black tracking-wider text-orange-700 uppercase ring-1 ring-orange-200">
                {option.icon}
              </span>
              <span className="mt-2 block font-bold text-slate-900">
                {option.title}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                {option.description}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
