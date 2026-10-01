export interface Envelope<T> {
  status: number;
  error: boolean;
  data?: T;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function unwrap<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: Envelope<T> | null = null;
  try {
    body = text ? (JSON.parse(text) as Envelope<T>) : null;
  } catch {
    body = null;
  }
  if (!res.ok || !body || body.error) {
    throw new ApiError(res.status, body?.message || res.statusText || "Something went wrong");
  }
  return body.data as T;
}
