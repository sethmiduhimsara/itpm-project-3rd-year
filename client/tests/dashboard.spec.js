import { test, expect } from '@playwright/test'

const credentials = {
	email: 'sethmiduhimsara6048@gmail.com',
	password: 'sethmidu123',
}

test.describe('Dashboard Tab', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login')
		await page.getByPlaceholder('you@university.edu').fill(credentials.email)
		await page.getByPlaceholder('Enter your password').fill(credentials.password)
		await page.getByRole('button', { name: /sign in/i }).click()
		await page.waitForURL('**/discussion')
	})

	test('Dashboard renders stats', async ({ page }) => {
		await page.goto('/progress')
		await expect(page.getByText('My Academic Dashboard')).toBeVisible()
		await expect(page.locator('.stat-grid')).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/dashboard.png', fullPage: true })
	})
})
