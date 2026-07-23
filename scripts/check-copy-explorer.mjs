import assert from "node:assert/strict";

import { rankRelatedCopyEntries } from "../src/lib/copy-explorer.ts";

const current = {
  id: "current",
  kind: "RESULT",
  content: "先在夜里安静一会儿。",
  activitySlug: "stare",
  dimensionKeys: {
    emotional_core: ["serenity"],
    psychological_need: ["rest"],
    scene: ["solitude"],
  },
};
const entries = [
  {
    id: "same-path",
    kind: "RESULT",
    content: "安静不是空白。",
    activitySlug: "stare",
    dimensionKeys: {
      emotional_core: ["serenity"],
      psychological_need: ["rest"],
      scene: ["solitude"],
    },
  },
  {
    id: "weak-path",
    kind: "CARD",
    content: "风从窗边经过。",
    activitySlug: "walk",
    dimensionKeys: { scene: ["solitude"] },
  },
  {
    id: "unrelated",
    kind: "RESULT",
    content: "另一条没有关联的句子。",
    activitySlug: "tea",
    dimensionKeys: { energy: ["bright"] },
  },
];

assert.deepEqual(
  rankRelatedCopyEntries(entries, current).map((entry) => entry.id),
  ["same-path", "weak-path"],
);
assert.deepEqual(
  rankRelatedCopyEntries(entries, current, ["same-path"]).map((entry) => entry.id),
  ["weak-path"],
);

console.log("copy explorer ranking OK");
