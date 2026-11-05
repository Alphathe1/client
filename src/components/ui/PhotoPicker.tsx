import { useId, useState } from "react";
import { ImageSquare, Plus, X } from "@phosphor-icons/react";
import { fileToDataUrl } from "../../lib/image";

interface PhotoPickerProps {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}

/** Pick, compress and preview photos; values are data URLs */
export function PhotoPicker({ label, value, onChange, max = 4 }: PhotoPickerProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    try {
      const picked = await Promise.all(Array.from(files).slice(0, max - value.length).map((f) => fileToDataUrl(f)));
      onChange([...value, ...picked]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text">{label}</span>
      <div className="flex flex-wrap gap-4">
        {value.map((src, i) => (
          <div key={i} className="group relative size-24 overflow-hidden rounded-xl border border-line">
            <img src={src} alt={`${label} ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white hover:bg-danger"
              aria-label={`Retirer la photo ${i + 1}`}
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label
            htmlFor={id}
            className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-surface-2 text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {value.length ? <Plus size={22} /> : <ImageSquare size={22} />}
            <span className="text-xs">Ajouter</span>
          </label>
        )}
        <input id={id} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
