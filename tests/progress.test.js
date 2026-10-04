import { test } from "node:test";
import assert from "node:assert/strict";
import { ProgressStore } from "../src/core/progress.js";
import { Preferences } from "../src/core/preferences.js";
import { MemoryStore } from "../src/adapters/memory-store.js";

test("セーブと記録はケースごとに分かれ、clearAll で全部消える", () => {
  const kv = new MemoryStore();
  kv.set("unrelated", 1);
  const p = new ProgressStore(kv);
  p.saveSnapshot("a", { scene: "x" });
  p.record("a", [{ type: "ending", id: "e1" }, { type: "inference", id: "A" }]);
  p.record("a", [{ type: "ending", id: "e1" }]);
  p.record("b", [{ type: "inference", id: "Z" }]);

  assert.ok(p.hasProgress("a"));
  assert.ok(!p.hasProgress("b"));
  assert.deepEqual(p.records("a"), { endings: ["e1"], inferences: ["A"] });
  assert.deepEqual(p.records("b"), { endings: [], inferences: ["Z"] });

  p.clearAll();
  assert.ok(!p.hasProgress("a"));
  assert.deepEqual(p.records("a"), { endings: [], inferences: [] });
  assert.equal(kv.get("unrelated"), 1, "他のキーは消さない");
});

test("表示の好みを保存する", () => {
  const kv = new MemoryStore();
  assert.equal(new Preferences(kv).largeText, false);
  new Preferences(kv).toggleLargeText();
  assert.equal(new Preferences(kv).largeText, true);
});
