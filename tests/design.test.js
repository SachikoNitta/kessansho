// デザイン原則（Material Design 3 と WCAG 2.1 AA に合わせる）を、style.css に対して確かめる。
//   ・文字は 12px 以上
//   ・文字の色は、紙（paper / card）の上で 4.5:1 以上のコントラスト
//   ・押せるもの（ボタン・タブ・選択肢・メニュー）は高さ 48px 以上
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

function token(name) {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  assert.ok(m, `--${name} が見つからない`);
  return m[1];
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** セレクタの宣言ブロック（最初に見つかったもの） */
function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`^${escaped} \\{([^}]*)\\}`, "m"));
  assert.ok(m, `${selector} が見つからない`);
  return m[1];
}

test("文字は 12px 以上", () => {
  const small = [...css.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1])).filter((px) => px < 12);
  assert.deepEqual(small, [], "12px 未満の文字がある");
});

test("文字の色は、紙の上で 4.5:1 以上のコントラスト", () => {
  for (const bg of ["paper", "card"]) {
    for (const fg of ["ink", "ink-soft", "muted", "faint", "navy", "red"]) {
      const ratio = contrast(token(fg), token(bg));
      assert.ok(ratio >= 4.5, `--${fg} on --${bg}: ${ratio.toFixed(2)}:1`);
    }
  }
});

test("押せるものは高さ 48px 以上", () => {
  for (const selector of [".link", ".link.underline", ".cover-menu button", ".docs-fab", ".option", ".tab", ".index-tabs .tab", ".menu-item"]) {
    const m = block(selector).match(/min-height:\s*(\d+)px/);
    assert.ok(m, `${selector} に min-height がない`);
    assert.ok(Number(m[1]) >= 48, `${selector}: ${m[1]}px`);
  }
});
