// ポラロイド風の写真。資料の写真にも、本文の挿し絵（食べものなど）にも使う。
// image（画像のパス）があれば画像、なければ illustration のスケッチ。

import { el } from "./dom.js";
import { illustration } from "./illustrations.js";

export function photoFrame({ image, illustration: name, caption, label }) {
  const picture = image ? el("img", { src: image, alt: caption || label || "" }) : illustration(name);
  return el("div", { class: "photo" }, [
    el("span", { class: "photo-tape", "aria-hidden": "true" }),
    el("div", { class: "photo-frame" }, picture),
    caption && el("div", { class: "photo-caption" }, caption),
  ]);
}
