import { sendTemplateEmail } from './send-email.ts'

/**
 * Sends a registered app-email template through Lovable's managed email API
 * and records the outcome in public.email_send_log (kept app table).
 *
 * Returns { error } so existing feature code can keep its branching shape.
 */
export async function sendManagedEmail(
  supabase: any,
  params: {
    templateName: string
    recipientEmail: string
    templateData?: Record<string, unknown>
    idempotencyKey?: string
    replyTo?: string
  },
): Promise<{ error: { message: string } | null; suppressed?: boolean }> {
  const { templateName, recipientEmail, templateData, idempotencyKey, replyTo } = params

  const log = async (status: string, errorMessage?: string) => {
    const { error } = await supabase.from('email_send_log').insert({
      template_name: templateName,
      recipient_email: recipientEmail,
      status,
      error_message: errorMessage ?? null,
    })
    if (error) {
      console.error('[email] send log write failed', { code: error.code, message: error.message })
    }
  }

  try {
    const result = await sendTemplateEmail(templateName, recipientEmail, {
      templateData: templateData ?? {},
      idempotencyKey,
      replyTo,
    })

    if (result.sent) {
      await log('sent')
      return { error: null }
    }

    await log('suppressed', 'Recipient is suppressed (bounce, complaint, or unsubscribe)')
    return { error: null, suppressed: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await log('failed', message)
    return { error: { message } }
  }
}
