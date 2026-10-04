// Web 版のビルド：配布するファイルを dist/ に集め、版を書き込む。
//   node scripts/build.js <版> [出力先]     例：node scripts/build.js 0.3.0
// 配布するファイルの一覧は sw.js の ASSETS（オフライン用キャッシュの一覧）をそのまま使う。
// 一覧の漏れは tests/offline.test.js が検出するので、ここで別の一覧は持たない。

import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const [version = "dev", out = join(ROOT, "dist")] = process.argv.slice(2);

if (version !== "dev" && !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`版は 0.3.0 の形で指定してください（受け取った値：${version}）`);
  process.exit(1);
}

const sw = readFileSync(join(ROOT, "sw.js"), "utf8");
const list = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!list) throw new Error("sw.js に ASSETS が見つかりません");
const assets = [...list[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((f) => f !== "./");

rmSync(out, { recursive: true, force: true });
for (const file of assets) {
  mkdirSync(dirname(join(out, file)), { recursive: true });
  copyFileSync(join(ROOT, file), join(out, file));
}

// 版を書き込む：画面に出す版と、端末のキャッシュを入れ替えるための CACHE 名
writeFileSync(join(out, "src/version.js"), `// リリースのビルドで生成\nexport const VERSION = ${JSON.stringify(version)};\n`);
writeFileSync(join(out, "sw.js"), sw.replace(/const CACHE = "[^"]*";/, `const CACHE = "kessansho-${version}";`));
writeFileSync(join(out, ".nojekyll"), "");

console.log(`✓ ${assets.length + 1} ファイルを ${out} に出力しました（ver ${version}）`);
