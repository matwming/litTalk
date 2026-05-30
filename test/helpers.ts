import sinon from 'sinon';

/**
 * Build a Response-like object for fetch stubs.
 */
export function fakeResponse(
  body: unknown,
  init: {status?: number; statusText?: string; ok?: boolean} = {}
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: init.statusText ?? '',
    json: async () => body,
    text: async () =>
      typeof body === 'string' ? body : JSON.stringify(body),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone() {
      return this as Response;
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    bytes: async () => new Uint8Array(0),
  } as unknown as Response;
}

/**
 * Returns a fetch stub plus an inspector. Replaces globalThis.fetch.
 * Caller is responsible for restoring (use `restoreFetch` or sinon sandbox).
 */
export function stubFetch(
  responder: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>
): sinon.SinonStub {
  const stub = sinon.stub(globalThis, 'fetch');
  stub.callsFake(async (input, init) => responder(input, init));
  return stub;
}

export function restoreAll(): void {
  sinon.restore();
}

/**
 * Wait for an element's `updateComplete` and any microtasks the test setup
 * just kicked off (e.g. an awaited fetch chain).
 */
export async function flush(el: {updateComplete: Promise<unknown>}): Promise<void> {
  await el.updateComplete;
  // Allow any chained microtasks to settle.
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

/**
 * Reset persistent browser storage between tests so state never leaks.
 */
export function clearStorage(): void {
  localStorage.clear();
  sessionStorage.clear();
}
