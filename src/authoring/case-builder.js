// ケースを書くための道具。ケースのファイルはこれだけに依存し、出力は CaseDefinition（純粋なデータ）。
//
//   pages(id, chapter, [[段落…], [段落…]], next)   本文。1つの配列が1画面。2画面目以降の id は `${id}_2`…
//   choice(id, chapter, { recap, prompt, docs, retry, next, options })
//     option = { label, judge: "o"|"tri"|"x", text?, gain?, delta?, flags?, requires?, next? }
//       delta 省略時：retry の分岐は o +1 / tri 0 / x −1、retry: false の分岐は 0
//       retry の分岐で o 以外を選ぶと、text を読んで分岐に戻る
//       text がない選択肢は、選んだ答えを吹き出しにして次のシーンへ
//   route(id, chapter, [{ if?: 条件, go }])       上から評価して最初に当てはまった go へ
//   end(id, chapter)
//   build(meta)                                 meta（id, start, chapters, inferences, endings, docs…）と合わせて完成

const DEFAULT_DELTA = { o: 1, tri: 0, x: -1 };

export function createCaseBuilder() {
  const scenes = {};

  function add(id, scene) {
    if (scenes[id]) throw new Error(`シーン id "${id}" が重複しています`);
    scenes[id] = scene;
  }

  function pages(id, chapter, list, next) {
    list.forEach((paragraphs, i) => {
      add(i === 0 ? id : `${id}_${i + 1}`, {
        type: "text",
        chapter,
        paragraphs,
        next: i === list.length - 1 ? next : `${id}_${i + 2}`,
      });
    });
  }

  function choice(id, chapter, def) {
    const retry = def.retry !== false;
    const scene = { type: "choice", chapter, recap: def.recap, prompt: def.prompt, docs: def.docs || [], retry, options: [] };
    add(id, scene);
    def.options.forEach((opt, i) => {
      const delta = opt.delta != null ? opt.delta : retry ? DEFAULT_DELTA[opt.judge] : 0;
      const after = opt.next || (retry && opt.judge !== "o" ? id : def.next);
      const option = { label: opt.label, judge: opt.judge, delta, flags: opt.flags || [], requires: opt.requires || null };
      if (opt.text) {
        const resultId = `${id}__${i + 1}`;
        add(resultId, { type: "text", chapter, showChoice: true, paragraphs: opt.text, gain: opt.gain || null, next: after });
        option.next = resultId;
      } else {
        option.next = after;
        option.bubble = true;
      }
      scene.options.push(option);
    });
  }

  function route(id, chapter, rules) {
    add(id, { type: "route", chapter, rules });
  }

  function end(id, chapter) {
    add(id, { type: "end", chapter });
  }

  function build(meta) {
    return { startConfidence: 0, endings: {}, docs: {}, ...meta, scenes };
  }

  return { pages, choice, route, end, build };
}
