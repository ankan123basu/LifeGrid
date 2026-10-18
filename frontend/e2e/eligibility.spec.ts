import { test, expect } from '@playwright/test';

test.describe('Blood Donation Eligibility Wizard', () => {
  test('completes the wizard from empty inputs to successful 100% eligible result', async ({ page }) => {
    // Clear session storage to avoid previous drafts
    await page.goto('/donate/eligibility');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    // Verify header
    await expect(page.locator('h1')).toContainText(/Blood donation eligibility check/i);

    // STEP 1: Basics
    // Initially Next button should be disabled because fields are empty
    const nextBtn = page.getByRole('button', { name: /Next step|Check eligibility/i });
    await expect(nextBtn).toBeDisabled();

    // Fill Step 1 inputs
    await page.getByPlaceholder(/e\.g\. 24/i).fill('25');
    await page.getByPlaceholder(/e\.g\. 62/i).fill('65');
    await page.getByRole('button', { name: /^Male$/i }).click();

    // Next button is now enabled
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // STEP 2: Previous Donation History
    await expect(page.locator('h2')).toContainText(/Previous Donation History/i);
    // Button disabled until history option selected
    await expect(nextBtn).toBeDisabled();
    await page.getByRole('button', { name: /Never donated \/ First time/i }).click();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // STEP 3: Recent Health & Procedures
    await expect(page.locator('h2')).toContainText(/Recent Health & Procedures/i);
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // STEP 4: Lifestyle & Hydration
    await expect(page.locator('h2')).toContainText(/Lifestyle & Hydration/i);
    // Alcohol intake question must be actively answered
    await expect(nextBtn).toBeDisabled();
    await page.getByRole('button', { name: /No, zero alcohol in past 24h/i }).click();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // STEP 5: Medical History
    await expect(page.locator('h2')).toContainText(/Medical History/i);
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // STEP 6: Hemoglobin Level (Step 6 for male)
    await expect(page.locator('h2')).toContainText(/Hemoglobin Level/i);
    const checkBtn = page.getByRole('button', { name: /Check eligibility/i });
    await expect(checkBtn).toBeDisabled();
    await page.getByRole('button', { name: /I don't know \(test at centre\)/i }).click();
    await expect(checkBtn).toBeEnabled();
    await checkBtn.click();

    // RESULT SCREEN
    // Should display successful result and 100% progress
    await expect(page.locator('text=Assessment complete')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=100%')).toBeVisible();
    await expect(page.locator('text=You are Eligible to Donate!')).toBeVisible();

    // Take screenshot of result screen
    await page.screenshot({ path: 'test-results/eligibility-result.png', fullPage: true });
  });
});
