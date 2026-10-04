// 依存の向きを守るためのテスト。抽象（core）は具象（ui・adapters・cases）に依存しない。
//
//   core       → core だけ
//   authoring  → なし
//   adapters   → core だけ（契約の型）
//   ui         → ui と core の契約（contracts.js）だけ。adapters と cases は知らない
//   cases      → authoring だけ（catalog は自分のケースを読む）
//   main.js    → すべて（組み立て役）

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function files(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(ROOT, path)).isDirectory() ? files(path) : path.endsWith(".js") ? [path] : [];
  });
}

function imports(file) {
  const src = readFileSync(join(ROOT, file), "utf8");
  const found = [...src.matchAll(/(?:import|export)[^"'()]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)];
  return found.map((m) => relative(ROOT, resolve(ROOT, dirname(file), m[1] || m[2])));
}

const RULES = [
  { from: "src/core/", allow: ["src/core/"] },
  { from: "src/authoring/", allow: [] },
  { from: "src/adapters/", allow: ["src/core/contracts.js"] },
  { from: "src/ui/", allow: ["src/ui/", "src/core/contracts.js"] },
  { from: "cases/", allow: ["src/authoring/", "cases/"] },
];

for (const rule of RULES) {
  test(`${rule.from} の依存は ${rule.allow.join("、") || "なし"} だけ`, () => {
    for (const file of files(rule.from)) {
      for (const dep of imports(file)) {
        assert.ok(rule.allow.some((a) => dep.startsWith(a)), `${file} が ${dep} に依存しています`);
      }
    }
  });
}
