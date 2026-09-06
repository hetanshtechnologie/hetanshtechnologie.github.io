package com.example.upipayments.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.example.upipayments.PaymentViewModel
import com.example.upipayments.R
import com.example.upipayments.UpiPaymentResult
import com.example.upipayments.databinding.FragmentResultBinding
import com.google.android.material.snackbar.Snackbar

/**
 * Second screen: the confirmation screen. Reads the payment result out of the
 * shared ViewModel and renders the appropriate status (success / failure /
 * cancelled / no UPI apps installed).
 */
class ResultFragment : Fragment() {

    private val viewModel: PaymentViewModel by activityViewModels()

    private var _binding: FragmentResultBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentResultBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // "Pay Again" pops back to the payment form (the fields are still
        // filled in, so a retry is quick).
        binding.buttonPayAgain.setOnClickListener {
            findNavController().popBackStack()
        }

        renderResult()
    }

    /**
     * Read (and consume) the result from the ViewModel and paint the screen.
     */
    private fun renderResult() {
        when (val result = viewModel.consumePaymentResult()) {

            is UpiPaymentResult.Success -> {
                binding.imageStatus.setImageResource(R.drawable.ic_status_success)
                binding.imageStatus.imageTintList =
                    ContextCompat.getColorStateList(requireContext(), R.color.success_green)
                binding.textStatusTitle.setText(R.string.status_success)
                binding.textStatusDetail.text = getString(
                    R.string.txn_details,
                    result.txnId.ifBlank { "N/A" },
                    result.refId.ifBlank { "N/A" }
                )
            }

            is UpiPaymentResult.Failure -> {
                binding.imageStatus.setImageResource(R.drawable.ic_status_failure)
                binding.imageStatus.imageTintList =
                    ContextCompat.getColorStateList(requireContext(), R.color.error_red)
                binding.textStatusTitle.setText(R.string.status_failure)
                binding.textStatusDetail.text = result.message
            }

            UpiPaymentResult.Cancelled -> {
                binding.imageStatus.setImageResource(R.drawable.ic_status_cancelled)
                binding.imageStatus.imageTintList =
                    ContextCompat.getColorStateList(requireContext(), R.color.warning_amber)
                binding.textStatusTitle.setText(R.string.status_cancelled)
                binding.textStatusDetail.text = getString(R.string.status_cancelled_detail)
            }

            UpiPaymentResult.NoUpiApps -> {
                // Nothing useful to show on this screen, so return the user to
                // the form with a helpful message.
                Snackbar.make(
                    binding.root,
                    R.string.status_no_apps_detail,
                    Snackbar.LENGTH_LONG
                ).show()
                findNavController().popBackStack()
            }

            null -> {
                // No result stored (should not happen in normal flow) — return.
                findNavController().popBackStack()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
