---
name: quickbooks-payroll-compliance
description: Check QuickBooks Online Payroll readiness, review payslips and employee records, and report federal payroll tax filing status (941, 940, W-2 family) with rejections surfaced and personal data minimized. Use for "why can't I run payroll", "what did we pay last period", "are our filings accepted", or employee setup questions. Employee writes are allowed only with field-by-field confirmation.
---

# QuickBooks Payroll Compliance

Read [quickbooks-business](../quickbooks-business/SKILL.md) and
[guardrails.md](../quickbooks-business/reference/guardrails.md) first. Payroll
results contain compensation and identifiers; quote only what the question
needs.

## Readiness ("why can't I run payroll")

1. `company_info`, then `qbo_payroll_get_company_payroll_readiness`.
2. If the company is ready but a person is blocked,
   `qbo_payroll_search_employee` then
   `qbo_payroll_get_employee_payroll_readiness`.
3. Report each blocking item as a checklist row: item, what is missing, who
   fixes it (owner, employee, payroll administrator, Intuit support), and
   whether the connector can write it (`qbo_payroll_update_employee`,
   `qbo_payroll_assign_employee_work_location`,
   `qbo_payroll_save_employee_contract_details`) or it must be done in
   QuickBooks.

Supporting context when needed: `qbo_payroll_get_employer_tax_setup`,
`qbo_payroll_get_pay_schedules`, `qbo_payroll_get_company_pay_types`,
`qbo_payroll_get_company_deductions_contributions`.

## Pay period review ("what did we pay")

1. `qbo_payroll_get_company_last_payroll_run` for the most recent run.
2. `qbo_payroll_get_payslips` with `input.pay_date_range` for the period.
   Results paginate 20 per page; pass `page_info.end_cursor` as `input.after`
   until `has_next_page` is false. Never construct a cursor.
3. Summarize: headcount paid, gross, net, employer contributions, by
   payslip type (REGULAR, BONUS, and so on). Give per-employee lines only when
   asked, and then only name, gross, net.
4. `qbo_payroll_get_payslip_details` only for a specific payslip the person
   asks about.

## Filing status ("are we compliant")

1. `qbo_payroll_get_tax_filings_summary` with no filters for the trailing
   twelve months, or with `tax_form_code` (941, 940, W-2, 941-X, or a state
   code) and a `period_start_date` / `period_end_date` window for a specific
   quarter.
2. Report one row per filing: form, period, status progression (Generated,
   Submitted, Accepted, Rejected), dates, rejection count, latest rejection
   reason, amendment linkage.
3. Rejected or stuck filings are the headline. State the reason verbatim, the
   likely fix, and that a rejected federal filing past its due date can carry
   penalties under the Internal Revenue Code (26 U.S.C. §§ 6651, 6656) that
   the payroll administrator or accountant should evaluate. Do not compute the
   penalty.

Distinguish clearly in the write-up:

- **Statutory obligation:** the deposit and filing duties themselves.
- **What QuickBooks did:** generated, submitted, and the acceptance status
  reported back.
- **Not visible here:** filings handled outside QuickBooks Online Payroll,
  and whether deposits cleared the bank.

## Puerto Rico flag

QuickBooks Online Payroll's territorial coverage is limited. Before relying on
the filings summary for a Puerto Rico employer, confirm which returns the
product produces for that company. Puerto Rico income-tax withholding,
quarterly returns, and the W-2PR / 499R-2 informative returns are filed with
Hacienda through SURI and may not appear in the connector's summary. The
Federal Unemployment Tax Act (Form 940) and the Form 941 family still apply
to Puerto Rico employers; report their status from the tool and mark the
Hacienda side as "not visible in QuickBooks" rather than "compliant".

## Employee changes

Writes (`qbo_payroll_create_employee`, `qbo_payroll_update_employee`,
`qbo_payroll_save_employee_contract_details`,
`qbo_payroll_assign_employee_work_location`) require a side-by-side table of
current and proposed values and an explicit yes. Compensation changes should
be reviewed by the payroll administrator before they are written; say so and
offer to prepare the change for their approval.

## Output

Lead with the compliance read in one sentence (ready, blocked, rejected
filings). Then the checklist or filing table, then who acts on what, then
what is outside the connector's view.
