const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

test('auth routes cover the confirmation, account and recovery contract', () => {
  const routes = read('src/routes/auth.js');
  const controller = read('src/controllers/authController.js');
  for (const route of ["router.post('/resend-verification'", "router.get('/me'", "router.post('/reset-password'"]) assert.ok(routes.includes(route), `${route} is registered`);
  assert.match(controller, /emailConfirmationRequired: !data\.session/);
  assert.match(controller, /method === 'recovery'/);
  assert.match(controller, /Bearer /);
});

test('profile endpoints follow the editor and upload field contract', () => {
  const routes = read('src/routes/profile.js');
  const controller = read('src/controllers/profileController.js');
  assert.match(routes, /router\.patch\('\/', updateProfile\)/);
  assert.match(routes, /upload\.single\('file'\)/);
  assert.match(controller, /req\.body\.fullName/);
  assert.match(controller, /req\.body\.country/);
});

test('business management actions enforce owner filtering and category lookup', () => {
  const routes = read('src/routes/businesses.js');
  const controller = read('src/controllers/businessController.js');
  for (const route of ["router.get('/categories'", "router.get('/mine', auth", "router.post('/', auth", "router.patch('/:id', auth", "router.post('/:id/publish', auth", "router.post('/:id/unpublish'"]) assert.ok(routes.includes(route), `${route} is registered`);
  assert.match(controller, /\.eq\('owner_id', req\.user\.id\)/);
  assert.match(controller, /'description', 'category_id', 'city'/);
});

test('public category lookup is registered before protected home routes', () => {
  const routes = read('src/routes/home.js');
  assert.ok(routes.indexOf("router.get('/categories'") < routes.indexOf('router.use(authMiddleware)'));
});
