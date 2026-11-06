import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchReceipt } from '../api/endpoints'
import { Badge } from '../components/ui/Badge'
import {
  orderStatusTone,
  paymentStatusTone,
} from '../components/ui/badgeTones'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/States'
import { toApiError } from '../lib/apiError'
import { formatMoney } from '../lib/money'

export function ReceiptPage() {
  const { token } = useParams()
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadReceipt = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setReceipt(await fetchReceipt(token))
    } catch (requestError) {
      setError(toApiError(requestError).message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadReceipt()
  }, [loadReceipt])

  if (loading) {
    return <LoadingState label="Loading your receipt..." />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState message={error} onRetry={loadReceipt} />
        <p className="text-center text-sm">
          <Link to="/" className="font-semibold text-orange-700">
            Back to the menu
          </Link>
        </p>
      </div>
    )
  }

  const createdAt = new Date(receipt.created_at).toLocaleString()
  const paidAt = receipt.paid_at
    ? new Date(receipt.paid_at).toLocaleString()
    : null
  const paymentMessage =
    receipt.payment_status === 'paid'
      ? receipt.payment_method === 'online'
        ? 'Paid online (mock).'
        : 'Paid at the counter.'
      : 'Payment due at the counter. Please show this receipt when you collect your order.'

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          &larr; Back to the menu
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          Print receipt
        </Button>
      </div>

      <Card className="print-area overflow-hidden">
        <div className="bg-slate-950 p-6 text-white sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.25em] text-orange-400 uppercase">
                Keyosk
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight">
                Receipt
              </h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Receipt number
              </p>
              <p className="mt-1 text-lg font-black text-orange-300">
                {receipt.order_number}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={orderStatusTone(receipt.status)}>
              {receipt.status}
            </Badge>
            <Badge tone={paymentStatusTone(receipt.payment_status)}>
              {receipt.payment_status}
            </Badge>
            <Badge tone="info">
              {receipt.payment_method === 'cash' ? 'Cash' : 'Online (mock)'}
            </Badge>
          </div>

          <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
            {paymentMessage}
          </p>

          <div>
            <h2 className="mb-3 text-sm font-black tracking-wide text-slate-900 uppercase">
              Items
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                    <th className="py-2 font-bold">Item</th>
                    <th className="py-2 text-center font-bold">Qty</th>
                    <th className="py-2 text-right font-bold">Price</th>
                    <th className="py-2 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, index) => (
                    <tr
                      key={`${item.product_name}-${index}`}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">
                        {item.product_name}
                      </td>
                      <td className="py-2.5 text-center text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 text-right text-slate-600">
                        {formatMoney(item.unit_price_cents, receipt.currency)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">
                        {formatMoney(item.line_total_cents, receipt.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="font-black text-slate-900">Total</span>
            <span className="text-2xl font-black text-slate-900">
              {formatMoney(receipt.total_cents, receipt.currency)}
            </span>
          </div>

          <dl className="grid gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:grid-cols-2">
            <div className="flex justify-between gap-3 sm:block">
              <dt className="font-semibold text-slate-600">Order placed</dt>
              <dd>{createdAt}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block sm:text-right">
              <dt className="font-semibold text-slate-600">Payment reference</dt>
              <dd>{receipt.payment_reference || 'Not applicable'}</dd>
            </div>
            {paidAt ? (
              <div className="flex justify-between gap-3 sm:block">
                <dt className="font-semibold text-slate-600">Paid at</dt>
                <dd>{paidAt}</dd>
              </div>
            ) : null}
          </dl>

          <p className="text-center text-[11px] text-slate-400">
            Thank you for ordering with Keyosk. This receipt was generated for
            order {receipt.order_number}.
          </p>
        </div>
      </Card>
    </div>
  )
}
