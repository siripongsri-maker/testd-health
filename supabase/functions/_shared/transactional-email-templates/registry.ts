/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as appointmentAction } from './appointment-action.tsx'
import { template as postServiceReview } from './post-service-review.tsx'
import { template as chatNewMessage } from './chat-new-message.tsx'
import { template as selftestReactiveAlert } from './selftest-reactive-alert.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'appointment-action': appointmentAction,
  'post-service-review': postServiceReview,
  'chat-new-message': chatNewMessage,
  'selftest-reactive-alert': selftestReactiveAlert,
}
