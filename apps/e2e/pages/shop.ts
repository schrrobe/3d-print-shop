import type { Locator, Page } from '@playwright/test'

/** Page object for the public shop. */
export class ShopPage {
  constructor(public readonly page: Page) {}

  async acceptConsent(): Promise<void> {
    const banner = this.page.getByTestId('consent-banner')
    if (await banner.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.page.getByTestId('consent-accept').click()
      await banner.waitFor({ state: 'hidden' })
    }
  }

  async addProductToCart(slug: string): Promise<void> {
    await this.page.goto(`/products/${slug}`)
    await this.acceptConsent()
    await this.page.getByTestId('add-to-cart').click()
  }

  cartCount(): Locator {
    return this.page.getByTestId('cart-count')
  }

  async fillCheckoutAddress(email = 'e2e-checkout@example.com'): Promise<void> {
    await this.page.locator('input[name="firstName"]').fill('Erika')
    await this.page.locator('input[name="lastName"]').fill('E2E')
    await this.page.locator('input[name="street"]').fill('Teststraße 42')
    await this.page.locator('input[name="zip"]').fill('10115')
    await this.page.locator('input[name="city"]').fill('Berlin')
    await this.page.locator('input[name="country"]').fill('DE')
    await this.page.locator('input[name="email"]').fill(email)
  }
}
