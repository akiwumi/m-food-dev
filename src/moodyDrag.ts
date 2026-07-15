export type MoodyDragPoint = { x: number; y: number };
export type MoodyDragRect = { left: number; top: number; right: number; bottom: number };
export type MoodyDragViewport = { width: number; height: number };

export function nextMoodyDragOffset({
  startOffset,
  startPointer,
  pointer,
  startRect,
  viewport,
  margin = 8,
}: {
  startOffset: MoodyDragPoint;
  startPointer: MoodyDragPoint;
  pointer: MoodyDragPoint;
  startRect: MoodyDragRect;
  viewport: MoodyDragViewport;
  margin?: number;
}): MoodyDragPoint {
  const desiredX = startOffset.x + pointer.x - startPointer.x;
  const desiredY = startOffset.y + pointer.y - startPointer.y;
  const minX = margin - startRect.left + startOffset.x;
  const maxX = viewport.width - margin - startRect.right + startOffset.x;
  const minY = margin - startRect.top + startOffset.y;
  const maxY = viewport.height - margin - startRect.bottom + startOffset.y;

  return {
    x: Math.min(maxX, Math.max(minX, desiredX)),
    y: Math.min(maxY, Math.max(minY, desiredY)),
  };
}
