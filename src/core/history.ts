export const HISTORY_LIMIT = 50;

/**
 * Undo/redo stack that keeps up to `limit` past states (FR-8). Each pushed
 * state is one history step (a shape add or a clear-all). Only vector states
 * are stored, never raster snapshots (non-functional requirement).
 */
export class HistoryStack<T> {
  private past: T[] = [];
  private present: T;
  private future: T[] = [];
  private readonly limit: number;

  constructor(initial: T, limit: number = HISTORY_LIMIT) {
    this.present = initial;
    this.limit = limit;
  }

  /** The current state. */
  current(): T {
    return this.present;
  }

  /** Push a new state, dropping the oldest step past the limit and clearing redo. */
  push(next: T): void {
    this.past.push(this.present);
    if (this.past.length > this.limit) {
      this.past.shift();
    }
    this.present = next;
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Step back one state. Returns the new current state, or null if none. */
  undo(): T | null {
    const previous = this.past.pop();
    if (previous === undefined) return null;
    this.future.unshift(this.present);
    this.present = previous;
    return this.present;
  }

  /** Step forward one state. Returns the new current state, or null if none. */
  redo(): T | null {
    const next = this.future.shift();
    if (next === undefined) return null;
    this.past.push(this.present);
    if (this.past.length > this.limit) {
      this.past.shift();
    }
    this.present = next;
    return this.present;
  }
}
