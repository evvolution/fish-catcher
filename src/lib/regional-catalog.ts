import catalog from "../../oss-upload/fish/assets/data/regional-catalog.json";

export type RegionalDistrict = (typeof catalog.cities)[number]["districts"][number];
export type RegionalCity = (typeof catalog.cities)[number];
export type RegionalProvince = (typeof catalog.regions)[number];
export type RegionalFood = (typeof catalog.foods)[number]["items"][number];

export const regionalCatalog = catalog;
