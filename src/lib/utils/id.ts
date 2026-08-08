let counter = 0;

/** Generates a reasonably unique id. Kept outside component/render scope so it isn't flagged as an impure call during render. */
export function generateId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
