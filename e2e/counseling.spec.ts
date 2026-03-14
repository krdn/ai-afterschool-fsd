import { test, expect } from "./fixtures"

test.describe("상담 관리", () => {
  test("상담 목록 페이지가 로드된다", async ({ page }) => {
    await page.goto("/ko/counseling")
    await expect(page.getByTestId("new-counseling-button")).toBeVisible()
  })

  test("통계 카드가 표시된다", async ({ page }) => {
    await page.goto("/ko/counseling")
    await expect(page.getByTestId("counseling-stat-card-monthly")).toBeVisible()
    await expect(page.getByTestId("counseling-stat-card-total")).toBeVisible()
  })

  test("검색 입력이 동작한다", async ({ page }) => {
    await page.goto("/ko/counseling")
    const searchInput = page.getByTestId("unified-search-input")
    await expect(searchInput).toBeVisible()

    await searchInput.fill("테스트")
    // 디바운스 대기
    await page.waitForTimeout(500)
    // URL에 query 파라미터가 추가되는지 확인
    await expect(page).toHaveURL(/query=/, { timeout: 5000 })
  })

  test("필터가 동작한다", async ({ page }) => {
    await page.goto("/ko/counseling")
    await expect(page.getByTestId("counseling-filters")).toBeVisible()
  })

  test("상담 세션 클릭 시 모달이 열린다", async ({ page }) => {
    await page.goto("/ko/counseling")
    const sessions = page.getByTestId("counseling-session")
    const count = await sessions.count()

    if (count > 0) {
      await sessions.first().click()
      await expect(page.getByTestId("counseling-modal")).toBeVisible({ timeout: 3000 })
    }
  })
})
