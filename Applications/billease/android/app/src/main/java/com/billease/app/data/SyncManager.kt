package com.billease.app.data

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.billease.app.network.SupabaseApi
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * Offline-first sync engine.
 *
 * Phase 1 - PULL:  fetch rows newer than last_synced_at into Room.
 * Phase 2 - PUSH:  replay every pending row in the sync_queue outbox.
 *
 * Replays are idempotent because offline inserts use a client-generated UUID,
 * so retrying with the same primary key either inserts or updates in place.
 */
class SyncManager(
    context: Context,
    params: WorkerParameters,
    private val api: SupabaseApi,
    private val dao: BillDao
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            pull()
            push()
            Result.success()
        } catch (t: Throwable) {
            // No connectivity or transient error -> WorkManager retries later
            Result.retry()
        }
    }

    /** Download remote changes into the local cache. */
    private suspend fun pull() {
        val last = dao.lastInvoiceSync()
        // Supabase returns ISO timestamps; filter server-side by updated_at.
        val remote = api.list("be_invoices", idFilter = null, order = "updated_at.desc")
        val fresh = remote.filter {
            parseEpoch(it, "updated_at") > last
        }
        val entities = fresh.map { InvoiceEntity(
            id = it.get("id").asString,
            invoiceNumber = it.get("invoice_number").asString,
            partyId = it.get("party_id")?.asString,
            type = it.get("type")?.asString ?: "sale",
            status = it.get("status")?.asString ?: "draft",
            invoiceDate = it.get("invoice_date")?.asString ?: "",
            dueDate = it.get("due_date")?.asString,
            total = it.get("total")?.asDouble ?: 0.0,
            paidAmount = it.get("paid_amount")?.asDouble ?: 0.0,
            updatedAt = parseEpoch(it, "updated_at"),
            deleted = false
        ) }
        dao.upsertInvoices(entities)
    }

    /** Flush the local outbox to Supabase. */
    private suspend fun push() {
        val pending = dao.getPending()
        for (entry in pending) {
            val ok = try {
                when (entry.operation) {
                    "delete" -> { api.delete(entry.entityType, "eq.${entry.entityId}"); true }
                    "update" -> { api.update(entry.entityType, "eq.${entry.entityId}", json(entry.payloadJson)); true }
                    else -> {
                        // insert: send with the same id -> safe to retry
                        val body = json(entry.payloadJson)
                        api.insert(entry.entityType, body)
                        true
                    }
                }
            } catch (t: Throwable) { false }

            if (ok) dao.remove(entry.id)
            else dao.markStatus(entry.id, "failed")
        }
    }

    private fun json(s: String): JsonObject =
        try { Gson().fromJson(s, JsonObject::class.java) } catch (e: Exception) { JsonObject() }

    private fun parseEpoch(o: JsonObject, key: String): Long {
        val iso = o.get(key)?.asString ?: return 0L
        return try {
            java.time.OffsetDateTime.parse(iso).toInstant().toEpochMilli()
        } catch (e: Exception) { 0L }
    }

    companion object {
        /** Enqueue an offline write. Call from any repository method. */
        suspend fun enqueue(dao: BillDao, entityType: String, id: String, op: String, payloadJson: String) {
            dao.enqueue(SyncQueueEntry(entityType = entityType, entityId = id, operation = op, payloadJson = payloadJson))
        }

        /** Schedule periodic background sync (respects network availability). */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = PeriodicWorkRequestBuilder<SyncManager>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork("billease_sync", ExistingPeriodicWorkPolicy.KEEP, request)
        }
    }
}
