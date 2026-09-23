// plans.js — plan catalog + Razorpay checkout for YT Track upgrades.

async function buyPlan(plan) {
  if (!plan || plan.price <= 0) return;
  let order;
  try {
    order = await callFunction('yt-create-order', { plan_id: plan.id });
  } catch (err) {
    toast(err.message, true);
    return;
  }

  const rzp = new Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency || 'INR',
    name: CONFIG.APP_NAME,
    description: order.plan_name + ' plan \u00b7 30 days',
    prefill: { email: order.user_email || '' },
    theme: { color: '#4f8cff' },
    handler: async (res) => {
      try {
        const out = await callFunction('yt-verify-purchase', {
          plan_id: plan.id,
          razorpay_order_id: res.razorpay_order_id,
          razorpay_payment_id: res.razorpay_payment_id,
          razorpay_signature: res.razorpay_signature,
        });
        toast(out.message || 'Plan activated!');
        window.location.reload();
      } catch (err) {
        toast(err.message, true);
      }
    },
    modal: {
      ondismiss: () => { /* user closed the popup */ },
    },
  });

  rzpRazorpayRef = rzp;
  rzp.open();
}

let rzpRazorpayRef = null;