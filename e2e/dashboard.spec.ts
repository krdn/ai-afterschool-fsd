import { test, expect } from "./fixtures"

test.describe("대시보드", () => {
  test("대시보드 페이지가 로드된다", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test("KPI 통계 카드가 표시된다", async ({ page }) => {
    // 통계 카드 확인 (최소 1개)
    const statCards = page.locator("[data-slot='card']")
    await expect(statCards.first()).toBeVisible({ timeout: 5000 })
  })

  test("검색 힌트 ⌘K가 표시된다", async ({ page }) => {
    await expect(page.getByText("검색...")).toBeVisible()
  })

  test("Cmd+K로 커맨드 메뉴가 열린다", async ({ page }) => {
    await page.keyboard.press("Meta+k")
    await expect(page.getByPlaceholder("페이지 또는 기능 검색...")).toBeVisible({
      timeout: 3000,
    })
  })
})
