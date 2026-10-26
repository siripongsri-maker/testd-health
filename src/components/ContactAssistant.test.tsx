/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContactAssistant } from './ContactAssistant';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

describe('ContactAssistant conversation history', () => {
  it('continues answering the eleventh and subsequent questions with bounded context', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    invoke.mockImplementation(async (_name, { body }) => body.messages.length > 20
      ? { data: null, error: new Error('messages required') }
      : { data: { reply: `Answer ${body.messages.at(-1).content}` }, error: null });
    render(<ContactAssistant th={false} />);

    for (let question = 1; question <= 12; question++) {
      fireEvent.change(screen.getByRole('textbox', { name: 'Question' }), { target: { value: `Kit question ${question}` } });
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));
      await waitFor(() => expect(screen.getByText(`Answer Kit question ${question}`)).toBeInTheDocument());
    }

    expect(invoke).toHaveBeenCalledTimes(12);
    const eleventh = invoke.mock.calls[10][1].body.messages;
    expect(eleventh).toHaveLength(10);
    expect(eleventh.at(-1)).toEqual({ role: 'user', content: 'Kit question 11' });
    expect(eleventh).toContainEqual({ role: 'assistant', content: 'Answer Kit question 10' });
    expect(screen.getByText('Answer Kit question 1')).toBeInTheDocument();
  });
});