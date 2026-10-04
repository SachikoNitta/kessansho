// 同梱ケースの一覧。ケースを足すときは、cases/<id>/case.js を作ってここに1行足す。
//   status: "open"   遊べる（load で中身を読む）
//           "locked" 一覧に「調査中」として出すだけ

export default [
  { id: "nulo", no: "No.01", name: "Nulo", blurb: "議事録AI・上場一年目", status: "open", load: () => import("./nulo/case.js") },
  { id: "kiribetsu", no: "No.02", name: "調査中", blurb: "近日、追加予定", status: "locked" },
];
