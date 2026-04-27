import { test, expect } from '@playwright/test'

const credentials = {
	email: 'sethmiduhimsara6048@gmail.com',
	password: 'sethmidu123',
}

test.describe('Activity History Tab', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login')
		await page.getByPlaceholder('you@university.edu').fill(credentials.email)
		await page.getByPlaceholder('Enter your password').fill(credentials.password)
		await page.getByRole('button', { name: /sign in/i }).click()
		await page.waitForURL('**/discussion')
	})

	test('Activity History search filters results', async ({ page }) => {
		await page.goto('/progress?tab=history')
		await expect(page.locator('.hist-title')).toBeVisible()
		const search = page.getByPlaceholder('Search activities, subjects...')
		await search.fill('resource')
		await expect(page.locator('.hist-result-count')).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/activity-history.png', fullPage: true })
	})
})
