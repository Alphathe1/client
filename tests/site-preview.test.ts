// Live preview protocol (spec §6.6): only same-origin, well-formed messages get through, both ways.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blockForClick,
  EDITOR_SOURCE,
  fitScale,
  isPreviewSearch,
  PREVIEW_SOURCE,
  previewTarget,
  readEditorMessage,
  readPreviewMessage,
} from "../src/lib/site/preview.ts";

const ORIGIN = "http://localhost:5173";
const fromEditor = (data: unknown, origin = ORIGIN) => readEditorMessage({ origin, data }, ORIGIN);
const fromPreview = (data: unknown, origin = ORIGIN) => readPreviewMessage({ origin, data }, ORIGIN);

test("editor → preview: same origin and known shapes only", () => {
  const draft = { from: EDITOR_SOURCE, type: "draft", content: { home: {} } };
  assert.deepEqual(fromEditor(draft), draft);
  assert.equal(fromEditor(draft, "https://evil.example"), null);
  assert.equal(fromEditor(draft, "null"), null);
  assert.equal(fromEditor({ ...draft, from: PREVIEW_SOURCE }), null);
  assert.equal(fromEditor({ ...draft, content: "texte" }), null);
  assert.equal(fromEditor({ ...draft, content: [] }), null);
  assert.equal(fromEditor("draft"), null);
  assert.equal(fromEditor(null), null);
  assert.deepEqual(fromEditor({ from: EDITOR_SOURCE, type: "navigate", path: "/services" }), { from: EDITOR_SOURCE, type: "navigate", path: "/services" });
  assert.equal(fromEditor({ from: EDITOR_SOURCE, type: "navigate", path: "/dashboard" }), null);
  assert.equal(fromEditor({ from: EDITOR_SOURCE, type: "navigate", path: "https://evil.example" }), null);
});

test("focus messages carry a known section or an edge, nothing else", () => {
  const focus = (section: unknown, edge: unknown) => fromEditor({ from: EDITOR_SOURCE, type: "focus", section, edge });
  assert.deepEqual(focus("prices", null), { from: EDITOR_SOURCE, type: "focus", section: "prices", edge: null });
  assert.deepEqual(focus(null, "bottom"), { from: EDITOR_SOURCE, type: "focus", section: null, edge: "bottom" });
  assert.equal(focus('hero"] , body [x="', null), null);
  assert.equal(focus("footer", null), null);
  assert.equal(focus(null, "middle"), null);
  assert.equal(focus(undefined, null), null);
});

test("preview → editor: same origin and known shapes only", () => {
  const ready = { from: PREVIEW_SOURCE, type: "ready", path: "/" };
  assert.deepEqual(fromPreview(ready), ready);
  assert.equal(fromPreview(ready, "https://evil.example"), null);
  assert.equal(fromPreview({ ...ready, from: EDITOR_SOURCE }), null);
  assert.equal(fromPreview({ ...ready, path: "javascript:alert(1)" }), null);
  assert.deepEqual(fromPreview({ from: PREVIEW_SOURCE, type: "location", path: "/services" }), { from: PREVIEW_SOURCE, type: "location", path: "/services" });
  assert.deepEqual(fromPreview({ from: PREVIEW_SOURCE, type: "select", block: "team" }), { from: PREVIEW_SOURCE, type: "select", block: "team" });
  assert.equal(fromPreview({ from: PREVIEW_SOURCE, type: "select", block: "footer" }), null);
  assert.equal(fromPreview({ from: PREVIEW_SOURCE, type: "publish" }), null);
});

test("preview address", () => {
  assert.equal(isPreviewSearch("?preview=1"), true);
  assert.equal(isPreviewSearch("?x=2&preview=1"), true);
  assert.equal(isPreviewSearch(""), false);
  assert.equal(isPreviewSearch("?preview=0"), false);
  assert.equal(isPreviewSearch("?preview=true"), false);
});

test("each block has a place in the preview", () => {
  assert.deepEqual(previewTarget("salon"), { path: "/", section: "salon", edge: null });
  assert.deepEqual(previewTarget("identity"), { path: "/", section: null, edge: "bottom" });
  assert.deepEqual(previewTarget("hours"), { path: "/", section: null, edge: "bottom" });
  assert.deepEqual(previewTarget("announcement"), { path: "/", section: null, edge: "top" });
  assert.deepEqual(previewTarget("gallery"), { path: "/gallery", section: null, edge: "top" });
});

test("a click in the preview opens the block it shows", () => {
  assert.equal(blockForClick("/", "prices", false, true), "prices");
  assert.equal(blockForClick("/", "nonsense", false, true), null);
  assert.equal(blockForClick("/", null, true, false), "identity");
  assert.equal(blockForClick("/services", null, false, true), "services");
  assert.equal(blockForClick("/gallery/", null, false, true), "gallery");
  assert.equal(blockForClick("/barbers/123", null, false, true), null);
  assert.equal(blockForClick("/services", null, false, false), null);
  assert.equal(blockForClick("/", null, false, true), null);
});

test("the frame is scaled down by steps to fit its column", () => {
  assert.equal(fitScale(390, 600), 1);
  assert.equal(fitScale(768, 600), 0.75);
  assert.equal(fitScale(768, 576), 0.75);
  assert.equal(fitScale(1280, 820), 0.625);
  assert.equal(fitScale(1280, 568), 0.4);
  assert.equal(fitScale(1280, 460), 0.35);
  assert.equal(fitScale(1280, 200), 0.35);
});
