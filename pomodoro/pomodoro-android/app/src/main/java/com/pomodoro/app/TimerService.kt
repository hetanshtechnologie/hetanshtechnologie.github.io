package com.pomodoro.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat

class TimerService : Service() {

    companion object {
        const val CHANNEL_ID = "pomodoro_timer"
        const val NOTIFICATION_ID = 1
        const val ACTION_START = "com.pomodoro.app.START"
        const val ACTION_PAUSE = "com.pomodoro.app.PAUSE"
        const val ACTION_RESET = "com.pomodoro.app.RESET"
        const val ACTION_STOP = "com.pomodoro.app.STOP"

        const val EXTRA_WORK_MINUTES = "work_minutes"
        const val EXTRA_BREAK_MINUTES = "break_minutes"

        private var isRunning = false
        private var isWorkSession = true
        private var remainingSeconds = 0
        private var workSeconds = 25 * 60
        private var breakSeconds = 5 * 60
        private var cycle = 1

        fun isRunning(): Boolean = isRunning
        fun isWorkSession(): Boolean = isWorkSession
        fun getRemainingSeconds(): Int = remainingSeconds
        fun getCycle(): Int = cycle

        fun formatTime(seconds: Int): String {
            val mins = seconds / 60
            val secs = seconds % 60
            return String.format("%02d:%02d", mins, secs)
        }
    }

    private var timerThread: Thread? = null
    private var running = false
    private var ringtone: Ringtone? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val newWork = intent.getIntExtra(EXTRA_WORK_MINUTES, 25) * 60
                val newBreak = intent.getIntExtra(EXTRA_BREAK_MINUTES, 5) * 60
                workSeconds = newWork
                breakSeconds = newBreak
                if (!isRunning) {
                    if (remainingSeconds <= 0) {
                        isWorkSession = true
                        remainingSeconds = workSeconds
                        cycle = 1
                    }
                }
                startTimer()
            }
            ACTION_PAUSE -> {
                pauseTimer()
            }
            ACTION_RESET -> {
                resetTimer()
            }
            ACTION_STOP -> {
                stopTimer()
                stopForegroundCompat()
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun startTimer() {
        if (running) return
        running = true
        isRunning = true

        val notification = createNotification()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            isRunning = false
            running = false
            return
        }

        timerThread = Thread {
            try {
                while (running) {
                    Thread.sleep(1000)
                    if (!running) break
                    
                    if (remainingSeconds > 0) {
                        remainingSeconds--
                    }

                    if (remainingSeconds <= 0) {
                        playAlarm()
                        vibrate()
                        if (isWorkSession) {
                            isWorkSession = false
                            remainingSeconds = breakSeconds
                        } else {
                            isWorkSession = true
                            cycle++
                            remainingSeconds = workSeconds
                        }
                    }
                    updateNotification()
                }
            } catch (e: InterruptedException) {
                // Normal exit
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isRunning = false
                running = false
            }
        }
        timerThread?.start()
    }

    private fun pauseTimer() {
        running = false
        isRunning = false
        timerThread?.interrupt()
        updateNotification()
    }

    private fun resetTimer() {
        remainingSeconds = if (isWorkSession) workSeconds else breakSeconds
        updateNotification()
    }

    private fun stopTimer() {
        running = false
        isRunning = false
        timerThread?.interrupt()
        remainingSeconds = 0
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

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Pomodoro Timer",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows current timer status"
            setSound(null, null)
        }
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(channel)
    }

    private fun createNotification(): Notification {
        val sessionType = if (isWorkSession) "Focus" else "Break"
        val timeStr = formatTime(remainingSeconds)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Pomodoro - $sessionType")
            .setContentText("$timeStr  |  Cycle #$cycle")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification() {
        val nm = getSystemService(NotificationManager::class.java)
        if (isRunning) {
            val sessionType = if (isWorkSession) "Focus" else "Break"
            val timeStr = formatTime(remainingSeconds)
            val title = if (running) "Pomodoro - $sessionType" else "Pomodoro - Paused"
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText("$timeStr  |  Cycle #$cycle")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .build()
            nm.notify(NOTIFICATION_ID, notification)
        } else {
            nm.cancel(NOTIFICATION_ID)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        running = false
        isRunning = false
        timerThread?.interrupt()
        ringtone?.stop()
    }

    private fun stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }

}
