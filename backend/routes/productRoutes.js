const express = require('express');
const router = express.Router();
const pc = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Categories (must be before /:id to avoid route conflict)
router.get('/categories/all', pc.getCategories);
router.post('/categories', pc.createCategory);
router.put('/categories/:id', pc.updateCategory);
router.delete('/categories/:id', pc.deleteCategory);

// Products
router.get('/', pc.getProducts);
router.get('/:id', pc.getProduct);
router.post('/', pc.createProduct);
router.put('/:id', pc.updateProduct);
router.delete('/:id', pc.deleteProduct);

module.exports = router;
