import { formatMoney } from '../lib/money'

export function Price({ cents, currency, className = '' }) {
  return <span className={className}>{formatMoney(cents, currency)}</span>
}
