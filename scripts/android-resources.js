// Android アプリの見た目（アイコン・起動画面・版）を、Web 版の素材から書き込む。
//   npx cap add android のあとに実行する：node scripts/android-resources.js <版> <ビルド番号>
// アイコンは icons/icon.svg から作る。PNG への変換には rsvg-convert（librsvg）を使う。

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(import.meta.dirname, "..");
const ANDROID = join(ROOT, "android");
const RES = join(ANDROID, "app/src/main/res");
const [version = "0.0.0", build = "1"] = process.argv.slice(2);

if (!existsSync(RES)) throw new Error("android/ がありません。先に npx cap add android を実行してください");
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`版は 0.3.0 の形で指定してください（受け取った値：${version}）`);
if (!/^\d+$/.test(build)) throw new Error(`ビルド番号は整数で指定してください（受け取った値：${build}）`);

const ICON_BG = "#1C1C1C"; // アイコンの地の色（icon.svg の角丸の四角と同じ）
const PAPER = "#EFE8DA"; // 起動画面の紙の色（style.css の --paper と同じ）

const icon = readFileSync(join(ROOT, "icons/icon.svg"), "utf8");
const inner = icon.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
// 地の四角を除いた、絵だけ（アダプティブアイコンの前景）
const glyph = inner.replace(/<rect[^>]*\/>/, "");

const tmp = join(tmpdir(), "kessansho-android");
mkdirSync(tmp, { recursive: true });

function png(svg, w, h, out) {
  const src = join(tmp, "in.svg");
  writeFileSync(src, svg);
  mkdirSync(resolve(out, ".."), { recursive: true });
  execFileSync("rsvg-convert", ["-w", String(w), "-h", String(h), "-o", out, src]);
}

// ランチャーアイコン：密度ごとの大きさ（前景は 108dp、そのうち中央 66% が見える）
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [name, scale] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${name}`);
  const size = Math.round(48 * scale);
  png(icon, size, size, join(dir, "ic_launcher.png"));
  png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><clipPath id="c"><circle cx="256" cy="256" r="256"/></clipPath><g clip-path="url(#c)"><rect width="512" height="512" fill="${ICON_BG}"/>${glyph}</g></svg>`, size, size, join(dir, "ic_launcher_round.png"));
  const fg = Math.round(108 * scale);
  png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-132 -132 776 776">${glyph}</svg>`, fg, fg, join(dir, "ic_launcher_foreground.png"));
}
writeFileSync(join(RES, "values/ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${ICON_BG}</color>\n</resources>\n`);

// 起動画面：紙の色の上に、アイコンを小さく
function splash(w, h) {
  const s = Math.round(Math.min(w, h) * 0.28);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${PAPER}"/><svg x="${(w - s) / 2}" y="${(h - s) / 2}" width="${s}" height="${s}" viewBox="0 0 512 512">${inner}</svg></svg>`;
}
const SPLASH = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
for (const [name, [w, h]] of Object.entries(SPLASH)) {
  png(splash(w, h), w, h, join(RES, `drawable-port-${name}/splash.png`));
  png(splash(h, w), h, w, join(RES, `drawable-land-${name}/splash.png`));
}
png(splash(480, 320), 480, 320, join(RES, "drawable/splash.png"));

// 版：versionName は画面の版と同じ、versionCode はビルドごとに増える番号
const gradle = join(ANDROID, "app/build.gradle");
writeFileSync(gradle, readFileSync(gradle, "utf8")
  .replace(/versionCode \d+/, `versionCode ${build}`)
  .replace(/versionName "[^"]*"/, `versionName "${version}"`));

rmSync(tmp, { recursive: true, force: true });
console.log(`✓ Android のアイコン・起動画面・版（${version} / ${build}）を書き込みました`);
