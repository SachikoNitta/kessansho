// 組み立て（コンポジションルート）。具体的な実装を選んで注入するのは、このファイルだけ。

import catalog from "../cases/catalog.js";
import { CaseSession } from "./core/session.js";
import { createConditionEvaluator } from "./core/conditions.js";
import { ProgressStore } from "./core/progress.js";
import { Preferences } from "./core/preferences.js";
import { LocalStorageStore } from "./adapters/local-storage-store.js";
import { BundledCaseRepository } from "./adapters/bundled-case-repository.js";
import { App } from "./ui/app.js";
import { Sheet } from "./ui/sheet.js";
import { createSceneViews } from "./ui/screens/scene-views.js";
import { createDocRenderers } from "./ui/doc-renderers.js";

const root = document.getElementById("app");
const store = new LocalStorageStore();
const conditions = createConditionEvaluator();

const app = new App({
  root,
  sheet: new Sheet(document.getElementById("sheet-root"), root),
  title: "決算書は嘘をつく",
  repository: new BundledCaseRepository(catalog),
  progress: new ProgressStore(store),
  preferences: new Preferences(store),
  createSession: (definition, snapshot) => new CaseSession(definition, { conditions, snapshot }),
  sceneViews: createSceneViews(),
  docRenderers: createDocRenderers(),
});

app.start();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => { /* オフライン対応は任意 */ });
}
