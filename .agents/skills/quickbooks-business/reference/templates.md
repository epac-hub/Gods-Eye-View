# Bilingual templates

Customer-facing text defaults to the customer's language. When unknown, deliver
both. Formal register, no emojis, correct accents in Spanish. Replace the
bracketed fields from tool results; never leave a placeholder in a sent
message.

## Invoice note to customer (`note_to_customer`)

**English:** Thank you for your business. Payment is due by [due date]. For
questions about this invoice, reply to this email or call [phone].

**Español:** Gracias por su confianza. El pago vence el [fecha de
vencimiento]. Para cualquier consulta sobre esta factura, responda a este
correo o llame al [teléfono].

## Payment reminder variants

Use with `custom_subject` and `custom_message` on a single-invoice reminder,
or as the basis for editing the global template. Show the final text before
sending.

### Courtesy (1 to 30 days past due)

**Subject (EN):** Friendly reminder: invoice [number] is past due
**Body (EN):** Dear [customer], our records show invoice [number] for
[amount], dated [invoice date], remains open after its due date of [due
date]. If payment has already been sent, please disregard this notice. You can
pay online through the link below or contact us to arrange payment.

**Asunto (ES):** Recordatorio cordial: la factura [número] está vencida
**Cuerpo (ES):** Estimado(a) [cliente]: nuestros registros indican que la
factura [número] por [monto], con fecha [fecha de factura], continúa pendiente
después de su vencimiento el [fecha de vencimiento]. Si ya realizó el pago,
por favor ignore este aviso. Puede pagar en línea mediante el enlace a
continuación o comunicarse con nosotros para coordinar el pago.

### Firm (31 to 60 days past due)

**Subject (EN):** Second notice: invoice [number], [amount] outstanding
**Body (EN):** Dear [customer], invoice [number] for [amount] is now [days]
days past due. We ask that payment be remitted within five business days. If
there is a dispute or a problem with the invoice, please let us know so we can
resolve it promptly.

**Asunto (ES):** Segundo aviso: factura [número], [monto] pendiente
**Cuerpo (ES):** Estimado(a) [cliente]: la factura [número] por [monto] lleva
[días] días vencida. Solicitamos que el pago se remita dentro de los próximos
cinco días laborables. Si existe alguna controversia o problema con la
factura, agradeceremos que nos lo indique para resolverlo con prontitud.

### Escalatory (61 or more days past due)

**Subject (EN):** Final notice before account review: invoice [number]
**Body (EN):** Dear [customer], despite prior notices, invoice [number] for
[amount] remains unpaid [days] days after its due date. Unless payment or a
written payment arrangement is received by [deadline], the account will be
placed under review and further orders may be placed on hold. We would prefer
to resolve this directly with you.

**Asunto (ES):** Aviso final previo a revisión de cuenta: factura [número]
**Cuerpo (ES):** Estimado(a) [cliente]: a pesar de los avisos anteriores, la
factura [número] por [monto] continúa impaga [días] días después de su
vencimiento. De no recibir el pago o un acuerdo de pago por escrito antes del
[fecha límite], la cuenta quedará bajo revisión y los pedidos futuros podrían
suspenderse. Preferimos resolver este asunto directamente con usted.

### Conciliatory (relationship account, known dispute)

**Body (EN):** Dear [customer], we value our relationship and want to make
sure invoice [number] is handled correctly. If any item needs adjustment,
please tell us which one and we will review it immediately. Otherwise, a
payment date that works for you would help us close the item.

**Cuerpo (ES):** Estimado(a) [cliente]: valoramos nuestra relación y queremos
asegurarnos de que la factura [número] se gestione correctamente. Si algún
renglón requiere ajuste, indíquenos cuál y lo revisaremos de inmediato. De lo
contrario, una fecha de pago que le resulte conveniente nos ayudaría a cerrar
el asunto.

## Internal monthly briefing skeleton

```
[Company] — Financial briefing, [period] ([basis] basis)
Overall read: [strong | stable | mixed | needs attention]. [One sentence.]

Key numbers
| Area | Current | Prior period | Change | Source |
| Revenue | | | | P&L |
| Gross margin | | | | P&L |
| Net income | | | | P&L |
| Cash position | | | | Cash Flow |
| Working capital / current ratio | | | | Balance Sheet |
| A/R overdue (1+ days) | | | | A/R Aging |
| A/P overdue (1+ days) | | | | A/P Aging |

What is going well (2 to 4 bullets)
Needs attention (severity High / Medium / Cleanup, one line each)
What changed since last period (2 to 4 bullets)
Suggested next moves (each with an owner and a date)
Data gaps and caveats
```

The Spanish version uses the headings: Cifras clave, Lo que va bien, Requiere
atención, Qué cambió desde el período anterior, Próximos pasos sugeridos,
Brechas de datos y salvedades.
