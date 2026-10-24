---
name: quickbooks-transaction-import
description: Handle CSV files or pasted transaction lists for QuickBooks — decide between analyzing them with the pre-authentication P&L and cash flow generators and loading them into the company with the transaction import tool, enforce row-level data quality, and confirm before any import. Use when a bank export, spreadsheet, or pasted list of transactions appears in the message. Importing is a write to the books and is never done to "take a look".
---

# QuickBooks Transaction Import

Read [quickbooks-business](../quickbooks-business/SKILL.md) and
[guardrails.md](../quickbooks-business/reference/guardrails.md) first.

## Decide: analyze or import

| The person wants                                                       | Tool                                                      | Sign-in |
| ---------------------------------------------------------------------- | --------------------------------------------------------- | ------- |
| A P&L, income statement, "how did we do", period comparison from the data | `profit_loss_generator`                                | No      |
| A cash flow view from the data                                         | `cash_flow_generator`                                     | No      |
| Compare the data with the industry                                     | `profit_loss_generator`, then `benchmarking_against_industry` | No  |
| "Put these in QuickBooks", "import", "save these transactions"         | `quickbooks_transaction_import`                           | Yes     |
| Ambiguous ("here are my transactions")                                 | Ask: analyze only, or load into the books?                | —       |

Never import in order to analyze. The generators exist so the books stay
untouched during exploration.

## Normalize the rows

Extract every row. Do not sample, truncate, or drop rows silently; if a row
cannot be parsed, list it under "rows needing attention" with the reason.

| Field         | Generators (`lineItems`)               | Import (`transactions`)                                          |
| ------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `description` | required                               | required                                                         |
| `amount`      | required; positive income, negative expense | required; same sign convention                              |
| `date`        | required, `MM/dd/yyyy`                 | optional, `YYYY-MM-DD`; missing dates default to today           |
| payee         | not used                               | `context.payee` whenever known                                   |
| `project`     | `projectName` filter                   | optional per row                                                 |

Rules:

- Bank exports often carry separate debit and credit columns; merge them into
  one signed `amount`. Show the sign convention you applied.
- When the description is formatted "<Payee> - <details>", split the payee
  into `context.payee` and keep the full text in `description`.
- When a Payee or Vendor column exists, always map it to `context.payee`.
- Strip currency symbols and thousands separators; keep two decimals.
- Rows with amount zero, transfers between the company's own accounts, and
  credit-card payments from the operating account are flagged, not imported,
  unless the person confirms they belong in the books.
- Generators accept 1 to 999 rows per call; split larger sets by period.

## Analyze path

Call the generator with `periodStart` and `periodEnd` matching the data. Pass
`industryName` only when the person stated it in the conversation; do not
infer it and do not call `industry_recommendation` for this purpose. Present
the report's headline figures and the link or widget it returns, and remind
the person that nothing was written to QuickBooks.

## Import path

1. `company_info`. If the person declines sign-in, stop; offer the analyze
   path.
2. Show the pre-import summary: row count, date span, total inflows, total
   outflows, net, five sample rows, flagged rows, and the payee mapping.
3. Check for likely duplicates: recent `qbo_sales_get_invoices` or the
   period's P&L can reveal that these transactions already exist. If so, say
   it and ask before continuing.
4. Ask for an explicit yes to import exactly that set.
5. Call `quickbooks_transaction_import` with the full `transactions` array.
   The call is synchronous and may take up to a minute.
6. If the result nudges to set the industry, relay it. Set
   `proceed_without_industry=true` only on a later call, only after that
   nudge was shown, and only if the person explicitly said to proceed without
   it.
7. Report what was imported, what was skipped, and any categorization notes
   the tool returned, and suggest a P&L run for the period to verify.

## Common failure modes

- Dates in day-first order (dd/MM/yyyy): confirm the convention from a row
  with a day above 12 before converting.
- Mixed currencies: stop and ask; the import assumes the company currency.
- Header rows or subtotal rows inside the data: exclude and list them.
- The same file imported twice: the second import duplicates revenue and
  expenses; there is no undo through the connector.
