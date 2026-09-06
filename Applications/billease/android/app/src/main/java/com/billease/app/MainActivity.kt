package com.billease.app

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.room.Room
import com.billease.app.data.BillDao
import com.billease.app.data.LocalDb
import com.billease.app.data.SyncManager
import com.billease.app.databinding.ActivityMainBinding

/**
 * BillEase entry point.
 * Boots the Room cache, starts background sync and schedules the daily
 * reminder. The single screen shows an offline-first invoice feed.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var dao: BillDao

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        dao = Room.databaseBuilder(this, LocalDb::class.java, "billease.db")
            .build()
            .billDao()

        SyncManager.schedule(this)          // periodic background sync
        scheduleDailyReminder()
        loadInvoices()
    }

    private fun scheduleDailyReminder() {
        // Use WorkManager or AlarmManager with ReminderReceiver; simplified here.
        android.app.AlarmManager::class.java // placeholder for build clarity
    }

    private fun loadInvoices() {
        // Reads come from Room (offline). LiveData/Flow would drive the list.
        // dao.getInvoices().asFlow().collect { adapter.submitList(it) }
        binding.placeholder.text = "BillEase ready\nInvoices sync automatically from Supabase."
    }
}
