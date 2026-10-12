function isInvalidUrlError(value: unknown): boolean {
  const msg = value instanceof Error ? String(value.message || "") : String(value || "");
  return /invalid url|failed to construct ['"]?url['"]?/i.test(msg);
}

if (typeof window !== "undefined") {
  const NativeURL = window.URL;

  function SafeURL(input: unknown, base?: unknown): URL {
    const primary = String(input ?? "");
    const fallback = String(base ?? "");
    try {
      if (fallback) return new NativeURL(primary, fallback);
      return new NativeURL(primary);
    } catch {
      try {
        if (/^https?:\/\//i.test(primary)) return new NativeURL(primary);
      } catch {
        /* continue */
      }
      const origin = String(window.location?.origin || "https://localhost");
      try {
        return new NativeURL(origin + "/");
      } catch {
        return new NativeURL("https://localhost/");
      }
    }
  }

  SafeURL.prototype = NativeURL.prototype;
  SafeURL.createObjectURL = NativeURL.createObjectURL.bind(NativeURL);
  SafeURL.revokeObjectURL = NativeURL.revokeObjectURL.bind(NativeURL);
  try {
    Object.setPrototypeOf(SafeURL, NativeURL);
  } catch {
    /* ignore */
  }
  window.URL = SafeURL as unknown as typeof URL;

  window.addEventListener(
    "error",
    (event) => {
      const msg = String(event?.message || event?.error?.message || "");
      if (isInvalidUrlError(msg) || isInvalidUrlError(event?.error)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener("unhandledrejection", (event) => {
    if (isInvalidUrlError(event?.reason)) event.preventDefault();
  });
}

export {};
