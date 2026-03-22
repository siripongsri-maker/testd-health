/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL = 'https://tzerhfvlrssrashrcbeg.supabase.co/storage/v1/object/public/email-assets/swing-logo.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>รหัสยืนยันตัวตนของคุณ</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="SWING" width="48" height="48" style={logo} />
        <Heading style={h1}>Confirm your identity</Heading>
        <Text style={text}>
          ใช้รหัสด้านล่างเพื่อยืนยันตัวตนของคุณ / Use the code below to confirm your identity:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.
          <br />
          รหัสนี้จะหมดอายุในอีกไม่นาน หากคุณไม่ได้ขอรหัสนี้ สามารถเพิกเฉยได้
        </Text>
        <Text style={brand}>testD × SWING</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: "'JetBrains Mono', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#c0275e',
  margin: '0 0 30px',
  letterSpacing: '4px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 8px', lineHeight: '1.5' }
const brand = { fontSize: '11px', color: '#c0275e', fontWeight: '600' as const, margin: '8px 0 0' }
