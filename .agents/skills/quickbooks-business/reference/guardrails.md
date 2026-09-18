# Guardrails for QuickBooks write and send actions

QuickBooks is the company's system of record. A wrong invoice reaches a
customer, a wrong import distorts the books, and a wrong payroll change affects
a person's pay. These rules apply in every workflow skill.

## Confirmation matrix

| Action class                                                          | What to show before acting                                                                                             | Consent required                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Read reports, list documents, search customers or products            | Nothing                                                                                                                | None                                                                                   |
| Save profile or industry                                              | The values to be saved                                                                                                 | A yes in the same turn                                                                 |
| Create customer or product                                            | Name, email, price, taxable flag                                                                                       | A yes to those values                                                                  |
| Create invoice, estimate, recurring template, payment link            | Customer, every line (product, description, quantity, rate, taxable), discount, dates, terms, total if computable      | An explicit yes to that exact proposal                                                 |
| Update or duplicate a sales document                                  | Document number, customer, current balance, and the fields that will change                                            | An explicit yes                                                                        |
| Send invoice, estimate, or payment link                               | Recipient addresses and the document that will be attached                                                             | An explicit yes; "looks good" is not consent to send                                   |
| Send invoice reminder                                                 | Reminder subject and body from `qbo_sales_get_settings`, invoice number, customer, balance                              | The literal question "Shall I send this reminder?" answered yes                        |
| Import transactions                                                   | Row count, date span, total inflows and outflows, sample rows, any rows dropped or altered                             | An explicit yes; never import to "analyze"                                             |
| Delete invoice, estimate, or recurring template                       | Number, customer, balance, and the consequence (a sent invoice deleted leaves the customer with a document you voided)  | An explicit yes naming the document                                                    |
| Payroll employee create or update                                     | Every field to be written, side by side with the current value                                                         | An explicit yes; suggest the payroll administrator review when compensation changes    |
| Submit a funding application                                          | Every field, the entity applying, and that this is an application                                                      | An explicit yes; stop if any field is uncertain                                        |

When a proposal is amended, show the amended proposal in full and ask again.
Consent does not carry over from one document to the next.

## Reactive holds on reminders

`qbo_sales_send_invoice_reminder` may hold instead of sending:

| Code     | Meaning                              | Allowed response                                                                                              |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| MCP-0020 | A pending bank match may be a payment | Tell the person. Only re-call with `pending_match_confirmed=true` if they confirm the invoice is still unpaid. |
| MCP-0021 | Invoice already paid                 | Report it. Re-call with `already_paid_confirmed=true` to drop those invoices from the batch, after a yes.      |
| MCP-0023 | No email on file                     | Ask for the address; re-call with `emails={invoice_id: address}` using the IDs from the hold, or `no_email_acknowledged=true` to drop them. |

Never fall back to `qbo_sales_send_invoice` when a reminder fails.

## Data handling

- Payroll results carry compensation, identifiers, and contact details. Quote
  only the fields the question needs. Do not paste payslips or employee records
  into shared channels, documents, or tickets.
- Do not pass business tax identification numbers (EIN, TIN, SSN, or Puerto
  Rico employer numbers) in any `tax_id` field; those fields take QuickBooks
  tax-code identifiers.
- Customer emails collected for sending stay inside the send call. Do not
  reuse them for any other service.
- When a result includes a warning line, surface it verbatim.

## Stop conditions

Stop and report rather than proceed when:

- The person declined to sign in and the request needs account data.
- A search returns `requires_clarification=true` and the candidates differ in
  a way that changes the document (different customer, different price).
- A required tax code cannot be resolved on a company using custom sales tax.
  Clearing the taxable flag to avoid the error saves an untaxed line silently;
  do not do that.
- The requested report basis is unsupported (cash-basis aging).
- A figure needed for a conclusion is missing from every available result.
- An import would load rows already present in QuickBooks, as far as can be
  seen from recent invoices or reports; duplicated revenue is hard to unwind.
