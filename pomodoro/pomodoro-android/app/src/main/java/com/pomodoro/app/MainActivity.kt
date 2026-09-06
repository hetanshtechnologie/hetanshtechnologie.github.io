package com.pomodoro.app

import android.Manifest
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.widget.Button
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.slider.Slider

class MainActivity : AppCompatActivity() {

    private lateinit var timerText: TextView
    private lateinit var sessionLabel: TextView
    private lateinit var cycleCount: TextView
    private lateinit var startButton: Button
    private lateinit var pauseButton: Button
    private lateinit var resetButton: Button
    private lateinit var stopButton: Button

    private lateinit var workSlider: Slider
    private lateinit var breakSlider: Slider
    private lateinit var workValue: TextView
    private lateinit var breakValue: TextView
    private lateinit var saveSettingsButton: Button

    private lateinit var prefs: SharedPreferences
    private var workMinutes = 25
    private var breakMinutes = 5

    private var ringtone: Ringtone? = null

    private val pollingHandler = Handler(Looper.getMainLooper())
    private val pollingRunnable = object : Runnable {
        private var lastIsWork = true
        override fun run() {
            val running = TimerService.isRunning()
            val remaining = TimerService.getRemainingSeconds()
            val isWork = TimerService.isWorkSession()
            val cycle = TimerService.getCycle()

            updateUI(remaining, isWork, cycle)

            if (running) {
                startButton.isEnabled = false
                pauseButton.isEnabled = true
                if (lastIsWork != isWork) {
                    showSessionEndDialog(if (isWork) "Focus time!" else "Break time!", isWork)
                    lastIsWork = isWork
                }
            } else {
                startButton.isEnabled = true
                pauseButton.isEnabled = false
                startButton.text = if (remaining < (if (isWork) workMinutes else breakMinutes) * 60 && remaining > 0) "Resume" else "Start"
            }
            
            pollingHandler.postDelayed(this, 500)
        }
    }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) {
            showPermissionDeniedDialog()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences("pomodoro_prefs", MODE_PRIVATE)
        workMinutes = prefs.getInt("work_minutes", 25)
        breakMinutes = prefs.getInt("break_minutes", 5)

        initViews()
        setupListeners()
        requestNotificationPermission()
    }

    private fun initViews() {
        timerText = findViewById(R.id.timerText)
        sessionLabel = findViewById(R.id.sessionLabel)
        cycleCount = findViewById(R.id.cycleCount)
        startButton = findViewById(R.id.startButton)
        pauseButton = findViewById(R.id.pauseButton)
        resetButton = findViewById(R.id.resetButton)
        stopButton = findViewById(R.id.stopButton)

        workSlider = findViewById(R.id.workDurationSlider)
        breakSlider = findViewById(R.id.breakDurationSlider)
        workValue = findViewById(R.id.workDurationValue)
        breakValue = findViewById(R.id.breakDurationValue)
        saveSettingsButton = findViewById(R.id.saveSettingsButton)
    }

    private fun setupListeners() {
        workSlider.addOnChangeListener { _, value, _ ->
            workValue.text = "${value.toInt()} min"
        }
        breakSlider.addOnChangeListener { _, value, _ ->
            breakValue.text = "${value.toInt()} min"
        }

        workSlider.value = workMinutes.toFloat()
        breakSlider.value = breakMinutes.toFloat()
        workValue.text = "$workMinutes min"
        breakValue.text = "$breakMinutes min"

        startButton.setOnClickListener {
            if (TimerService.isRunning()) return@setOnClickListener
            val intent = Intent(this, TimerService::class.java).apply {
                action = TimerService.ACTION_START
                putExtra(TimerService.EXTRA_WORK_MINUTES, workMinutes)
                putExtra(TimerService.EXTRA_BREAK_MINUTES, breakMinutes)
            }
            ContextCompat.startForegroundService(this, intent)
        }

        pauseButton.setOnClickListener {
            val intent = Intent(this, TimerService::class.java).apply {
                action = TimerService.ACTION_PAUSE
            }
            startService(intent)
        }

        resetButton.setOnClickListener {
            val intent = Intent(this, TimerService::class.java).apply {
                action = TimerService.ACTION_RESET
            }
            startService(intent)
        }

        stopButton.setOnClickListener {
            val intent = Intent(this, TimerService::class.java).apply {
                action = TimerService.ACTION_STOP
            }
            startService(intent)
        }

        saveSettingsButton.setOnClickListener {
            workMinutes = workSlider.value.toInt()
            breakMinutes = breakSlider.value.toInt()
            prefs.edit().putInt("work_minutes", workMinutes).putInt("break_minutes", breakMinutes).apply()
            if (!TimerService.isRunning()) {
                updateUI(workMinutes * 60, true, 1)
            }
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun showPermissionDeniedDialog() {
        AlertDialog.Builder(this)
            .setTitle("Permission Denied")
            .setMessage("Timer notifications may not work without notification permission.")
            .setPositiveButton("OK", null)
            .show()
    }

    private fun showSessionEndDialog(message: String, isWork: Boolean) {
        playAlarm()
        vibrate()
        AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
            .setTitle("Time's up!")
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("OK") { _, _ ->
                ringtone?.stop()
            }
            .show()
    }

    private fun playAlarm() {
        try {
            val alarmUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            ringtone?.stop()
            ringtone = RingtoneManager.getRingtone(this, alarmUri)
            ringtone?.play()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun vibrate() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(VIBRATOR_SERVICE) as Vibrator
            }
            val effect = VibrationEffect.createOneShot(2000, VibrationEffect.DEFAULT_AMPLITUDE)
            vibrator.vibrate(effect)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun updateUI(remainingSeconds: Int, isWork: Boolean, cycle: Int) {
        timerText.text = TimerService.formatTime(remainingSeconds)
        sessionLabel.text = if (isWork) "Focus" else "Break"
        cycleCount.text = "Cycle #$cycle"
    }

    override fun onResume() {
        super.onResume()
        pollingHandler.post(pollingRunnable)
    }

    override fun onPause() {
        super.onPause()
        pollingHandler.removeCallbacks(pollingRunnable)
    }

    override fun onDestroy() {
        super.onDestroy()
        ringtone?.stop()
    }
}
