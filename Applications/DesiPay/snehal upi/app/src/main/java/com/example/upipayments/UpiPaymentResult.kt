package com.example.upipayments

import android.app.Activity
import android.content.Intent

/**
 * Describes the possible outcomes of a UPI payment flow.
 */
sealed class UpiPaymentResult {

    /** No installed app could handle the UPI deep link. */
    object NoUpiApps : UpiPaymentResult()

    /** The user backed out of the UPI app before finishing. */
    object Cancelled : UpiPaymentResult()

    /** The UPI app reported that the transaction succeeded. */
    data class Success(
        val txnId: String,
        val refId: String,
        val approvalRef: String
    ) : UpiPaymentResult()

    /** The UPI app reported that the transaction failed. */
    data class Failure(val message: String) : UpiPaymentResult()

    companion object {

        // The Intent extra every UPI app uses to hand the result back.
        const val EXTRA_RESPONSE = "response"

        /**
         * Parse the result delivered by the UPI app.
         *
         * UPI apps return a pipe-delimited string such as:
         *     ID::1234|RefID::5678|Status::SUCCESS|Response::Success|ApprovalRef::..|txnid::..|..
         *
         * The known status values are SUCCESS, FAILURE and CANCEL / REJECTED /
         * TIMEOUT / (no response when the user presses back).
         *
         * @param resultCode the [Activity.RESULT_OK] / [Activity.RESULT_CANCELED]
         *                   returned by the UPI app.
         * @param data       the data Intent holding the "response" extra.
         */
        fun parse(resultCode: Int, data: Intent?): UpiPaymentResult {
            // Most apps set RESULT_CANCELED when the user presses back.
            if (resultCode == Activity.RESULT_CANCELED) {
                return Cancelled
            }

            val response = data?.getStringExtra(EXTRA_RESPONSE).orEmpty()

            // Some apps return RESULT_OK but an empty response on cancel/error.
            if (response.isBlank()) {
                return if (resultCode == Activity.RESULT_OK) {
                    Failure("The UPI app did not return a result.")
                } else {
                    Cancelled
                }
            }

            // Split "k::v|k::v|..." into a map, tolerating values that
            // themselves contain "::" (join the remainder back together).
            val fields = response
                .split("|")
                .mapNotNull { part ->
                    val kv = part.split("::")
                    if (kv.size >= 2) kv[0] to kv.subList(1, kv.size).joinToString("::") else null
                }
                .associate { it.first to it.second }

            return when (val status = fields["Status"]) {
                "SUCCESS" -> Success(
                    txnId = fields["txnid"] ?: fields["ID"] ?: "",
                    refId = fields["RefID"] ?: "",
                    approvalRef = fields["ApprovalRef"] ?: ""
                )
                "FAILURE" -> Failure(
                    message = fields["Response"] ?: "Transaction failed. Please try again."
                )
                else -> {
                    // No status, or a status like CANCEL/TIMEOUT -> treat as cancelled
                    // unless the app explicitly returned an OK result with a status.
                    if (resultCode == Activity.RESULT_OK && status != null) {
                        Failure(fields["Response"] ?: "Unexpected status from UPI app: $status")
                    } else {
                        Cancelled
                    }
                }
            }
        }
    }
}
