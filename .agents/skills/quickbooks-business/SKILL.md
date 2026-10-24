---
name: quickbooks-business
description: Operate the connected QuickBooks Online company through the Intuit QuickBooks connector for business work — financial reporting, invoicing and payments, collections, payroll compliance, industry benchmarking, and transaction import. Use for any request about the company's books, sales documents, receivables, payables, payroll, or benchmarks, then load the matching workflow skill. Not for editing this repository's code.
---

# QuickBooks Business

This skill is the entry point for business work against the QuickBooks Online
(QBO) company connected through the `Intuit_QuickBooks` MCP connector. It owns
the connection protocol, the safety rules for write actions, and the reporting
conventions. The workflow skills listed below own each job; read this file
first, then the workflow skill that matches the request.

Supporting references (read the ones the workflow needs):

- [reference/tool-map.md](reference/tool-map.md): every connector tool grouped
  by domain, with required parameters and known constraints.
- [reference/guardrails.md](reference/guardrails.md): the confirmation matrix
  for write and send actions, data-handling rules, and stop conditions.
- [reference/templates.md](reference/templates.md): bilingual (English and
  Spanish) customer-facing and internal templates with tonal variants.

## Route the request

| Request pattern                                                                   | Workflow skill                                                                   |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| "How is the business doing", month-end review, P&L, balance sheet, cash flow      | [quickbooks-financial-briefing](../quickbooks-financial-briefing/SKILL.md)       |
| Create or send an invoice, estimate, payment link, or recurring invoice           | [quickbooks-invoicing](../quickbooks-invoicing/SKILL.md)                         |
| Who owes us, overdue receivables, reminders, collections plan                     | [quickbooks-collections](../quickbooks-collections/SKILL.md)                     |
| Payroll readiness, payslips, employees, 941/940/W-2 filing status                 | [quickbooks-payroll-compliance](../quickbooks-payroll-compliance/SKILL.md)       |
| Compare against the industry, NAICS, "how do we rank", industry profitability     | [quickbooks-benchmarking](../quickbooks-benchmarking/SKILL.md)                   |
| A CSV or pasted transactions to analyze or to load into QuickBooks                | [quickbooks-transaction-import](../quickbooks-transaction-import/SKILL.md)       |
| Bills, vendors, what we owe (A/P aging)                                           | [quickbooks-financial-briefing](../quickbooks-financial-briefing/SKILL.md), A/P section |
| Funding, loans, QuickBooks Capital                                                | Lending section of [reference/tool-map.md](reference/tool-map.md)               |

If a request spans several rows (for example "review the month and chase the
overdue customers"), run the workflows in the order that produces the inputs
the next one needs: briefing first, then collections.

## Connection protocol

1. **Establish the connection once per conversation.** Call
   `mcp__Intuit_QuickBooks__company_info` before any account-backed tool. It
   returns the company name and industry; keep both, the briefing and
   benchmarking workflows use them. Do not call it again unless a tool reports
   an authentication error.
2. **Respect a declined sign-in.** If the person declines to authorize
   QuickBooks, do not call account-backed tools again in that conversation.
   Offer the pre-authentication alternatives instead (`profit_loss_generator`,
   `cash_flow_generator`, `benchmarking_against_industry`) using data they
   provide.
3. **Industry is "Unknown".** Benchmarking and some reports need an industry.
   Use `industry_recommendation`, let the person choose, then save it with
   `quickbooks_profile_info_update`. Never guess an industry from transaction
   text.
4. **CSV or pasted transactions in the current message** change the tool
   choice: analysis goes to the `*_generator` tools, loading goes to
   `quickbooks_transaction_import`. Details are in the transaction-import skill.

## Safety rules that apply to every workflow

- **Reads are free, writes are gated.** Creating, updating, deleting,
  duplicating, importing, or sending anything requires an explicit "yes" to a
  specific proposal that shows what will be created or sent. Showing the
  details is not consent. The matrix is in
  [reference/guardrails.md](reference/guardrails.md).
- **Never send without the three-step reminder gate** described in the
  collections skill. The connector rejects reminders sent outside that gate.
- **Numbers come from tool results, never from memory.** If a figure is not in
  a result, say it is unavailable. Do not derive a metric a tool does not
  report unless the derivation is shown (for example current ratio from the
  balance sheet).
- **Reproduce QuickBooks links verbatim.** When a result includes an
  "Open in QuickBooks", "View in QuickBooks", or share link, pass it through
  unchanged as a markdown link. Never invent one.
- **State basis and period on every figure.** Accrual or cash, and the exact
  date range. A/R and A/P aging summaries are accrual only; if cash basis is
  requested for them, say so and stop.
- **Minimize personal data.** Payroll results contain compensation and
  identifiers. Report only what the question needs and never paste full
  payslips into shared channels.

## Reporting conventions

- Respond in the language of the request. Customer-facing drafts default to
  the customer's language; when unknown, provide Spanish and English versions.
- Formal register, correct orthography and accents in Spanish, no emojis.
- Lead with the conclusion, then a compact table of the key numbers, then the
  items that need attention, then the recommended next moves.
- Present money with currency and thousands separators, percentages to one
  decimal, and always the comparison period when one exists.
- Label estimates, approximations, and derived ratios as such.

## Puerto Rico and territorial flags

Many connector features assume a U.S. state context. When the company operates
in Puerto Rico, flag the following rather than silently applying stateside
assumptions:

- **Sales tax:** Puerto Rico applies the IVU (Impuesto sobre Ventas y Uso),
  administered by Hacienda through SURI, not a state sales-tax regime. Verify
  the tax codes configured in QuickBooks before attaching `tax_code_id` or
  `tax_id` to sales lines.
- **Payroll and withholding:** Federal payroll filings (Forms 940 and 941
  family, W-2 family) coexist with Puerto Rico income-tax withholding filed
  with Hacienda (Form 499 series). Confirm which filings QuickBooks Online
  Payroll actually produces for the company before treating the filings
  summary as complete.
- **Benchmarking location:** the benchmarking tools require a two-letter state
  code. Confirm whether `PR` is accepted by the connector; if the tool errors
  or returns no peers, say that territorial benchmarks are unavailable rather
  than substituting a stateside location.
- **Healthcare receivables:** for a pharmacy or provider, A/R from insurers and
  pharmacy benefit managers behaves differently from retail customer A/R.
  Segment collections analysis by payer type when customer names indicate a
  plan or PBM.
