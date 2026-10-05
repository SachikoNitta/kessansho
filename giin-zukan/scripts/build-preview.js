// 1枚の HTML にまとめる（Claude の Artifact で非公開プレビューするため）。
//   node scripts/build-preview.js  →  dist-preview/index.html
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFile(join(ROOT, p), "utf8");
const [css, js, data] = await Promise.all([read("style.css"), read("app.js"), read("data/members.json")]);
// </script> がデータに含まれても壊れないように
const json = JSON.stringify(JSON.parse(data)).replace(/</g, "\\u003c");

const html = `<meta charset="utf-8">
<title>国会議員図鑑</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DotGothic16&family=M+PLUS+Rounded+1c:wght@400;700&display=swap">
<style>
${css}
</style>
<main class="wrap" id="app"></main>
<script>window.GIIN_DATA = ${json};</script>
<script type="module">
${js}
</script>
`;
await mkdir(join(ROOT, "dist-preview"), { recursive: true });
await writeFile(join(ROOT, "dist-preview", "index.html"), html);
console.log("dist-preview/index.html を書き出しました");
