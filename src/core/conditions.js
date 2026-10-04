// 結末の判定などで使う条件式の評価器。
// 条件の種類は登録制で、新しい種類は評価器を作るときに足す（既存のコードは変えない）。

const BUILT_IN = {
  any: (list, view, evaluate) => list.some((c) => evaluate(c, view)),
  all: (list, view, evaluate) => list.every((c) => evaluate(c, view)),
  flag: (name, view) => view.flags.includes(name),
  notFlag: (name, view) => !view.flags.includes(name),
  inference: (id, view) => view.inferences.includes(id),
  confidenceBelow: (n, view) => view.confidence < n,
  confidenceAtLeast: (n, view) => view.confidence >= n,
};

/**
 * @param {Object<string, (value: any, view: object, evaluate: Function) => boolean>} [extra]
 */
export function createConditionEvaluator(extra = {}) {
  const tests = { ...BUILT_IN, ...extra };

  /** 条件オブジェクトのキーをすべて満たすとき true。条件なしは常に true。 */
  function evaluate(condition, view) {
    if (!condition) return true;
    return Object.entries(condition).every(([kind, value]) => {
      const test = tests[kind];
      if (!test) throw new Error(`未知の条件 "${kind}"`);
      return test(value, view, evaluate);
    });
  }

  /** 条件式に未知の種類が含まれていないか（検証用） */
  function unknownKinds(condition) {
    if (!condition) return [];
    return Object.entries(condition).flatMap(([kind, value]) => {
      if (!tests[kind]) return [kind];
      return kind === "any" || kind === "all" ? value.flatMap(unknownKinds) : [];
    });
  }

  return { evaluate, unknownKinds };
}
