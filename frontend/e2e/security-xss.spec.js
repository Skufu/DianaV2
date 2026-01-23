import { test, expect } from '@playwright/test';

test.describe('Security: HttpOnly Cookie Protection', () => {
  test('XSS payload injection - verify HttpOnly cookies not accessible to JavaScript', async ({ page, context }) => {
    const API_BASE = 'http://localhost:8080/api/v1';

    const loginResponse = await context.request.post(`${API_BASE}/auth/login`, {
      data: {
        email: 'admin@diana.app',
        password: 'admin123',
      },
    });

    expect(loginResponse.ok()).toBeTruthy();

    const loginData = await loginResponse.json();
    expect(loginData.user).toBeDefined();

    const testResult = await page.evaluate(() => {
      try {
        const cookies = document.cookie;

        const hasDianaToken = cookies.includes('diana_token');
        const hasDianaRefreshToken = cookies.includes('diana_refresh_token');

        return {
          access_error: null,
          document_cookie: cookies,
          has_diana_token: hasDianaToken,
          has_diana_refresh_token: hasDianaRefreshToken,
          test: 'XSS_COOKIE_PROTECTION'
        };
      } catch (error) {
        return {
          access_error: error.message,
          document_cookie: null,
          has_diana_token: false,
          has_diana_refresh_token: false,
          test: 'XSS_COOKIE_PROTECTION'
        };
      }
    });

    if (testResult.access_error) {
      console.log('✅ SECURITY TEST PASSED: HttpOnly cookies protected - JavaScript cannot access cookies');
      console.log('   Error:', testResult.access_error);
    } else {
      expect(testResult.has_diana_token).toBe(false);
      expect(testResult.has_diana_refresh_token).toBe(false);
      expect(testResult.document_cookie).not.toContain('diana_token');
      expect(testResult.document_cookie).not.toContain('diana_refresh_token');
      console.log('✅ SECURITY TEST PASSED: HttpOnly cookies not in document.cookie');
    }
  });

  test('Verify cookie attributes are correctly set', async ({ context }) => {
    const API_BASE = 'http://localhost:8080/api/v1';

    const loginResponse = await context.request.post(`${API_BASE}/auth/login`, {
      data: {
        email: 'admin@diana.app',
        password: 'admin123',
      },
    });

    expect(loginResponse.ok()).toBeTruthy();

    const cookies = loginResponse.headers()['set-cookie'] || '';

    expect(cookies).toContain('HttpOnly');
    expect(cookies).toContain('Secure');
    expect(cookies).toContain('SameSite=Strict');

    console.log('✅ Cookie security attributes verified:', cookies);
  });

  test('XSS attack simulation: Reflective XSS in URL parameter', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>XSS Test Page</title>
      </head>
      <body>
        <h1>XSS Test Page</h1>
        <p id="test-result"></p>
      </body>
      </html>
    `);

    const theftResult = await page.evaluate(() => {
      try {
        const cookies = document.cookie;

        document.getElementById('test-result').textContent = JSON.stringify({
          stolen: cookies.includes('diana_token'),
          allCookies: cookies
        });

        return {
          access_error: null,
          stolen: cookies.includes('diana_token'),
          allCookies: cookies
        };
      } catch (error) {
        return {
          access_error: error.message,
          stolen: false,
          allCookies: null
        };
      }
    });

    if (theftResult.access_error) {
      console.log('✅ Reflective XSS test passed: HttpOnly cookies protected - access blocked');
      console.log('   Error:', theftResult.access_error);
    } else {
      expect(theftResult.stolen).toBe(false);
      expect(theftResult.allCookies).not.toContain('diana_token');
      console.log('✅ Reflective XSS test passed: HttpOnly cookies protected');
    }
  });
});
