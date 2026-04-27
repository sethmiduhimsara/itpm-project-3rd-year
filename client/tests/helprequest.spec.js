import { test, expect } from '@playwright/test'

const credentials = {
	email: 'imesh02@gmail.com',
	password: '1234567',
}

const randomLetters = (length) => {
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
	let result = ''
	for (let i = 0; i < length; i++) {
		result += letters.charAt(Math.floor(Math.random() * letters.length))
	}
	return result
}

test.describe('Help Request Module', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login')
		await page.getByPlaceholder('you@university.edu').fill(credentials.email)
		await page.getByPlaceholder('Enter your password').fill(credentials.password)
		await page.getByRole('button', { name: /sign in/i }).click()
		await page.waitForURL('**/discussion')
	})

	test('Successfully create a new help request', async ({ page }) => {
		const uniqueTitle = 'Patterns ' + randomLetters(5)
		
		await page.goto('/help-request')
		await expect(page.getByRole('heading', { name: 'Peer Help Requests' })).toBeVisible()

		await page.getByRole('button', { name: '+ Create New Request' }).click()
		await page.waitForURL('**/help-request/new')

		await page.locator('input[name="subject"]').fill('Software Engineering')
		await page.getByRole('button', { name: 'High' }).click()
		await page.locator('input[name="title"]').fill(uniqueTitle)
		await page.locator('textarea').fill('I am struggling with the Observer pattern. Can someone explain it?')
		await page.getByRole('button', { name: 'Public' }).click()

		await page.getByRole('button', { name: 'Post Request' }).click()

		await page.waitForURL('**/help-request')
		await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/helprequest-create.png', fullPage: true })
	})

	test('Validation errors for empty fields', async ({ page }) => {
		await page.goto('/help-request/new')
		await page.getByRole('button', { name: 'Post Request' }).click()

		await expect(page.getByText('Subject is required.')).toBeVisible()
		await expect(page.getByText('Title is required.')).toBeVisible()
		await expect(page.getByText('Description is required.')).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/helprequest-validation-empty.png', fullPage: true })
	})

	test('Validation errors for character length and type', async ({ page }) => {
		await page.goto('/help-request/new')

		await page.locator('input[name="subject"]').fill('Math123')
		await page.locator('input[name="title"]').fill('Abc')
		await page.locator('textarea').fill('Short')

		await page.getByRole('button', { name: 'Post Request' }).click()

		await expect(page.getByText('Only letters and spaces are allowed.')).toBeVisible()
		await expect(page.getByText('Title must be at least 5 characters.')).toBeVisible()
		await expect(page.getByText('Description must be at least 10 characters.')).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/helprequest-validation-invalid.png', fullPage: true })
	})

	test('Accept and respond to a help request', async ({ page }) => {
		const uniqueTitle = 'Testing ' + randomLetters(5)
		const uniqueResponse = 'Playwright response ' + randomLetters(5)

		// 1. Create a request
		await page.goto('/help-request/new')
		await page.locator('input[name="subject"]').fill('Software Engineering')
		await page.getByRole('button', { name: 'Medium' }).click()
		await page.locator('input[name="title"]').fill(uniqueTitle)
		await page.locator('textarea').fill('I need help with unit testing basics.')
		await page.getByRole('button', { name: 'Public' }).click()
		await page.getByRole('button', { name: 'Post Request' }).click()
		
		await page.waitForURL('**/help-request')

		// 2. Accept the request
		await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible()
		let requestCard = page.getByRole('heading', { name: uniqueTitle }).locator('..')
		
		await requestCard.getByPlaceholder('Your name').fill('Test Helper')
		await requestCard.getByRole('button', { name: 'Accept' }).click()

		await expect(requestCard.getByText('In Progress')).toBeVisible()

		// 3. Respond to the request
		await requestCard.locator('textarea').fill(uniqueResponse)
		await requestCard.getByRole('button', { name: 'Respond' }).click()

		// Final check - the unique response text is the most reliable proof of success
		await expect(page.getByText(uniqueResponse)).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/helprequest-respond.png', fullPage: true })
	})

	test('Edit an existing help request', async ({ page }) => {
		const uniqueTitle = 'Edit Test ' + randomLetters(5)
		const updatedTitle = uniqueTitle + ' Updated'

		// 1. Create a request to edit
		await page.goto('/help-request/new')
		await page.locator('input[name="subject"]').fill('Software Engineering')
		await page.getByRole('button', { name: 'Low' }).click()
		await page.locator('input[name="title"]').fill(uniqueTitle)
		await page.locator('textarea').fill('This is a test description that will be edited.')
		await page.getByRole('button', { name: 'Public' }).click()
		await page.getByRole('button', { name: 'Post Request' }).click()
		
		await page.waitForURL('**/help-request')
		await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible()

		// 2. Click Edit on the card
		const requestCard = page.getByRole('heading', { name: uniqueTitle }).locator('..')
		await requestCard.getByRole('button', { name: 'Edit' }).click()
		await page.waitForURL('**/help-request/edit/**')

		// 3. Verify form is populated and edit it
		await expect(page.locator('input[name="title"]')).toHaveValue(uniqueTitle)
		await page.locator('input[name="title"]').fill(updatedTitle)
		await page.locator('textarea').fill('This is the UPDATED description.')
		await page.getByRole('button', { name: 'High' }).click()

		// 4. Submit changes
		await page.getByRole('button', { name: 'Save Changes' }).click()
		await page.waitForURL('**/help-request')

		// 5. Verify updates on main feed
		await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/helprequest-edit.png', fullPage: true })
	})

	test('Dashboard rendering and navigation', async ({ page }) => {
		await page.goto('/help-request/dashboard')
		await expect(page.getByRole('heading', { name: 'My Help Dashboard' })).toBeVisible()

		// Verify Stats Cards exist
		await expect(page.getByText('My Requests', { exact: true })).toBeVisible()
		await expect(page.getByText('Active Helping')).toBeVisible()
		await expect(page.getByText('Completed', { exact: true })).toBeVisible()

		// Verify Sections
		await expect(page.getByRole('heading', { name: 'Manage My Requests' })).toBeVisible()
		await expect(page.getByRole('heading', { name: 'My Tasks (Helping)' })).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/helprequest-dashboard.png', fullPage: true })

		// Test navigation to full feed
		await page.getByRole('button', { name: 'View All Feed →' }).click()
		await page.waitForURL('**/help-request')
		await expect(page.getByRole('heading', { name: 'Peer Help Requests' })).toBeVisible()
	})

	test('Manage accepted request and chat session', async ({ page }) => {
		const uniqueTitle = 'Chat Test ' + randomLetters(5)

		// 1. Create and Accept a request
		await page.goto('/help-request/new')
		await page.locator('input[name="subject"]').fill('Networks')
		await page.getByRole('button', { name: 'High' }).click()
		await page.locator('input[name="title"]').fill(uniqueTitle)
		await page.locator('textarea').fill('Need help with subnetting.')
		await page.getByRole('button', { name: 'Public' }).click()
		await page.getByRole('button', { name: 'Post Request' }).click()
		await page.waitForURL('**/help-request')

		await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible()
		let requestCard = page.getByRole('heading', { name: uniqueTitle }).locator('..')
		await requestCard.getByPlaceholder('Your name').fill('Chat Helper')
		await requestCard.getByRole('button', { name: 'Accept' }).click()
		await expect(requestCard.getByText('In Progress')).toBeVisible()

		// 2. Navigate to Accepted Requests
		await page.goto('/help-request/accepted')
		await expect(page.getByRole('heading', { name: 'Accepted Tasks' })).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/helprequest-accepted-tasks.png', fullPage: true })

		// 3. Find the card in active sessions
		const activeCard = page.getByRole('heading', { name: uniqueTitle }).locator('..')
		await expect(activeCard).toBeVisible()

		// 4. Open Chat Session
		await activeCard.getByRole('button', { name: 'Open Chat Session' }).click()
		await page.waitForURL('**/help-request/chat/**')

		// 5. Verify Chat UI and Send Message
		await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible()
		await page.locator('input[placeholder="Type a message..."]').fill('Hello, let us start subnetting!')
		await page.locator('form').getByRole('button').click() // The send button

		// Wait for message to appear
		await expect(page.getByText('Hello, let us start subnetting!')).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/helprequest-chat.png', fullPage: true })

		// 6. End Session
		page.once('dialog', dialog => dialog.accept()) // Handle the confirm prompt
		await page.getByRole('button', { name: 'End Chat' }).click()

		// Verify it is closed
		await expect(page.getByText('Closed •')).toBeVisible()
		await expect(page.locator('input[placeholder="This session is closed"]')).toBeVisible()
	})
})

test.describe('Help Request Module - Admin', () => {
	test.beforeEach(async ({ page }) => {
		// Login as the built-in admin
		await page.goto('/login')
		await page.getByPlaceholder('you@university.edu').fill('admin@uniconnect.com')
		await page.getByPlaceholder('Enter your password').fill('Admin@1234')
		await page.getByRole('button', { name: /sign in/i }).click()
		await page.waitForURL('**/discussion')
	})

	test('Admin Help Requests Dashboard', async ({ page }) => {
		// We need a known request to search for, let's create one first
		const uniqueTitle = 'Admin Test ' + randomLetters(5)
		await page.goto('/help-request/new')
		await page.locator('input[name="subject"]').fill('ITPM')
		await page.getByRole('button', { name: 'Medium' }).click()
		await page.locator('input[name="title"]').fill(uniqueTitle)
		await page.locator('textarea').fill('Admin should see this.')
		await page.getByRole('button', { name: 'Public' }).click()
		await page.getByRole('button', { name: 'Post Request' }).click()
		await page.waitForURL('**/help-request')

		// 1. Navigate to Admin
		await page.goto('/admin/help-requests')
		await expect(page.getByRole('heading', { name: 'Admin Help Request Monitor' })).toBeVisible()

		// 2. Search for it
		await page.getByPlaceholder('Search by title, student, or subject...').fill(uniqueTitle)
		await page.waitForTimeout(1000) // Wait for React to re-render
		await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible()
		await page.screenshot({ path: 'tests/screenshots/helprequest-admin.png', fullPage: true })

		// 3. Delete
		// We find the parent card element to locate the correct button
		const adminCard = page.getByRole('heading', { name: uniqueTitle }).locator('..').locator('..')
		page.once('dialog', dialog => dialog.accept())
		await adminCard.getByTitle('Delete Request').click()
		
		// Ensure it's gone
		await expect(page.getByRole('heading', { name: uniqueTitle })).toBeHidden()
	})
})

