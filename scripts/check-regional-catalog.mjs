import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile("oss-upload/fish/assets/data/regional-catalog.json", "utf8"));
const fail = (message) => { throw new Error(message); };
const citySlugs = new Set(catalog.cities.map((city) => city.slug));
const cityCodes = new Set(catalog.cities.map((city) => city.code));
const regionCodes = new Set(catalog.regions.map((region) => region.code));
const rankedCities = catalog.cities.filter((city) => Number.isInteger(city.rank) && city.rank > 0);
const districtCount = catalog.cities.reduce((total, city) => total + city.districts.length, 0);
const foodCount = catalog.foods.flatMap((city) => city.items).length;

if (catalog.regions.length !== 34 || regionCodes.size !== 34) fail("Expected all 34 province-level regions");
if (catalog.cities.length < 360 || districtCount < 2800) fail("Nationwide city/county coverage is incomplete");
if (citySlugs.size !== catalog.cities.length || cityCodes.size !== catalog.cities.length) fail("City slugs and codes must be unique");
if (rankedCities.length !== 50) fail("Expected exactly 50 GDP-ranked food cities");
if (foodCount !== 100) fail("Expected exactly 100 regional foods");
if (catalog.cities.some((city) => !city.districts.length)) fail("Every city needs a county-level choice");
if (catalog.cities.some((city) => !regionCodes.has(city.provinceCode))) fail("Every city must belong to a listed province");
if (catalog.foods.some((city) => !citySlugs.has(city.citySlug))) fail("Every food city must exist in the regional catalog");
if (catalog.foods.some((city) => city.items.some((food) => !food.name || food.priceCents <= 0))) {
  fail("Food names and estimated prices must be valid");
}
for (const slug of ["beijing", "shanghai", "guangzhou", "shenzhen", "wuhan"]) {
  if (!citySlugs.has(slug)) fail(`Missing required city: ${slug}`);
}

console.log(`Regional catalog OK: ${catalog.regions.length} provinces, ${catalog.cities.length} cities, ${districtCount} districts, ${foodCount} local foods`);
