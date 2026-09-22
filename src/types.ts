export type IndicatorId =
  | "avgWealth"
  | "medWealth"
  | "avgIncome"
  | "medIncome"
  | "violentCrime"
  | "lifeExpectancy";

export type ValueFormat = "usd" | "usdPerDay" | "rate" | "years";

export interface IndicatorMeta {
  id: IndicatorId;
  label: string;
  detail: string;
  unit: string;
  higherIsBetter: boolean;
  format: ValueFormat;
  source: string;
  yearNote: string;
}

export interface MetricValue {
  v: number;
  y: number;
}

export type WealthSourceId = "ubs" | "wid";

export interface WealthFieldCopy {
  detail: string;
  unit: string;
  source: string;
  yearNote: string;
}

export interface WealthSourceSpec {
  id: WealthSourceId;
  label: string;
  avgWealth: WealthFieldCopy;
  medWealth: WealthFieldCopy;
}

export interface WealthSourcesFile {
  default: WealthSourceId;
  options: WealthSourceSpec[];
}

export interface CountryMetrics {
  id: string;
  name: string;
  values: Partial<Record<IndicatorId, MetricValue>>;
  wealth?: Partial<
    Record<WealthSourceId, Partial<Record<"avgWealth" | "medWealth", MetricValue>>>
  >;
}

export interface MetricsFile {
  anchorYear: number;
  indicators: IndicatorMeta[];
  wealthSources: WealthSourcesFile;
  countries: CountryMetrics[];
}

export interface ScorePart {
  id: IndicatorId;
  raw: number;
  year: number;
  normalized: number;
}

export interface RankedCountry {
  id: string;
  name: string;
  score: number;
  parts: ScorePart[];
  enabledCount: number;
}

export interface WorldFeature {
  type: "Feature";
  id: string;
  properties: { id: string; name: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface WorldCollection {
  type: "FeatureCollection";
  features: WorldFeature[];
}
