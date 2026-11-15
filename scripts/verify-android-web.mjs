import { chromium, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
  const errors = [], loaded = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    assert.equal(url.origin, 'https://appassets.androidplatform.net');
    assert.ok(url.pathname.startsWith('/game/'));
    const name = url.pathname.slice('/game/'.length) || 'index.html';
    assert.ok(!name.split('/').includes('..'));
    const file = new URL(`../android/app/src/main/assets/public/${name}`, import.meta.url);
    const body = await readFile(file);
    loaded.push(name);
    const contentType = name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html';
    await route.fulfill({body,contentType,headers:{'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; base-uri 'none'"}});
  });
  await page.goto('https://appassets.androidplatform.net/game/compatibility.html');
  await page.getByRole('button',{name:'Enter the glade'}).tap();
  await page.keyboard.down('d');await page.waitForTimeout(1000);await page.keyboard.up('d');
  await expect(page.locator('#mode-label')).toHaveText('IN COMBAT');
  await page.getByRole('button',{name:/4 Bulwark/}).tap();
  await expect(page.locator('#ally-0 .role-name')).toHaveText('Guardian');
  await page.getByRole('button',{name:/1 Pressure/}).tap();
  await expect.poll(()=>page.locator('#ally-2').getAttribute('data-actions'),{timeout:10000}).not.toBe('0');
  await page.getByRole('button',{name:'Pause menu'}).tap();
  await page.getByRole('button',{name:'Reset encounter'}).tap();
  await expect(page.locator('#mode-label')).toHaveText('IN COMBAT');
  await page.addInitScript(()=>Object.defineProperty(window,'structuredClone',{value:undefined}));
  await page.goto('https://appassets.androidplatform.net/game/compatibility.html');
  await expect(page.getByText('Update Android System WebView',{exact:true})).toBeVisible();
  assert.deepEqual(errors,[]);assert.ok(loaded.some(p=>p.endsWith('.js')));assert.ok(loaded.some(p=>p.endsWith('.css')));
  console.log('Offline packaged-assets PASS: secure local origin, CSP, relative assets, autonomous combat, touch shifts, menu/retry; no network or page errors.');
} finally {await browser.close();}
