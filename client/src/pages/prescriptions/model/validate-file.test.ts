import { describe, expect, it } from "vitest";
import { MAX_PRESCRIPTION_BYTES, prescriptionFileError } from "./validate-file";

describe("prescriptionFileError", () => {
  it("accepts JPEG, PNG and PDF up to the limit", () => {
    expect(
      prescriptionFileError({ type: "application/pdf", size: 1 }),
    ).toBeNull();
    expect(prescriptionFileError({ type: "image/png", size: 5 })).toBeNull();
    expect(
      prescriptionFileError({
        type: "image/jpeg",
        size: MAX_PRESCRIPTION_BYTES,
      }),
    ).toBeNull();
  });

  it("rejects other types and oversized files", () => {
    expect(prescriptionFileError({ type: "image/gif", size: 1 })).toBe("type");
    expect(
      prescriptionFileError({
        type: "image/png",
        size: MAX_PRESCRIPTION_BYTES + 1,
      }),
    ).toBe("size");
  });
});
