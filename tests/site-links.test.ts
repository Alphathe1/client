// Owner-entered links and images (spec §6.8): https:// or an internal path, never javascript:.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTENT } from "../src/lib/site/defaults.ts";
import { mediaSrc, safeLink, socialHandle, socialLinks, telHref } from "../src/lib/site/links.ts";

test("safeLink keeps https:// and internal paths, nothing else", () => {
  assert.equal(safeLink("https://instagram.com/lempire_barber"), "https://instagram.com/lempire_barber");
  assert.equal(safeLink("/services"), "/services");
  assert.equal(safeLink("/"), "/");
  for (const bad of ["javascript:alert(1)", "//evil.example", "/\\evil.example", "http://example.com", "mailto:salon@example.com", "", " https://example.com"]) {
    assert.equal(safeLink(bad), "", bad);
  }
});

test("telHref keeps digits and +", () => {
  assert.equal(telHref("06 58 86 14 45"), "tel:0658861445");
  assert.equal(telHref("+213 (0) 6.58"), "tel:+2130658");
  assert.equal(telHref(""), "");
  assert.equal(telHref("+"), "");
});

test("socialHandle reads the profile name from the address", () => {
  assert.equal(socialHandle("https://instagram.com/lempire_barber"), "@lempire_barber");
  assert.equal(socialHandle("https://www.tiktok.com/@lempire_barber"), "@lempire_barber");
  assert.equal(socialHandle("https://instagram.com/lempire_barber/"), "@lempire_barber");
  assert.equal(socialHandle("https://instagram.com/lempire_barber/reels/"), "@lempire_barber");
  assert.equal(socialHandle("https://www.tiktok.com/@lempire_barber/video/123"), "@lempire_barber");
  assert.equal(socialHandle("https://instagram.com"), "");
  assert.equal(socialHandle("pas une adresse"), "");
});

test("socialLinks lists the filled https:// profiles", () => {
  assert.deepEqual(socialLinks(DEFAULT_CONTENT.contact), [
    { network: "instagram", label: "Instagram", href: "https://instagram.com/lempire_barber", handle: "@lempire_barber" },
    { network: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@lempire_barber", handle: "@lempire_barber" },
  ]);
  assert.deepEqual(socialLinks({ instagram: "", tiktok: "javascript:alert(1)" }), []);
  assert.deepEqual(socialLinks({ instagram: "/instagram", tiktok: "" }), []);
});

test("mediaSrc sends uploads to the API and refuses anything else unknown", () => {
  const id = "0123456789abcdef01234567";
  assert.equal(mediaSrc(`/site/media/${id}`, "/api"), `/api/site/media/${id}`);
  assert.equal(mediaSrc(`/site/media/${id}`, "https://api.example.com"), `https://api.example.com/site/media/${id}`);
  assert.equal(mediaSrc("https://images.unsplash.com/photo-1", "/api"), "https://images.unsplash.com/photo-1");
  assert.equal(mediaSrc("/images/hero.jpg", "/api"), "/images/hero.jpg");
  for (const bad of ["", "/images/../hero.jpg", "data:image/png;base64,AAAA", "javascript:alert(1)", "/site/media/123"]) {
    assert.equal(mediaSrc(bad, "/api"), "", bad);
  }
});
