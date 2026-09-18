# QuickBooks connector tool map

All tools are exposed as `mcp__Intuit_QuickBooks__<name>`. The short name is
used below. Tools marked **write** change data in QuickBooks and fall under the
confirmation matrix in [guardrails.md](guardrails.md). Tools marked **send**
deliver email to a third party and require the send gate.

Call `company_info` once before any tool in the "account-backed" groups.

## Company and profile

| Tool                             | Kind  | Notes                                                                                             |
| -------------------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| `company_info`                   | read  | Returns company name and industry. Required first call. Industry "Unknown" means it is unset.     |
| `industry_recommendation`        | read  | Suggests industries and NAICS codes; the person chooses one.                                      |
| `quickbooks_profile_info_update` | write | Saves business name, two-letter state, industry name and NAICS code. Low risk, still confirm.     |

## Financial reports (account-backed)

| Tool                                                        | Key parameters                                                                                                          | Notes                                                                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `profit_loss_quickbooks_account` / `_text`                  | `periodStart`, `periodEnd` (YYYY-MM-DD)                                                                                 | Income, COGS, expenses, margins, monthly breakdown. Widget version renders; `_text` returns text plus link.    |
| `cash_flow_quickbooks_account` / `_text`                    | `periodStart`, `periodEnd`                                                                                              | Operating, investing, financing; net change and ending cash.                                                  |
| `qbo_accounting_get_balance_sheet` / `_text`                | `date_range` macro or `start_date` + `end_date` (both), `accounting_method`, `split_by`                                 | Point in time as of the period end. For "as of <date>" pass the same date in both fields.                     |
| `qbo_accounting_get_ar_aging_summary` / `_text`             | `as_of_date`, `customer_name`, `min_days_overdue` (0, 1, 31, 61, 91), `min_overdue_amount`, `top_n`                     | Accrual only. Default tool for generic "what is overdue" questions.                                           |
| `qbo_accounting_get_ar_aging_detail`                        | `as_of_date`, `customer_name`, `transaction_type`                                                                       | Invoice-level detail. Pass `transaction_type="invoice"` when the request says invoices.                       |
| `qbo_accounting_get_ap_aging_summary`                       | `as_of_date`, `vendor_name`, `min_days_overdue`, `min_overdue_amount`, `top_n`                                          | Only when the request names bills, vendors, payables, or "what we owe".                                       |
| `qbo_accounting_get_ap_aging_detail`                        | same pattern as A/R detail                                                                                              | Bill-level detail.                                                                                            |
| `qbo_accounting_get_sales_by_customer_summary` / `_text`    | `date_range`, `start_date`/`end_date`, `accounting_method`, `split_by`, `compare_to`, `top_n`, `ranking`                | Use `compare_to` for growth questions; do not call twice manually.                                            |
| `qbo_accounting_get_sales_by_product_summary` / `_text`     | `date_range` (includes LAST_12_MONTHS, LAST_30_DAYS), `top_n`, `bottom_n`, `product_name`, `sort_by`, value filters    | Revenue only, not margin. Say so when asked about profitability.                                              |
| `qbo_accounting_get_product_service_list`                   | listing                                                                                                                 | Reporting list. Not for building invoice lines; use `qbo_catalog_search_products` for that.                   |

Date macros accepted by the report tools: `THIS_YEAR`, `LAST_YEAR`,
`THIS_QUARTER`, `LAST_QUARTER`, `THIS_MONTH`, `LAST_MONTH`,
`THIS_YEAR_TO_DATE`; the product summary also accepts `LAST_12_MONTHS` and
`LAST_30_DAYS`.

## Pre-authentication analysis (data supplied in the message)

| Tool                            | Key parameters                                                                                | Notes                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `profit_loss_generator`         | `lineItems` (1 to 999 rows, `date` as MM/dd/yyyy), `periodStart`, `periodEnd`, `industryName` | Only when a CSV or pasted transactions are in the current message. Output is an HTML report. |
| `cash_flow_generator`           | same input pattern                                                                            | Cash flow from supplied rows.                                                             |
| `benchmarking_against_industry` | see benchmarking section                                                                      | Works without sign-in when the metric value is supplied.                                  |

## Sales documents

| Tool                                                       | Kind  | Notes                                                                                                                                      |
| ---------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `qbo_contact_search_customer`                              | read  | Semantic match on name or email. `found=false` means create; `requires_clarification=true` means ask.                                      |
| `qbo_contact_create_customer`                              | write | Creates the customer. Confirm name and email first.                                                                                        |
| `qbo_catalog_search_products`                              | read  | Up to 20 names per call. Returns `product_id`, price, `taxable`. Preferred for line items.                                                 |
| `qbo_catalog_create_product`                               | write | Creates a product or service. Confirm name, price, taxable flag.                                                                           |
| `qbo_sales_get_settings`                                   | read  | Sales settings and templates. `{domain:'reminder_template', action:'get_global'}` fetches the reminder email text.                         |
| `qbo_sales_update_settings`                                | write | Changes company-wide sales settings. High impact; confirm explicitly.                                                                      |
| `qbo_sales_get_invoices`                                   | read  | Filters: `invoice_ids`, `doc_numbers`, `customer_id`, `transaction_date`, `order_by`, `limit`. Defaults to last 30 days.                   |
| `qbo_sales_create_invoice`                                 | write | Requires `customer_data.customer_id` and line items with `product_id`, `description`, `amount`, `taxable`. Relay the result content fully. |
| `qbo_sales_update_invoice`, `qbo_sales_duplicate_invoice`  | write | Confirm the target invoice by number and customer before changing it.                                                                      |
| `qbo_sales_delete_invoice`                                 | write | Destructive. Requires the invoice number, customer, and balance shown back, and an explicit yes.                                           |
| `qbo_sales_send_invoice`                                   | send  | Emails the invoice. Confirm recipient addresses first.                                                                                     |
| `qbo_sales_send_invoice_reminder`                          | send  | Three-step gate mandatory: fetch template, show it with invoice details, explicit yes. Holds: MCP-0020, MCP-0021, MCP-0023.                 |
| `qbo_sales_get_estimates`, `qbo_sales_create_estimate`, `qbo_sales_update_estimate`, `qbo_sales_duplicate_estimate`, `qbo_sales_delete_estimate`, `qbo_sales_send_estimate` | mixed | Same discipline as invoices. Estimates default to the last 180 days when listing. |
| `qbo_sales_get_recurring_invoices`                         | read  | After creating a template, fetch it by `template_id` to confirm what was saved.                                                            |
| `qbo_sales_create_recurring_invoice`                       | write | Use for any cadence wording. Defaults: AUTOMATED, monthly on day 1, no end. Never pass a past `start_date`.                                |
| `qbo_sales_update_recurring_invoice`, `qbo_sales_operate_recurring_invoice`, `qbo_sales_delete_recurring_invoice` | write | Pause, resume, edit, or delete templates. Confirm by template name.               |
| `qbo_sales_get_payment_links`, `qbo_sales_create_payment_link`, `qbo_sales_update_payment_link` | mixed | `type` is `single` (one customer, `contact_id` and `delivery_email_to` required) or `multi` (reusable, no customer). |
| `qbo_sales_send_payment_link`                              | send  | Single-use links only. Ask before sending.                                                                                                 |
| `qbo_sales_get_transaction_document`                       | read  | Retrieves the document for an existing transaction.                                                                                        |

## Payroll (account-backed, contains personal data)

| Tool                                                                                                                 | Notes                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `qbo_payroll_get_company_payroll_readiness`, `qbo_payroll_get_employee_payroll_readiness`                            | Why payroll cannot run and what setup is missing.                                                                     |
| `qbo_payroll_get_company_info`, `qbo_payroll_get_employer_tax_setup`, `qbo_payroll_get_pay_schedules`                | Company-level payroll configuration.                                                                                  |
| `qbo_payroll_get_company_last_payroll_run`, `qbo_payroll_get_payslips`, `qbo_payroll_get_payslip_details`            | Payslips paginate 20 per page; pass `page_info.end_cursor` as `after`. Wrap arguments under `input`.                  |
| `qbo_payroll_get_employees`, `qbo_payroll_search_employee`, `qbo_payroll_get_employee_details`, `qbo_payroll_get_employees_by_work_location` | Employee roster and details.                                                                  |
| `qbo_payroll_get_employee_compensations`, `qbo_payroll_get_employee_deductions`, `qbo_payroll_get_employee_contract_details`, `qbo_payroll_get_employee_timeoff_assignments`, `qbo_payroll_get_employee_manager_details` | Per-employee records. |
| `qbo_payroll_get_company_deductions_contributions`, `qbo_payroll_get_company_pay_types`, `qbo_payroll_get_company_timeoff_details` | Company-level catalogs.                                                                          |
| `qbo_payroll_get_tax_filings_summary`                                                                                | `tax_form_code` (F941, 941, 940, W-2, 941-X, state codes), `period_start_date`, `period_end_date`. Default trailing 12 months. |
| `qbo_payroll_create_employee`, `qbo_payroll_update_employee`, `qbo_payroll_save_employee_contract_details`, `qbo_payroll_assign_employee_work_location` | **write**. Employment records; confirm every field.                       |

## Benchmarking

| Tool                              | Key parameters                                                                                                                                                    | Notes                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `benchmarking_against_industry`   | `industryType` and `naicsCode` (parallel arrays, 1 to 5), `metricValue`, `metricType` (profit, revenue, expenses, income, margin), `companyName`, `location_state` (2-letter), `location_county`, `aggregationPeriod`, `profitValue` + `revenueValue` for margin | Use when the person supplies the number or asks about industries in a location. |
| `benchmarking_quickbooks_account` | `metricType`, `aggregationPeriod`                                                                                                                                 | Pulls the metric from the account. Not when a number was supplied. Needs industry set.                  |
| `industry_benchmark_widget`       | rendering                                                                                                                                                         | Visual comparison after data is in hand.                                                                |
| `business_health_check_widget`    | synthesized briefing fields                                                                                                                                       | Only when explicitly requested, after all reports are fetched. Makes no API calls.                      |

## Transactions

| Tool                            | Notes                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quickbooks_transaction_import` | **write**. Loads every row (`description`, `amount`, optional `date` YYYY-MM-DD, `context.payee`, `project`). Synchronous, up to 60 seconds. See the import skill. |

## Lending (QuickBooks Capital)

| Tool                                 | Notes                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `qbo_lending_help`                   | Explains how a product works. Guidance only.                                                            |
| `qbo_lending_shop_loans`             | First call with `query` only; the widget re-calls with intake fields. Never fill intake fields yourself. |
| `qbo_lending_estimate_loan_payments` | Payment estimates for a scenario.                                                                       |
| `qbo_lending_get_loans`, `qbo_lending_get_peer_offers` | Existing loans and peer offers.                                                       |
| `money_onboarding_application_metadata`, `money_onboarding_application_submit` | **write**. Submits an application. Treat as a signed document; confirm every field and the person's intent to apply. |

Results from lending tools are guidance, not offers, rates, limits, or
eligibility decisions. Say so when reporting them.
