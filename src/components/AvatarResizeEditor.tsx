import { useState } from "react";
import { Check, X } from "lucide-react";
import { clampAvatarScale, resizeAvatarDataUrl } from "../avatarImage";

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
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true); setError("");
    try {
      await onSave(await resizeAvatarDataUrl(image, scale));
    } catch (err) {
      setError((err as Error).message || "The profile photo could not be resized.");
      setBusy(false);
    }
  };

  return (
    <div className="avatar-resize-editor" role="group" aria-label="Resize profile photo">
      <div className="avatar-resize-preview" aria-hidden="true">
        <img src={image} alt="" style={{ transform: `scale(${scale})` }} />
      </div>
      <label>
        <span>Photo size</span>
        <input
          type="range"
          min="1"
          max="2.5"
          step="0.05"
          value={scale}
          onChange={e => setScale(clampAvatarScale(Number(e.target.value)))}
          aria-label="Profile photo size"
        />
      </label>
      {error && <em>{error}</em>}
      <div className="avatar-resize-actions">
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}><X size={15} />Cancel</button>
        <button type="button" className="primary" onClick={save} disabled={busy}><Check size={15} />{busy ? "Saving..." : `Use for ${name || "profile"}`}</button>
      </div>
    </div>
  );
}
