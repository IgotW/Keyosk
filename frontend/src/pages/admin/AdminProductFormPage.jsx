import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createProduct,
  fetchAdminProduct,
  updateProduct,
} from '../../api/endpoints'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/States'
import { Textarea } from '../../components/ui/Textarea'
import { toApiError } from '../../lib/apiError'
import { centsToDollars, dollarsToCents } from '../../lib/money'

export function AdminProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_available: true,
  })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!isEdit) {
      return undefined
    }

    let active = true

    fetchAdminProduct(id)
      .then((product) => {
        if (!active) {
          return
        }

        setForm({
          name: product.name,
          description: product.description ?? '',
          price: centsToDollars(product.price_cents),
          image_url: product.image_url ?? '',
          is_available: product.is_available,
        })
      })
      .catch((requestError) => {
        if (active) {
          setError(toApiError(requestError).message)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [id, isEdit])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFieldErrors({})
    setError(null)

    const priceCents = dollarsToCents(form.price)

    if (priceCents === null) {
      setFieldErrors({
        price: 'Enter a valid price with up to two decimal places.',
      })

      return
    }

    if (!form.name.trim()) {
      setFieldErrors({ name: 'Enter a product name.' })

      return
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_cents: priceCents,
      image_url: form.image_url.trim() || null,
      is_available: form.is_available,
    }

    setSaving(true)

    try {
      if (isEdit) {
        await updateProduct(id, payload)
      } else {
        await createProduct(payload)
      }

      navigate('/admin/products')
    } catch (requestError) {
      const apiError = toApiError(requestError)
      setError(apiError.message)
      setFieldErrors(apiError.errors)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingState label="Loading product..." />
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-black tracking-[0.2em] text-orange-600 uppercase">
          Catalogue
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
          {isEdit ? 'Edit product' : 'New product'}
        </h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <Input
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={fieldErrors.name?.[0] || fieldErrors.name}
            maxLength={140}
            required
          />

          <Textarea
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            error={fieldErrors.description?.[0] || fieldErrors.description}
            maxLength={2000}
            rows={3}
          />

          <Input
            label="Price"
            name="price"
            inputMode="decimal"
            placeholder="8.50"
            value={form.price}
            onChange={handleChange}
            error={fieldErrors.price_cents?.[0] || fieldErrors.price}
            required
          />

          <Input
            label="Image URL (optional)"
            name="image_url"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={form.image_url}
            onChange={handleChange}
            error={fieldErrors.image_url?.[0] || fieldErrors.image_url}
          />

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <input
              type="checkbox"
              name="is_available"
              checked={form.is_available}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-semibold text-slate-700">
              Visible on the storefront
            </span>
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" size="lg" disabled={saving}>
              {saving
                ? 'Saving...'
                : isEdit
                  ? 'Save changes'
                  : 'Create product'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/admin/products')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
