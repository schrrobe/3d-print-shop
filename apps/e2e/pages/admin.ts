import type { Page } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers/api.js'
import { gotoHydrated } from '../helpers/hydration.js'

/** Page object for the admin area. */
export class AdminPage {
  constructor(public readonly page: Page) {}

  async login(email = ADMIN_EMAIL, password = ADMIN_PASSWORD): Promise<void> {
    await gotoHydrated(this.page, '/admin/login')
    await this.page.locator('input[name="email"]').fill(email)
    await this.page.locator('input[name="password"]').fill(password)
    await this.page.getByTestId('login-submit').click()
    await this.page.waitForURL(/\/admin(?!\/login)/)
  }
}
