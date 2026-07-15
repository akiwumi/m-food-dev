import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, X } from "lucide-react";
import {
  AVATAR_PREVIEW_SIZE,
  avatarDrawRect,
  clampAvatarTransform,
  resizeAvatarDataUrl,
  type AvatarImageSize,
  type AvatarTransform,
} from "../avatarImage";

type Point = { x: number; y: number };
type GestureStart = {
  transform: AvatarTransform;
  points: Point[];
  distance: number;
  midpoint: Point;
};

const INITIAL_TRANSFORM: AvatarTransform = { scale: 1, x: 0, y: 0 };

function midpoint(points: Point[]): Point {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
}

function distance(points: Point[]): number {
  if (points.length < 2) return 1;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1;
}

export function AvatarResizeEditor({
  image,
  name,
  onCancel,
  onSave,
}: {
  image: string;
  name: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void | Promise<void>;
}) {
  const [transform, setTransform] = useState<AvatarTransform>(INITIAL_TRANSFORM);
  const [imageSize, setImageSize] = useState<AvatarImageSize | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<GestureStart | null>(null);
  const transformRef = useRef(transform);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const applyTransform = (next: AvatarTransform) => {
    transformRef.current = next;
    setTransform(next);
  };

  const startGesture = () => {
    const points = [...pointers.current.values()].slice(0, 2);
    gesture.current = { transform: transformRef.current, points, distance: distance(points), midpoint: midpoint(points) };
  };

  const moveGesture = (points: Point[]) => {
    if (!gesture.current || !imageSize || points.length === 0) return;
    const start = gesture.current;
    if (points.length >= 2 && start.points.length >= 2) {
      const nextMidpoint = midpoint(points);
      applyTransform(clampAvatarTransform({
        scale: start.transform.scale * (distance(points) / start.distance),
        x: start.transform.x + nextMidpoint.x - start.midpoint.x,
        y: start.transform.y + nextMidpoint.y - start.midpoint.y,
      }, imageSize, AVATAR_PREVIEW_SIZE));
      return;
    }

    const startPoint = start.points[0];
    if (!startPoint) return;
    applyTransform(clampAvatarTransform({
      ...start.transform,
      x: start.transform.x + points[0].x - startPoint.x,
      y: start.transform.y + points[0].y - startPoint.y,
    }, imageSize, AVATAR_PREVIEW_SIZE));
  };

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    startGesture();
  };

  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moveGesture([...pointers.current.values()].slice(0, 2));
  };

  const pointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointers.current.delete(event.pointerId);
    if (pointers.current.size) startGesture();
    else gesture.current = null;
  };

  const save = async () => {
    setBusy(true); setError("");
    try {
      await onSave(await resizeAvatarDataUrl(image, transform, AVATAR_PREVIEW_SIZE));
    } catch (err) {
      setError((err as Error).message || "The profile photo could not be resized.");
      setBusy(false);
    }
  };

  const rect = imageSize ? avatarDrawRect(imageSize, transform, AVATAR_PREVIEW_SIZE) : { x: 0, y: 0, width: AVATAR_PREVIEW_SIZE, height: AVATAR_PREVIEW_SIZE };

  return (
    <div className="avatar-resize-editor" role="group" aria-label="Edit profile photo">
      <div
        className="avatar-resize-preview"
        role="application"
        aria-label="Drag or pinch profile photo"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
      >
        <img
          src={image}
          alt=""
          draggable={false}
          onLoad={event => {
            const size = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight };
            setImageSize(size);
            setTransform(current => {
              const next = clampAvatarTransform(current, size, AVATAR_PREVIEW_SIZE);
              transformRef.current = next;
              return next;
            });
          }}
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        />
      </div>
      {error && <em>{error}</em>}
      <div className="avatar-resize-actions">
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}><X size={15} />Cancel</button>
        <button type="button" className="primary" onClick={save} disabled={busy}><Check size={15} />{busy ? "Saving..." : `Use for ${name || "profile"}`}</button>
      </div>
    </div>
  );
}
