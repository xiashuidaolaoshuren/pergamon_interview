import { expect, test } from "@playwright/test";

test("recorded kettle: intake through conflict, gap, power, and report", async ({
  page,
}) => {
  let extractMode: string | null = null;

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("generativelanguage.googleapis.com")) {
      throw new Error(`Live Gemini host must not be called: ${url}`);
    }
  });

  page.on("response", async (response) => {
    if (
      response.url().includes("/api/extract") &&
      response.request().method() === "POST" &&
      response.ok()
    ) {
      const body = (await response.json()) as { mode?: string };
      extractMode = body.mode ?? null;
    }
  });

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");

  await expect(
    page.getByRole("radio", { name: /recorded extraction/i }),
  ).toBeChecked();
  await page.getByRole("button", { name: /load the bundled example/i }).click();

  await page
    .getByRole("button", { name: /open the interview/i })
    .click({ timeout: 30_000 });

  await page.getByRole("button", { name: /use 1\.5 l/i }).click();

  await page.getByRole("textbox", { name: /your answer/i }).fill("Acme Imports Ltd");
  await page.getByRole("button", { name: /submit answer/i }).click();

  await page
    .getByRole("button", { name: /confirm 2200 w as user-provided/i })
    .click();

  await expect(page.getByText(/readiness report · ark-1500 kettle/i)).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("heading", { name: /ready for manual authoring/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/this session used recorded extraction/i),
  ).toBeVisible();
  await expect(page.getByText(/eu-compliant|compliance score/i)).not.toBeVisible();

  expect(extractMode).toBe("recorded");
});
