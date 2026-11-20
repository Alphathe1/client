// What the site shows before GET /site answers, and what it keeps when it fails (spec §6.4, Review Focus 1 and 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CACHE_KEY, fromServer, readCache, writeCache } from "../src/lib/site/cache.ts";
import { DEFAULT_CONTENT } from "../src/lib/site/defaults.ts";

class MemoryStorage {
  items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}
const refused = () => {
  throw new Error("Stockage refusé");
};
const broken = { getItem: refused, setItem: refused, removeItem: refused };
const CACHED = { content: { home: { hero: { title: "Titre en cache" } } }, updatedAt: "2026-11-18T08:00:00.000Z" };
const withCache = () => {
  const storage = new MemoryStorage();
  storage.setItem(CACHE_KEY, JSON.stringify(CACHED));
  return storage;
};

test("no usable cache gives the default", () => {
  for (const storage of [null, new MemoryStorage(), broken]) assert.equal(readCache(storage).source, "default");
  for (const raw of ["{", "null", "42", JSON.stringify({ content: {} }), JSON.stringify({ updatedAt: CACHED.updatedAt })]) {
    const storage = new MemoryStorage();
    storage.setItem(CACHE_KEY, raw);
    const site = readCache(storage);
    assert.equal(site.source, "default", raw);
    assert.equal(site.content, DEFAULT_CONTENT, raw);
  }
});

test("a cached publication is shown first, merged on the default", () => {
  const site = readCache(withCache());
  assert.equal(site.source, "cache");
  assert.equal(site.updatedAt, CACHED.updatedAt);
  assert.equal(site.content.home.hero.title, "Titre en cache");
  assert.equal(site.content.home.hero.text, DEFAULT_CONTENT.home.hero.text);
});

test("writeCache keeps the raw publication and forgets it once nothing is published", () => {
  const storage = new MemoryStorage();
  writeCache(storage, CACHED.content, CACHED.updatedAt);
  assert.deepEqual(JSON.parse(storage.getItem(CACHE_KEY) ?? "null"), CACHED);
  writeCache(storage, null, null);
  assert.equal(storage.getItem(CACHE_KEY), null);
  assert.doesNotThrow(() => writeCache(broken, CACHED.content, CACHED.updatedAt));
});

test("the server answer replaces the cache; the same version keeps the same object", () => {
  const cached = readCache(withCache());
  const same = fromServer(cached, { home: { hero: { title: "Autre" } } }, CACHED.updatedAt);
  assert.equal(same.content, cached.content);
  assert.equal(same.source, "server");
  const none = fromServer(cached, null, null);
  assert.equal(none.content, DEFAULT_CONTENT);
  assert.equal(none.updatedAt, null);
  assert.equal(none.source, "server");
  const fresh = fromServer(cached, { home: { hero: { title: "Titre publié" } } }, "2026-11-19T09:00:00.000Z");
  assert.equal(fresh.content.home.hero.title, "Titre publié");
  assert.equal(fresh.updatedAt, "2026-11-19T09:00:00.000Z");
  assert.equal(fresh.source, "server");
});
