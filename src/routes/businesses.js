const express = require('express');
const auth = require('../middleware/auth');
const controller = require('../controllers/businessController');
const router = express.Router();

router.get('/categories', controller.listCategories);
router.get('/mine', auth, controller.listMine);
router.post('/', auth, controller.create);
router.patch('/:id', auth, controller.update);
router.post('/:id/publish', auth, controller.publish);
router.post('/:id/unpublish', auth, controller.unpublish);
router.get('/:idOrSlug', async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (token) {
    const { data } = await require('../config/supabase').supabase.auth.getUser(token);
    if (data?.user) req.user = data.user;
  }
  next();
}, controller.getOne);

module.exports = router;
