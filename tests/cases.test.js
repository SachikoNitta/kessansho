import { test } from "node:test";
import assert from "node:assert/strict";
import catalog from "../cases/catalog.js";
import template from "../cases/_template/case.js";
import { validateCase } from "../src/core/validate.js";
import { DOC_TYPES } from "../src/ui/doc-renderers.js";
import { BundledCaseRepository } from "../src/adapters/bundled-case-repository.js";

const repo = new BundledCaseRepository(catalog);

test("一覧の id は重複せず、遊べるケースは load を持つ", () => {
  const ids = catalog.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of catalog) if (c.status === "open") assert.equal(typeof c.load, "function", c.id);
});

for (const c of catalog.filter((c) => c.status === "open")) {
  test(`ケース ${c.id} が検証を通り、id が一覧と一致し、JSON にできる`, async () => {
    const def = await repo.loadCase(c.id);
    const { errors } = validateCase(def, { docTypes: DOC_TYPES });
    assert.deepEqual(errors, []);
    assert.equal(def.id, c.id);
    assert.deepEqual(JSON.parse(JSON.stringify(def)), def);
  });
}

test("Nulo：全問正解で確度18・完全な論証（台本どおり）", async () => {
  const { stats } = validateCase(await repo.loadCase("nulo"));
  assert.equal(stats.maxConfidence, 18);
  assert.equal(stats.perfectEnding, "end_perfect");
});

test("雛形も検証を通る", () => {
  assert.deepEqual(validateCase(template, { docTypes: DOC_TYPES }).errors, []);
});

test("調査中のケースは読み込めない", async () => {
  const locked = catalog.find((c) => c.status === "locked");
  if (locked) await assert.rejects(() => repo.loadCase(locked.id));
});
