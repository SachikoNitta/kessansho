// 同梱ファイルがすべてオフライン用にキャッシュされるか（sw.js の ASSETS の漏れ検出）。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function files(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(ROOT, path)).isDirectory() ? files(path) : [path];
  });
}

test("src/ と cases/（雛形以外）のファイルが sw.js の ASSETS に入っている", () => {
  const sw = readFileSync(join(ROOT, "sw.js"), "utf8");
  const listed = new Set([...sw.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  const runtime = [...files("src"), ...files("cases")].filter((f) => !f.startsWith("cases/_template/"));
  const missing = runtime.filter((f) => !listed.has(f));
  assert.deepEqual(missing, [], `sw.js の ASSETS に足りないファイル: ${missing.join(", ")}`);
});
