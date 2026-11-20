// The site editor's model (spec §6.5, §6.7): blocks, paths, what changed, section order, upload and publish messages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTENT } from "../src/lib/site/defaults.ts";
import {
  blockOfPath,
  blockOrder,
  counterTone,
  dataUrlBytes,
  dirtyKeys,
  dirtyLabel,
  dropIndex,
  editorLayout,
  fieldId,
  firstIssue,
  focusCandidates,
  getIn,
  isAtDefault,
  isBlockId,
  issueAt,
  issuesByBlock,
  moveSection,
  moveSectionTo,
  publishFailure,
  resetBlock,
  sameValue,
  setIn,
  toggleHidden,
  uploadErrorMessage,
} from "../src/lib/site/editor.ts";
import { HOME_SECTION_IDS } from "../src/lib/site/types.ts";
import { validateContent } from "../src/lib/site/validate.ts";

const clone = (): any => structuredClone(DEFAULT_CONTENT);

test("every field path belongs to one block", () => {
  assert.equal(blockOfPath("identity.tagline"), "identity");
  assert.equal(blockOfPath("contact.instagram"), "identity");
  assert.equal(blockOfPath("hours.days.3.end"), "hours");
  assert.equal(blockOfPath("announcement.linkTo"), "announcement");
  assert.equal(blockOfPath("home.features.items.1.title"), "features");
  assert.equal(blockOfPath("home.salon.images.0"), "salon");
  assert.equal(blockOfPath("pages.gallery.text"), "gallery");
  assert.equal(blockOfPath("home.order"), null);
  assert.equal(blockOfPath("home.hidden.2"), null);
  assert.equal(blockOfPath("theme"), null);
  assert.equal(isBlockId("prices"), true);
  assert.equal(isBlockId("services"), true);
  assert.equal(isBlockId("footer"), false);
});

test("panel order: general, home sections in the draft's order, inner pages", () => {
  assert.deepEqual(blockOrder(["team", "hero", "features", "salon", "prices", "highlights", "testimonial", "invitation"]), [
    "identity", "hours", "announcement",
    "team", "hero", "features", "salon", "prices", "highlights", "testimonial", "invitation",
    "services", "barbers", "gallery",
  ]);
});

test("field ids and focus fallbacks", () => {
  assert.equal(fieldId("home.features.items.1.title"), "site-home-features-items-1-title");
  assert.deepEqual(focusCandidates("home.salon.images.1"), ["home.salon.images.1", "home.salon.images", "home.salon"]);
  assert.deepEqual(focusCandidates("hours.days"), ["hours.days"]);
});

test("getIn and setIn follow dotted paths, copy only what they change, refuse unknown paths", () => {
  assert.equal(getIn(DEFAULT_CONTENT, "home.features.items.1.title"), "Produits premium");
  assert.equal(getIn(DEFAULT_CONTENT, "home.nothing.here"), undefined);
  const next = setIn(DEFAULT_CONTENT, "home.features.items.1.title", "Soins");
  assert.equal(next.home.features.items[1]!.title, "Soins");
  assert.equal(DEFAULT_CONTENT.home.features.items[1]!.title, "Produits premium");
  assert.notEqual(next.home.features.items, DEFAULT_CONTENT.home.features.items);
  assert.equal(next.home.features.items[0], DEFAULT_CONTENT.home.features.items[0]);
  assert.equal(next.identity, DEFAULT_CONTENT.identity);
  assert.throws(() => setIn(DEFAULT_CONTENT, "home.hero.subtitle", "x"), /Unknown content path/);
  assert.throws(() => setIn(DEFAULT_CONTENT, "home.features.items.9.title", "x"), /Unknown content path/);
});

test("sameValue compares JSON-like values deeply", () => {
  assert.equal(sameValue(clone(), DEFAULT_CONTENT), true);
  assert.equal(sameValue({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), true);
  assert.equal(sameValue({ a: 1 }, { a: 1, b: undefined }), false);
  assert.equal(sameValue([1, 2], [2, 1]), false);
  assert.equal(sameValue(null, {}), false);
});

test("dirty keys name the changed blocks, visibility included; reordering counts once", () => {
  assert.deepEqual(dirtyKeys(clone(), DEFAULT_CONTENT), []);
  const c = clone();
  c.home.hero.title = "Nouveau titre";
  c.contact.phone = "06 00 00 00 00";
  c.pages.gallery.text = "Autre";
  c.home.hidden = ["team"];
  assert.deepEqual(dirtyKeys(c, DEFAULT_CONTENT), ["identity", "hero", "team", "gallery"]);
  const moved = clone();
  moved.home.order = moveSection(moved.home.order, "team", -1);
  assert.deepEqual(dirtyKeys(moved, DEFAULT_CONTENT), ["order"]);
  const testimonial = clone();
  testimonial.home.hidden = ["testimonial"];
  assert.deepEqual(dirtyKeys(testimonial, DEFAULT_CONTENT), ["testimonial"]);
});

test("reset puts the block's fields back to the original content, keeps visibility and order", () => {
  const c = clone();
  c.home.hero.title = "Nouveau titre";
  c.home.hero.image = "";
  c.home.hidden = ["hero"];
  c.home.order = moveSection(c.home.order, "hero", 1);
  assert.equal(isAtDefault(c, "hero"), false);
  const reset = resetBlock(c, "hero");
  assert.deepEqual(reset.home.hero, DEFAULT_CONTENT.home.hero);
  assert.deepEqual(reset.home.hidden, ["hero"]);
  assert.equal(reset.home.order[1], "hero");
  assert.equal(isAtDefault(reset, "hero"), true);
  assert.equal(Object.isFrozen(reset.home.hero), false);
  const identity = clone();
  identity.identity.tagline = "Autre";
  identity.contact.address = "12 rue du Port";
  assert.deepEqual(resetBlock(identity, "identity").contact, DEFAULT_CONTENT.contact);
  const page = clone();
  page.pages.barbers.title = "Autre";
  page.pages.gallery.title = "Gardé";
  const resetPage = resetBlock(page, "barbers");
  assert.deepEqual(resetPage.pages.barbers, DEFAULT_CONTENT.pages.barbers);
  assert.equal(resetPage.pages.gallery.title, "Gardé");
  assert.equal(resetBlock(page, "testimonial"), page);
  assert.equal(isAtDefault(page, "testimonial"), true);
});

test("arrows move one step and stop at the ends", () => {
  const order = [...HOME_SECTION_IDS];
  assert.deepEqual(moveSection(order, "features", -1).slice(0, 2), ["features", "hero"]);
  assert.deepEqual(moveSection(order, "hero", -1), order);
  assert.deepEqual(moveSection(order, "invitation", 1), order);
  assert.deepEqual(moveSection(order, "invitation", -1).slice(-2), ["invitation", "testimonial"]);
  assert.notEqual(moveSection(order, "hero", -1), order);
});

test("drag and drop lands where the marker shows", () => {
  const order = [...HOME_SECTION_IDS];
  // hero (index 0) dropped before prices (row 3): ends at index 2, just above prices
  assert.deepEqual(moveSectionTo(order, "hero", dropIndex(0, 3)).slice(0, 4), ["features", "salon", "hero", "prices"]);
  // invitation (index 7) dropped before features (row 1)
  assert.deepEqual(moveSectionTo(order, "invitation", dropIndex(7, 1)).slice(0, 3), ["hero", "invitation", "features"]);
  // dropped at the very end
  assert.equal(moveSectionTo(order, "hero", dropIndex(0, order.length)).at(-1), "hero");
  assert.deepEqual(moveSectionTo(order, "hero", 99).length, 8);
});

test("toggling a section twice gives back the same list", () => {
  const once = toggleHidden(["team"], "hero");
  assert.deepEqual(once, ["hero", "team"]);
  assert.deepEqual(toggleHidden(once, "hero"), ["team"]);
  assert.deepEqual(toggleHidden(["invitation", "team"], "salon"), ["salon", "team", "invitation"]);
});

test("issues: grouped by block, the first in panel order, the message of one field", () => {
  const c = clone();
  c.pages.services.title = "";
  c.home.features.items[1].title = "";
  c.home.hero.text = "x".repeat(300);
  c.contact.phone = "abc";
  const issues = validateContent(c);
  const byBlock = issuesByBlock(issues);
  assert.deepEqual([...byBlock.keys()].sort(), ["features", "hero", "identity", "services"]);
  assert.equal(firstIssue(issues, c.home.order)?.path, "contact.phone");
  const noIdentity = issues.filter((i) => i.path !== "contact.phone");
  assert.equal(firstIssue(noIdentity, c.home.order)?.path, "home.hero.text");
  assert.equal(firstIssue(noIdentity, moveSection(c.home.order, "features", -1))?.path, "home.features.items.1.title");
  assert.equal(issueAt(issues, "home.hero.text"), "240 caractères au maximum.");
  assert.equal(issueAt(issues, "home.hero.title"), undefined);
  assert.equal(firstIssue([], c.home.order), undefined);
});

test("character counter tone", () => {
  assert.equal(counterTone(0, 90), "normal");
  assert.equal(counterTone(80, 90), "normal");
  assert.equal(counterTone(81, 90), "near");
  assert.equal(counterTone(90, 90), "near");
  assert.equal(counterTone(91, 90), "over");
});

test("layout follows the editor's own width", () => {
  assert.equal(editorLayout(390), "narrow");
  assert.equal(editorLayout(767), "narrow");
  assert.equal(editorLayout(768), "medium");
  assert.equal(editorLayout(1032), "medium"); // 1280px window with the full 248px sidebar
  assert.equal(editorLayout(1151), "medium");
  assert.equal(editorLayout(1192), "wide"); // 1440px window with the full sidebar
  assert.equal(editorLayout(1216), "wide"); // 1280px window with the folded rail
});

test("images: decoded size of a data URL, and the message of each refusal", () => {
  assert.equal(dataUrlBytes("data:image/png;base64,iVBORw0KGgo="), 8);
  assert.equal(dataUrlBytes("data:image/jpeg;base64,AAAA"), 3);
  assert.equal(dataUrlBytes("pas une image"), 0);
  assert.match(uploadErrorMessage(0, ""), /connexion/);
  assert.match(uploadErrorMessage(413, "Image too large"), /2 Mo/);
  assert.match(uploadErrorMessage(415, "Unsupported"), /JPEG, PNG ou WebP/);
  assert.match(uploadErrorMessage(401, "No token provided"), /session a expiré/);
  assert.equal(uploadErrorMessage(500, "Erreur serveur"), "Erreur serveur");
});

test("publish failures: each status gets its way out", () => {
  assert.equal(publishFailure(0, "").kind, "network");
  assert.deepEqual(publishFailure(409, "Le site a été modifié depuis un autre appareil."), {
    kind: "conflict",
    message: "Le site a été modifié depuis un autre appareil.",
  });
  assert.equal(publishFailure(401, "No token provided").kind, "session");
  assert.doesNotMatch(publishFailure(401, "No token provided").message, /token/);
  assert.equal(publishFailure(400, "✖ Invalid input").kind, "refused");
  assert.equal(publishFailure(500, "").message, "La publication a échoué.");
  assert.equal(dirtyLabel(1), "1 bloc modifié");
  assert.equal(dirtyLabel(3), "3 blocs modifiés");
});
