const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { renderCheckout } = require('../controllers/checkoutController');
const auth = require('../middleware/auth');

router.post('/create-order', auth, createOrder);
router.post('/verify', auth, verifyPayment);
router.get('/checkout/:orderId', renderCheckout);

module.exports = router;
