export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown) {
    super(`HTTP ${status}`)
    this.status = status
    this.detail = detail
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, init)
  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    const detail = contentType !== null && contentType.includes('application/json')
      ? ((await response.json()) as { detail: unknown }).detail
      : await response.text()
    throw new ApiError(response.status, detail)
  }
  return response
}

export async function baseFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init)
  return response.json() as Promise<T>
}

export async function baseFetchObjectUrl(path: string): Promise<string> {
  const blob = await (await request(path)).blob()
  return URL.createObjectURL(blob)
}
