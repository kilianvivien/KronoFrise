export interface CanvasPointer { id: number; type: string; x: number; y: number }

/** A pen owns its stroke; touch contacts cannot replace it or create a pinch. */
export class CanvasPointers {
  private points = new Map<number, CanvasPointer>();
  down(point: CanvasPointer): 'start' | 'pinch' | 'ignore' {
    const active = [...this.points.values()];
    if (active.some((pointer) => pointer.type === 'pen')) return 'ignore';
    if (point.type === 'pen') {
      this.points.clear();
      this.points.set(point.id, point);
      return 'start';
    }
    if (active.length && (point.type !== 'touch' || active.some((pointer) => pointer.type !== 'touch') || active.length >= 2)) return 'ignore';
    this.points.set(point.id, point);
    return this.points.size === 2 ? 'pinch' : 'start';
  }
  move(point: CanvasPointer): void { if (this.points.has(point.id)) this.points.set(point.id, point); }
  has(id: number): boolean { return this.points.has(id); }
  up(id: number): void { this.points.delete(id); }
  clear(): void { this.points.clear(); }
  pair(): { x: number; y: number; distance: number } | null {
    const [a, b] = [...this.points.values()];
    if (!a || !b) return null;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
  }
}

export function pinchZoom(initialZoom: number, initialDistance: number, distance: number): number {
  return Math.max(1, Math.min(5000, initialZoom * distance / Math.max(1, initialDistance)));
}
