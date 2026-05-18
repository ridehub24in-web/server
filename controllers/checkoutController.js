const Transaction = require('../models/Transaction');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.renderCheckout = async (req, res) => {
    const { orderId } = req.params;
    const { amount, name, email, contact } = req.query;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Razorpay Checkout</title>
      </head>
      <body>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <script>
          var options = {
            "key": "${process.env.RAZORPAY_KEY_ID}",
            "amount": "${amount}",
            "currency": "INR",
            "name": "Dating App Gift",
            "description": "Premium Gift Payment",
            "order_id": "${orderId}",
            "prefill": {
              "name": "${name}",
              "email": "${email}",
              "contact": "${contact}"
            },
            "theme": { "color": "#FF5F6D" },
            "handler": function (response) {
                // Success - Redirect back to app with params
                const params = new URLSearchParams(response).toString();
                window.location.href = "datingapp://payment-success?" + params;
            },
            "modal": {
                "ondismiss": function() {
                    window.location.href = "datingapp://payment-cancel";
                }
            }
          };
          var rzp = new Razorpay(options);
          rzp.on('payment.failed', function (response){
              window.location.href = "datingapp://payment-failed?error=" + encodeURIComponent(response.error.description);
          });
          rzp.open();
        </script>
      </body>
    </html>
    `;
    res.send(html);
};
