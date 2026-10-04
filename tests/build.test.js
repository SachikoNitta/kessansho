import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

test("ビルドは配布ファイルを集め、版を書き込む", () => {
  const out = mkdtempSync(join(tmpdir(), "kessansho-build-"));
  execFileSync("node", [join(ROOT, "scripts/build.js"), "1.2.3", out]);
  for (const f of ["index.html", "src/main.js", "cases/nulo/case.js", "sw.js", ".nojekyll"]) {
    assert.ok(existsSync(join(out, f)), `${f} がありません`);
  }
  assert.ok(!existsSync(join(out, "tests")), "テストは配布しない");
  assert.ok(!existsSync(join(out, "cases/_template")), "雛形は配布しない");
  assert.match(readFileSync(join(out, "src/version.js"), "utf8"), /"1\.2\.3"/);
  assert.match(readFileSync(join(out, "sw.js"), "utf8"), /const CACHE = "kessansho-1\.2\.3";/);
});

test("版の形が違えばビルドは失敗する", () => {
  assert.throws(() => execFileSync("node", [join(ROOT, "scripts/build.js"), "v1.2"], { stdio: "pipe" }));
});
