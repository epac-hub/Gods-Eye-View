# Agent skills

Skills in this directory are loaded by agent tooling that reads
`.agents/skills/<name>/SKILL.md`. Each skill's front matter states when it
applies; the body holds the procedure.

| Skill                                                                 | Purpose                                                                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [community-pr](community-pr/SKILL.md)                                 | Review and integrate community pull requests with the maintainer workflow.               |
| [quickbooks-business](quickbooks-business/SKILL.md)                   | Entry point for QuickBooks Online work: connection protocol, safety rules, routing.       |
| [quickbooks-financial-briefing](quickbooks-financial-briefing/SKILL.md) | Month-end and on-demand financial briefing from P&L, balance sheet, cash flow, aging.  |
| [quickbooks-invoicing](quickbooks-invoicing/SKILL.md)                 | Invoices, estimates, recurring templates, payment links, with confirmation gates.         |
| [quickbooks-collections](quickbooks-collections/SKILL.md)             | A/R prioritization and payment reminders through the mandatory send gate.                |
| [quickbooks-payroll-compliance](quickbooks-payroll-compliance/SKILL.md) | Payroll readiness, payslip review, and federal filing status with data minimization.   |
| [quickbooks-benchmarking](quickbooks-benchmarking/SKILL.md)           | Industry and regional peer comparison with correct NAICS and location handling.          |
| [quickbooks-transaction-import](quickbooks-transaction-import/SKILL.md) | Analyze or import CSV and pasted transactions with row-level quality rules.            |

The QuickBooks skills depend on the `Intuit_QuickBooks` MCP connector being
attached to the session; they do not touch this repository's application code.
