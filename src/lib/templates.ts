export interface ThesisTemplate {
  name: string;
  category: "geopolitical" | "macro" | "earnings" | "commodity" | "crypto";
  belief: string;
  causal_logic: string;
  invalidation_conditions: string[];
}

export const THESIS_TEMPLATES: ThesisTemplate[] = [
  {
    name: "Oil Supply Disruption",
    category: "geopolitical",
    belief: "Oil prices stay elevated through [timeframe] due to geopolitical supply constraints",
    causal_logic:
      "IF [conflict/sanctions] persist AND OPEC maintains production discipline THEN oil stays above [price] BECAUSE supply constraints create a price floor",
    invalidation_conditions: [
      "OPEC announces production increase > 500k bpd",
      "Major ceasefire or sanctions relief timeline announced",
      "US shale production exceeds [threshold] bpd",
      "WTI trades below [price] for 5 consecutive sessions",
    ],
  },
  {
    name: "Rate Cut Thesis",
    category: "macro",
    belief: "Central bank cuts rates by [timeframe] as economic data softens",
    causal_logic:
      "IF labor market weakens AND inflation trends toward target THEN the Fed/ECB cuts rates BECAUSE slowing growth outweighs residual inflation concerns",
    invalidation_conditions: [
      "Core CPI reaccelerates above [rate]% for 2+ consecutive months",
      "Unemployment stays below [rate]% through [date]",
      "Fed/ECB forward guidance explicitly rules out near-term cuts",
      "Wage growth reaccelerates above [rate]%",
    ],
  },
  {
    name: "Sector Outperformance",
    category: "earnings",
    belief: "[Sector] earnings outperform the broad market in [quarter/year]",
    causal_logic:
      "IF [sector driver] continues AND margins hold THEN [sector] outperforms S&P BECAUSE [specific margin/revenue catalyst]",
    invalidation_conditions: [
      "[Sector] earnings growth falls below S&P average for the quarter",
      "Key margin driver reverses (specify: input costs, pricing power, etc.)",
      "Top 3 sector names miss consensus by > 5%",
      "Sector ETF underperforms SPY by > 3% over 30 days",
    ],
  },
  {
    name: "Supply-Demand Imbalance",
    category: "commodity",
    belief: "[Commodity] prices rise due to structural supply deficit",
    causal_logic:
      "IF demand growth continues at [rate] AND supply remains constrained by [factor] THEN [commodity] prices rise BECAUSE the deficit cannot be closed quickly",
    invalidation_conditions: [
      "Major new supply source comes online (specify project/country)",
      "Demand destruction: consumption drops > [percent]% quarter-over-quarter",
      "Inventory builds exceed [threshold] for 3+ consecutive reporting periods",
      "Substitute technology reaches commercial viability",
    ],
  },
  {
    name: "Regulatory Catalyst",
    category: "crypto",
    belief: "[Asset/sector] benefits from upcoming regulatory clarity",
    causal_logic:
      "IF [regulatory body] approves [specific action] THEN [asset] appreciates BECAUSE institutional capital flows in once regulatory uncertainty is resolved",
    invalidation_conditions: [
      "Regulatory body explicitly rejects or delays the action past [date]",
      "Enforcement action against major player in the space",
      "Legislative proposal introduces restrictive framework",
      "Institutional adoption metrics fail to increase post-approval",
    ],
  },
];
