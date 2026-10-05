// data/members.json の形と出典の有無を確かめる。問題があれば終了コード 1。
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateData } from "./lib.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(await readFile(join(ROOT, "data", "members.json"), "utf8"));
const errors = validateData(data);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const unreviewed = data.members.filter((m) => !m.review.reviewed).length;
console.log(`議員 ${data.members.length} 人、問題なし（未確認 ${unreviewed} 人）`);
