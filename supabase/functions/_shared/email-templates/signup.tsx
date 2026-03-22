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
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

const LOGO_URL = 'https://tzerhfvlrssrashrcbeg.supabase.co/storage/v1/object/public/email-assets/swing-logo.png'

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>ยืนยันอีเมลของคุณสำหรับ {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="SWING" width="48" height="48" style={logo} />
        <Heading style={h1}>Welcome to testD! 🎉</Heading>
        <Text style={text}>
          ขอบคุณที่สมัครใช้งาน{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          ! กรุณายืนยันอีเมลของคุณเพื่อเริ่มใช้งาน
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verify Email / ยืนยันอีเมล
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
          <br />
          หากคุณไม่ได้สมัครสมาชิก สามารถเพิกเฉยอีเมลนี้ได้
        </Text>
        <Text style={brand}>testD × SWING</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: '#c0275e', textDecoration: 'underline' }
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
