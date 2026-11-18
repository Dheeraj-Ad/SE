import {test,expect} from '@playwright/test';

for(const role of ['admin','faculty','security','student']){
  test(`Vercel demo ${role} login and logout`,async({page})=>{
    await page.goto('http://127.0.0.1:3101/');
    await expect(page.locator('.demo-notice')).toContainText('Demo mode');
    await page.getByLabel('Email address').fill(`${role}@lobby.local`);
    await page.getByLabel('Password',{exact:true}).fill('Lobby@2026!');
    await page.getByRole('button',{name:'Sign in to LOBBY'}).click();
    await expect(page.getByRole('heading',{name:'A clear view of your campus.'})).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading',{name:'A clear view of your campus.'})).toBeVisible();
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await page.reload();
    await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
  });
}
