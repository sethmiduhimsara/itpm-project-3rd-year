import { test, expect } from '@playwright/test'

const credentials = {
	email: 'sethmiduhimsara6048@gmail.com',
	password: 'sethmidu123',
}

test.describe('Progress Tab', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login')
		await page.getByPlaceholder('you@university.edu').fill(credentials.email)
		await page.getByPlaceholder('Enter your password').fill(credentials.password)
		await page.getByRole('button', { name: /sign in/i }).click()
		await page.waitForURL('**/discussion')
	})

	test('Progress tab renders charts', async ({ page }) => {
		await page.goto('/progress?tab=progress')
		await expect(page.getByText('Academic Progress')).toBeVisible()
		await expect(page.locator('.line-chart-area')).toBeVisible()
		await expect(page.locator('.donut-wrap')).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/progress.png', fullPage: true })
	})
})
