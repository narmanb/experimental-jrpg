import type { Game } from '../src/game/engine';
import { expect, test } from '@playwright/test';

test('exploration, autonomous combat, shifts, menu and reset work together', async ({ page }) => {
  const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:'Enter the glade'}).click();
  await expect(page.locator('#mode-label')).toHaveText('EXPLORING');
  await page.keyboard.down('d');await page.waitForTimeout(1000);await page.keyboard.up('d');
  await expect(page.locator('#mode-label')).toHaveText('IN COMBAT');
  await page.getByRole('button',{name:/4 Bulwark/}).click();
  await expect(page.locator('#current-formation')).toHaveText('Bulwark');
  await expect(page.locator('#ally-0 .role-name')).toHaveText('Guardian');
  await page.keyboard.press('1');await expect(page.locator('#current-formation')).toHaveText('Pressure');
  await expect.poll(()=>page.locator('#ally-2').getAttribute('data-actions'),{timeout:10000}).not.toBe('0');
  await page.getByRole('button',{name:'Pause menu'}).click();await expect(page.getByRole('dialog',{name:'Field menu'})).toBeVisible();
  await page.getByRole('button',{name:'Reset encounter'}).click();await expect(page.locator('#mode-label')).toHaveText('IN COMBAT');
  expect(errors).toEqual([]);
});

for (const size of [{width:390,height:844},{width:844,height:390},{width:568,height:320},{width:667,height:375},{width:1280,height:900}]) {
  test(`controls fit ${size.width}×${size.height}`,async({page})=>{
    await page.setViewportSize(size);await page.goto('/');await page.getByRole('button',{name:'Enter the glade'}).click();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
    expect(overflow).toBe(false);
    for(const id of ['#formations','#tactics','#party','#menu-button'])await expect(page.locator(id)).toBeVisible();
    const buttons=page.locator('.formation-button');expect(await buttons.count()).toBe(6);
    for(const button of await buttons.all()) { const box=await button.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(42);expect(box!.x+box!.width).toBeLessThanOrEqual(size.width+1);expect(box!.y+box!.height).toBeLessThanOrEqual(size.height+1); }
    const geometry=await page.evaluate(()=>Array.from(document.querySelectorAll('.formation-button,.tactic-button')).map(button=>{
      const rect=button.getBoundingClientRect();const label=button.querySelector('.formation-copy b,.tactic-copy b')!;const range=document.createRange();range.selectNodeContents(label);const text=range.getBoundingClientRect();
      return {label:label.textContent,fits:text.right<=rect.right-2&&text.left>=rect.left,visible:rect.bottom<=innerHeight+1};
    }));expect(geometry.filter(g=>!g.fits||!g.visible)).toEqual([]);
    await page.getByRole('button',{name:'Configure formations'}).click();
    await expect(page.getByRole('dialog',{name:'Formation workshop'})).toBeVisible();
    await page.locator('#edit-role-0').selectOption('Healer');
    await page.getByRole('button',{name:'Save formation'}).click();
    await expect(page.locator('#ally-0 .role-name')).toHaveText('Healer');
    await page.screenshot({path:`test-results/layout-${size.width}.png`,fullPage:true});
  });
}


test('priority targeting survives HUD updates during an enemy windup',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Enter the glade'}).click();
  await page.evaluate(()=>{const g=(window as unknown as {ashglade:Game}).ashglade;g.party.forEach((p,i)=>{p.x=21.5;p.y=16.5+i;});g.shift(3);const e=g.enemies.find(e=>e.kind==='caller')!;g.engage(e);e.windup={kind:'call',remaining:3,total:4,target:g.party[0].id,x:e.x,y:e.y};});
  const card=page.getByRole('button',{name:'Focus Reed Caller'});await expect(card).toBeVisible();
  const box=(await card.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(250);await page.mouse.up();
  await expect(card).toHaveClass(/focused/);
});

test.describe('Android-sized touch play',()=>{
  test.use({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
  test('tap movement engages and touch formation controls change roles',async({page})=>{
    await page.goto('/');await page.getByRole('button',{name:'Enter the glade'}).tap();
    const canvas=page.locator('#game-canvas');const r=(await canvas.boundingBox())!;
    await page.touchscreen.tap(r.x+r.width*0.68,r.y+r.height*0.54);
    await expect(page.locator('#mode-label')).toHaveText('IN COMBAT',{timeout:10000});
    await page.getByRole('button',{name:/3 Lifeline/}).tap();
    await expect(page.locator('#ally-1 .role-name')).toHaveText('Healer');
    await expect(page.locator('#joystick')).toBeHidden();
  });
});
