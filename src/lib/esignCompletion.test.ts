import { describe, expect, it } from "vitest";
import { allPartiesSigned } from "../../supabase/functions/_shared/esignCompletion";

describe("document completion notification", () => {
  it("requires every party to have signed", () => {
    expect(allPartiesSigned([{ status: "signed" }, { status: "signed" }])).toBe(true);
    expect(allPartiesSigned([{ status: "signed" }, { status: "pending" }])).toBe(false);
    expect(allPartiesSigned([{ status: "signed" }, { status: "viewed" }])).toBe(false);
  });
  it("does not treat a declined party as signed", () => {
    expect(allPartiesSigned([{ status: "signed" }, { status: "declined" }])).toBe(false);
  });
  it("does not notify for a document with no parties", () => {
    expect(allPartiesSigned([])).toBe(false);
  });
});