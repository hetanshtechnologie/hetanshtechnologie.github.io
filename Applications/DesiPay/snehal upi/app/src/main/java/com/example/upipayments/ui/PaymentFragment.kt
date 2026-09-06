package com.example.upipayments.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.example.upipayments.PaymentRequest
import com.example.upipayments.PaymentViewModel
import com.example.upipayments.R
import com.example.upipayments.UpiClient
import com.example.upipayments.UpiPaymentResult
import com.example.upipayments.databinding.FragmentPaymentBinding

/**
 * First screen: the payment form (UPI ID, name, amount, note) and the
 * "Pay Now" button that hands off to the installed UPI apps.
 */
class PaymentFragment : Fragment() {

    // Share the ViewModel with the Activity so both this fragment and the
    // result screen can read the same payment result.
    private val viewModel: PaymentViewModel by activityViewModels()

    // ViewBinding instance; nullable because it is only valid between
    // onCreateView() and onDestroyView().
    private var _binding: FragmentPaymentBinding? = null
    private val binding get() = _binding!!

    /**
     * Activity Result API (the modern replacement for startActivityForResult).
     * The callback fires when the UPI app hands control back to us.
     */
    private val upiLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { activityResult ->
        // Parse the UPI app's response string into a typed result and hand it
        // to the ViewModel for the confirmation screen.
        val result = UpiPaymentResult.parse(activityResult.resultCode, activityResult.data)
        viewModel.setPaymentResult(result)
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPaymentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupClickListeners()

        // When a result appears in the ViewModel, move to the confirmation
        // screen exactly once. (The result screen clears it afterwards.)
        viewModel.paymentResult.observe(viewLifecycleOwner) { result ->
            if (result != null) {
                findNavController().navigate(
                    R.id.action_paymentFragment_to_resultFragment
                )
            }
        }
    }

    private fun setupClickListeners() {
        binding.buttonPayNow.setOnClickListener {
            // Validate the form; if valid, launch the UPI hand-off.
            val request = buildRequestOrNull() ?: return@setOnClickListener
            launchUpiPayment(request)
        }

        // Clear validation errors as soon as the user starts typing again.
        binding.editUpiId.doAfterTextChanged { binding.textInputUpiId.error = null }
        binding.editAmount.doAfterTextChanged { binding.textInputAmount.error = null }
    }

    /**
     * Validate the form and build a [PaymentRequest]. Returns null (after
     * showing an inline error) when the input is not usable.
     */
    private fun buildRequestOrNull(): PaymentRequest? {
        val upiId = binding.editUpiId.text.toString().trim()
        val amount = binding.editAmount.text.toString().trim()
        val payeeName = binding.editPayeeName.text.toString().trim().ifBlank { null }
        val note = binding.editNote.text.toString().trim().ifBlank { null }

        // Very light UPI ID check: "anything@anything".
        if (!upiId.matches(Regex("^[\\w.-]+@[\\w.-]+$"))) {
            binding.textInputUpiId.error = getString(R.string.invalid_upi_id)
            return null
        }

        // Amount must parse and be greater than zero.
        val amountValue = amount.toDoubleOrNull()
        if (amountValue == null || amountValue <= 0.0) {
            binding.textInputAmount.error = getString(R.string.invalid_amount)
            return null
        }

        return PaymentRequest(
            payeeUpiId = upiId,
            payeeName = payeeName,
            amount = amount,
            note = note
        )
    }

    /**
     * Open the system app chooser so the user can pick Google Pay, PhonePe,
     * Paytm or any other installed UPI app. If none is installed, tell the
     * user instead.
     */
    private fun launchUpiPayment(request: PaymentRequest) {
        if (!UpiClient.hasUpiApps(requireContext())) {
            viewModel.setPaymentResult(UpiPaymentResult.NoUpiApps)
            return
        }

        // ACTION_VIEW + the UPI URI makes Android list every UPI-capable app.
        val intent = UpiClient.createPaymentIntent(request)
        val chooser = Intent.createChooser(intent, getString(R.string.choose_upi_app))
        upiLauncher.launch(chooser)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
