/**
 * Automated checks: every Virtual share/copy action must write the correct
 * slug + title (and event_type) into analytics_events via supabase insert.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ---- Mocks ----------------------------------------------------------------
const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn((_table: string) => ({ insert: insertMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

// Stable visitor/session/attribution helpers used by trackEvent
vi.mock('@/lib/visitorId', () => ({ getVisitorId: () => 'anon_test' }));
vi.mock('@/lib/sessionId', () => ({ getSessionId: () => 'sess_test' }));
vi.mock('@/lib/attribution', () => ({
  getSessionAttribution: () => null,
  initSessionAttribution: vi.fn(),
}));

import { ShareEpisodeButton } from '../ShareEpisodeButton';

const SLUG = 'prep-fortune';
const TITLE = 'PrEP Fortune';

const insertsFor = (eventType: string) =>
  insertMock.mock.calls
    .map((c) => c[0])
    .filter((p: any) => p?.event_type === eventType);

beforeEach(() => {
  insertMock.mockClear();
  fromMock.mockClear();
});

afterEach(() => {
  // restore navigator overrides
  // @ts-ignore
  delete (navigator as any).share;
});

describe('ShareEpisodeButton → analytics_events writes', () => {
  it('writes share impression with correct slug + title on mount', async () => {
    render(<ShareEpisodeButton slug={SLUG} title={TITLE} surface="episode_screen" />);
    await waitFor(() => expect(insertsFor('virtual_share_impression').length).toBeGreaterThan(0));
    const row = insertsFor('virtual_share_impression')[0];
    expect(fromMock).toHaveBeenCalledWith('analytics_events');
    expect(row.metadata.slug).toBe(SLUG);
    expect(row.metadata.episode_slug).toBe(SLUG);
    expect(row.metadata.title).toBe(TITLE);
    expect(row.metadata.surface).toBe('episode_screen');
  });

  it('writes click + clipboard copy events with correct slug + title (no Web Share API)', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<ShareEpisodeButton slug={SLUG} title={TITLE} surface="result_screen" />);
    fireEvent.click(screen.getByLabelText(/share episode link/i));

    await waitFor(() => expect(insertsFor('virtual_result_share').length).toBeGreaterThanOrEqual(2));

    // virtual_share_click was emitted alongside virtual_result_share(click)
    const clickRow = insertsFor('virtual_share_click')[0];
    expect(clickRow.metadata.slug).toBe(SLUG);
    expect(clickRow.metadata.title).toBe(TITLE);

    // virtual_share_copy must carry slug + title + clipboard method
    const copyRow = insertsFor('virtual_share_copy')[0];
    expect(copyRow.metadata.slug).toBe(SLUG);
    expect(copyRow.metadata.title).toBe(TITLE);
    expect(copyRow.metadata.method).toBe('clipboard');

    // The result_share rows mirror the same slug + title
    for (const r of insertsFor('virtual_result_share')) {
      expect(r.metadata.slug).toBe(SLUG);
      expect(r.metadata.title).toBe(TITLE);
    }
  });

  it('writes native share event with correct slug + title when Web Share API succeeds', async () => {
    (navigator as any).share = vi.fn().mockResolvedValue(undefined);

    render(<ShareEpisodeButton slug={SLUG} title={TITLE} />);
    fireEvent.click(screen.getByLabelText(/share episode link/i));

    await waitFor(() => expect(insertsFor('virtual_share_native').length).toBe(1));
    const nativeRow = insertsFor('virtual_share_native')[0];
    expect(nativeRow.metadata.slug).toBe(SLUG);
    expect(nativeRow.metadata.title).toBe(TITLE);
    expect(nativeRow.metadata.method).toBe('web_share_api');

    // No clipboard fallback should fire when native share resolves
    expect(insertsFor('virtual_share_copy').length).toBe(0);
  });

  it('writes cancelled + failed events with correct slug + title when share/copy reject', async () => {
    (navigator as any).share = vi.fn().mockRejectedValue(new Error('user cancelled'));
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    render(<ShareEpisodeButton slug={SLUG} title={TITLE} />);
    fireEvent.click(screen.getByLabelText(/share episode link/i));

    await waitFor(() => expect(insertsFor('virtual_share_failed').length).toBe(1));
    const cancelled = insertsFor('virtual_share_cancelled')[0];
    const failed = insertsFor('virtual_share_failed')[0];

    expect(cancelled.metadata.slug).toBe(SLUG);
    expect(cancelled.metadata.title).toBe(TITLE);
    expect(failed.metadata.slug).toBe(SLUG);
    expect(failed.metadata.title).toBe(TITLE);
  });
});
