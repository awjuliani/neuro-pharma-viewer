import { expect, test } from "@playwright/test";

test("visualizer loads and responds on desktop", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /receptor-level neuropharmacology/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /turn sound on/i })).toBeVisible();
  await expect(page.getByLabel("Animated transmitter molecules")).toBeVisible();
  await expect(page.getByLabel("Receptor note timeline")).toBeVisible();
  await expect(page.getByText(/Information readout/i)).toHaveCount(0);
  await expect
    .poll(() => page.locator(".signal-note").count(), { timeout: 8000 })
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.locator(".timeline-note").count(), { timeout: 8000 })
    .toBeGreaterThan(0);

  await page.getByRole("tab", { name: /reuptake/i }).click();
  await expect(page.getByText(/Drug molecules bind transporter sites/i)).toBeVisible();
  const receptorStrokes = await page
    .locator(".receptors path")
    .evaluateAll((paths) => paths.map((path) => path.getAttribute("stroke")));
  expect(receptorStrokes).not.toContain("#0c9b8a");

  await page.getByRole("tab", { name: /releaser/i }).click();
  await expect(page.getByText(/occupied transporters leak extra transmitter/i)).toBeVisible();
  await expect(page.getByLabel("Intervention strength")).toBeVisible();

  await page.getByRole("tab", { name: /^maoi\b/i }).click();
  await expect(page.getByText(/MAO-like clearing enzymes/i)).toBeVisible();
  await expect(page.locator(".mao-enzyme")).toHaveCount(6);

  await page.getByRole("tab", { name: /^agonist\b/i }).click();
  await expect(page.getByText(/receptor pockets directly/i)).toBeVisible();
  await expect
    .poll(() => page.locator(".timeline-note").count(), { timeout: 8000 })
    .toBeGreaterThan(0);

  await expect
    .poll(async () =>
      page.locator("canvas").evaluate((canvasElement) => {
        const canvas = canvasElement as HTMLCanvasElement;
        const context = canvas.getContext("2d");
        if (!context) {
          return 0;
        }

        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let painted = 0;
        for (let index = 3; index < data.length; index += 4) {
          if (data[index] > 0) {
            painted += 1;
          }
        }
        return painted;
      })
    )
    .toBeGreaterThan(400);
  expect(consoleErrors).toEqual([]);
});

test("mobile layout keeps controls usable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /pam/i }).click();
  await expect(page.getByText(/allosteric side site/i)).toBeVisible();
  await expect(page.getByLabel("Intervention strength")).toBeVisible();
  await page.getByRole("tab", { name: /reuptake/i }).click();
  await expect(page.getByLabel("Intervention strength")).toBeVisible();
  await expect(page.getByLabel("Molecules per pulse")).toBeVisible();
  await page.getByRole("tab", { name: /baseline/i }).click();
  await expect(page.getByLabel("Intervention strength")).toHaveCount(0);
  await expect(page.getByText(/Conceptual educational model only/i)).toBeVisible();
});
