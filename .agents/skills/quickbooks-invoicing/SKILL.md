---
name: quickbooks-invoicing
description: Create, update, duplicate, send, and schedule sales documents in QuickBooks Online — invoices, estimates, recurring invoice templates, and payment links — with customer and product resolution, tax handling, and explicit confirmation before every write or send. Use when asked to bill a customer, quote a job, set up recurring billing, or request a payment. Not for reminders on existing overdue invoices; that is the collections skill.
---

# QuickBooks Invoicing

Read [quickbooks-business](../quickbooks-business/SKILL.md) and
[guardrails.md](../quickbooks-business/reference/guardrails.md) first. Every
create, update, delete, and send in this workflow needs an explicit yes to a
shown proposal.

## Choose the document

| Wording                                                       | Document                                   |
| ------------------------------------------------------------- | ------------------------------------------ |
| Bill, invoice, charge for work done                           | Invoice                                    |
| Quote, proposal, estimate, "how much would it be"             | Estimate                                   |
| Weekly, monthly, every N months, "set up recurring", retainer | Recurring invoice template                 |
| "Send a link to pay", deposit, one-off amount without lines   | Payment link (single-use if a customer is named) |
| "Make it a real invoice" on an estimate                       | Duplicate the estimate as an invoice, then confirm |

## Pre-flight resolution

1. **Customer.** Call `qbo_contact_search_customer` with the name (and email
   if given). `found=false`: propose creating the customer with name and
   email, wait for a yes, then `qbo_contact_create_customer`.
   `requires_clarification=true`: list the candidates with their emails and
   ask which one. Do not pick by confidence score alone.
2. **Products and services.** Call `qbo_catalog_search_products` with every
   line's name in one call (up to 20). Take `product_id`, price, and
   `taxable` from the result; the taxable flag on the invoice line must be the
   one the lookup returned. Missing items: propose `qbo_catalog_create_product`
   with name, price, and taxable flag, and wait for a yes.
3. **Add-ons without a price** (rush delivery, setup fee): price them as their
   own line or leave them out and say so. Never fold them into another line's
   description.
4. **Tax.** On a company using custom sales tax, a taxable line with no
   resolvable code is rejected. Ask for the tax code rather than clearing the
   taxable flag. For Puerto Rico companies, confirm the IVU code in use before
   attaching `tax_code_id`.
5. **Terms and dates.** Use the customer's default terms unless told
   otherwise. `reference_number` is at most 21 characters. Descriptions over
   100 characters need a `summarized_description` of 100 characters or fewer;
   when the description is shorter, set `summarized_description` equal to it.
6. **Discounts.** Fixed discounts are negative amounts; percentage discounts
   are positive numbers (10.0 for ten percent). Never apply both.

## Proposal, then create

Show the full proposal in a table: customer and email, each line with product,
description, quantity, rate, taxable, then discount, shipping, dates, terms,
note to customer, and the computed subtotal. Ask for a yes.

On yes, call the create tool:

- Invoice: `qbo_sales_create_invoice`.
- Estimate: `qbo_sales_create_estimate`.
- Recurring: `qbo_sales_create_recurring_invoice` with `name` defaulted to
  the customer's display name, `template_type` AUTOMATED unless asked, and a
  schedule only when the person specified one. Never pass a `start_date` in
  the past. After success, call `qbo_sales_get_recurring_invoices` with the
  returned `template_id` and report name, type, schedule, customer, lines,
  tax, total, and AutoPay status. Close with the review link verbatim.
- Payment link: `qbo_sales_create_payment_link`. Single-use links need
  `contact_id` and `delivery_email_to`; multi-use links take neither. If no
  customer is named, ask which type. Reply with the amount, description, and
  the `share_link` as a markdown link, and surface any warning.

After an invoice or estimate is created, reply with one short message that
conveys every point in the tool's `content` field, including any
call-to-action at the end, and reproduce the "Open in QuickBooks" link
verbatim. Do not list the line items again.

## Send

Sending is a second gate. Show the recipient addresses (to, cc, bcc) and the
document number, ask for a yes, then call `qbo_sales_send_invoice`,
`qbo_sales_send_estimate`, or `qbo_sales_send_payment_link` (single-use links
only). Use the bilingual note text in
[templates.md](../quickbooks-business/reference/templates.md) when the person
wants a message on the document.

## Update, duplicate, delete

- Identify the target with `qbo_sales_get_invoices` or
  `qbo_sales_get_estimates`. For a bare number, try `doc_numbers` first and
  fall back to `invoice_ids` or `estimate_ids` if empty.
- Show number, customer, date, balance, and the fields that will change.
  Then call the update or duplicate tool after a yes.
- Deletion of a document that was already sent removes it from the customer's
  view. Say that, show number, customer, and balance, and require a yes that
  names the document.
- Recurring templates: use `qbo_sales_operate_recurring_invoice` to pause or
  resume, `qbo_sales_update_recurring_invoice` to edit, and confirm by
  template name.

## Common failure modes

- Customer found but email missing: ask for it before proposing a send.
- Product found with a different price than requested: keep the catalog
  price on the line and show the override as a decision for the person.
- Multiple customers with the same name in different locations: clarify by
  email or billing address, never by guessing.
- The shipping fee field requires the Shipping toggle in Sales settings; if
  the create call rejects it, offer a shipping line item instead and say why.
