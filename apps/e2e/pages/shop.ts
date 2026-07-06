import type { Locator, Page } from '@playwright/test'
import { gotoHydrated } from '../helpers/hydration.js'

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
    await gotoHydrated(this.page, `/products/${slug}`)
    await this.acceptConsent()
    await this.page.getByTestId('add-to-cart').click()
  }

  cartCount(): Locator {
    return this.page.getByTestId('cart-count')
  }

  /** Add a product, then open the (hydrated) cart page. */
  async addAndGotoCart(slug: string): Promise<void> {
    await this.addProductToCart(slug)
    await gotoHydrated(this.page, '/cart')
  }

  /** Fill the voucher input on the cart page and submit it. */
  async applyVoucher(code: string): Promise<void> {
    await this.page.getByTestId('voucher-input').fill(code)
    await this.page.getByTestId('voucher-apply').click()
  }

  async gotoCheckout(): Promise<void> {
    await gotoHydrated(this.page, '/checkout')
  }

  async fillCheckoutAddress(email = 'e2e-checkout@example.com'): Promise<void> {
    await this.page.waitForSelector('html[data-hydrated="true"]')
    await this.page.locator('input[name="firstName"]').fill('Erika')
    await this.page.locator('input[name="lastName"]').fill('E2E')
    await this.page.locator('input[name="street"]').fill('Teststraße 42')
    await this.page.locator('input[name="zip"]').fill('10115')
    await this.page.locator('input[name="city"]').fill('Berlin')
    await this.page.locator('input[name="country"]').fill('DE')
    await this.page.locator('input[name="email"]').fill(email)
  }
}
