async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, init)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
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
