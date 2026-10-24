---
name: quickbooks-benchmarking
description: Compare the company's profit, revenue, expenses, or margin with regional industry peers using the QuickBooks benchmarking tools, choosing the right path when the number is supplied, comes from the account, or comes from pasted transactions, and resolving NAICS industries and location correctly. Use for "how do we compare", "most profitable industries in [place]", or "is our margin normal". Reports peer statistics as context, never as targets.
---

# QuickBooks Benchmarking

Read [quickbooks-business](../quickbooks-business/SKILL.md) first.

## Pick the path

| Situation                                                                  | Path                                                                                                       |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| The person states a number ("we made 80k profit", "revenue is 1.2M")       | `benchmarking_against_industry` with `metricValue`; no sign-in needed                                     |
| The person asks about industries in a location, no company number          | `benchmarking_against_industry` with `metricValue=0` and the industries to compare                         |
| "Compare my QuickBooks numbers", no number given                           | `company_info`, then `benchmarking_quickbooks_account`                                                     |
| CSV or pasted transactions in the current message                          | `profit_loss_generator` first, then `benchmarking_against_industry` with the computed profit; do not import |
| Margin comparison                                                          | `metricType="margin"` with both `profitValue` and `revenueValue`                                           |

Do not call `benchmarking_quickbooks_account` when a metric value was
supplied, and do not call it again once the industry has been provided; set
the industry and use the account path once.

## Resolve the industry

- `company_info` returns the industry when set. If "Unknown", call
  `industry_recommendation`, present the candidates with their NAICS codes,
  and let the person choose. Save the choice with
  `quickbooks_profile_info_update` after a yes.
- `industryType` and `naicsCode` are parallel arrays of one to five entries.
  Prefer the four-digit NAICS subsector name; fall back to the two-digit
  sector. Six-digit codes are accepted and widened automatically.
- Never exceed five industries; if asked for more, choose the five most
  relevant and say which were left out.

## Resolve the location

- `location_state` must be a two-letter uppercase code; `location_county` is
  optional and improves the peer set.
- For a Puerto Rico company, try `PR`. If the tool errors or returns no
  peers, report that territorial benchmarks are unavailable in the dataset
  and offer a stateside reference set explicitly labeled as such. Do not
  present a stateside peer group as local.

## Aggregation

`aggregationPeriod` must match how the number was measured: yearly by
default, monthly or quarterly when the person supplied a monthly or quarterly
figure. Mismatched periods produce misleading comparisons.

## Report

1. The company's metric, its period, and its basis.
2. The peer statistic returned (median or average as labeled by the tool),
   the peer set (industry, location, period), and the company's position.
3. Interpretation in one paragraph: what would explain a gap (mix, pricing,
   cost structure, seasonality, one-time items) and what to check in the
   books before acting.
4. Caveats: benchmark data is descriptive of peers in the dataset, not a
   target; small peer sets are noisy; margins depend on the accounting basis
   and on how COGS is classified.

Use `industry_benchmark_widget` when the person wants a visual, after the
data is in hand.

## Handoffs

- The company's own P&L for the comparison period:
  [quickbooks-financial-briefing](../quickbooks-financial-briefing/SKILL.md).
- Loading the pasted transactions permanently:
  [quickbooks-transaction-import](../quickbooks-transaction-import/SKILL.md).
