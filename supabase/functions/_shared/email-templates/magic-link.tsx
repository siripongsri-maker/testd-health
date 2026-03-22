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
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL = 'https://tzerhfvlrssrashrcbeg.supabase.co/storage/v1/object/public/email-assets/swing-logo.png'

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>ลิงก์เข้าสู่ระบบสำหรับ {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="SWING" width="48" height="48" style={logo} />
        <Heading style={h1}>Your login link ✨</Heading>
        <Text style={text}>
          กดปุ่มด้านล่างเพื่อเข้าสู่ระบบ {siteName} ลิงก์นี้จะหมดอายุในอีกไม่นาน
        </Text>
        <Text style={text}>
          Click the button below to log in. This link will expire shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log In / เข้าสู่ระบบ
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
          <br />
          หากคุณไม่ได้ขอลิงก์นี้ สามารถเพิกเฉยอีเมลนี้ได้
        </Text>
        <Text style={brand}>testD × SWING</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const logo = { marginBottom: '24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1e1e2e',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#4a4a5a',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: '#c0275e',
  color: '#faf0f5',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '24px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 8px', lineHeight: '1.5' }
const brand = { fontSize: '11px', color: '#c0275e', fontWeight: '600' as const, margin: '8px 0 0' }
