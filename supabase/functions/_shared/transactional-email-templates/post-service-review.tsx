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

interface PostServiceReviewProps {
  branchName?: string
  serviceName?: string
  appointmentDate?: string
  reviewUrl?: string
}

const PostServiceReviewEmail = ({
  branchName = 'SWING Clinic',
  serviceName = 'HIV Testing',
  appointmentDate = '15 มกราคม 2026',
  reviewUrl = APP_URL,
}: PostServiceReviewProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>ขอบคุณที่มาใช้บริการ 💛 — {branchName} | Thank you for your visit</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="SWING" width="48" height="48" style={logo} />
        <Heading style={h1}>💛 ขอบคุณที่มาใช้บริการ</Heading>
        <Heading style={h2}>Thank you for your visit!</Heading>

        <Text style={text}>
          ขอบคุณที่ไว้วางใจมาใช้บริการที่ <strong>{branchName}</strong> เมื่อวันที่ {appointmentDate}
        </Text>
        <Text style={text}>
          Thank you for trusting us at <strong>{branchName}</strong>. We hope you had a good experience.
        </Text>

        <Hr style={divider} />

        <Text style={questionTitle}>
          บริการของเราเป็นอย่างไรบ้าง? / How was our service?
        </Text>

        <Section style={ratingGroup}>
          <Button style={ratingGood} href={`${reviewUrl}?rating=great`}>
            😊 ดีมาก / Very Good
          </Button>
        </Section>

        <Section style={ratingGroup}>
          <Button style={ratingOkay} href={`${reviewUrl}?rating=okay`}>
            🙂 ก็โอเค / Okay
          </Button>
        </Section>

        <Section style={ratingGroup}>
          <Button style={ratingSupport} href={`${reviewUrl}?rating=need_support`}>
            🤝 ต้องการความช่วยเหลือเพิ่ม / Need Follow-up
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={reassurance}>
          🔒 ความคิดเห็นของคุณเป็นความลับและไม่ระบุตัวตน
          <br />
          Your feedback is confidential and anonymous.
        </Text>

        <Text style={supportNote}>
          หากต้องการพูดคุยเพิ่มเติม สามารถติดต่อเราได้ทุกเวลา 💬
          <br />
          If you need to talk, feel free to reach out anytime.
        </Text>

        <Text style={footer}>
          ดูแลตัวเองด้วยนะ 💛 / Take care of yourself!
        </Text>
        <Text style={brand}>{SITE_NAME} × SWING</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PostServiceReviewEmail,
  subject: '💛 ขอบคุณที่มาใช้บริการ — Thank you for your visit',
  displayName: 'Post-service review',
  previewData: {
    branchName: 'SWING Sathorn',
    serviceName: 'HIV Testing',
    appointmentDate: '15 มกราคม 2026',
    reviewUrl: APP_URL + '/my-appointments',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const logo = { marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e1e2e', margin: '0 0 4px' }
const h2 = { fontSize: '16px', fontWeight: '500' as const, color: '#666', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 16px' }
const divider = { borderColor: '#eee', margin: '24px 0' }
const questionTitle = { fontSize: '16px', fontWeight: '600' as const, color: '#1e1e2e', margin: '0 0 16px', textAlign: 'center' as const }
const ratingGroup = { margin: '0 0 10px', textAlign: 'center' as const }
const ratingBase = {
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '24px',
  padding: '12px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  width: '260px',
  textAlign: 'center' as const,
}
const ratingGood = { ...ratingBase, backgroundColor: '#16a34a', color: '#ffffff' }
const ratingOkay = { ...ratingBase, backgroundColor: '#f59e0b', color: '#ffffff' }
const ratingSupport = { ...ratingBase, backgroundColor: '#c0275e', color: '#ffffff' }
const reassurance = { fontSize: '12px', color: '#888', textAlign: 'center' as const, lineHeight: '1.6', margin: '0 0 16px' }
const supportNote = { fontSize: '13px', color: '#666', textAlign: 'center' as const, lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 8px', lineHeight: '1.5', textAlign: 'center' as const }
const brand = { fontSize: '11px', color: '#c0275e', fontWeight: '600' as const, margin: '8px 0 0', textAlign: 'center' as const }
