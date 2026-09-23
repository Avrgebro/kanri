import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { Client, DocConfig, Estimate, EstimateLine } from '@/types/domain'
import { computeTotals } from '../totals'
import { formatMoney, formatHours } from '@/lib/money'

/**
 * The one estimate layout. Everything that varies between estimates is data:
 * `config` comes from settings, and is snapshotted onto the estimate on send
 * so a previously sent PDF always re-renders as the client saw it.
 */
export interface EstimateDocumentProps {
  estimate: Estimate
  client: Client
  lines: EstimateLine[]
  config: DocConfig
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 9.5, color: '#1f2430', lineHeight: 1.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  logo: { width: 120, height: 40, objectFit: 'contain' },
  companyName: { fontSize: 13, fontWeight: 'bold' },
  muted: { color: '#6b7280' },
  title: { fontSize: 22, fontWeight: 'bold', letterSpacing: -0.4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  metaBlock: { maxWidth: '48%' },
  label: { fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9ca3af', marginBottom: 3 },
  tableHead: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111827',
    paddingBottom: 5, marginBottom: 6,
  },
  row: { flexDirection: 'row', paddingVertical: 5 },
  sectionRow: { marginTop: 14, marginBottom: 4, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  sectionName: { fontSize: 10.5, fontWeight: 'bold' },
  colDesc: { flex: 1, paddingRight: 12 },
  colNum: { width: 58, textAlign: 'right' },
  colAmt: { width: 76, textAlign: 'right' },
  subtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 },
  totals: { marginTop: 18, marginLeft: 'auto', width: 220 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grandTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#111827', marginTop: 5, paddingTop: 6,
    fontSize: 12, fontWeight: 'bold',
  },
  terms: { marginTop: 34, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: '#e5e7eb' },
  footer: {
    position: 'absolute', bottom: 28, left: 48, right: 48,
    textAlign: 'center', fontSize: 7.5, color: '#9ca3af',
  },
})

export function EstimateDocument({ estimate, client, lines, config }: EstimateDocumentProps) {
  const t = computeTotals(estimate, lines)
  const money = (c: number) => formatMoney(c, estimate.currency)
  const accent = config.accent_color || '#334155'
  const showHours = config.show_line_hours
  const showRate = config.show_unit_price

  return (
    <Document title={`${estimate.number} — ${client.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {config.logo_url
              ? <Image style={styles.logo} src={config.logo_url} />
              : <Text style={styles.companyName}>{config.company.name}</Text>}
            {config.company.address && <Text style={styles.muted}>{config.company.address}</Text>}
            {config.company.email && <Text style={styles.muted}>{config.company.email}</Text>}
            {config.company.tax_id && <Text style={styles.muted}>Tax ID {config.company.tax_id}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.title, { color: accent }]}>ESTIMATE</Text>
            <Text style={styles.muted}>{estimate.number}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Prepared for</Text>
            <Text style={{ fontWeight: 'bold' }}>{client.name}</Text>
            {client.contact_name && <Text>{client.contact_name}</Text>}
            {client.address && <Text style={styles.muted}>{client.address}</Text>}
            {client.email && <Text style={styles.muted}>{client.email}</Text>}
          </View>
          <View style={[styles.metaBlock, { alignItems: 'flex-end' }]}>
            <Text style={styles.label}>Issued</Text>
            <Text>{estimate.issue_date}</Text>
            {estimate.valid_until && (
              <>
                <Text style={[styles.label, { marginTop: 8 }]}>Valid until</Text>
                <Text>{estimate.valid_until}</Text>
              </>
            )}
          </View>
        </View>

        {estimate.title && (
          <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 14 }}>{estimate.title}</Text>
        )}

        <View style={styles.tableHead}>
          <Text style={[styles.colDesc, styles.label, { marginBottom: 0 }]}>Description</Text>
          {showHours && <Text style={[styles.colNum, styles.label, { marginBottom: 0 }]}>Hours</Text>}
          {showRate && <Text style={[styles.colNum, styles.label, { marginBottom: 0 }]}>Rate</Text>}
          <Text style={[styles.colAmt, styles.label, { marginBottom: 0 }]}>Amount</Text>
        </View>

        {t.groups.map((group, gi) => (
          <View key={group.section?.id ?? `g${gi}`} wrap={false}>
            {group.section && (
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionName, { color: accent }]}>{group.section.description}</Text>
                {group.section.detail && <Text style={styles.muted}>{group.section.detail}</Text>}
              </View>
            )}

            {group.lines.map(({ line, amount_cents }) => (
              <View key={line.id} style={styles.row}>
                <View style={styles.colDesc}>
                  <Text>{line.description}</Text>
                  {line.detail && <Text style={[styles.muted, { fontSize: 8.5 }]}>{line.detail}</Text>}
                </View>
                {showHours && <Text style={styles.colNum}>{formatHours(line.hours)}</Text>}
                {showRate && <Text style={styles.colNum}>{money(line.unit_price_cents)}</Text>}
                <Text style={styles.colAmt}>{money(amount_cents)}</Text>
              </View>
            ))}

            {group.section && group.lines.length > 1 && (
              <View style={styles.subtotalRow}>
                <Text style={[styles.colAmt, styles.muted]}>{money(group.subtotal_cents)}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{money(t.subtotal_cents)}</Text>
          </View>
          {t.discount_cents > 0 && (
            <View style={styles.totalLine}>
              <Text style={styles.muted}>Discount</Text>
              <Text>−{money(t.discount_cents)}</Text>
            </View>
          )}
          {t.tax_cents > 0 && (
            <View style={styles.totalLine}>
              <Text style={styles.muted}>{config.tax_label} ({estimate.tax_rate}%)</Text>
              <Text>{money(t.tax_cents)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text>Total</Text>
            <Text style={{ color: accent }}>{money(t.total_cents)}</Text>
          </View>
          {showHours && t.total_hours > 0 && (
            <View style={styles.totalLine}>
              <Text style={styles.muted}>Estimated effort</Text>
              <Text style={styles.muted}>{formatHours(t.total_hours)}</Text>
            </View>
          )}
        </View>

        {(estimate.terms || config.terms_text || config.payment_terms) && (
          <View style={styles.terms}>
            <Text style={styles.label}>Terms</Text>
            {config.payment_terms && <Text>{config.payment_terms}</Text>}
            <Text style={styles.muted}>{estimate.terms || config.terms_text}</Text>
          </View>
        )}

        {estimate.notes && (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.muted}>{estimate.notes}</Text>
          </View>
        )}

        {config.footer_text && <Text style={styles.footer} fixed>{config.footer_text}</Text>}
      </Page>
    </Document>
  )
}
