// Overview chair list (spec §5.2): "en cours" comes from the clock and the status, no new data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chairList, chairState, dayBounds } from "../src/lib/chair.ts";

/** local time; 19 Nov 2026 */
const at = (h: number, m = 0) => new Date(2026, 10, 19, h, m);
const slot = (h: number, m: number, minutes: number, status: string, id = `${h}:${m}`): any => ({
  _id: id,
  start: at(h, m).toISOString(),
  end: new Date(at(h, m).getTime() + minutes * 60_000).toISOString(),
  status,
});

test("the day runs from local midnight to the next midnight", () => {
  const { from, to } = dayBounds(at(15, 42));
  assert.equal(from.getTime(), new Date(2026, 10, 19).getTime());
  assert.equal(to.getTime(), new Date(2026, 10, 20).getTime());
});

test("a confirmed appointment is in progress from its first minute to its last", () => {
  const a = slot(10, 0, 30, "confirmed");
  assert.equal(chairState(a, at(9, 59)), "confirmed");
  assert.equal(chairState(a, at(10, 0)), "in-progress");
  assert.equal(chairState(a, at(10, 29)), "in-progress");
  assert.equal(chairState(a, at(10, 30)), null);
});

test("a pending appointment stays pending during its slot", () => {
  const a = slot(10, 0, 30, "pending");
  assert.equal(chairState(a, at(9, 0)), "pending");
  assert.equal(chairState(a, at(10, 15)), "pending");
  assert.equal(chairState(a, at(10, 30)), null);
});

test("finished, cancelled and no-show appointments are not on the chair", () => {
  for (const status of ["completed", "cancelled", "no-show"]) {
    assert.equal(chairState(slot(10, 0, 30, status), at(10, 10)), null);
  }
});

test("the list keeps what is still ahead, in start order", () => {
  const items = [
    slot(14, 0, 30, "pending", "c"),
    slot(9, 0, 30, "confirmed", "past"),
    slot(10, 0, 45, "confirmed", "a"),
    slot(11, 0, 30, "confirmed", "b"),
    slot(10, 30, 30, "cancelled", "x"),
  ];
  assert.deepEqual(
    chairList(items, at(10, 20)).map(({ a, state }) => [a._id, state]),
    [
      ["a", "in-progress"],
      ["b", "confirmed"],
      ["c", "pending"],
    ],
  );
});

test("an empty day gives an empty list", () => {
  assert.deepEqual(chairList([], at(12)), []);
});
