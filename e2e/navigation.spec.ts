import { test, expect } from "./fixtures"

test.describe("네비게이션", () => {
  test("사이드바 메뉴가 표시된다", async ({ page }) => {
    // 데스크톱에서 사이드바 확인
    await expect(page.getByText("AI AfterSchool").first()).toBeVisible()
  })

  test("학생 페이지로 이동할 수 있다", async ({ page }) => {
    await page.getByRole("link", { name: /학생/i }).first().click()
    await expect(page).toHaveURL(/\/students/, { timeout: 5000 })
  })

  test("상담 페이지로 이동할 수 있다", async ({ page }) => {
    await page.getByRole("link", { name: /상담/i }).first().click()
    await expect(page).toHaveURL(/\/counseling/, { timeout: 5000 })
  })

  test("성적 페이지로 이동할 수 있다", async ({ page }) => {
    await page.getByRole("link", { name: /성적/i }).first().click()
    await expect(page).toHaveURL(/\/grades/, { timeout: 5000 })
  })

  test("다크모드 토글이 동작한다", async ({ page }) => {
    // html 태그의 class 확인
    const html = page.locator("html")
    const initialClass = await html.getAttribute("class")

    // 다크모드 토글 클릭 (사이드바 하단)
    const themeButton = page.getByRole("button", { name: /다크|라이트|테마/i })
    if (await themeButton.isVisible()) {
      await themeButton.click()
      await page.waitForTimeout(500)
      const newClass = await html.getAttribute("class")
      expect(newClass).not.toBe(initialClass)
    }
  })
})
