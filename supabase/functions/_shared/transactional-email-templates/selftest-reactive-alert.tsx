/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ReactiveAlertProps {
  shortId?: string
  requestId?: string
  submittedAt?: string
  deliveryMode?: string
  photoAttached?: boolean
  adminUrl?: string
}

const ReactiveAlertEmail = ({
  shortId,
  requestId,
  submittedAt,
  deliveryMode,
  photoAttached,
  adminUrl,
}: ReactiveAlertProps) => (
  <Html lang="th" dir="ltr">
    <Head />
    <Preview>Reactive self-test submission — follow up within 24 hours</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🤝 Reactive self-test submission</Heading>
        <Text style={text}>
          มีผู้ใช้ส่งผลแบบ <strong>2 ขีด (reactive)</strong> ผ่าน lean flow
          กรุณา follow-up ตามที่ผู้ใช้เลือก connection ภายใน 24 ชั่วโมง
        </Text>

        <Section style={tableWrap}>
          <Row label="Request ID" value={requestId || '-'} mono />
          <Row label="Short ID" value={shortId || '-'} mono />
          <Row label="Submitted at" value={submittedAt || '-'} />
          <Row label="Delivery mode" value={deliveryMode || '-'} />
          <Row label="Photo attached" value={photoAttached ? 'Yes' : 'No'} />
        </Section>

        <Section style={buttonSection}>
          <Button style={button} href={adminUrl || 'https://testd.website/admin'}>
            เปิด admin panel
          </Button>
        </Section>

        <Text style={footer}>
          Privacy reminder: อย่า forward อีเมลนี้ออกนอกทีม
          ระบบไม่ได้แนบ PII เพื่อความปลอดภัย — เข้าถึงข้อมูลผู้ใช้ผ่าน admin panel เท่านั้น
        </Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <table style={rowTable}>
    <tbody>
      <tr>
        <td style={rowLabel}>{label}</td>
        <td style={mono ? rowValueMono : rowValue}>{value}</td>
      </tr>
    </tbody>
  </table>
)

export const template = {
  component: ReactiveAlertEmail,
  subject: (data: Record<string, any>) =>
    `[testD ALERT] Reactive self-test result — ${data.shortId || 'unknown'}`,
  displayName: 'Reactive self-test alert (internal)',
  previewData: {
    shortId: 'abc12345',
    requestId: 'abc12345-1111-2222-3333-444455556666',
    submittedAt: new Date().toISOString(),
    deliveryMode: 'ship',
    photoAttached: false,
    adminUrl: 'https://testd.website/admin',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Sukhumvit Set', 'Noto Sans Thai', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#d97706', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const tableWrap = { margin: '16px 0' }
const rowTable = { width: '100%', borderCollapse: 'collapse' as const, margin: '2px 0' }
const rowLabel = { padding: '6px 12px', background: '#f9fafb', fontSize: '13px', color: '#374151', width: '40%' as const }
const rowValue = { padding: '6px 12px', fontSize: '13px', color: '#111' }
const rowValueMono = { padding: '6px 12px', fontSize: '12px', color: '#111', fontFamily: 'monospace' }
const buttonSection = { textAlign: 'center' as const, marginBottom: '24px' }
const button = {
  backgroundColor: '#d97706',
  color: '#ffffff',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '11px', color: '#999', margin: '20px 0 0', lineHeight: '1.4' }
