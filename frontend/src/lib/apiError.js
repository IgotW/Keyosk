const statusMessages = {
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  422: 'Please check the form and try again.',
  429: 'Too many attempts. Please try again later.',
  500: 'Something went wrong on the server. Please try again.',
}

export function toApiError(error) {
  if (error?.response) {
    const { status, data } = error.response
    const errors = data?.errors ?? {}
    const firstFieldError = Object.values(errors).flat().find(Boolean)

    return {
      status,
      message:
        firstFieldError ||
        data?.message ||
        statusMessages[status] ||
        'The request could not be completed.',
      errors,
      isNetworkError: false,
    }
  }

  if (error?.code === 'ECONNABORTED') {
    return {
      status: 0,
      message: 'The request timed out. Please try again.',
      errors: {},
      isNetworkError: true,
    }
  }

  return {
    status: 0,
    message:
      'Unable to reach the server. Check your connection and try again.',
    errors: {},
    isNetworkError: true,
  }
}
