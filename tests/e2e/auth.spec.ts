import { test, expect } from "@playwright/test";
import { ready, setup } from "./fixtures";

test("signs in with the existing API, logo and animated reveal", async ({
  page,
}) => {
  const { calls, errors } = await setup(page, false);
  await ready(page, "/login");
  await expect(page.locator(".auth-form-logo img")).toHaveAttribute(
    "src",
    "/logo.png",
  );
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("test@example.com");
  await page
    .locator('input[autocomplete="current-password"]')
    .fill("password123");
  await page.getByRole("button", { name: "Entrar a mi espacio" }).click();
  await expect(page.locator(".brand-transition")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Buenas, Bryan",
  );
  const login = calls.find((c) => c.path === "auth/login");
  expect(login?.body).toEqual({
    email: "test@example.com",
    password: "password123",
  });
  expect(login?.headers).not.toHaveProperty("authorization");
  expect(login?.headers).not.toHaveProperty("x-profile-id");
  expect(errors).toEqual([]);
});

test("switches login language and keeps it after a reload", async ({ page }) => {
  const { errors } = await setup(page, false);
  await ready(page, "/login");
  await page.getByRole("button", { name: "Cambiar a inglés" }).click();
  await expect(page.getByRole("heading", { name: "Good to see you again." })).toBeVisible();
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.locator(".brand-transition")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Good to see you again." })).toBeVisible();
  await page.getByRole("button", { name: "Switch to Spanish" }).click();
  await expect(page.getByRole("heading", { name: "Qué bueno verte de nuevo." })).toBeVisible();
  await expect(page.getByLabel("Correo electrónico", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  expect(errors).toEqual([]);
});

test("registers and verifies the emailed code", async ({ page }) => {
  const { calls } = await setup(page, false);
  await ready(page, "/register");
  await page.getByLabel("Tu nombre", { exact: true }).fill("Bryan");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("test@example.com");
  await page.locator('input[autocomplete="new-password"]').fill("password123");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/verify\?/);
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Buenas, Bryan",
  );
  expect(calls.find((c) => c.path === "auth/register")?.body).toEqual({
    name: "Bryan",
    email: "test@example.com",
    password: "password123",
  });
  expect(calls.find((c) => c.path === "auth/verify")?.body).toEqual({
    email: "test@example.com",
    code: "123456",
  });
});

test("handles Google's selected credential and rejects missing ID tokens", async ({
  page,
}) => {
  const { calls, errors } = await setup(page, false);
  // Replace only Google's external SDK. The app and its API client run normally.
  await page.route("https://accounts.google.com/gsi/client*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
        (() => {
        let configuration;
        let attempts = 0;
        window.google = { accounts: { id: {
          initialize(options) { configuration = options; },
          renderButton(container, options) {
            const button = document.createElement('button');
            button.textContent = 'Continuar con Google';
            button.type = 'button';
            button.onclick = () => configuration.callback(
              attempts++ === 0 ? {} : { credential: 'selected-google-id-token' }
            );
            container.replaceChildren(button);
          }
        } } };
        })();
      `,
    }),
  );
  await ready(page, "/login");
  test.skip(
    (await page.locator(".google-button").count()) === 0,
    "Google sign-in requires VITE_GOOGLE_WEB_CLIENT_ID.",
  );
  const googleButton = page.getByRole("button", { name: "Continuar con Google" });
  await googleButton.click();
  await expect(page.getByText("No se pudo iniciar sesión con Google.")).toBeVisible();
  expect(calls.filter((c) => c.path === "auth/google")).toHaveLength(0);
  await googleButton.click();
  await expect(page).toHaveURL(/\/$/);
  const googleCalls = calls.filter((c) => c.path === "auth/google");
  expect(googleCalls).toHaveLength(1);
  expect(googleCalls[0].body).toEqual({ idToken: "selected-google-id-token" });
  expect(googleCalls[0].headers).not.toHaveProperty("authorization");
  expect(googleCalls[0].headers).not.toHaveProperty("x-profile-id");
  expect(errors).toEqual([]);
});

test("recovers access with the three existing password endpoints", async ({
  page,
}) => {
  const { calls } = await setup(page, false);
  await ready(page, "/recuperar");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("test@example.com");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .locator('input[autocomplete="new-password"]')
    .first()
    .fill("newpassword123");
  await page.getByLabel("Confirmar contraseña").fill("newpassword123");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL(/\/reset-listo$/);
  await expect(
    page.getByRole("heading", { name: "Todo listo." }),
  ).toBeVisible();
  expect(
    calls.filter((c) => c.path.startsWith("auth/password/")).map((c) => c.path),
  ).toEqual([
    "auth/password/forgot",
    "auth/password/verify-code",
    "auth/password/reset",
  ]);
});

test("keeps the native splash timeline and respects browser reduced motion", async ({
  page,
}) => {
  await setup(page, false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/login");
  const overlay = page.locator(".boot-transition");
  await expect(overlay).toBeVisible();
  expect(
    await overlay.evaluate((el) => getComputedStyle(el).animationDelay),
  ).toBe("3.8s");
  expect(
    await overlay.evaluate((el) => getComputedStyle(el).animationDuration),
  ).toBe("0.65s");
  await expect(overlay.locator(".boot-particle")).toHaveCount(16);
  await expect(overlay.locator(".transition-orbit")).toHaveCount(2);
  await expect(overlay).toHaveCount(0, { timeout: 7000 });
});
