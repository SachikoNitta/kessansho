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

const ILLUSTRATIONS = { office, stage };

export function illustration(name) {
  const draw = ILLUSTRATIONS[name];
  return draw ? draw() : null;
}
