// Opening status (spec §6.2 « Horaires »): computed on the visitor's device, only once the owner publishes hours.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTENT } from "../src/lib/site/defaults.ts";
import { openingStatus, weekRows } from "../src/lib/site/hours.ts";

/** local time; 16 Nov 2026 is a Monday: 16 Mon, 17 Tue, 21 Sat, 22 Sun */
const at = (date: number, h: number, m = 0) => new Date(2026, 10, date, h, m);
const week = (openDays: number[], start = "09:00", end = "20:00"): any => ({
  detailed: true,
  summary: "Ouvert 7j/7",
  days: [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, open: openDays.includes(day), start, end })),
});
const MON_SAT = week([1, 2, 3, 4, 5, 6]);

test("without detailed hours, the summary is the status", () => {
  assert.deepEqual(openingStatus(DEFAULT_CONTENT.hours, at(16, 3)), { kind: "summary", label: "Ouvert 7j/7" });
  assert.deepEqual(openingStatus({ ...MON_SAT, detailed: false, summary: "Ouvert du mardi au samedi" }, at(16, 10)), {
    kind: "summary",
    label: "Ouvert du mardi au samedi",
  });
});

test("open from the opening minute until the closing minute, excluded", () => {
  for (const now of [at(16, 9), at(16, 10), at(16, 19, 59)]) {
    assert.deepEqual(openingStatus(MON_SAT, now), { kind: "open", label: "Ouvert · ferme à 20:00" });
  }
});

test("before opening, it says when today", () => {
  assert.deepEqual(openingStatus(MON_SAT, at(16, 7, 30)), { kind: "closed", label: "Fermé · ouvre à 09:00" });
});

test("after closing, the next open day: tomorrow, or its name", () => {
  assert.equal(openingStatus(MON_SAT, at(16, 20)).label, "Fermé · ouvre demain à 09:00");
  assert.equal(openingStatus(MON_SAT, at(21, 21)).label, "Fermé · ouvre lundi à 09:00");
  assert.equal(openingStatus(MON_SAT, at(22, 12)).label, "Fermé · ouvre demain à 09:00");
});

test("a single open day: next week's opening says « prochain »", () => {
  const mondays = week([1]);
  assert.equal(openingStatus(mondays, at(16, 21)).label, "Fermé · ouvre lundi prochain à 09:00");
  assert.equal(openingStatus(mondays, at(17, 10)).label, "Fermé · ouvre lundi à 09:00");
});

test("no open day at all: « Fermé »", () => {
  assert.deepEqual(openingStatus(week([]), at(16, 10)), { kind: "closed", label: "Fermé" });
});

test("the week shown in the footer starts on Monday", () => {
  const rows = weekRows(MON_SAT);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows[0], { day: 1, label: "Lundi", open: true, value: "09:00 – 20:00" });
  assert.deepEqual(rows[6], { day: 0, label: "Dimanche", open: false, value: "Fermé" });
});
