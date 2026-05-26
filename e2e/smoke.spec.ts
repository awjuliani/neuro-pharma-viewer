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
  await expect(page.getByRole("button", { name: /switch to dark mode/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /turn sound on/i })).toBeVisible();
  await expect(page.getByLabel("Animated transmitter molecules")).toBeVisible();
  await expect(page.getByLabel("Receptor note timeline")).toBeVisible();
  await expect(page.getByRole("heading", { name: /visual glossary/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Active receptor" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Blocked transporter" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Signal output" })).toHaveCount(0);
  const glossaryGroupOrder = await page.locator(".glossary-group h3").evaluateAll((headings) =>
    headings.map((heading) => heading.textContent ?? "")
  );
  expect(glossaryGroupOrder).toEqual(["Anatomy", "Binding sites and states", "Molecules"]);
  const glossaryLayout = await page.locator(".glossary-grid").first().evaluate((grid) => ({
    columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    viewportWidth: window.innerWidth
  }));
  expect(glossaryLayout.columns).toBe(glossaryLayout.viewportWidth <= 820 ? 1 : 2);
  const glossaryIconSizes = await page.locator(".glossary-visual").evaluateAll((boxes) =>
    boxes.map((box) => {
      const rect = box.getBoundingClientRect();
      return { height: Math.round(rect.height), width: Math.round(rect.width) };
    })
  );
  expect(new Set(glossaryIconSizes.map((box) => `${box.width}x${box.height}`)).size).toBe(1);
  expect(glossaryIconSizes.every((box) => box.width === box.height)).toBe(true);
  const minimumGlossarySentences = await page.locator(".glossary-copy p").evaluateAll((paragraphs) =>
    Math.min(...paragraphs.map((paragraph) => (paragraph.textContent?.match(/[.!?]/g) ?? []).length))
  );
  expect(minimumGlossarySentences).toBeGreaterThanOrEqual(2);
  await expect(page.getByText(/Information readout/i)).toHaveCount(0);
  await expect(page.locator(".signal-note")).toHaveCount(0);
  await expect(page.locator(".mechanism-strip")).toHaveCount(0);
  await expect
    .poll(() => page.locator(".timeline-note").count(), { timeout: 8000 })
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.locator(".dendrite-activation-pulse").count(), { timeout: 8000 })
    .toBeGreaterThan(0);

  await page.getByRole("button", { name: /switch to dark mode/i }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: /switch to light mode/i })).toBeVisible();

  await page.getByRole("tab", { name: /reuptake/i }).click();
  await expect(page.getByRole("tab", { name: /reuptake/i })).toContainText(/Transporter blockade/i);
  const receptorStrokes = await page
    .locator(".receptors path")
    .evaluateAll((paths) => paths.map((path) => path.getAttribute("stroke")));
  expect(receptorStrokes).not.toContain("#0c9b8a");

  await page.getByRole("tab", { name: /releaser/i }).click();
  await expect(page.getByRole("tab", { name: /releaser/i })).toContainText(/Extra transmitter leaks/i);
  await expect(page.getByLabel("Intervention strength")).toBeVisible();
  await expect(page.getByRole("tab", { name: /^maoi\b/i })).toHaveCount(0);
  await expect(page.locator(".mao-enzyme")).toHaveCount(0);

  await page.getByRole("tab", { name: /^agonist\b/i }).click();
  await expect(page.getByRole("tab", { name: /^agonist\b/i })).toContainText(/Direct receptor activation/i);
  await expect
    .poll(() => page.locator(".timeline-sustain").count(), { timeout: 8000 })
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
  await expect(page.getByRole("tab", { name: /pam/i })).toContainText(/Pulse-linked gain boost/i);
  await expect(page.getByLabel("Intervention strength")).toBeVisible();
  await page.getByRole("tab", { name: /reuptake/i }).click();
  await expect(page.getByLabel("Intervention strength")).toBeVisible();
  await expect(page.getByLabel("Molecules per pulse")).toBeVisible();
  await page.getByRole("tab", { name: /baseline/i }).click();
  await expect(page.getByLabel("Intervention strength")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /visual glossary/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Receptor note" })).toHaveCount(0);
  const glossaryLayout = await page.locator(".glossary-grid").first().evaluate((grid) => ({
    columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    viewportWidth: window.innerWidth
  }));
  expect(glossaryLayout.columns).toBe(glossaryLayout.viewportWidth <= 820 ? 1 : 2);
  await expect(page.getByText(/Conceptual educational model only/i)).toHaveCount(0);
});

test("desktop simulator and staff shell matches controls panel height", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop-only layout assertion");

  await page.setViewportSize({ width: 1180, height: 920 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /receptor-level neuropharmacology/i })).toBeVisible();

  const layout = await page.evaluate(() => {
    const controls = document.querySelector(".controls-panel")?.getBoundingClientRect();
    const scene = document.querySelector(".scene-shell")?.getBoundingClientRect();
    const timeline = document.querySelector(".note-timeline")?.getBoundingClientRect();

    return {
      controlsHeight: controls?.height ?? 0,
      sceneHeight: scene?.height ?? 0,
      timelineHeight: timeline?.height ?? 0
    };
  });

  expect(Math.abs(layout.sceneHeight - layout.controlsHeight)).toBeLessThan(2);
  expect(layout.timelineHeight).toBeGreaterThan(126);
});
