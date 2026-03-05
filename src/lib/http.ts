export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ success: true, data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return Response.json(
    {
      success: false,
      error: { message, details },
    },
    { status },
  );
}
