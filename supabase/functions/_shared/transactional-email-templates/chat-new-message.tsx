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
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://tzerhfvlrssrashrcbeg.supabase.co/storage/v1/object/public/email-assets/swing-logo.png'
const SITE_NAME = 'testD'

interface ChatNewMessageProps {
  senderName?: string
  messagePreview?: string
  threadUrl?: string
}

const ChatNewMessageEmail = ({ senderName, messagePreview, threadUrl }: ChatNewMessageProps) => (
  <Html lang="th" dir="ltr">
    <Head />
    <Preview>ข้อความใหม่จาก {senderName || 'ผู้ใช้'} — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="120" height="40" style={logo} />
        </Section>
        <Heading style={h1}>💬 ข้อความใหม่</Heading>
        <Text style={text}>
          คุณได้รับข้อความใหม่จาก <strong>{senderName || 'ผู้ใช้'}</strong> ใน {SITE_NAME} Support Chat
        </Text>
        {messagePreview && (
          <Section style={previewBox}>
            <Text style={previewText}>"{messagePreview}"</Text>
          </Section>
        )}
        <Section style={buttonSection}>
          <Button style={button} href={threadUrl || 'https://testd-health.lovable.app/admin?tab=user-chats'}>
            เปิดกล่องข้อความ
          </Button>
        </Section>
        <Text style={footer}>
          ระบบจะส่งอีเมลแจ้งเตือนตามการตั้งค่าของคุณ สามารถปรับได้ในหน้า Admin → กล่องข้อความ → วิเคราะห์
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ChatNewMessageEmail,
  subject: (data: Record<string, any>) => `💬 ข้อความใหม่จาก ${data.senderName || 'ผู้ใช้'} — ${SITE_NAME}`,
  displayName: 'Chat new message notification',
  previewData: { senderName: 'ผู้ใช้ทดสอบ', messagePreview: 'สวัสดีครับ อยากสอบถามเรื่อง PrEP' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Sukhumvit Set', 'Noto Sans Thai', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '20px' }
const logo = { margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const previewBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '20px',
  borderLeft: '3px solid hsl(262, 83%, 58%)',
}
const previewText = { fontSize: '13px', color: '#333', margin: '0', fontStyle: 'italic' as const }
const buttonSection = { textAlign: 'center' as const, marginBottom: '24px' }
const button = {
  backgroundColor: 'hsl(262, 83%, 58%)',
  color: '#ffffff',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '11px', color: '#999', margin: '20px 0 0', lineHeight: '1.4' }
