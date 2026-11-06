import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteProduct,
  fetchAdminProducts,
  updateProduct,
} from '../../api/endpoints'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { Price } from '../../components/Price'
import { toApiError } from '../../lib/apiError'

export function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setProducts(await fetchAdminProducts())
    } catch (requestError) {
      setError(toApiError(requestError).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const toggleAvailability = async (product) => {
    setBusyId(product.id)
    setActionError(null)

    try {
      const updated = await updateProduct(product.id, {
        is_available: !product.is_available,
      })
      setProducts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (requestError) {
      setActionError(toApiError(requestError).message)
    } finally {
      setBusyId(null)
    }
  }

  const removeProduct = async (product) => {
    if (
      !window.confirm(
        `Delete ${product.name}? Historical order items will keep their snapshots.`,
      )
    ) {
      return
    }

    setBusyId(product.id)
    setActionError(null)

    try {
      await deleteProduct(product.id)
      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      )
    } catch (requestError) {
      setActionError(toApiError(requestError).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-orange-600 uppercase">
            Catalogue
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
            Products
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage what customers can order from the storefront.
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500"
        >
          New product
        </Link>
      </div>

      {actionError ? (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {actionError}
        </p>
      ) : null}

      {loading ? <LoadingState label="Loading products..." /> : null}

      {!loading && error ? (
        <ErrorState message={error} onRetry={loadProducts} />
      ) : null}

      {!loading && !error && products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Create your first product to start taking orders."
          action={
            <Link
              to="/admin/products/new"
              className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Create product
            </Link>
          }
        />
      ) : null}

      {!loading && !error && products.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="px-4 py-3 font-bold">Product</th>
                  <th className="px-4 py-3 font-bold">Price</th>
                  <th className="px-4 py-3 font-bold">Availability</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{product.name}</p>
                      <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-slate-500">
                        {product.description || 'No description'}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      <Price cents={product.price_cents} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={product.is_available ? 'success' : 'neutral'}
                        >
                          {product.is_available ? 'Available' : 'Hidden'}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => toggleAvailability(product)}
                          disabled={busyId === product.id}
                          className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-50"
                        >
                          {product.is_available ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeProduct(product)}
                          disabled={busyId === product.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
