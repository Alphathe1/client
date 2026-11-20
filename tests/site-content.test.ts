// Content model of the public site (spec §6.2): today's site as the default, and the validation the editor will use.
//   npm --prefix client test
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTENT } from "../src/lib/site/defaults.ts";
import { HOME_SECTION_IDS } from "../src/lib/site/types.ts";
import { validateContent } from "../src/lib/site/validate.ts";

// The fixtures break the types on purpose: `any` keeps them short.
const clone = (): any => structuredClone(DEFAULT_CONTENT);
/** distinct field paths reported for `c`, sorted */
const paths = (c: any) => [...new Set(validateContent(c).map((i) => i.path))].sort();
const MEDIA = "/site/media/0123456789abcdef01234567";

test("the default content is valid", () => {
  assert.deepEqual(validateContent(DEFAULT_CONTENT), []);
});

test("the default content is today's site", () => {
  assert.equal(DEFAULT_CONTENT.hours.detailed, false);
  assert.equal(DEFAULT_CONTENT.hours.summary, "Ouvert 7j/7");
  assert.equal(DEFAULT_CONTENT.hours.days.length, 7);
  assert.equal(DEFAULT_CONTENT.contact.phone, "06 58 86 14 45");
  assert.deepEqual(DEFAULT_CONTENT.home.order, [...HOME_SECTION_IDS]);
  assert.deepEqual(DEFAULT_CONTENT.home.hidden, []);
  assert.equal(DEFAULT_CONTENT.announcement.enabled, false);
  assert.deepEqual(
    Object.values(DEFAULT_CONTENT.pages).map((p) => p.title),
    ["Les tarifs", "Nos barbers", "La galerie"],
  );
});

test("the default content cannot be mutated by accident", () => {
  assert.throws(() => (DEFAULT_CONTENT.home.order as string[]).push("hero"), TypeError);
  assert.throws(() => {
    (DEFAULT_CONTENT.identity as any).tagline = "Autre";
  }, TypeError);
});

test("blank required text is refused, optional text may be empty", () => {
  const c = clone();
  c.home.hero.title = "   ";
  c.identity.description = "";
  c.contact.address = "";
  c.contact.instagram = "";
  assert.deepEqual(paths(c), ["home.hero.title", "identity.description"]);
});

test("text longer than its limit is refused", () => {
  const ok = clone();
  ok.identity.tagline = "a".repeat(90);
  ok.pages.gallery.title = "b".repeat(40);
  assert.deepEqual(paths(ok), []);
  const c = clone();
  c.identity.tagline = "a".repeat(91);
  c.pages.gallery.title = "b".repeat(41);
  c.home.features.items[2].text = "c".repeat(141);
  assert.deepEqual(paths(c), ["home.features.items.2.text", "identity.tagline", "pages.gallery.title"]);
});

test("links: https or empty; the announcement link may also be an internal path", () => {
  const c = clone();
  c.contact.instagram = "javascript:alert(1)";
  c.contact.tiktok = "http://tiktok.com/@lempire_barber";
  c.contact.mapsUrl = "/contact";
  c.announcement = { enabled: true, text: "Fermé le 1er mai", linkLabel: "Voir", linkTo: "//evil.example" };
  assert.deepEqual(paths(c), ["announcement.linkTo", "contact.instagram", "contact.mapsUrl", "contact.tiktok"]);
  const ok = clone();
  ok.announcement = { enabled: true, text: "Fermé le 1er mai", linkLabel: "Voir les tarifs", linkTo: "/services" };
  ok.contact.mapsUrl = "";
  assert.deepEqual(paths(ok), []);
  const backslash = clone();
  backslash.announcement = { ...ok.announcement, linkTo: "/\\evil.example" };
  assert.deepEqual(paths(backslash), ["announcement.linkTo"]);
});

test("images: empty, uploaded, https or /images only", () => {
  const ok = clone();
  ok.home.hero.image = "";
  ok.home.highlights.items[0].image = MEDIA;
  ok.home.salon.images = ["/images/salon.jpg"];
  assert.deepEqual(paths(ok), []);
  const c = clone();
  c.home.hero.image = "data:image/svg+xml;base64,PHN2Zz4=";
  c.home.highlights.items[1].image = "/site/media/123";
  c.home.salon.images = ["/images/../secret.jpg", ""];
  assert.deepEqual(paths(c), ["home.hero.image", "home.highlights.items.1.image", "home.salon.images.0", "home.salon.images.1"]);
});

test("home order is a permutation of the eight sections, hidden a subset", () => {
  const twice = clone();
  twice.home.order[1] = "hero";
  assert.deepEqual(paths(twice), ["home.order"]);
  const short = clone();
  short.home.order = short.home.order.slice(1);
  assert.deepEqual(paths(short), ["home.order"]);
  const unknown = clone();
  unknown.home.order[7] = "footer";
  assert.deepEqual(paths(unknown), ["home.order.7"]);
  const hidden = clone();
  hidden.home.hidden = ["team", "team", "footer"];
  assert.deepEqual(paths(hidden), ["home.hidden", "home.hidden.2"]);
  const all = clone();
  all.home.hidden = [...HOME_SECTION_IDS];
  assert.deepEqual(paths(all), []);
});

test("list sizes follow the spec", () => {
  const c = clone();
  c.home.features.items = c.home.features.items.slice(0, 1);
  c.home.salon.points = [];
  c.home.salon.images = ["/images/a.jpg", "/images/b.jpg", "/images/c.jpg"];
  c.home.highlights.items = [...c.home.highlights.items, c.home.highlights.items[0]];
  assert.deepEqual(paths(c), ["home.features.items", "home.highlights.items", "home.salon.images", "home.salon.points"]);
  const five = clone();
  five.home.features.items = [...five.home.features.items, five.home.features.items[0]];
  assert.deepEqual(paths(five), ["home.features.items"]);
  const icon = clone();
  icon.home.features.items[0].icon = "skull";
  assert.deepEqual(paths(icon), ["home.features.items.0.icon"]);
});

test("hours: seven distinct days, HH:mm, closing after opening on open days", () => {
  const six = clone();
  six.hours.days = six.hours.days.slice(0, 6);
  assert.deepEqual(paths(six), ["hours.days"]);
  const twice = clone();
  twice.hours.days[1].day = twice.hours.days[0].day;
  assert.deepEqual(paths(twice), ["hours.days"]);
  const reversed = clone();
  Object.assign(reversed.hours.days[0], { open: true, start: "19:00", end: "09:00" });
  assert.deepEqual(paths(reversed), ["hours.days.0.end"]);
  const closed = clone();
  Object.assign(closed.hours.days[0], { open: false, start: "19:00", end: "09:00" });
  assert.deepEqual(paths(closed), []);
  const format = clone();
  Object.assign(format.hours.days[0], { open: false, start: "24:00", end: "9:00" });
  assert.deepEqual(paths(format), ["hours.days.0.end", "hours.days.0.start"]);
  const day = clone();
  day.hours.days[0].day = 9;
  assert.deepEqual(paths(day), ["hours.days.0.day"]);
});

test("announcement: text required when shown; link text and target go together", () => {
  const shown = clone();
  shown.announcement.enabled = true;
  assert.deepEqual(paths(shown), ["announcement.text"]);
  const label = clone();
  label.announcement.linkLabel = "Voir";
  assert.deepEqual(paths(label), ["announcement.linkTo"]);
  const target = clone();
  target.announcement.linkTo = "/services";
  assert.deepEqual(paths(target), ["announcement.linkLabel"]);
});

test("phone: 6 to 24 characters among digits, spaces and + ( ) . -", () => {
  for (const phone of ["06 58 86 14 45", "+213 (0) 6.58-86", "065886"]) {
    const c = clone();
    c.contact.phone = phone;
    assert.deepEqual(paths(c), [], phone);
  }
  for (const phone of ["06588", "06 58 86 14 45 06 58 86 14", "06 58 x6 14 45", ""]) {
    const c = clone();
    c.contact.phone = phone;
    assert.deepEqual(paths(c), ["contact.phone"], phone);
  }
});
