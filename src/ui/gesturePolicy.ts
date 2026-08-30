export type Tool = 'auto' | 'event' | 'period';
/** Default navigation never creates a document mutation, even for a short drag. */
export function backgroundIntent(tool: Tool, shift: boolean, space: boolean, button: number): 'pan' | 'marquee' | 'create' {
  if (space || button === 1) return 'pan';
  if (shift) return 'marquee';
  return tool === 'auto' ? 'pan' : 'create';
}
export function createsEvent(tool: Tool, moved: boolean): boolean { return tool === 'event' && !moved; }
