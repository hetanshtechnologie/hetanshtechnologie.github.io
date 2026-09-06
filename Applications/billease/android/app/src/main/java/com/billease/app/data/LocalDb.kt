package com.billease.app.data

import androidx.room.Database
import androidx.room.RoomDatabase

/**
 * Room database = the offline cache for the app.
 * All reads come from here; the SyncManager keeps it in step with Supabase.
 */
@Database(
    entities = [
        InvoiceEntity::class,
        InvoiceItemEntity::class,
        ProductEntity::class,
        PartyEntity::class,
        SyncQueueEntry::class,
    ],
    version = 1,
    exportSchema = false
)
abstract class LocalDb : RoomDatabase() {
    abstract fun billDao(): BillDao
}
