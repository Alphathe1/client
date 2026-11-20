// Published content merged onto the default (spec §6.2): a field added later never breaks content published earlier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTENT } from "../src/lib/site/defaults.ts";
import { mergeContent } from "../src/lib/site/merge.ts";
import { HOME_SECTION_IDS } from "../src/lib/site/types.ts";

test("nothing published, or garbage, gives a fresh copy of the default", () => {
  for (const value of [null, undefined, "texte", 42, [], {}]) {
    const merged = mergeContent(value);
    assert.deepEqual(merged, DEFAULT_CONTENT);
    assert.notEqual(merged, DEFAULT_CONTENT);
    merged.home.hero.title = "Modifié";
    merged.home.order.reverse();
    assert.equal(DEFAULT_CONTENT.home.hero.title, "Le coiffeur préféré de ton coiffeur préféré.");
    assert.equal(DEFAULT_CONTENT.home.order[0], "hero");
  }
});

test("a partial document keeps the default everywhere else", () => {
  const merged = mergeContent({ home: { hero: { title: "Nouveau titre" } } });
  assert.equal(merged.home.hero.title, "Nouveau titre");
  assert.equal(merged.home.hero.text, DEFAULT_CONTENT.home.hero.text);
  assert.deepEqual(merged.identity, DEFAULT_CONTENT.identity);
  assert.deepEqual(merged.pages, DEFAULT_CONTENT.pages);
});

test("a value of the wrong type falls back to the default value", () => {
  const merged = mergeContent({ identity: { tagline: 42 }, hours: { detailed: "oui", days: "lundi" }, home: { salon: "salon" } });
  assert.equal(merged.identity.tagline, DEFAULT_CONTENT.identity.tagline);
  assert.equal(merged.hours.detailed, false);
  assert.deepEqual(merged.hours.days, DEFAULT_CONTENT.hours.days);
  assert.deepEqual(merged.home.salon, DEFAULT_CONTENT.home.salon);
});

test("fields the model does not know are dropped", () => {
  const merged = mergeContent({ theme: "rose", identity: { tagline: "Accroche", slogan: "Autre" } }) as unknown as Record<string, any>;
  assert.equal("theme" in merged, false);
  assert.deepEqual(Object.keys(merged.identity).sort(), ["description", "tagline"]);
  assert.equal(merged.identity.tagline, "Accroche");
});

test("lists are taken whole, including empty ones", () => {
  const items = [
    { icon: "star", title: "Accueil", text: "Un café en attendant." },
    { icon: "clock", title: "Ponctualité", text: "On commence à l'heure." },
  ];
  const merged = mergeContent({ home: { features: { items }, salon: { images: [] } } });
  assert.deepEqual(merged.home.features.items, items);
  assert.deepEqual(merged.home.salon.images, []);
  assert.deepEqual(merged.home.salon.points, DEFAULT_CONTENT.home.salon.points);
});

test("an item missing a field gets it from the default item; a non-object item is dropped", () => {
  const merged = mergeContent({ home: { features: { items: [{ icon: "star", title: "Accueil" }] }, highlights: { items: ["pas un objet"] } } });
  assert.deepEqual(merged.home.features.items, [{ icon: "star", title: "Accueil", text: DEFAULT_CONTENT.home.features.items[0]!.text }]);
  assert.deepEqual(merged.home.highlights.items, []);
});

test("section order: unknown and repeated ids dropped, missing sections appended in default order", () => {
  const merged = mergeContent({ home: { order: ["team", "hero", "team", "footer", "prices"], hidden: ["footer", "salon", "salon"] } });
  assert.deepEqual(merged.home.order, ["team", "hero", "prices", "features", "salon", "highlights", "testimonial", "invitation"]);
  assert.deepEqual(merged.home.hidden, ["salon"]);
  assert.equal(merged.home.order.length, HOME_SECTION_IDS.length);
});
