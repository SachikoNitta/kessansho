// 同梱ケースと雛形を検証し、ケースごとの概要を表示する（`npm run validate`）。

import catalog from "../cases/catalog.js";
import template from "../cases/_template/case.js";
import { validateCase } from "../src/core/validate.js";
import { DOC_TYPES } from "../src/ui/doc-renderers.js";

let failed = false;
const targets = [
  ...(await Promise.all(catalog.filter((c) => c.status === "open").map(async (c) => [c.id, (await c.load()).default]))),
  ["_template", template],
];

for (const [name, def] of targets) {
  const { errors, stats } = validateCase(def, { docTypes: DOC_TYPES });
  if (errors.length) {
    failed = true;
    console.error(`✗ ${name}\n` + errors.map((e) => `    ${e}`).join("\n"));
  } else {
    console.log(`✓ ${name}: ${stats.scenes} シーン、${stats.inferences} 推論、${stats.docs} 資料、全問正解で確度 ${stats.maxConfidence}・結末「${def.endings[stats.perfectEnding]}」`);
  }
}
process.exit(failed ? 1 : 0);
