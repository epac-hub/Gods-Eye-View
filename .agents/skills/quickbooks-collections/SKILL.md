---
name: quickbooks-collections
description: Turn QuickBooks Online A/R aging into a prioritized collections plan and send payment reminders through the connector's mandatory confirmation gate, with bilingual courtesy, firm, escalatory, and conciliatory message variants. Use for "who owes us", overdue invoices, past-due follow-up, reminder emails, or a weekly collections routine. Not for creating new invoices.
---

# QuickBooks Collections

Read [quickbooks-business](../quickbooks-business/SKILL.md),
[guardrails.md](../quickbooks-business/reference/guardrails.md), and
[templates.md](../quickbooks-business/reference/templates.md) first. A/R
aging is accrual only; if cash basis is requested, say so and stop.

## Assess

1. `company_info`, then `qbo_accounting_get_ar_aging_summary_text` with
   `min_days_overdue=1` as of today (or the requested date). Add `top_n`,
   `min_overdue_amount`, or `customer_name` when the request narrows the
   scope.
2. For the customers that matter, `qbo_accounting_get_ar_aging_detail` with
   `transaction_type="invoice"` and `customer_name` to get invoice numbers,
   dates, and balances. Invoice IDs for sending come from
   `qbo_sales_get_invoices` filtered by `customer_id` or `doc_numbers`.
3. Read the credit-side rows too: credit memos and unapplied payments on the
   detail report often explain a "past due" balance that is not really owed.

## Prioritize

Score each customer on three axes and sort by the combination:

| Axis         | Weight | Reading                                                             |
| ------------ | ------ | ------------------------------------------------------------------- |
| Amount       | High   | Overdue balance as a share of total overdue A/R                     |
| Age          | High   | Oldest bucket present (91+ outranks 61 to 90, and so on)            |
| Relationship | Medium | Payer type, sales volume from the sales-by-customer report, history |

Segment by payer type when names indicate an insurer, plan, pharmacy benefit
manager, government agency, or wholesaler; those balances follow contractual
remittance cycles and are chased through the payer's process, not a customer
reminder email. Retail and commercial customers get the reminder ladder below.

Output a table: customer, total overdue, oldest bucket, invoices, proposed
action, tone. Follow with the estimated cash effect of collecting the top
group.

## The reminder ladder

| Days past due | Tone         | Channel                                   |
| ------------- | ------------ | ----------------------------------------- |
| 1 to 30       | Courtesy     | Reminder email with pay link              |
| 31 to 60      | Firm         | Reminder email, then a call by the owner  |
| 61 or more    | Escalatory   | Final notice, hold on new orders, review  |
| Any, disputed | Conciliatory | Direct contact, resolve the dispute first |

Pick the tone per customer from the table; do not send an escalatory notice
to a customer with a known dispute or a pending credit.

## The send gate (mandatory, no exceptions)

`qbo_sales_send_invoice_reminder` is rejected outside this sequence:

1. Call `qbo_sales_get_settings` with
   `{domain: 'reminder_template', action: 'get_global'}` and read the subject
   and body.
2. Show, for each invoice: invoice number, customer, balance, and the exact
   subject and body that will go out. For a single invoice with a
   `custom_subject` and `custom_message`, show the custom text instead.
3. Ask, literally, "Shall I send this reminder?" and wait for an explicit yes.
   Information provided earlier is not consent.

Then call the tool with the invoice IDs. Handle holds as listed in
guardrails: MCP-0020 (pending bank match), MCP-0021 (already paid), MCP-0023
(no email on file). Each hold goes back to the person before any re-call.
Never call `qbo_sales_send_invoice` as a fallback when a reminder fails.

Custom subject and message are allowed only on single-invoice sends; batch
sends use the global template.

## Weekly routine

When asked to run collections on a schedule:

1. Aging summary and detail as above; compare with last week's totals if the
   person shares them or they are in the conversation.
2. Movement table: paid since last run, newly overdue, escalated bucket.
3. Proposed sends grouped by tone, each awaiting the gate.
4. A short note for the owner: what to call personally, what to write off
   review with the accountant, what is blocked on a missing email.

## Record

After sends, list what was sent (invoice, customer, tone, address) and what
was held and why, so the next run starts from a known state.
