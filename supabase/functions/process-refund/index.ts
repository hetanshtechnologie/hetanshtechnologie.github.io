import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

serve(async (req: Request) => {
  try {
    const { payment_id, amount, order_item_id } = await req.json();
    if (!payment_id || !amount) {
      return new Response(JSON.stringify({ error: "payment_id and amount are required" }), { status: 400 });
    }

    const auth = btoa(RAZORPAY_KEY_ID + ":" + RAZORPAY_KEY_SECRET);
    const refRes = await fetch("https://api.razorpay.com/v1/payments/" + payment_id + "/refund", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + auth,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount: amount })
    });

    const refData = await refRes.json();
    if (!refRes.ok) {
      return new Response(JSON.stringify({ error: refData.error?.description || "Razorpay refund failed" }), { status: 400 });
    }

    if (order_item_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const sRes = await fetch(supabaseUrl + "/rest/v1/ec_order_items?id=eq." + order_item_id, {
        method: "PATCH",
        headers: {
          "Authorization": "Bearer " + supabaseKey,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({ status: "refunded", refunded_at: new Date().toISOString(), refund_id: refData.id })
      });
      if (!sRes.ok) console.error("Failed to update order item", await sRes.text());
    }

    return new Response(JSON.stringify({ success: true, refund_id: refData.id, status: refData.status }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
