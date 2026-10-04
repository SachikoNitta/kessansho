// Claude の非公開ページ（Artifact）用のビルド：アプリ全体を 1 枚の HTML にまとめる。
//   node scripts/build-artifact.js <版> [出力先ファイル]
// Artifact では自前のスクリプトをファイルとして読めず、Service Worker も使えないので、
// JS は esbuild で 1 本にまとめて埋め込み、CSS も埋め込む。表紙の版には "<版>-preview" と出す。

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const [version = "dev", out = join(ROOT, "dist-artifact/index.html")] = process.argv.slice(2);

const bundle = await build({
  entryPoints: [join(ROOT, "src/main.js")],
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: true,
  write: false,
  define: { __ARTIFACT__: "true" },
  plugins: [{
    name: "version",
    setup(b) {
      b.onLoad({ filter: /src[\\/]version\.js$/ }, () => ({
        contents: `export const VERSION = ${JSON.stringify(`${version}-preview`)};`,
        loader: "js",
      }));
    },
  }],
});

const js = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync(join(ROOT, "style.css"), "utf8");
const html = readFileSync(join(ROOT, "index.html"), "utf8");

// index.html の <body> の中身（紙の質感・画面の置き場）だけを取り出し、読み込みの script は外す
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[^>]*src="src\/main\.js"[^>]*><\/script>\s*/, "");
const fonts = html.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/)[0];

const page = `<title>決算書は嘘をつく</title>
${fonts}
<style>
:root { color-scheme: light; }
${css}
</style>
${body.trim()}
<script>
${js}
</script>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`✓ ${out}（${(page.length / 1024).toFixed(0)} KB、ver ${version}-preview）`);
