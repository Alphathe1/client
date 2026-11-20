import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type Dispatch, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ImageSquare, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { Button, IconButton } from "../../../components/ui/Button";
import { Input, Textarea } from "../../../components/ui/Field";
import { Skeleton } from "../../../components/ui/Display";
import { Switch } from "../../../components/ui/Switch";
import { FEATURE_ICON, FEATURE_ICON_LABEL } from "../../../components/site/featureIcons";
import { api, API_BASE, ApiError } from "../../../lib/api";
import { fileToDataUrl } from "../../../lib/image";
import type { DraftAction } from "../../../lib/site/draft";
import {
  counterTone,
  dataUrlBytes,
  fieldId,
  getIn,
  IMAGE_MAX_BYTES,
  IMAGE_MESSAGES,
  isAcceptedImageType,
  LIST_LIMITS,
  uploadErrorMessage,
  type ListPath,
} from "../../../lib/site/editor";
import { mediaSrc } from "../../../lib/site/links";
import { FEATURE_ICONS, type FeatureIcon, type SiteContent } from "../../../lib/site/types";

export interface EditorFormValue {
  draft: SiteContent;
  dispatch: Dispatch<DraftAction>;
  /** message under the control of `path`, once it was left or a publication was attempted */
  errorAt: (path: string) => string | undefined;
  /** marks `path` as visited (its message may now show) */
  touch: (path: string) => void;
  /** publication in progress: fields read-only, uploads and list edits blocked */
  busy: boolean;
}

export const EditorFormContext = createContext<EditorFormValue | null>(null);

export function useEditorForm(): EditorFormValue {
  const ctx = useContext(EditorFormContext);
  if (!ctx) throw new Error("useEditorForm must be used inside EditorFormContext");
  return ctx;
}

/** Polite announcements (list moves, removals, additions) go to the one live region BlockForm renders */
export const AnnounceContext = createContext<(message: string) => void>(() => {});

const TONE = { normal: "text-subtle", near: "text-warning", over: "font-medium text-danger" } as const;

/** "12/90" on the label row; turns warning near the limit and danger past it (the limit itself is in the hint, for screen readers) */
export function CharCounter({ length, max }: { length: number; max: number }) {
  return (
    <span aria-hidden className={`font-mono text-xs tabular-nums transition-colors duration-150 ease-out ${TONE[counterTone(length, max)]}`}>
      {length}/{max}
    </span>
  );
}

interface TextFieldProps {
  path: string;
  label: string;
  /** character limit: shows the counter and says the limit in the hint; omit for links */
  max?: number;
  hint?: string;
  /** a textarea of that many rows; an input otherwise */
  rows?: number;
  required?: boolean;
  type?: "text" | "tel" | "url";
  /** data voice (phone): Geist Mono */
  mono?: boolean;
  placeholder?: string;
}

/** One text field of the draft, by its content path */
export function TextField({ path, label, max, hint, rows, required = true, type = "text", mono = false, placeholder }: TextFieldProps) {
  const { draft, dispatch, errorAt, touch, busy } = useEditorForm();
  const value = String(getIn(draft, path) ?? "");
  const limitHint = max ? `${max} caractères au maximum.` : "";
  const fullHint = [hint, limitHint].filter(Boolean).join(" ") || undefined;
  const shared = {
    id: fieldId(path),
    label,
    value,
    required,
    placeholder,
    readOnly: busy,
    error: errorAt(path),
    hint: fullHint,
    aside: max ? <CharCounter length={value.length} max={max} /> : undefined,
    onBlur: () => touch(path),
  };
  return rows ? (
    <Textarea {...shared} rows={rows} onChange={(e) => dispatch({ type: "set", path, value: e.target.value })} />
  ) : (
    <Input {...shared} type={type} className={mono ? "font-mono" : ""} onChange={(e) => dispatch({ type: "set", path, value: e.target.value })} />
  );
}

export function SwitchField({ path, label, hint }: { path: string; label: string; hint?: string }) {
  const { draft, dispatch, busy } = useEditorForm();
  return <Switch label={label} hint={hint} checked={getIn(draft, path) === true} disabled={busy} onChange={(checked) => dispatch({ type: "set", path, value: checked })} />;
}

const ICON_COLUMNS = 6;
const ICON_STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: ICON_COLUMNS, ArrowUp: -ICON_COLUMNS };

/** The closed list of twelve feature icons as a radio grid: Tab reaches the chosen icon, arrows move the choice */
export function IconPicker({ path, label }: { path: string; label: string }) {
  const { draft, dispatch, errorAt, busy } = useEditorForm();
  const value = getIn(draft, path) as FeatureIcon;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = useId();
  const id = fieldId(path);
  const error = errorAt(path);
  const current = FEATURE_ICONS.indexOf(value);

  const choose = (index: number) => {
    const icon = FEATURE_ICONS[index];
    if (!icon || busy) return;
    dispatch({ type: "set", path, value: icon });
    buttons.current[index]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = ICON_STEPS[e.key];
    if (!step) return;
    e.preventDefault();
    choose((Math.max(current, 0) + step + FEATURE_ICONS.length) % FEATURE_ICONS.length);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p id={labelId} className="text-sm font-medium text-text">
        {label}
      </p>
      <div
        id={id}
        tabIndex={-1}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onKeyDown={onKeyDown}
        className="grid grid-cols-6 gap-1 rounded-sm outline-none"
      >
        {FEATURE_ICONS.map((icon, i) => {
          const Icon = FEATURE_ICON[icon];
          const active = icon === value;
          return (
            <button
              key={icon}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={FEATURE_ICON_LABEL[icon]}
              title={FEATURE_ICON_LABEL[icon]}
              tabIndex={active || (current === -1 && i === 0) ? 0 : -1}
              disabled={busy}
              onClick={() => choose(i)}
              className={`flex h-10 cursor-pointer items-center justify-center rounded-sm border transition-colors duration-100 ease-out disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-11 ${active ? "border-brand bg-brand/8 text-brand" : "border-line text-muted hover:border-line-strong hover:text-text"}`}
            >
              <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden />
            </button>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type UploadState = { status: "idle" } | { status: "uploading" } | { status: "error"; message: string };

/** Checks, compresses and sends an image (POST /site/media); resolves with its /site/media/<id> URL, or null after an error it reports */
export function useImageUpload() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const upload = useCallback(async (file: File): Promise<string | null> => {
    if (!isAcceptedImageType(file.type)) {
      setState({ status: "error", message: IMAGE_MESSAGES.format });
      return null;
    }
    setState({ status: "uploading" });
    let dataUrl: string;
    try {
      dataUrl = await fileToDataUrl(file, 1600, 0.85);
    } catch {
      setState({ status: "error", message: IMAGE_MESSAGES.read });
      return null;
    }
    if (dataUrlBytes(dataUrl) > IMAGE_MAX_BYTES) {
      setState({ status: "error", message: IMAGE_MESSAGES.size });
      return null;
    }
    try {
      const res = await api.post<{ url: string }>("/site/media", { dataUrl });
      setState({ status: "idle" });
      return res.data.url;
    } catch (e) {
      setState({ status: "error", message: uploadErrorMessage(e instanceof ApiError ? e.status : -1, e instanceof Error ? e.message : "") });
      return null;
    }
  }, []);
  return { state, upload };
}

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

interface ImageFieldProps {
  path: string;
  label: string;
  hint?: string;
  /** salon photos: "Retirer" removes the slot (an empty salon photo is invalid); otherwise it empties the field */
  onRemove?: () => void;
}

/** Image of the draft (spec §4): thumbnail with Remplacer / Retirer, dashed drop zone when empty, skeleton while sending,
 *  message under the field on refusal — the previous image stays, since the value only changes on success.
 *  Focus: the button that started an upload or a removal gets focus back under the same id once the field has settled
 *  (its own button unmounts meanwhile); a drop never navigates the browser away, whatever the field holds. */
export function ImageField({ path, label, hint, onRemove }: ImageFieldProps) {
  const { draft, dispatch, errorAt, busy } = useEditorForm();
  const { state, upload } = useImageUpload();
  const [over, setOver] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  const id = fieldId(path);
  const value = String(getIn(draft, path) ?? "");
  const src = mediaSrc(value, API_BASE);
  const uploading = state.status === "uploading";
  const message = state.status === "error" ? state.message : errorAt(path);
  const described = message ? `${id}-err` : hint ? `${id}-hint` : undefined;

  useEffect(() => {
    if (!restoreFocus.current || uploading) return;
    restoreFocus.current = false;
    document.getElementById(id)?.focus();
  }, [uploading, value, id]);

  const pick = async (file: File | undefined) => {
    if (!file || busy || uploading) return;
    const url = await upload(file);
    if (url) dispatch({ type: "set", path, value: url });
  };
  const chooseFile = () => {
    restoreFocus.current = true;
    input.current?.click();
  };
  const removeImage = () => {
    if (onRemove) return onRemove();
    restoreFocus.current = true;
    dispatch({ type: "set", path, value: "" });
  };

  return (
    <div
      data-field={path}
      className="flex flex-col gap-1.5"
      onDragOver={(e) => {
        // always taken over: a file dropped anywhere on the field must not open in the browser
        e.preventDefault();
        if (hasFiles(e) && !value && !busy && !uploading) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!value) void pick(e.dataTransfer.files[0]);
      }}
    >
      <p id={`${id}-label`} className="text-sm font-medium text-text">
        {label}
      </p>
      {uploading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="aspect-4/3 w-32 shrink-0" />
          <span role="status" className="text-sm text-muted">
            Envoi…
          </span>
        </div>
      ) : value ? (
        <div className="flex flex-wrap items-center gap-4">
          {!src || broken === src ? (
            <div className="flex aspect-4/3 w-32 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 px-2 text-center text-xs text-subtle">Aperçu indisponible</div>
          ) : (
            <img src={src} alt="" onError={() => setBroken(src)} className="aspect-4/3 w-32 shrink-0 rounded-md border border-line object-cover" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button id={id} variant="secondary" size="sm" icon={<UploadSimple size={16} aria-hidden />} disabled={busy} aria-describedby={`${id}-label ${described ?? ""}`.trim()} onClick={chooseFile}>
              Remplacer
            </Button>
            <Button variant="ghost" size="sm" icon={<Trash size={16} aria-hidden />} disabled={busy} aria-describedby={`${id}-label`} onClick={removeImage}>
              Retirer
            </Button>
          </div>
        </div>
      ) : (
        <div className={`flex flex-col items-center gap-3 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors duration-100 ease-out ${over ? "border-brand bg-brand/8" : "border-line-strong"}`}>
          <ImageSquare size={28} className="text-subtle" aria-hidden />
          <p className="text-sm text-muted">Glissez une image ici, ou</p>
          <Button id={id} variant="secondary" size="sm" disabled={busy} aria-describedby={`${id}-label ${described ?? ""}`.trim()} onClick={chooseFile}>
            Choisir une image
          </Button>
          <p className="text-xs text-subtle">JPEG, PNG ou WebP, compressée avant l'envoi.</p>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {message ? (
        <p id={`${id}-err`} role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface ListContextValue {
  path: ListPath;
  /** singular of the items, for announcements: "Atout", "Point", "Carte", "Photo" */
  noun: string;
  busy: boolean;
  move: (index: number, delta: -1 | 1) => void;
  remove: (index: number) => void;
  add: (item: unknown) => void;
}

const ListContext = createContext<ListContextValue | null>(null);

function useListCtx(): ListContextValue {
  const ctx = useContext(ListContext);
  if (!ctx) throw new Error("List controls must be used inside ListSection");
  return ctx;
}

/** Focuses the element with this id, or the first field inside it when it is an item's body; false when it cannot take focus */
function focusById(id: string): boolean {
  const el = document.getElementById(id) as HTMLElement | null;
  if (!el || (el as HTMLButtonElement).disabled) return false;
  const body = el.querySelector(":scope > [data-item-body]");
  const target = body?.querySelector<HTMLElement>("[role='radio'], input:not([type='file']), textarea, button:not(:disabled)") ?? el;
  target.focus();
  return true;
}

/** "Ajouter une photo" for the salon: uploads first, then adds the slot, so a salon photo is never empty.
 *  Focus goes to the new photo's field, or stays on this button while it uploads (it is re-enabled, not removed). */
export function AddImageButton({ path, label }: { path: ListPath; label: string }) {
  const { draft, busy } = useEditorForm();
  const { add } = useListCtx();
  const { state, upload } = useImageUpload();
  const input = useRef<HTMLInputElement>(null);
  const count = (getIn(draft, path) as unknown[]).length;
  const full = count >= LIST_LIMITS[path].max;
  return (
    <div data-add-image={path} className="flex flex-col gap-1.5">
      <div>
        <Button
          id={`${fieldId(path)}-add`}
          variant="secondary"
          size="sm"
          icon={<Plus size={16} aria-hidden />}
          loading={state.status === "uploading"}
          disabled={busy || full}
          onClick={() => input.current?.click()}
        >
          {state.status === "uploading" ? "Envoi…" : label}
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        tabIndex={-1}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          const url = file ? await upload(file) : null;
          if (url) add(url);
        }}
      />
      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
    </div>
  );
}

interface ListItemProps {
  path: ListPath;
  index: number;
  count: number;
  /** "Atout 2", "Photo 1" */
  title: string;
  children: ReactNode;
}

/** One item of a list (features, salon points, highlights) with its move and delete buttons (ids: `<item>-up`, `-down`, `-del`) */
export function ListItem({ path, index, count, title, children }: ListItemProps) {
  const { busy, move, remove } = useListCtx();
  const titleId = useId();
  const itemId = fieldId(`${path}.${index}`);
  const atMin = count <= LIST_LIMITS[path].min;
  return (
    <div id={itemId} tabIndex={-1} role="group" aria-labelledby={titleId} className="flex flex-col gap-4 rounded-md border border-line p-4 outline-none">
      <div className="flex items-center justify-between gap-3">
        <h3 id={titleId} className="text-sm font-semibold text-text">
          {title}
        </h3>
        <div className="flex items-center gap-1">
          <IconButton id={`${itemId}-up`} label={`Monter : ${title}`} disabled={busy || index === 0} onClick={() => move(index, -1)}>
            <ArrowUp size={18} aria-hidden />
          </IconButton>
          <IconButton id={`${itemId}-down`} label={`Descendre : ${title}`} disabled={busy || index === count - 1} onClick={() => move(index, 1)}>
            <ArrowDown size={18} aria-hidden />
          </IconButton>
          <IconButton id={`${itemId}-del`} label={atMin ? `${title} : minimum atteint` : `Supprimer : ${title}`} disabled={busy || atMin} onClick={() => remove(index)}>
            <Trash size={18} aria-hidden />
          </IconButton>
        </div>
      </div>
      <div data-item-body className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

/** One salon photo slot. Its "Retirer" removes the slot; focus then goes to the next photo, else the previous one, else "Ajouter une photo". */
export function ListImageSlot({ path, index, label }: { path: ListPath; index: number; label: string }) {
  const { remove } = useListCtx();
  return <ImageField path={`${path}.${index}`} label={label} onRemove={() => remove(index)} />;
}

interface ListSectionProps {
  path: ListPath;
  /** singular of the items, for announcements */
  noun: string;
  /** "De 2 à 4 atouts." */
  rule: string;
  /** omit for the salon photos, which add through AddImageButton */
  add?: { label: string; item: () => unknown };
  children: ReactNode;
}

/** A list with its size rule, its list-level error and its add button; Publish focuses it for a list-size issue.
 *  Focus after an action: a move follows the moved item (its same control, the other one at an edge); a removal goes to
 *  the next item, else the previous one, else the add button; an addition goes to the new item's first field. */
export function ListSection({ path, noun, rule, add, children }: ListSectionProps) {
  const { draft, dispatch, errorAt, busy } = useEditorForm();
  const announce = useContext(AnnounceContext);
  const id = fieldId(path);
  const itemId = (i: number) => fieldId(`${path}.${i}`);
  const count = (getIn(draft, path) as unknown[]).length;
  const error = errorAt(path);
  const pending = useRef<string[] | null>(null);

  // runs after each render: applies the focus asked for by the last action, once the list shows its new state
  useEffect(() => {
    const ids = pending.current;
    if (!ids) return;
    pending.current = null;
    ids.some((target) => focusById(target));
  });

  const move = (index: number, delta: -1 | 1) => {
    const to = index + delta;
    const first = delta < 0 ? "up" : "down";
    const other = delta < 0 ? "down" : "up";
    pending.current = [`${itemId(to)}-${first}`, `${itemId(to)}-${other}`];
    dispatch({ type: "listMove", path, index, delta });
    announce(`${noun} déplacé en position ${to + 1}`);
  };
  const remove = (index: number) => {
    const next = index < count - 1 ? index : index - 1;
    pending.current = next >= 0 ? [itemId(next)] : [`${id}-add`];
    dispatch({ type: "listRemove", path, index });
    announce(`${noun} supprimé`);
  };
  const addItem = (item: unknown) => {
    pending.current = [itemId(count)];
    dispatch({ type: "listAdd", path, item });
    announce(`${noun} ajouté`);
  };

  return (
    <ListContext.Provider value={{ path, noun, busy, move, remove, add: addItem }}>
      <div id={id} tabIndex={-1} aria-describedby={error ? `${id}-err` : undefined} className="flex flex-col gap-4 outline-none">
        {children}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-subtle">{rule}</p>
          {add && (
            <Button id={`${id}-add`} variant="secondary" size="sm" icon={<Plus size={16} aria-hidden />} disabled={busy || count >= LIST_LIMITS[path].max} onClick={() => addItem(add.item())}>
              {add.label}
            </Button>
          )}
        </div>
        {error && (
          <p id={`${id}-err`} role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </ListContext.Provider>
  );
}
