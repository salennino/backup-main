const baseUrl = "https://api.bazaarlink.ai/v1";
const apiKey = process.env.TEST_API;

if (!apiKey) {
  console.error("BazaarLink API: FAIL — TEST_API is not set.");
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15_000),
    });

    const rawBody = await response.text();
    let body: { data?: unknown[]; error?: { message?: string }; message?: string } = {};
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      // Keep the failure output useful without dumping an arbitrary response.
    }

    if (!response.ok) {
      const reason = body.error?.message || body.message || `HTTP ${response.status}`;
      console.error(`BazaarLink API: FAIL — ${reason}`);
      process.exitCode = 1;
    } else if (!Array.isArray(body.data)) {
      console.error("BazaarLink API: FAIL — response did not contain a models list.");
      process.exitCode = 1;
    } else {
      console.log(`BazaarLink API: PASS — TEST_API accepted; ${body.data.length} model(s) returned.`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "request failed";
    console.error(`BazaarLink API: FAIL — ${reason}`);
    process.exitCode = 1;
  }
}

export {};