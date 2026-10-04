// 本文の「写真」に使うインクのスケッチ。実写の代わりに、紙の上に描いた線画として見せる。
// 名前 → SVG。新しい絵は ILLUSTRATIONS に足すだけ。

import { svg } from "./dom.js";

const INK = "#2F3E5C";
const WASH = "#E6DCC8";
const SHADE = "#D6C9B0";

const line = (d, w = 1.2, extra = {}) => svg("path", { d, fill: "none", stroke: INK, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", ...extra });
const shape = (d, fill = SHADE, extra = {}) => svg("path", { d, fill, stroke: INK, "stroke-width": 1.1, "stroke-linejoin": "round", ...extra });
const person = (x, y, s = 1) => svg("g", { transform: `translate(${x} ${y}) scale(${s})` }, [
  svg("circle", { cx: 0, cy: -16, r: 5, fill: SHADE, stroke: INK, "stroke-width": 1.1 }),
  shape("M -8 4 C -8 -6, -5 -10, 0 -10 C 5 -10, 8 -6, 8 4 Z", "#C9BBA0"),
]);

/** 渋谷本社：ガラス張りのフロア、ロゴの壁、並んだ机 */
function office() {
  const desks = [[70, 150], [140, 158], [210, 150], [262, 162]].map(([x, y]) => svg("g", {}, [
    shape(`M ${x - 26} ${y} L ${x + 26} ${y} L ${x + 32} ${y + 12} L ${x - 32} ${y + 12} Z`, "#EFE6D3"),
    shape(`M ${x - 10} ${y - 15} L ${x + 10} ${y - 15} L ${x + 10} ${y - 2} L ${x - 10} ${y - 2} Z`, "#3E4C68"),
    line(`M ${x} ${y - 2} L ${x} ${y}`),
  ]));
  return svg("svg", { viewBox: "0 0 320 200", role: "img", "aria-label": "ガラス張りのオフィスのスケッチ" }, [
    svg("rect", { width: 320, height: 200, fill: WASH }),
    // 奥の壁と床の遠近
    shape("M 92 38 L 228 38 L 228 112 L 92 112 Z", "#EFE6D3"),
    line("M 0 0 L 92 38 M 320 0 L 228 38 M 0 200 L 92 112 M 320 200 L 228 112"),
    line("M 0 150 L 60 124", 0.8, { opacity: 0.5 }), line("M 320 150 L 260 124", 0.8, { opacity: 0.5 }),
    // 天井の照明
    ...[0, 1, 2].map((i) => line(`M ${120 + i * 40} ${16 + i * 0} L ${136 + i * 40} ${16}`, 2)),
    // ロゴの壁
    svg("text", { x: 160, y: 82, "text-anchor": "middle", "font-family": "Helvetica, Arial, sans-serif", "font-weight": 700, "font-size": 22, fill: INK, "letter-spacing": 1 }, "Nulog"),
    line("M 140 90 L 180 90", 1, { opacity: 0.6 }),
    // 左右のガラス
    ...[18, 40, 62].map((x, i) => line(`M ${x} ${8 + i * 9} L ${x} ${178 - i * 18}`, 0.9, { opacity: 0.7 })),
    ...[258, 280, 302].map((x, i) => line(`M ${x} ${26 - i * 9} L ${x} ${142 + i * 18}`, 0.9, { opacity: 0.7 })),
    line("M 26 60 L 34 52 M 48 70 L 56 62", 0.8, { opacity: 0.5 }),
    // 観葉植物
    svg("circle", { cx: 236, cy: 98, r: 9, fill: "#B9C2A2", stroke: INK, "stroke-width": 1 }),
    shape("M 231 104 L 241 104 L 239 114 L 233 114 Z", "#C9BBA0"),
    ...desks,
    person(88, 146, 0.9), person(196, 146, 0.9), person(150, 154, 0.8),
  ]);
}

/** 決算説明会：右肩上がりのグラフの前で話す社長 */
function stage() {
  return svg("svg", { viewBox: "0 0 320 200", role: "img", "aria-label": "決算説明会で話す社長のスケッチ" }, [
    svg("rect", { width: 320, height: 200, fill: "#D9CDB5" }),
    // スクリーン
    shape("M 70 18 L 250 18 L 250 112 L 70 112 Z", "#F4EEDF"),
    line("M 88 98 L 124 86 L 156 80 L 186 60 L 214 46 L 236 30", 2.2),
    svg("circle", { cx: 236, cy: 30, r: 3, fill: INK }),
    line("M 88 104 L 236 104", 0.8, { opacity: 0.5 }),
    svg("text", { x: 90, y: 38, "font-family": "Helvetica, Arial, sans-serif", "font-weight": 700, "font-size": 11, fill: INK }, "Revenue  ×5.7"),
    // スポットライト
    svg("path", { d: "M 150 0 L 120 172 L 196 172 Z", fill: "#FFF8E6", opacity: 0.55 }),
    // 演台と社長
    shape("M 172 128 L 204 128 L 200 172 L 176 172 Z", "#3E4C68"),
    svg("circle", { cx: 154, cy: 104, r: 9, fill: SHADE, stroke: INK, "stroke-width": 1.2 }),
    shape("M 138 172 L 140 128 C 141 120, 146 116, 154 116 C 162 116, 167 120, 168 128 L 170 172 Z", "#2A2620"),
    line("M 166 132 L 180 124", 2.4),
    // 客席
    ...[30, 70, 110, 150, 190, 230, 270, 300].map((x, i) => svg("circle", { cx: x, cy: 192 + (i % 2) * 3, r: 10, fill: "#8A7D66", stroke: INK, "stroke-width": 0.8 })),
  ]);
}

// ---------- 白樺の食べもの（喫茶店のテーブルの上） ----------

const WOOD = "#C9A27A";
const PLATE = "#FBF8F1";

function table(children) {
  return [
    svg("rect", { width: 320, height: 200, fill: WOOD }),
    ...[30, 78, 126, 174].map((y) => line(`M 0 ${y} C 90 ${y - 6}, 200 ${y + 6}, 320 ${y - 2}`, 0.7, { opacity: 0.35 })),
    ...children,
  ];
}

function plate(cx, cy, rx, ry) {
  return [
    svg("ellipse", { cx, cy: cy + 4, rx, ry, fill: "rgba(60,40,20,0.18)" }),
    svg("ellipse", { cx, cy, rx, ry, fill: PLATE, stroke: INK, "stroke-width": 1.2 }),
    svg("ellipse", { cx, cy, rx: rx * 0.72, ry: ry * 0.72, fill: "none", stroke: INK, "stroke-width": 0.7, opacity: 0.45 }),
  ];
}

function cup(cx, cy, s = 1) {
  return svg("g", { transform: `translate(${cx} ${cy}) scale(${s})` }, [
    ...plate(0, 18, 62, 24),
    shape("M -36 -6 C -34 26, -22 38, 0 38 C 22 38, 34 26, 36 -6 Z", PLATE),
    shape("M 34 2 C 52 0, 54 22, 30 24", "none"),
    svg("ellipse", { cx: 0, cy: -6, rx: 36, ry: 12, fill: PLATE, stroke: INK, "stroke-width": 1.2 }),
    svg("ellipse", { cx: 0, cy: -5, rx: 30, ry: 9, fill: "#4A2C1D" }),
    svg("ellipse", { cx: -8, cy: -7, rx: 9, ry: 2.5, fill: "#7A4E33", opacity: 0.8 }),
    line("M -54 30 L -18 22", 2.2), svg("ellipse", { cx: -56, cy: 31, rx: 5, ry: 3, fill: "#B7B2A8", stroke: INK, "stroke-width": 0.8 }),
    line("M -10 -24 C -16 -34, -4 -40, -10 -52", 1, { opacity: 0.55 }),
    line("M 6 -22 C 0 -34, 12 -40, 6 -54", 1, { opacity: 0.55 }),
  ]);
}

/** 白樺のブレンド */
function coffee() {
  return svg("svg", { viewBox: "0 0 320 200", role: "img", "aria-label": "湯気の立つブレンドコーヒーのスケッチ" }, table([cup(160, 104, 1.25)]));
}

/** バタートースト二枚 */
function toast() {
  const slice = (x, y, r) => svg("g", { transform: `translate(${x} ${y}) rotate(${r})` }, [
    shape("M -34 -30 C -40 -44, -18 -50, -6 -40 C 6 -50, 30 -46, 30 -30 L 30 30 C 30 34, 26 36, 22 36 L -30 36 C -34 36, -36 32, -34 28 Z", "#A86B2F"),
    shape("M -28 -26 C -32 -36, -16 -42, -6 -34 C 4 -42, 24 -38, 24 -26 L 24 28 L -28 28 Z", "#E2B26A", { "stroke-width": 0.6 }),
    ...[[-14, -10], [8, 4], [-6, 16]].map(([bx, by]) => line(`M ${bx - 5} ${by} L ${bx + 5} ${by + 2}`, 0.8, { opacity: 0.4 })),
    shape("M -10 -8 L 8 -10 L 10 4 L -8 6 Z", "#F3DC8A", { "stroke-width": 0.8 }),
    svg("path", { d: "M -8 6 C -10 12, -4 14, -2 8", fill: "#F3DC8A", opacity: 0.8 }),
  ]);
  return svg("svg", { viewBox: "0 0 320 200", role: "img", "aria-label": "皿にのったバタートースト二枚のスケッチ" }, table([
    ...plate(150, 108, 118, 64),
    slice(116, 104, -8), slice(186, 110, 10),
    cup(282, 52, 0.55),
  ]));
}

/** 卵サンド */
function eggSando() {
  const sando = (x, y, flip) => svg("g", { transform: `translate(${x} ${y}) scale(${flip} 1)` }, [
    shape("M -40 26 L 40 26 L 0 -34 Z", "#F6EBD3"),
    shape("M -34 18 L 34 18 L 28 10 L -28 10 Z", "#F2D46B", { "stroke-width": 0.8 }),
    ...[-18, -4, 10].map((ex) => svg("circle", { cx: ex, cy: 14, r: 1.6, fill: "#FBF4DC" })),
    line("M -40 26 L 40 26", 1.4),
  ]);
  return svg("svg", { viewBox: "0 0 320 200", role: "img", "aria-label": "卵サンドのスケッチ" }, table([
    ...plate(148, 112, 110, 58),
    sando(112, 108, 1), sando(178, 116, -1),
    svg("circle", { cx: 214, cy: 82, r: 7, fill: "#7FA05A", stroke: INK, "stroke-width": 0.8 }),
    cup(278, 58, 0.5),
  ]));
}

/** ナポリタン */
function napolitan() {
  const noodles = [];
  for (let i = 0; i < 16; i++) {
    const y = 84 + (i % 8) * 6;
    const x = 100 + (i * 13) % 90;
    noodles.push(line(`M ${x} ${y} C ${x + 24} ${y - 14}, ${x + 40} ${y + 16}, ${x + 66} ${y - 4}`, 3.2, { stroke: "#D9692E", opacity: 0.9 }));
  }
  return svg("svg", { viewBox: "0 0 320 200", role: "img", "aria-label": "ナポリタンのスケッチ" }, table([
    ...plate(160, 108, 126, 66),
    svg("ellipse", { cx: 160, cy: 104, rx: 82, ry: 38, fill: "#E58A4E", stroke: INK, "stroke-width": 1 }),
    ...noodles,
    ...[[130, 92], [176, 112], [202, 92]].map(([x, y]) => svg("circle", { cx: x, cy: y, r: 7, fill: "#B9533A", stroke: INK, "stroke-width": 0.8 })),
    ...[[150, 118], [188, 88], [118, 112]].map(([x, y]) => svg("path", { d: `M ${x - 7} ${y} C ${x - 4} ${y - 7}, ${x + 4} ${y - 7}, ${x + 7} ${y} C ${x + 4} ${y - 3}, ${x - 4} ${y - 3}, ${x - 7} ${y} Z`, fill: "#6E9A4B", stroke: INK, "stroke-width": 0.7 })),
    line("M 252 70 L 286 170", 2.4), line("M 246 70 L 252 70 M 248 62 L 252 70 M 254 62 L 252 70 M 258 66 L 252 70", 1.2),
  ]));
}

const ILLUSTRATIONS = { office, stage, coffee, toast, eggSando, napolitan };

export function illustration(name) {
  const draw = ILLUSTRATIONS[name];
  return draw ? draw() : null;
}
