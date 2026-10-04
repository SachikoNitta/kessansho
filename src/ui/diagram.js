// 本文に差し込む図。いまは「お金の輪」（cycle）だけ：
// 箱を円の上に並べ、隣どうしを矢印でつなぎ、輪の上を硬貨が回り続ける。
//
// spec = {
//   kind: "cycle",
//   title, note?,
//   nodes: [{ label, sub? }],              上から時計回りに並ぶ
//   edges: [{ from, to, label, dashed? }], dashed はまだ確かめていないつながり
// }

import { el, svg } from "./dom.js";

const W = 320;
const H = 200;
const CX = W / 2;
const CY = 108;
const RX = 108; // 横に広い楕円の上に箱を並べる
const RY = 80;
const BOX_H = 40;
let uid = 0;

function boxWidth(node) {
  return Math.max(76, Math.min(140, Math.max(node.label.length * 13.5, (node.sub || "").length * 10.5) + 18));
}

/** 2つの箱の中心を結ぶ、外側にふくらんだ曲線 */
function arc(a, b) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = mx - CX;
  const dy = my - CY;
  const len = Math.hypot(dx, dy) || 1;
  const bulge = 38;
  const c = { x: mx + (dx / len) * bulge, y: my + (dy / len) * bulge };
  // 曲線のまんなか（ラベルの位置）
  const mid = { x: 0.25 * a.x + 0.5 * c.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * c.y + 0.25 * b.y };
  return { c, mid, out: { x: dx / len, y: dy / len } };
}

/** 二次ベジェ曲線の t の位置 */
const at = (a, c, b, t) => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
});

function cycle(spec, delay) {
  const id = `dia${++uid}`;
  const n = spec.nodes.length;
  const pos = spec.nodes.map((node, i) => {
    const t = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: CX + RX * Math.cos(t), y: CY + RY * Math.sin(t), w: boxWidth(node) };
  });

  const ring = [];
  const arrows = spec.edges.map((e, k) => {
    const a = pos[e.from];
    const b = pos[e.to];
    const { c, mid, out } = arc(a, b);
    ring.push(`${k ? "" : `M ${a.x} ${a.y} `}Q ${c.x} ${c.y} ${b.x} ${b.y}`);
    // 矢印は箱にかからないところだけ描く
    const p0 = at(a, c, b, 0.3);
    const p1 = at(a, c, b, 0.72);
    const pc = at(a, c, b, 0.51);
    const cc = { x: 2 * pc.x - (p0.x + p1.x) / 2, y: 2 * pc.y - (p0.y + p1.y) / 2 };
    const lx = mid.x + out.x * 16;
    const ly = mid.y + out.y * 16;
    return [
      svg("path", {
        class: `dia-arrow${e.dashed ? " dashed" : ""}`,
        d: `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q ${cc.x.toFixed(1)} ${cc.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
        "marker-end": `url(#${id}-head)`,
        pathLength: e.dashed ? null : "1",
        style: `animation-delay:${delay + 0.3 + k * 0.45}s`,
      }),
      svg("text", {
        class: `dia-label${e.dashed ? " dashed" : ""}`,
        x: lx.toFixed(1), y: (ly + 4).toFixed(1),
        "text-anchor": Math.abs(out.x) < 0.3 ? "middle" : out.x > 0 ? "start" : "end",
        style: `animation-delay:${delay + 0.5 + k * 0.45}s`,
      }, e.label),
    ];
  });

  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 輪の上を回る硬貨（箱の下をくぐる）
  const coin = reduce ? null : svg("g", { class: "dia-coin", style: `animation-delay:${delay + 1.8}s` }, [
    svg("circle", { r: 7 }),
    svg("text", { y: 3.5, "text-anchor": "middle" }, "¥"),
    svg("animateMotion", { dur: `${n * 1.3}s`, repeatCount: "indefinite", path: ring.join(" ") }),
  ]);

  const boxes = spec.nodes.map((node, i) => {
    const p = pos[i];
    return svg("g", { class: "dia-node" }, [
      svg("rect", { x: p.x - p.w / 2, y: p.y - BOX_H / 2, width: p.w, height: BOX_H, rx: 6 }),
      svg("text", { class: "dia-name", x: p.x, y: node.sub ? p.y + 1 : p.y + 5, "text-anchor": "middle" }, node.label),
      node.sub && svg("text", { class: "dia-sub", x: p.x, y: p.y + 14, "text-anchor": "middle" }, node.sub),
    ]);
  });

  const summary = `${spec.title}。` + spec.edges.map((e) =>
    `${spec.nodes[e.from].label}から${spec.nodes[e.to].label}へ、${e.label}${e.dashed ? "（未確認）" : ""}`).join("。");

  return el("figure", { class: "diagram reveal", style: `animation-delay:${delay}s`, role: "img", "aria-label": summary }, [
    el("div", { class: "graph-head" }, el("span", { class: "graph-title" }, spec.title)),
    svg("svg", { class: "dia-svg", viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" }, [
      svg("defs", {}, svg("marker", { id: `${id}-head`, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
        svg("path", { class: "dia-head", d: "M 0 0 L 10 5 L 0 10 z" }))),
      ...arrows.flat(),
      coin,
      ...boxes,
    ]),
    spec.note && el("div", { class: "graph-note" }, spec.note),
  ]);
}

const KINDS = { cycle };

/** @param {number} delay 表示を始めるまでの秒数 */
export function diagram(spec, delay = 0) {
  const draw = KINDS[spec.kind];
  if (!draw) throw new Error(`図の種類 "${spec.kind}" はありません`);
  return draw(spec, delay);
}
