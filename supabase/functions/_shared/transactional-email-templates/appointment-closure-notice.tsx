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
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const APP_URL = 'https://testd.website'

interface ClosureNoticeProps {
  branchName?: string
  appointmentDate?: string
  appointmentTime?: string
  closureTitle?: string
  closureReason?: string
  rescheduleUrl?: string
}

const ClosureNoticeEmail = ({
  branchName = 'SWING Service Point',
  appointmentDate = '',
  appointmentTime = '',
  closureTitle = 'ปิดทำการ',
  closureReason = '',
  rescheduleUrl = APP_URL,
}: ClosureNoticeProps) => (
  <Html lang="th" dir="ltr">
    <Head>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
    </Head>
    <Preview>แจ้งเปลี่ยนแปลงนัดหมาย — {branchName} ปิดทำการวันที่ {appointmentDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>แจ้งเปลี่ยนแปลงนัดหมาย</Heading>
        <Text style={text}>
          สวัสดีค่ะ/ครับ ทาง testD x SWING ขอแจ้งว่า <strong>{branchName}</strong> จะ
          <strong> ปิดทำการ</strong> ในวันที่ <strong>{appointmentDate}</strong>
          {appointmentTime ? ` (นัดหมายเดิมเวลา ${appointmentTime} น.)` : ''} จึงไม่สามารถให้บริการตามนัดหมายเดิมได้
        </Text>

        <Section style={box}>
          <Text style={boxTitle}>เหตุผล: {closureTitle}</Text>
          {closureReason ? <Text style={boxText}>{closureReason}</Text> : null}
        </Section>

        <Text style={text}>
          ขออภัยในความไม่สะดวก คุณสามารถกดปุ่มด้านล่างเพื่อ <strong>ย้ายวันนัดหมาย</strong> ได้ทันที
          ข้อมูลบริการและสิทธิ์ทั้งหมดของคุณยังคงเดิม
        </Text>

        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={rescheduleUrl} style={button}>
            ย้ายวันนัดหมาย
          </Button>
        </Section>

        <Text style={small}>หากลิงก์ไม่ทำงาน คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์: {rescheduleUrl}</Text>

        <Hr style={hr} />
        <Text style={small}>
          ต้องการความช่วยเหลือ ติดต่อ SWING Clinic โทร +66 2 632 9501
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ClosureNoticeEmail,
  subject: (data: Record<string, any>) =>
    `แจ้งปิดทำการ ${data?.appointmentDate || ''} — กรุณาย้ายวันนัดหมาย | testD`,
  displayName: 'แจ้งปิดทำการ / ย้ายวันนัดหมาย',
  previewData: {
    branchName: 'SWING Silom',
    appointmentDate: '12 สิงหาคม 2569',
    appointmentTime: '13:00',
    closureTitle: 'วันหยุดนักขัตฤกษ์ (วันแม่แห่งชาติ)',
    closureReason: 'คลินิกปิดทำการทุกสาขา',
    rescheduleUrl: `${APP_URL}/my-appointments`,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 22px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '22px', color: '#111827', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '1.7', color: '#374151' }
const small = { fontSize: '12px', lineHeight: '1.6', color: '#6b7280', wordBreak: 'break-all' as const }
const box = {
  backgroundColor: '#fdf2f6',
  border: '1px solid #f5c6d8',
  borderRadius: '12px',
  padding: '14px 16px',
  margin: '16px 0',
}
const boxTitle = { fontSize: '14px', fontWeight: 'bold', color: '#c0275e', margin: '0 0 4px' }
const boxText = { fontSize: '13px', color: '#6b7280', margin: 0 }
const button = {
  backgroundColor: '#c0275e',
  color: '#ffffff',
  borderRadius: '10px',
  padding: '13px 26px',
  fontSize: '15px',
  fontWeight: 'bold',
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
