import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fetchProducts } from './api/endpoints'

vi.mock('./api/endpoints', async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    fetchProducts: vi.fn(),
  }
})

const menuPayload = {
  data: [
    {
      id: 1,
      name: 'Test Burger',
      description: 'A burger used by the smoke test.',
      price_cents: 850,
      image_url: null,
      is_available: true,
    },
  ],
  meta: { currency: 'USD' },
}

describe('App routing', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    vi.mocked(fetchProducts).mockResolvedValue(menuPayload)
  })

  it('renders the storefront menu from the API', async () => {
    render(<App />)

    expect(await screen.findByText('Test Burger')).toBeInTheDocument()
    expect(screen.getByText('1 item available')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cart/i })).toBeInTheDocument()
  })

  it('redirects unauthenticated admin visits to the login page', async () => {
    window.history.pushState({}, '', '/admin/products')

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Keyosk Admin' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })
})
