export type FoodBudgetItem = {
  name: string;
  unit: string;
  priceCents: number;
};

export type FoodBackpackItem = {
  name: string;
  unit: string;
  amount: number;
  isPartial: boolean;
};

export function packFoodBudget(foods: FoodBudgetItem[], totalCents: number): FoodBackpackItem[] {
  let remainder = Math.max(0, Math.round(totalCents));
  const items: FoodBackpackItem[] = [];

  for (const food of foods) {
    const amount = Math.floor(remainder / food.priceCents);
    if (!amount) continue;
    items.push({ name: food.name, unit: food.unit, amount, isPartial: false });
    remainder -= amount * food.priceCents;
  }

  if (!remainder || !foods.length) return items;

  const nextFood = foods.reduce((cheapest, food) => food.priceCents < cheapest.priceCents ? food : cheapest);
  const partialAmount = Math.max(0.01, Math.round((remainder / nextFood.priceCents) * 100) / 100);
  const existing = items.find((item) => item.name === nextFood.name && item.unit === nextFood.unit);
  if (existing) {
    existing.amount += partialAmount;
    existing.isPartial = true;
  } else {
    items.push({ name: nextFood.name, unit: nextFood.unit, amount: partialAmount, isPartial: true });
  }

  return items;
}
