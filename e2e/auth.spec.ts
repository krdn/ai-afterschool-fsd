import { test, expect } from "@playwright/test"

test.describe("인증 흐름", () => {
  test("로그인 페이지가 표시된다", async ({ page }) => {
    await page.goto("/ko/auth/login")
    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(page.getByTestId("password-input")).toBeVisible()
    await expect(page.getByTestId("login-button")).toBeVisible()
  })

  test("잘못된 자격 증명으로 에러가 표시된다", async ({ page }) => {
    await page.goto("/ko/auth/login")
    await page.getByTestId("email-input").fill("wrong@test.com")
    await page.getByTestId("password-input").fill("wrongpassword")
    await page.getByTestId("login-button").click()

    await expect(page.getByTestId("form-error")).toBeVisible({ timeout: 5000 })
  })

  test("올바른 자격 증명으로 대시보드로 이동한다", async ({ page }) => {
    await page.goto("/ko/auth/login")
    await page.getByTestId("email-input").fill("admin@test.com")
    await page.getByTestId("password-input").fill("test1234")
    await page.getByTestId("login-button").click()

    await page.waitForURL("**/dashboard", { timeout: 10000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
