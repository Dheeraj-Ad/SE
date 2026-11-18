import {test,expect} from '@playwright/test';

for(const response of [
  {name:'hosting error page',status:404,contentType:'text/plain',body:'The page could not be found'},
  {name:'HTML fallback',status:200,contentType:'text/html',body:'<!doctype html><title>LOBBY</title>'},
  {name:'malformed JSON',status:502,contentType:'application/json',body:'The page could not be loaded'},
  {name:'null JSON',status:502,contentType:'application/json',body:'null'},
]){
  test(`login explains ${response.name}`,async({page})=>{
    await page.route('**/api/auth/login',route=>route.fulfill(response));
    await page.goto('/');
    await page.getByLabel('Email address').fill('admin@lobby.local');
    await page.getByLabel('Password',{exact:true}).fill('Lobby@2026!');
    await page.getByRole('button',{name:'Sign in to LOBBY'}).click();
    await expect(page.getByRole('alert')).toHaveText(`The sign-in service is unavailable (HTTP ${response.status}). Please try again later or contact your campus administrator.`);
    await expect(page.getByRole('button',{name:'Sign in to LOBBY'})).toBeEnabled();
  });
}

test('login preserves invalid-credentials message',async({page})=>{
  await page.goto('/');
  await page.getByLabel('Email address').fill('admin@lobby.test');
  await page.getByLabel('Password',{exact:true}).fill('IncorrectPassword');
  await page.getByRole('button',{name:'Sign in to LOBBY'}).click();
  await expect(page.getByRole('alert')).toContainText(/invalid|incorrect/i);
});
