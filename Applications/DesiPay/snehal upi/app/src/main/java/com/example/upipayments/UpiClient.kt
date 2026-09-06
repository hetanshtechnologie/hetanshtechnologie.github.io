package com.example.upipayments

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Builds the standard "upi://pay" deep-link URI and the Intent that opens it.
 *
 * This is the mechanism agreed by the UPI ecosystem (NPCI) and understood by
 * Google Pay, PhonePe, Paytm, BHIM, Amazon Pay and every other UPI app.
 */
object UpiClient {

    private const val UPI_SCHEME = "upi"
    private const val UPI_HOST = "pay"

    /**
     * Build the UPI payment URI from a [PaymentRequest].
     *
     * Supported query parameters:
     *  - pa : payee VPA / UPI ID          (mandatory)
     *  - pn : payee display name          (optional)
     *  - am : amount in INR               (mandatory for a payment)
     *  - cu : currency code               (INR)
     *  - tn : transaction note            (optional)
     *  - mode : 04 = UPI standard
     *  - purpose : 00 = normal payment
     */
    fun buildPaymentUri(request: PaymentRequest): Uri = Uri.Builder()
        .scheme(UPI_SCHEME)
        .authority(UPI_HOST)
        .appendQueryParameter("pa", request.payeeUpiId)
        .appendQueryParameter("pn", request.payeeName.orEmpty())
        .appendQueryParameter("am", request.amount)
        .appendQueryParameter("cu", "INR")
        .appendQueryParameter("tn", request.note.orEmpty())
        .appendQueryParameter("mode", "04")
        .appendQueryParameter("purpose", "00")
        .build()

    /**
     * Returns true when at least one installed app can handle a UPI payment.
     */
    fun hasUpiApps(context: Context): Boolean {
        // A minimal probe request; the values never reach a real transaction.
        val probeUri = buildPaymentUri(
            PaymentRequest(
                payeeUpiId = "test@upi",
                payeeName = "Test",
                amount = "1",
                note = null
            )
        )
        val intent = Intent(Intent.ACTION_VIEW, probeUri)
        return intent.resolveActivity(context.packageManager) != null
    }

    /**
     * Create an ACTION_VIEW Intent for the payment. Android resolves the
     * target to any installed UPI app (Google Pay, PhonePe, Paytm, ...).
     */
    fun createPaymentIntent(request: PaymentRequest): Intent =
        Intent(Intent.ACTION_VIEW, buildPaymentUri(request))
}
