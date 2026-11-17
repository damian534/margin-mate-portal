import { describe, expect, it } from "vitest";
import { nextSigningGroup } from "../../supabase/functions/_shared/esignSigningOrder";

const james = { name: "James", status: "pending", signing_order: 1, sent_at: null as string | null };
const beth = { name: "Beth", status: "pending", signing_order: 2, sent_at: null as string | null };

describe("all requested signing invitations", () => {
  it("initially invites both James and Beth regardless of signing order", () => {
    expect(nextSigningGroup([james, beth]).map(s => s.name)).toEqual(["James", "Beth"]);
  });
  it("invites Beth immediately after James signs", () => {
    expect(nextSigningGroup([{ ...james, status: "signed" }, beth]).map(s => s.name)).toEqual(["Beth"]);
  });
  it("does not automatically resend an accepted invitation", () => {
    expect(nextSigningGroup([{ ...james, status: "signed" }, { ...beth, status: "sent", sent_at: "2026-11-17T07:00:00Z" }])).toEqual([]);
  });
  it("reminds unsigned parties without resending to signed parties", () => {
    expect(nextSigningGroup([{ ...james, status: "signed" }, { ...beth, status: "sent", sent_at: "2026-11-17T07:00:00Z" }], true).map(s => s.name)).toEqual(["Beth"]);
  });
  it("invites a later added Beth even while James is still unsigned", () => {
    expect(nextSigningGroup([{ ...james, status: "sent", sent_at: "2026-11-17T07:00:00Z" }, beth]).map(s => s.name)).toEqual(["Beth"]);
    expect(nextSigningGroup([james, { ...beth, signing_order: 1 }])).toHaveLength(2);
  });
  it("invites every requested third or subsequent applicant", () => {
    expect(nextSigningGroup([james, beth, { ...beth, name: "Third applicant", signing_order: 3 }]).map(s => s.name)).toEqual(["James", "Beth", "Third applicant"]);
  });
  it("never invites signed or declined parties", () => {
    expect(nextSigningGroup([{ ...james, status: "signed" }, { ...beth, status: "declined" }], true)).toEqual([]);
  });
});