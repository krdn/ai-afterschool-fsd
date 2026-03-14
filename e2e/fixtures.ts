import { test as base, expect } from "@playwright/test"

/**
 * 인증된 상태의 테스트 fixture
 * 각 테스트 전에 로그인을 수행합니다.
 */
export const test = base.extend({
  // 인증된 페이지
  page: async ({ page }, use) => {
    // 로그인
    await page.goto("/ko/auth/login")
    await page.getByTestId("email-input").fill("admin@test.com")
    await page.getByTestId("password-input").fill("test1234")
    await page.getByTestId("login-button").click()
    await page.waitForURL("**/dashboard", { timeout: 10000 })

    await use(page)
  },
})

export { expect }
