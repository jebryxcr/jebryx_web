import { test, expect } from "@playwright/test";
import { chooseSelectOption, ready, setup } from "./fixtures";

for (const [path, title, trigger, resource] of [
  ["/cuentas", "Eliminar cuenta", "Eliminar", "cuentas"],
  ["/categorias", "Eliminar categoría", "Eliminar", "categorias"],
  ["/presupuestos", "Eliminar presupuesto", "Eliminar", "presupuestos"],
  ["/recurrentes", "Eliminar plan", "Eliminar", "planes-recurrentes"],
  ["/coach", "Eliminar conversación", "Eliminar conversación", "coach/conversations"],
]) {
  test(`confirms ${resource} deletion without browser prompts`, async ({ page }, testInfo) => {
    const { calls, errors } = await setup(page);
    let nativeDialogs = 0;
    page.on("dialog", async (dialog) => {
      nativeDialogs++;
      await dialog.dismiss();
    });
    await page.emulateMedia({ colorScheme: path === "/cuentas" ? "dark" : "light" });
    await ready(page, path);
    if (path === "/coach") {
      await page.getByLabel("Mensaje para el coach").fill("Ayúdame con mi presupuesto");
      await page.getByRole("button", { name: "Enviar mensaje" }).click();
      await expect(page.getByText("Mi presupuesto", { exact: true })).toBeVisible();
    }
    const remove = page.getByRole("button", { name: trigger, exact: true }).first();
    const deletes = () => calls.filter((c) => c.method === "DELETE" && c.path.startsWith(`${resource}/`));
    await remove.click();
    const confirmation = page.getByRole("alertdialog", { name: title });
    await expect(confirmation).toBeVisible();
    await expect(confirmation.getByRole("button", { name: "Cancelar" })).toBeFocused();
    expect(deletes()).toHaveLength(0);
    await page.keyboard.press("Escape");
    await expect(confirmation).toHaveCount(0);
    await expect(remove).toBeFocused();
    expect(deletes()).toHaveLength(0);
    await remove.click();
    await expect(confirmation).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("confirmation.png") });
    expect(await confirmation.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await confirmation.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(confirmation).toHaveCount(0);
    await expect.poll(() => deletes().length).toBe(1);
    expect(nativeDialogs).toBe(0);
    expect(errors).toEqual([]);
  });
}

test("stacks balance and budget warnings over the editor without losing the form", async ({ page }) => {
  const { calls, errors } = await setup(page);
  await ready(page, "/agregar");
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Monto", { exact: true }).fill("200000");
  await chooseSelectOption(editor.getByLabel("Categoría", { exact: true }), "cat1");
  const saves = () => calls.filter((c) => c.method === "POST" && c.path === "movimientos");
  for (const acceptBudget of [false, true]) {
    await editor.getByRole("button", { name: "Guardar", exact: true }).click();
    const balance = page.getByRole("alertdialog", { name: "La cuenta quedará en negativo" });
    await expect(balance).toBeVisible();
    await balance.getByRole("button", { name: "Continuar con el gasto" }).click();
    const budget = page.getByRole("alertdialog", { name: "Superarás tu presupuesto" });
    await expect(budget).toBeVisible();
    expect(saves()).toHaveLength(0);
    await budget.getByRole("button", { name: acceptBudget ? "Continuar con el gasto" : "Cancelar" }).click();
    if (!acceptBudget) {
      await expect(editor.getByLabel("Monto", { exact: true })).toHaveValue("200000");
      await expect(editor.getByRole("button", { name: "Guardar", exact: true })).toBeEnabled();
      expect(saves()).toHaveLength(0);
    }
  }
  await expect(editor).toHaveCount(0);
  expect(saves()).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("leaving a pending warning cancels the action and restores page scrolling", async ({ page }) => {
  const { calls } = await setup(page);
  await ready(page, "/movimientos");
  await page.getByRole("link", { name: "Agregar", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Monto", { exact: true }).fill("200000");
  await chooseSelectOption(editor.getByLabel("Categoría", { exact: true }), "cat1");
  await editor.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/movimientos$/);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.locator("body").evaluate((el) => el.style.overflow)).not.toBe("hidden");
  expect(calls.filter((c) => c.method === "POST" && c.path === "movimientos")).toHaveLength(0);
});
