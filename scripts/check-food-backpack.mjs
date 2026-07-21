import assert from "node:assert/strict";

import { packFoodBudget } from "../src/lib/food-backpack.ts";

const foods = [
  { name: "猪脚饭", unit: "份", priceCents: 1800 },
  { name: "肠粉", unit: "份", priceCents: 900 },
  { name: "可乐", unit: "瓶", priceCents: 400 },
];

assert.deepEqual(packFoodBudget(foods, 4800), [
  { name: "猪脚饭", unit: "份", amount: 2, isPartial: false },
  { name: "肠粉", unit: "份", amount: 1, isPartial: false },
  { name: "可乐", unit: "瓶", amount: 0.75, isPartial: true },
]);
assert.deepEqual(packFoodBudget(foods, 900), [
  { name: "肠粉", unit: "份", amount: 1, isPartial: false },
]);
assert.deepEqual(packFoodBudget(foods, 200), [
  { name: "可乐", unit: "瓶", amount: 0.5, isPartial: true },
]);
assert.deepEqual(packFoodBudget(foods, 0), []);

console.log("Food backpack allocation OK");
