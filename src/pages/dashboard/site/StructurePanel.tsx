import { useEffect, useRef, useState, type Dispatch, type DragEvent } from "react";
import { ArrowDown, ArrowUp, DotsSixVertical, Eye, EyeSlash } from "@phosphor-icons/react";
import { IconButton } from "../../../components/ui/Button";
import type { DraftAction } from "../../../lib/site/draft";
import { BLOCK_GROUP_LABELS, BLOCK_LABELS, dropIndex, GENERAL_BLOCKS, PAGE_BLOCKS, type BlockId, type DirtyKey } from "../../../lib/site/editor";
import type { HomeSectionId, SiteContent } from "../../../lib/site/types";

interface StructurePanelProps {
  draft: SiteContent;
  selected: BlockId;
  onSelect: (block: BlockId) => void;
  dispatch: Dispatch<DraftAction>;
  dirty: ReadonlySet<DirtyKey>;
  /** blocks with at least one invalid field */
  invalid: ReadonlySet<BlockId>;
  /** publication in progress: reordering and hiding are blocked */
  busy: boolean;
}

/** Warning dot (changed) and danger dot (invalid), each with its words for screen readers: never colour alone */
function Marks({ dirty, invalid }: { dirty: boolean; invalid: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {invalid && (
        <span className="flex items-center">
          <span aria-hidden className="size-2 rounded-full bg-danger" />
          <span className="sr-only">, à corriger</span>
        </span>
      )}
      {dirty && (
        <span className="flex items-center">
          <span aria-hidden className="size-2 rounded-full bg-warning" />
          <span className="sr-only">, modifié</span>
        </span>
      )}
    </span>
  );
}

const rowBase = "relative flex min-h-10 items-center gap-1 rounded-sm pr-1 transition-colors duration-100 ease-out pointer-coarse:min-h-11";
const rowState = (active: boolean) => (active ? "bg-surface-2 before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-brand" : "hover:bg-surface-2");
const nameButton = "flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm pl-3 text-left text-sm pointer-coarse:min-h-11";

/** Block list (spec §6.5): general blocks, the eight home sections (grip, eye, up/down arrows) and the inner pages */
export function StructurePanel({ draft, selected, onSelect, dispatch, dirty, invalid, busy }: StructurePanelProps) {
  const { order, hidden } = draft.home;
  const [live, setLive] = useState("");
  const [dragging, setDragging] = useState<HomeSectionId | null>(null);
  const [dropBefore, setDropBefore] = useState<number | null>(null);
  const arrows = useRef(new Map<string, HTMLButtonElement | null>());
  /** after an arrow move: keep focus on the moved section's arrow, or its other arrow once at the end */
  const [refocus, setRefocus] = useState<{ id: HomeSectionId; delta: -1 | 1 } | null>(null);

  useEffect(() => {
    if (!refocus) return;
    const index = order.indexOf(refocus.id);
    const atEnd = refocus.delta === -1 ? index === 0 : index === order.length - 1;
    const delta = atEnd ? -refocus.delta : refocus.delta;
    arrows.current.get(`${refocus.id}:${delta}`)?.focus();
    setRefocus(null);
  }, [refocus, order]);

  const move = (id: HomeSectionId, delta: -1 | 1) => {
    const to = order.indexOf(id) + delta;
    dispatch({ type: "move", id, delta });
    setRefocus({ id, delta });
    setLive(`${BLOCK_LABELS[id]} : position ${to + 1} sur ${order.length}.`);
  };

  const toggle = (id: HomeSectionId) => {
    const nowHidden = !hidden.includes(id);
    dispatch({ type: "toggleHidden", id });
    setLive(`${BLOCK_LABELS[id]} : ${nowHidden ? "masquée" : "affichée"}.`);
  };

  const endDrag = () => {
    setDragging(null);
    setDropBefore(null);
  };
  const onDragOver = (e: DragEvent<HTMLLIElement>, index: number) => {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    setDropBefore(e.clientY < rect.top + rect.height / 2 ? index : index + 1);
  };
  const onDrop = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (dragging && dropBefore !== null) {
      const index = dropIndex(order.indexOf(dragging), dropBefore);
      dispatch({ type: "moveTo", id: dragging, index });
      setLive(`${BLOCK_LABELS[dragging]} : position ${index + 1} sur ${order.length}.`);
    }
    endDrag();
  };

  const plainRow = (block: BlockId) => (
    <li key={block} className={`${rowBase} ${rowState(selected === block)}`}>
      <button type="button" aria-current={selected === block || undefined} onClick={() => onSelect(block)} className={`${nameButton} ${selected === block ? "font-medium text-text" : "text-muted hover:text-text"}`}>
        <span className="min-w-0 flex-1 truncate">{BLOCK_LABELS[block]}</span>
        <Marks dirty={dirty.has(block)} invalid={invalid.has(block)} />
      </button>
    </li>
  );

  return (
    <nav aria-label="Structure du site" className="flex flex-col gap-6 p-3">
      <section aria-labelledby="structure-general">
        <h2 id="structure-general" className="px-3 pb-1.5 text-xs font-medium text-subtle">
          {BLOCK_GROUP_LABELS.general}
        </h2>
        <ul className="flex flex-col gap-0.5">{GENERAL_BLOCKS.map(plainRow)}</ul>
      </section>

      <section aria-labelledby="structure-home">
        <h2 id="structure-home" className="flex items-center gap-2 px-3 pb-1.5 text-xs font-medium text-subtle">
          {BLOCK_GROUP_LABELS.home}
          {dirty.has("order") && (
            <span className="flex items-center gap-1 font-normal text-warning">
              <span aria-hidden className="size-1.5 rounded-full bg-warning" />
              ordre modifié
            </span>
          )}
        </h2>
        <ul className="flex flex-col gap-0.5" onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setDropBefore(null)}>
          {order.map((id, index) => {
            const isHidden = hidden.includes(id);
            const active = selected === id;
            return (
              <li
                key={id}
                draggable={!busy}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", id);
                  setDragging(id);
                }}
                onDragOver={(e) => onDragOver(e, index)}
                onDrop={onDrop}
                onDragEnd={endDrag}
                className={`${rowBase} ${rowState(active)} ${dragging === id ? "bg-surface-2 opacity-80 shadow-pop" : ""}`}
              >
                {dropBefore === index && <span aria-hidden className="absolute inset-x-2 -top-0.5 h-0.5 rounded-full bg-brand" />}
                {dropBefore === order.length && index === order.length - 1 && <span aria-hidden className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-brand" />}
                <span aria-hidden title="Glisser pour déplacer" className="flex w-4 shrink-0 cursor-grab justify-center pl-1 text-subtle active:cursor-grabbing">
                  <DotsSixVertical size={16} weight="bold" />
                </span>
                <button type="button" aria-current={active || undefined} onClick={() => onSelect(id)} className={`${nameButton} pl-1 ${isHidden ? "text-subtle" : active ? "font-medium text-text" : "text-muted hover:text-text"}`}>
                  <span title={BLOCK_LABELS[id]} className="min-w-0 flex-1 truncate">{BLOCK_LABELS[id]}</span>
                  {isHidden && <span className="shrink-0 text-xs text-subtle">masquée</span>}
                  <Marks dirty={dirty.has(id)} invalid={invalid.has(id)} />
                </button>
                <IconButton label={isHidden ? `Afficher : ${BLOCK_LABELS[id]}` : `Masquer : ${BLOCK_LABELS[id]}`} disabled={busy} onClick={() => toggle(id)}>
                  {isHidden ? <EyeSlash size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </IconButton>
                <IconButton
                  ref={(el) => {
                    arrows.current.set(`${id}:-1`, el);
                  }}
                  label={`Monter : ${BLOCK_LABELS[id]}`}
                  disabled={busy || index === 0}
                  onClick={() => move(id, -1)}
                >
                  <ArrowUp size={16} aria-hidden />
                </IconButton>
                <IconButton
                  ref={(el) => {
                    arrows.current.set(`${id}:1`, el);
                  }}
                  label={`Descendre : ${BLOCK_LABELS[id]}`}
                  disabled={busy || index === order.length - 1}
                  onClick={() => move(id, 1)}
                >
                  <ArrowDown size={16} aria-hidden />
                </IconButton>
              </li>
            );
          })}
        </ul>
        <p aria-live="polite" className="sr-only">
          {live}
        </p>
      </section>

      <section aria-labelledby="structure-pages">
        <h2 id="structure-pages" className="px-3 pb-1.5 text-xs font-medium text-subtle">
          {BLOCK_GROUP_LABELS.pages}
        </h2>
        <ul className="flex flex-col gap-0.5">{PAGE_BLOCKS.map(plainRow)}</ul>
      </section>
    </nav>
  );
}
