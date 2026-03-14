import { test, expect } from "./fixtures"

test.describe("학생 관리", () => {
  test("학생 목록 페이지가 로드된다", async ({ page }) => {
    await page.goto("/ko/students")
    await expect(page.getByTestId("add-student-button")).toBeVisible()
  })

  test("학생 검색이 동작한다", async ({ page }) => {
    await page.goto("/ko/students")
    const searchInput = page.getByTestId("student-search-input")
    await expect(searchInput).toBeVisible()

    // 존재하지 않는 이름 검색
    await searchInput.fill("존재하지않는학생xyz")
    // 디바운스 대기
    await page.waitForTimeout(500)
    await expect(page.getByTestId("no-students-message")).toBeVisible({ timeout: 5000 })
  })

  test("학생 카드가 표시된다", async ({ page }) => {
    await page.goto("/ko/students")
    // 시드 데이터에 학생이 있으면 카드 표시
    const cards = page.getByTestId("student-card")
    const count = await cards.count()

    if (count > 0) {
      await expect(cards.first()).toBeVisible()
      // 학생 이름이 표시되는지
      await expect(page.getByTestId("student-name").first()).toBeVisible()
    }
  })

  test("학생 카드 클릭 시 상세 페이지로 이동한다", async ({ page }) => {
    await page.goto("/ko/students")
    const cards = page.getByTestId("student-card")
    const count = await cards.count()

    if (count > 0) {
      await cards.first().click()
      await page.waitForURL("**/students/**", { timeout: 5000 })
      await expect(page).toHaveURL(/\/students\//)
    }
  })
})
