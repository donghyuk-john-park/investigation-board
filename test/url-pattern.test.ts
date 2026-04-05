import { describe, it, expect } from "vitest";

// Extracted from QuickAddEvidence component
const URL_PATTERN = /^https?:\/\//i;

describe("URL detection in evidence input", () => {
  it("detects http URLs", () => {
    expect(URL_PATTERN.test("http://example.com")).toBe(true);
  });

  it("detects https URLs", () => {
    expect(URL_PATTERN.test("https://reuters.com/article/oil")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(URL_PATTERN.test("HTTPS://EXAMPLE.COM")).toBe(true);
    expect(URL_PATTERN.test("Http://Example.com")).toBe(true);
  });

  it("rejects plain text", () => {
    expect(URL_PATTERN.test("Oil prices rose 5% today")).toBe(false);
  });

  it("rejects URLs without protocol", () => {
    expect(URL_PATTERN.test("example.com")).toBe(false);
    expect(URL_PATTERN.test("www.reuters.com")).toBe(false);
  });

  it("rejects ftp and other protocols", () => {
    expect(URL_PATTERN.test("ftp://files.example.com")).toBe(false);
  });
});
