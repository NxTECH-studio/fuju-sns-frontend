// URL validation helpers. Anything rendered into `href`, CSS `url(...)`,
// or `src` from user / remote input goes through here.

export function isSafeHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function safeCssUrl(value: string | null | undefined): string | null {
  if (!isSafeHttpUrl(value)) return null;
  // Escape characters that could break out of the CSS `url("...")` context.
  const escaped = value!.replace(/["\\\n\r]/g, "");
  return `url("${escaped}")`;
}
