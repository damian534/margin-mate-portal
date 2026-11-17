import { describe, expect, it } from "vitest";
import { nextSigningGroup } from "../../supabase/functions/_shared/esignSigningOrder";

const james = { name: "James", status: "pending", signing_order: 1, sent_at: null as string | null };
const beth = { name: "Beth", status: "pending", signing_order: 2, sent_at: null as string | null };

describe("sequential signing invitations", () => {
  it("initially invites James, not Beth", () => {
    expect(nextSigningGroup([james, beth]).map(s => s.name)).toEqual(["James"]);
  });
  it("invites Beth immediately after James signs", () => {
    expect(nextSigningGroup([{ ...james, status: "signed" }, beth]).map(s => s.name)).toEqual(["Beth"]);
  });
  it("does not automatically resend an accepted invitation", () => {
    expect(nextSigningGroup([{ ...james, status: "signed" }, { ...beth, status: "sent", sent_at: "2026-11-17T07:00:00Z" }])).toEqual([]);
  });
  it("only reminds the next unsigned person", () => {
    expect(nextSigningGroup([{ ...james, status: "signed" }, { ...beth, status: "sent", sent_at: "2026-11-17T07:00:00Z" }], true).map(s => s.name)).toEqual(["Beth"]);
  });
  it("notifies all parties sharing the next order without skipping an invited blocker", () => {
    expect(nextSigningGroup([{ ...james, status: "sent", sent_at: "2026-11-17T07:00:00Z" }, beth])).toEqual([]);
    expect(nextSigningGroup([james, { ...beth, signing_order: 1 }])).toHaveLength(2);
  });
  it("never invites signed or declined parties", () => {
    expect(nextSigningGroup([{ ...james, status: "signed" }, { ...beth, status: "declined" }], true)).toEqual([]);
  });
});