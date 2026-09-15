let counter = 0;

/** Collision-safe enough for a local-only task store. */
export function generateId(prefix: string): string {
  counter = (counter + 1) % 1000;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}_${counter}`;
}
