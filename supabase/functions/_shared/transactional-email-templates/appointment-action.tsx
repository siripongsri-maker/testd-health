/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://tzerhfvlrssrashrcbeg.supabase.co/storage/v1/object/public/email-assets/swing-logo.png'
const SITE_NAME = 'testD'
const APP_URL = 'https://testd-health.lovable.app'

interface AppointmentActionProps {
  branchName?: string
  serviceName?: string
  appointmentDate?: string
  appointmentTime?: string
  verificationCode?: string
  referralCode?: string
  checkinUrl?: string
  confirmUrl?: string
  rescheduleUrl?: string
  cancelUrl?: string
}

const AppointmentActionEmail = ({
  branchName = 'SWING Clinic',
  serviceName = 'HIV Testing',
  appointmentDate = '15 มกราคม 2026',
  appointmentTime = '14:00',
  verificationCode = '847291',
  referralCode = 'SWG-XXXXXX',
  checkinUrl = APP_URL,
  confirmUrl = APP_URL,
  rescheduleUrl = APP_URL,
  cancelUrl = APP_URL,
}: AppointmentActionProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>นัดหมายของคุณกำลังมาถึง — {branchName} | Your appointment is coming up</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="SWING" width="48" height="48" style={logo} />
        <Heading style={h1}>📋 นัดหมายของคุณ / Your Appointment</Heading>

        <Section style={infoCard}>
          <Text style={infoLabel}>📍 สถานที่ / Location</Text>
          <Text style={infoValue}>{branchName}</Text>
          <Text style={infoLabel}>🩺 บริการ / Service</Text>
          <Text style={infoValue}>{serviceName}</Text>
          <Text style={infoLabel}>📅 วันที่ / Date</Text>
          <Text style={infoValue}>{appointmentDate}</Text>
          <Text style={infoLabel}>🕐 เวลา / Time</Text>
          <Text style={infoValue}>{appointmentTime}</Text>
          <Text style={infoLabel}>🔖 รหัสนัดหมาย / Booking Code</Text>
          <Text style={infoValue}>{referralCode}</Text>
        </Section>

        <Section style={codeSection}>
          <Text style={codeLabel}>รหัสยืนยัน / Verification Code</Text>
          <Text style={codeValue}>{verificationCode}</Text>
          <Text style={codeExpiry}>⏰ รหัสนี้ใช้ได้ภายใน 24 ชั่วโมง / Valid for 24 hours</Text>
        </Section>

        <Hr style={divider} />

        <Text style={actionTitle}>คุณต้องการทำอะไร? / What would you like to do?</Text>

        <Section style={buttonGroup}>
          <Button style={buttonPrimary} href={checkinUrl}>
            ✅ เช็คอิน / Check In
          </Button>
        </Section>

        <Section style={buttonGroup}>
          <Button style={buttonSecondary} href={confirmUrl}>
            👍 ยืนยันนัด / Confirm
          </Button>
        </Section>

        <Section style={buttonGroup}>
          <Button style={buttonOutline} href={rescheduleUrl}>
            📅 เลื่อนนัด / Reschedule
          </Button>
        </Section>

        <Section style={buttonGroup}>
          <Button style={buttonDanger} href={cancelUrl}>
            ❌ ยกเลิก / Cancel
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={footer}>
          ข้อมูลของคุณปลอดภัยและเป็นความลับ 🔒
          <br />
          Your data is safe and confidential.
        </Text>
        <Text style={brand}>{SITE_NAME} × SWING</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AppointmentActionEmail,
  subject: (data: Record<string, any>) =>
    `📋 นัดหมายของคุณ — ${data.branchName || 'SWING Clinic'} | Your Appointment`,
  displayName: 'Appointment action',
  previewData: {
    branchName: 'SWING Sathorn',
    serviceName: 'HIV Testing',
    appointmentDate: '15 มกราคม 2026',
    appointmentTime: '14:00',
    verificationCode: '847291',
    referralCode: 'SWG-ABC123',
    checkinUrl: APP_URL,
    confirmUrl: APP_URL,
    rescheduleUrl: APP_URL,
    cancelUrl: APP_URL,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const logo = { marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e1e2e', margin: '0 0 20px' }
const infoCard = {
  backgroundColor: '#f8f9fa',
  borderRadius: '16px',
  padding: '20px',
  margin: '0 0 24px',
}
const infoLabel = { fontSize: '12px', color: '#888', margin: '0 0 2px', fontWeight: '500' as const }
const infoValue = { fontSize: '15px', color: '#1e1e2e', margin: '0 0 12px', fontWeight: '600' as const }
const codeSection = {
  backgroundColor: '#fdf2f8',
  borderRadius: '16px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const codeLabel = { fontSize: '13px', color: '#c0275e', margin: '0 0 8px', fontWeight: '600' as const }
const codeValue = {
  fontFamily: "'JetBrains Mono', Courier, monospace",
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#c0275e',
  letterSpacing: '6px',
  margin: '0 0 8px',
}
const codeExpiry = { fontSize: '11px', color: '#999', margin: '0' }
const divider = { borderColor: '#eee', margin: '24px 0' }
const actionTitle = { fontSize: '16px', fontWeight: '600' as const, color: '#1e1e2e', margin: '0 0 16px', textAlign: 'center' as const }
const buttonGroup = { margin: '0 0 10px', textAlign: 'center' as const }
const buttonPrimary = {
  backgroundColor: '#c0275e',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '24px',
  padding: '12px 32px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  width: '260px',
  textAlign: 'center' as const,
}
const buttonSecondary = {
  ...buttonPrimary,
  backgroundColor: '#16a34a',
}
const buttonOutline = {
  ...buttonPrimary,
  backgroundColor: '#ffffff',
  color: '#c0275e',
  border: '2px solid #c0275e',
}
const buttonDanger = {
  ...buttonPrimary,
  backgroundColor: '#ffffff',
  color: '#dc2626',
  border: '2px solid #dc2626',
}
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 8px', lineHeight: '1.5', textAlign: 'center' as const }
const brand = { fontSize: '11px', color: '#c0275e', fontWeight: '600' as const, margin: '8px 0 0', textAlign: 'center' as const }
