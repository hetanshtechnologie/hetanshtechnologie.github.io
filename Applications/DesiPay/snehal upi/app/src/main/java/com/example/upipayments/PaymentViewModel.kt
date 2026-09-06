package com.example.upipayments

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel

/**
 * Immutable snapshot of everything needed to build a UPI payment request.
 */
data class PaymentRequest(
    val payeeUpiId: String,   // VPA such as "merchant@bank"
    val payeeName: String?,   // Optional display name shown to the user
    val amount: String,       // Amount without currency symbol, e.g. "499.00"
    val note: String?         // Optional transaction note
)

/**
 * Activity-scoped ViewModel for the payment flow.
 *
 * It lives across configuration changes (rotation, etc.) and across both
 * fragments, so the result returned by the UPI app survives until the
 * confirmation screen is ready to display it.
 */
class PaymentViewModel : ViewModel() {

    // Private MutableLiveData backing field. The UI only ever sees the
    // immutable LiveData exposed below.
    private val _paymentResult = MutableLiveData<UpiPaymentResult?>()

    // The current payment result (null = none stored yet).
    val paymentResult: LiveData<UpiPaymentResult?> get() = _paymentResult

    /**
     * Store the outcome of a payment. Called by the PaymentFragment when the
     * UPI app returns control to us.
     */
    fun setPaymentResult(result: UpiPaymentResult) {
        _paymentResult.value = result
    }

    /**
     * Read and clear the stored result. Called by the ResultFragment so the
     * same result is never rendered twice (e.g. after a configuration change).
     */
    fun consumePaymentResult(): UpiPaymentResult? {
        val result = _paymentResult.value
        _paymentResult.value = null
        return result
    }
}
