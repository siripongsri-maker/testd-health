import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---- Mocks ----------------------------------------------------------------

// Capture inserts so we can assert on the payload sent to client_feedback_responses.
const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn((table: string) => {
  if (table === "client_feedback_responses") {
    return { insert: insertMock };
  }
  // analytics / seed tables — accept silently
  return { insert: vi.fn().mockResolvedValue({ error: null }) };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...(args as [string])),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  },
}));

// Avoid network/db side effects from trackers.
vi.mock("@/lib/journeyTracker", () => ({
  trackJourneyEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/clientSeed", async () => {
  const actual = await vi.importActual<any>("@/lib/clientSeed");
  return {
    ...actual,
    trackSeedEvent: vi.fn().mockResolvedValue(undefined),
    getClientSeedId: () => "cs_test_seed",
    fetchUicVisitStats: vi.fn().mockResolvedValue(null),
  };
});

// Toaster from sonner — no-op
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

import ClientFeedbackForm from "@/pages/ClientFeedbackForm";

// ---- Helpers --------------------------------------------------------------

const renderForm = () =>
  render(
    <MemoryRouter initialEntries={["/feedback"]}>
      <ClientFeedbackForm />
    </MemoryRouter>
  );

const clickNext = async () => {
  const next = await screen.findByRole("button", { name: /ถัดไป|Next/i });
  fireEvent.click(next);
};

// ---- Test -----------------------------------------------------------------

describe("ClientFeedbackForm — submit without UIC", () => {
  beforeEach(() => {
    insertMock.mockClear();
    fromMock.mockClear();
    localStorage.clear();
  });

  it("submits the feedback with expected payload and no UIC", async () => {
    renderForm();

    // Step 1: intro — just go next
    await clickNext();

    // Step 2: counselling — answer all 5 questions with 'Strongly Agree' (เห็นด้วยอย่างยิ่ง)
    // Use exact match to avoid colliding with 'ไม่เห็นด้วยอย่างยิ่ง' (Strongly Disagree).
    const stronglyAgreeExact = /^เห็นด้วยอย่างยิ่ง$|^Strongly Agree$/;
    const agreeButtons = await screen.findAllByRole("button", {
      name: stronglyAgreeExact,
    });
    expect(agreeButtons).toHaveLength(5);
    agreeButtons.forEach((b) => fireEvent.click(b));
    await clickNext();

    // Step 3: satisfaction — pick 5 for both sliders
    // Each "5" button appears in two satisfaction blocks; click both.
    const fives = await screen.findAllByRole("button", { name: "5" });
    expect(fives.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(fives[0]);
    fireEvent.click(fives[1]);
    await clickNext();

    // Step 4: services — pick "No additional services" so we skip UIC + sub-sections
    const noneBtn = await screen.findByRole("button", {
      name: /ไม่ได้รับบริการเพิ่มเติม|No additional services/i,
    });
    fireEvent.click(noneBtn);
    await clickNext();

    // Step 5: open feedback — submit
    const submit = await screen.findByRole("button", {
      name: /ส่งแบบประเมิน|Submit/i,
    });
    fireEvent.click(submit);

    // Wait for the insert into client_feedback_responses
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    const payload = insertMock.mock.calls[0][0];

    // ── Assertions on the saved payload ──────────────────────────────────
    expect(payload).toMatchObject({
      channel: "clinic",
      is_anonymous: true,
      uic: null,
      client_seed_id: "cs_test_seed",
      // Counselling answers (4 = Strongly Agree)
      q1_respect: 4,
      q2_open_discussion: 4,
      q3_info_clarity: 4,
      q4_results_explained: 4,
      q5_condom_demo: 4,
      // Satisfaction
      satisfaction_score: 5,
      self_efficacy_score: 5,
      // Services
      received_sti: false,
      received_prep: false,
      received_pep: false,
      received_art: false,
      received_harm_reduction: false,
      received_mental_health: false,
      no_additional_service: true,
      status: "submitted",
    });

    // Service date should default to today's ISO date
    expect(payload.service_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Success screen should appear after submission
    await waitFor(() => {
      expect(
        screen.getByText(/ส่งแบบประเมินสำเร็จ|Feedback submitted successfully/i)
      ).toBeInTheDocument();
    });
  });
});
