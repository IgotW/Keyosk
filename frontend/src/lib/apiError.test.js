import { describe, expect, it } from 'vitest'
import { toApiError } from './apiError'

describe('toApiError', () => {
  it('prefers the first field validation message', () => {
    const error = {
      response: {
        status: 422,
        data: {
          message: 'The given data was invalid.',
          errors: {
            name: ['Enter a product name.'],
            price_cents: ['The price must be positive.'],
          },
        },
      },
    }

    expect(toApiError(error)).toEqual({
      status: 422,
      message: 'Enter a product name.',
      errors: error.response.data.errors,
      isNetworkError: false,
    })
  })

  it('falls back to the response message', () => {
    const error = {
      response: {
        status: 400,
        data: { message: 'Bad request.' },
      },
    }

    expect(toApiError(error).message).toBe('Bad request.')
  })

  it('falls back to a status message', () => {
    const error = { response: { status: 429, data: {} } }

    expect(toApiError(error).message).toMatch(/too many/i)
  })

  it('falls back to a generic message for unknown statuses', () => {
    const error = { response: { status: 418, data: {} } }

    expect(toApiError(error)).toEqual({
      status: 418,
      message: 'The request could not be completed.',
      errors: {},
      isNetworkError: false,
    })
  })

  it('handles timeouts', () => {
    const result = toApiError({ code: 'ECONNABORTED' })

    expect(result.isNetworkError).toBe(true)
    expect(result.status).toBe(0)
    expect(result.message).toMatch(/timed out/i)
  })

  it('handles network failures', () => {
    const result = toApiError(new Error('Network Error'))

    expect(result.isNetworkError).toBe(true)
    expect(result.status).toBe(0)
    expect(result.message).toMatch(/unable to reach/i)
  })
})
