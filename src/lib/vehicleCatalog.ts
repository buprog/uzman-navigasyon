/** Türkiye’de popüler araç marka/modelleri — statik katalog (API yok). */

export type FuelType = "benzin" | "dizel" | "lpg" | "elektrikli" | "hibrit";

export const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: "benzin", label: "Benzin" },
  { value: "dizel", label: "Dizel" },
  { value: "lpg", label: "LPG" },
  { value: "elektrikli", label: "Elektrikli" },
  { value: "hibrit", label: "Hibrit" },
];

export const BLOOD_TYPES = [
  "A Rh+",
  "A Rh-",
  "B Rh+",
  "B Rh-",
  "AB Rh+",
  "AB Rh-",
  "0 Rh+",
  "0 Rh-",
] as const;

/** Marka → modeller + varsayılan tüketim (L veya kWh / 100 km) */
export type VehicleModelEntry = {
  name: string;
  defaultFuel: FuelType;
  defaultConsumption: number;
};

export type VehicleMakeEntry = {
  make: string;
  models: VehicleModelEntry[];
};

export const VEHICLE_CATALOG: VehicleMakeEntry[] = [
  {
    make: "Toyota",
    models: [
      { name: "Corolla", defaultFuel: "hibrit", defaultConsumption: 4.5 },
      { name: "Yaris", defaultFuel: "benzin", defaultConsumption: 5.2 },
      { name: "C-HR", defaultFuel: "hibrit", defaultConsumption: 4.8 },
      { name: "RAV4", defaultFuel: "hibrit", defaultConsumption: 5.5 },
    ],
  },
  {
    make: "Volkswagen",
    models: [
      { name: "Golf", defaultFuel: "benzin", defaultConsumption: 6.0 },
      { name: "Passat", defaultFuel: "dizel", defaultConsumption: 5.5 },
      { name: "Tiguan", defaultFuel: "benzin", defaultConsumption: 7.2 },
      { name: "Polo", defaultFuel: "benzin", defaultConsumption: 5.4 },
    ],
  },
  {
    make: "Renault",
    models: [
      { name: "Clio", defaultFuel: "benzin", defaultConsumption: 5.3 },
      { name: "Megane", defaultFuel: "benzin", defaultConsumption: 6.1 },
      { name: "Captur", defaultFuel: "benzin", defaultConsumption: 5.8 },
      { name: "Megane E-Tech", defaultFuel: "elektrikli", defaultConsumption: 16.5 },
    ],
  },
  {
    make: "Fiat",
    models: [
      { name: "Egea", defaultFuel: "benzin", defaultConsumption: 5.7 },
      { name: "Egea Cross", defaultFuel: "benzin", defaultConsumption: 6.0 },
      { name: "500", defaultFuel: "benzin", defaultConsumption: 5.1 },
      { name: "Doblo", defaultFuel: "dizel", defaultConsumption: 6.5 },
    ],
  },
  {
    make: "Ford",
    models: [
      { name: "Focus", defaultFuel: "benzin", defaultConsumption: 6.2 },
      { name: "Puma", defaultFuel: "benzin", defaultConsumption: 5.9 },
      { name: "Kuga", defaultFuel: "hibrit", defaultConsumption: 5.4 },
      { name: "Transit Custom", defaultFuel: "dizel", defaultConsumption: 8.0 },
    ],
  },
  {
    make: "BMW",
    models: [
      { name: "3 Serisi", defaultFuel: "dizel", defaultConsumption: 5.8 },
      { name: "X1", defaultFuel: "benzin", defaultConsumption: 7.0 },
      { name: "i4", defaultFuel: "elektrikli", defaultConsumption: 18.0 },
      { name: "5 Serisi", defaultFuel: "dizel", defaultConsumption: 6.2 },
    ],
  },
  {
    make: "Mercedes-Benz",
    models: [
      { name: "C-Serisi", defaultFuel: "dizel", defaultConsumption: 5.9 },
      { name: "E-Serisi", defaultFuel: "dizel", defaultConsumption: 6.4 },
      { name: "GLA", defaultFuel: "benzin", defaultConsumption: 7.1 },
      { name: "EQA", defaultFuel: "elektrikli", defaultConsumption: 17.5 },
    ],
  },
  {
    make: "Tesla",
    models: [
      { name: "Model 3", defaultFuel: "elektrikli", defaultConsumption: 15.0 },
      { name: "Model Y", defaultFuel: "elektrikli", defaultConsumption: 16.5 },
      { name: "Model S", defaultFuel: "elektrikli", defaultConsumption: 18.0 },
    ],
  },
  {
    make: "TOGG",
    models: [
      { name: "T10X", defaultFuel: "elektrikli", defaultConsumption: 18.5 },
      { name: "T10F", defaultFuel: "elektrikli", defaultConsumption: 16.0 },
    ],
  },
  {
    make: "Hyundai",
    models: [
      { name: "i20", defaultFuel: "benzin", defaultConsumption: 5.4 },
      { name: "Tucson", defaultFuel: "hibrit", defaultConsumption: 5.6 },
      { name: "Bayon", defaultFuel: "benzin", defaultConsumption: 5.5 },
      { name: "Ioniq 5", defaultFuel: "elektrikli", defaultConsumption: 17.0 },
    ],
  },
  {
    make: "Peugeot",
    models: [
      { name: "208", defaultFuel: "benzin", defaultConsumption: 5.2 },
      { name: "3008", defaultFuel: "dizel", defaultConsumption: 5.8 },
      { name: "e-208", defaultFuel: "elektrikli", defaultConsumption: 15.5 },
    ],
  },
  {
    make: "Opel",
    models: [
      { name: "Corsa", defaultFuel: "benzin", defaultConsumption: 5.3 },
      { name: "Astra", defaultFuel: "benzin", defaultConsumption: 5.9 },
      { name: "Mokka", defaultFuel: "benzin", defaultConsumption: 6.0 },
    ],
  },
];

export function getMakes(): string[] {
  return VEHICLE_CATALOG.map((e) => e.make);
}

export function getModelsForMake(make: string): VehicleModelEntry[] {
  return VEHICLE_CATALOG.find((e) => e.make === make)?.models ?? [];
}

export function findModelDefaults(
  make: string,
  model: string
): VehicleModelEntry | undefined {
  return getModelsForMake(make).find((m) => m.name === model);
}
