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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL = 'https://tzerhfvlrssrashrcbeg.supabase.co/storage/v1/object/public/email-assets/swing-logo.png'

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>รีเซ็ตรหัสผ่านสำหรับ {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="SWING" width="48" height="48" style={logo} />
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับ {siteName} กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่
        </Text>
        <Text style={text}>
          We received a request to reset your password. Click the button below to choose a new one.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password / รีเซ็ตรหัสผ่าน
        </Button>
        <Text style={footer}>
          If you didn't request this, you can safely ignore this email.
          <br />
          หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน สามารถเพิกเฉยอีเมลนี้ได้
        </Text>
        <Text style={brand}>testD × SWING</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
