// The editor's draft (spec §6.4): pure edits, and the copy the browser keeps between visits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTENT } from "../src/lib/site/defaults.ts";
import { draftReducer, makeStoredDraft, parseStoredDraft, startDraft, type DraftAction } from "../src/lib/site/draft.ts";
import { HOME_SECTION_IDS, type SiteContent } from "../src/lib/site/types.ts";

const run = (actions: DraftAction[], from: SiteContent = startDraft(DEFAULT_CONTENT)) => actions.reduce(draftReducer, from);

test("the draft starts as an editable deep copy of the published content", () => {
  const draft = startDraft(DEFAULT_CONTENT);
  assert.deepEqual(draft, DEFAULT_CONTENT);
  assert.equal(Object.isFrozen(draft), false);
  assert.equal(Object.isFrozen(draft.home.features.items[0]), false);
  draft.home.hero.title = "Modifié";
  assert.equal(DEFAULT_CONTENT.home.hero.title, "Le coiffeur préféré de ton coiffeur préféré.");
});

test("set changes one field and never the previous state", () => {
  const before = startDraft(DEFAULT_CONTENT);
  const after = draftReducer(before, { type: "set", path: "home.hero.title", value: "Nouveau" });
  assert.equal(after.home.hero.title, "Nouveau");
  assert.equal(before.home.hero.title, DEFAULT_CONTENT.home.hero.title);
  assert.equal(draftReducer(after, { type: "set", path: "home.hero.title", value: "Nouveau" }), after);
  // a late upload whose photo slot is gone changes nothing
  assert.equal(draftReducer(after, { type: "set", path: "home.salon.images.5", value: "/images/a.jpg" }), after);
});

test("the reducer works on the frozen default without throwing", () => {
  const next = draftReducer(DEFAULT_CONTENT, { type: "set", path: "identity.tagline", value: "Autre" });
  assert.equal(next.identity.tagline, "Autre");
  assert.doesNotThrow(() => draftReducer(DEFAULT_CONTENT, { type: "toggleHidden", id: "team" }));
  assert.doesNotThrow(() => draftReducer(DEFAULT_CONTENT, { type: "move", id: "team", delta: -1 }));
});

test("moving and hiding sections", () => {
  const start = startDraft(DEFAULT_CONTENT);
  const moved = run([{ type: "move", id: "features", delta: -1 }], start);
  assert.deepEqual(moved.home.order.slice(0, 2), ["features", "hero"]);
  assert.equal(run([{ type: "move", id: "hero", delta: -1 }], start), start);
  const dropped = run([{ type: "moveTo", id: "invitation", index: 0 }], start);
  assert.equal(dropped.home.order[0], "invitation");
  assert.equal(dropped.home.order.length, HOME_SECTION_IDS.length);
  const hidden = run([{ type: "toggleHidden", id: "salon" }, { type: "toggleHidden", id: "hero" }], start);
  assert.deepEqual(hidden.home.hidden, ["hero", "salon"]);
});

test("lists stay within their sizes", () => {
  const start = startDraft(DEFAULT_CONTENT); // 4 features, 2 points, 2 salon photos, 2 highlights
  const item = { icon: "star", title: "", text: "" };
  assert.equal(run([{ type: "listAdd", path: "home.features.items", item }], start), start);
  const two = run([
    { type: "listRemove", path: "home.features.items", index: 0 },
    { type: "listRemove", path: "home.features.items", index: 0 },
    { type: "listRemove", path: "home.features.items", index: 0 },
  ], start);
  assert.equal(two.home.features.items.length, 2);
  assert.deepEqual(two.home.features.items.map((f) => f.title), ["Salon impeccable", "Finitions nettes"]); // the third removal stops at the minimum
  const three = run([{ type: "listAdd", path: "home.features.items", item }], two);
  assert.deepEqual(three.home.features.items[2], item);
  const noPhotos = run([
    { type: "listRemove", path: "home.salon.images", index: 1 },
    { type: "listRemove", path: "home.salon.images", index: 0 },
    { type: "listRemove", path: "home.salon.images", index: 0 },
  ], start);
  assert.deepEqual(noPhotos.home.salon.images, []);
  const onePoint = run([{ type: "listRemove", path: "home.salon.points", index: 1 }], start);
  assert.equal(run([{ type: "listRemove", path: "home.salon.points", index: 0 }], onePoint), onePoint);
});

test("moving an item inside a list", () => {
  const start = startDraft(DEFAULT_CONTENT);
  const swapped = run([{ type: "listMove", path: "home.highlights.items", index: 0, delta: 1 }], start);
  assert.equal(swapped.home.highlights.items[0]!.title, "Barbe & rasage");
  assert.equal(swapped.home.highlights.items[1]!.title, "Dégradés précis");
  assert.equal(run([{ type: "listMove", path: "home.highlights.items", index: 1, delta: 1 }], start), start);
});

test("reset and replace", () => {
  const edited = run([{ type: "set", path: "pages.gallery.title", value: "Photos" }, { type: "toggleHidden", id: "team" }]);
  const reset = run([{ type: "reset", block: "gallery" }], edited);
  assert.equal(reset.pages.gallery.title, "La galerie");
  assert.deepEqual(reset.home.hidden, ["team"]);
  const fresh = startDraft(DEFAULT_CONTENT);
  assert.equal(run([{ type: "replace", content: fresh }], edited), fresh);
});

test("the stored draft survives a round trip and refuses anything else", () => {
  const content = run([{ type: "set", path: "home.hero.title", value: "Brouillon" }]);
  const stored = makeStoredDraft(content, "2026-11-19T09:00:00.000Z", new Date("2026-11-19T10:30:00.000Z"));
  const back = parseStoredDraft(JSON.stringify(stored));
  assert.equal(back?.content.home.hero.title, "Brouillon");
  assert.equal(back?.baseUpdatedAt, "2026-11-19T09:00:00.000Z");
  assert.equal(back?.savedAt, "2026-11-19T10:30:00.000Z");
  assert.equal(parseStoredDraft(JSON.stringify({ ...stored, baseUpdatedAt: null }))?.baseUpdatedAt, null);
  const partial = parseStoredDraft(JSON.stringify({ ...stored, content: { home: { hero: { title: "Ancien" } } } }));
  assert.equal(partial?.content.home.hero.text, DEFAULT_CONTENT.home.hero.text);
  for (const raw of [null, "", "{", "42", "null", JSON.stringify({ ...stored, version: 2 }), JSON.stringify({ ...stored, content: "x" }), JSON.stringify({ ...stored, baseUpdatedAt: 5 }), JSON.stringify({ ...stored, savedAt: undefined })]) {
    assert.equal(parseStoredDraft(raw), null, String(raw));
  }
});
