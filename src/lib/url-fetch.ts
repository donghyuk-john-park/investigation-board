const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
];

const MAX_CONTENT_SIZE = 50 * 1024; // 50KB
const FETCH_TIMEOUT = 5000; // 5 seconds

export function validateUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }

  const hostname = parsed.hostname;
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(hostname)) {
      throw new Error("URLs pointing to private/internal addresses are not allowed");
    }
  }

  return parsed;
}

export async function fetchUrlContent(
  url: string
): Promise<{ title: string; content: string }> {
  const validated = validateUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(validated.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GnosisBot/1.0; +https://gnosis.app)",
        Accept: "text/html,application/xhtml+xml,text/plain",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("Unsupported content type: " + contentType);
    }

    const text = await response.text();
    const truncated = text.slice(0, MAX_CONTENT_SIZE);

    // Extract title from HTML
    const titleMatch = truncated.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/\s+/g, " ").trim()
      : validated.hostname;

    // Strip HTML tags for content
    const content = truncated
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return { title, content };
  } finally {
    clearTimeout(timeout);
  }
}
