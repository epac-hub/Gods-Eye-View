---
name: quickbooks-financial-briefing
description: Produce a month-end or on-demand financial briefing for the connected QuickBooks Online company from the P&L, balance sheet, cash flow, A/R aging, and A/P aging reports, with ratios, period comparison, and prioritized next moves. Use for "how is the business doing", month-end review, board or owner updates, or any single-report question that benefits from context. Not for creating documents or sending anything.
---

# QuickBooks Financial Briefing

Read [quickbooks-business](../quickbooks-business/SKILL.md) first for the
connection protocol and reporting conventions. This workflow is read-only.

## Scope the period

1. Resolve the reporting period and the comparison period before calling any
   report. Default: last full month against the month before it. For a
   quarter or year, compare with the prior period of the same length. When the
   person asks for "year to date", the comparison is the same span last year.
2. Resolve the basis. Default accrual. If the person asks for cash basis,
   run the P&L, balance sheet, and sales reports on cash basis and state that
   the aging reports remain accrual only.
3. Write both periods and the basis at the top of the answer.

## Fetch, in this order

Call `company_info` once, then fetch the reports. Prefer the `_text` variants
when a written briefing is the deliverable; they return a
"View in QuickBooks" link to reproduce verbatim. Use the widget variants when
the person wants to explore interactively.

| Step | Tool                                                       | Parameters                                                                 |
| ---- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1    | `profit_loss_quickbooks_account_text`                      | `periodStart`, `periodEnd` for the current period; repeat for the prior    |
| 2    | `qbo_accounting_get_balance_sheet_text`                    | `start_date` = `end_date` = period end; repeat for prior period end        |
| 3    | `cash_flow_quickbooks_account_text`                        | current period, then prior                                                 |
| 4    | `qbo_accounting_get_ar_aging_summary_text`                 | `as_of_date` = period end, `min_days_overdue` = 1                          |
| 5    | `qbo_accounting_get_ap_aging_summary`                      | `as_of_date` = period end, `min_days_overdue` = 1                          |
| 6    | `qbo_accounting_get_sales_by_customer_summary_text`        | current period with `compare_to=PREVIOUS_PERIOD`, `top_n` = 10 (optional)  |

Independent calls can run in parallel. Stop after step 1 and report if the
connection fails or the P&L returns no transactions; a briefing on an empty
period is misleading.

For a single-report question ("what is my current ratio"), fetch only the
report that answers it, plus the prior period for context when cheap.

## Compute and label

Derive these from the fetched figures and label each as derived:

- Gross margin = (revenue minus COGS) / revenue.
- Net margin = net income / revenue.
- Working capital = current assets minus current liabilities.
- Current ratio = current assets / current liabilities.
- A/R overdue share = overdue A/R / total A/R.
- Days sales outstanding, approximate = total A/R / (period revenue / days in
  period). Mark as approximate; it uses period revenue, not trailing twelve
  months.
- Cash runway, only when operating cash flow is negative = ending cash /
  monthly operating cash burn. Mark as approximate.

Never compute a ratio when one of its inputs is missing from the results;
list it under data gaps instead.

## Classify what needs attention

Use these thresholds unless the company has its own:

| Signal                                                | Severity |
| ----------------------------------------------------- | -------- |
| Negative operating cash flow two periods in a row     | High     |
| Current ratio below 1.0                               | High     |
| A/R 61+ days above 20 percent of total A/R            | High     |
| Gross margin down more than 3 points versus prior     | Medium   |
| Revenue down more than 10 percent versus prior        | Medium   |
| A/P 31+ days present with cash on hand to cover it    | Medium   |
| Uncategorized or suspense balances on the balance sheet | Cleanup |
| Customer concentration: one customer above 25 percent of sales | Medium |

## Write the briefing

Follow the skeleton in
[templates.md](../quickbooks-business/reference/templates.md). Lead with the
overall read in one sentence, then the key-numbers table, then attention
items in severity order, then what changed, then next moves with an owner and
a date. Close with data gaps and caveats. Include each report's
"View in QuickBooks" link next to its row or in a sources line.

Every next move must be executable through a workflow skill or a named person:
"send firm reminders to the three customers over 60 days" points to the
collections skill; "review the uncategorized balance with the accountant" names
the accountant.

## Optional visual widget

Call `business_health_check_widget` only when the person explicitly asks for
the visual health check, and only after every report above has been fetched.
Map the synthesized sections into its fields; `overallRead` must be one of
`strong`, `stable`, `mixed`, `needs_attention`, and `reportLinks` must carry
the exact URLs from the text results.

## Handoffs

- Overdue receivables: [quickbooks-collections](../quickbooks-collections/SKILL.md).
- Industry comparison of the resulting profit or margin:
  [quickbooks-benchmarking](../quickbooks-benchmarking/SKILL.md).
- Payroll cost questions: [quickbooks-payroll-compliance](../quickbooks-payroll-compliance/SKILL.md).
