package com.billease.app.data

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query

// ---------------------------------------------------------------------------
// Entities (mirror the Supabase tables: be_invoices, be_invoice_items, ...)
// ---------------------------------------------------------------------------

@Entity(tableName = "invoices")
data class InvoiceEntity(
    @PrimaryKey val id: String,
    val invoiceNumber: String,
    val partyId: String?,
    val type: String,            // sale | purchase | quotation
    val status: String,          // draft | sent | paid | ...
    val invoiceDate: String,
    val dueDate: String?,
    val total: Double,
    val paidAmount: Double,
    val updatedAt: Long,
    val deleted: Boolean = false
)

@Entity(tableName = "invoice_items")
data class InvoiceItemEntity(
    @PrimaryKey val id: String,
    val invoiceId: String,
    val productName: String,
    val hsn: String,
    val qty: Double,
    val unit: String,
    val rate: Double,
    val gstRate: Double,
    val amount: Double,
    val updatedAt: Long
)

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val sku: String,
    val hsn: String,
    val sellingPrice: Double,
    val gstRate: Double,
    val stock: Double,
    val lowStockAt: Double,
    val isService: Boolean,
    val updatedAt: Long,
    val deleted: Boolean = false
)

@Entity(tableName = "parties")
data class PartyEntity(
    @PrimaryKey val id: String,
    val name: String,
    val type: String,            // customer | vendor
    val phone: String,
    val gstin: String,
    val billingAddress: String,
    val creditLimit: Double,
    val openingBalance: Double,
    val updatedAt: Long,
    val deleted: Boolean = false
)

/** Outbox for writes made while offline; flushed when connectivity returns. */
@Entity(tableName = "sync_queue")
data class SyncQueueEntry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val entityType: String,      // invoice | product | party | payment
    val entityId: String,        // remote UUID (client-generated if new)
    val operation: String,       // insert | update | delete
    val payloadJson: String,
    val status: String = "pending",
    val createdAt: Long = System.currentTimeMillis()
)

// ---------------------------------------------------------------------------
// DAO
// ---------------------------------------------------------------------------
@Dao
interface BillDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertInvoice(invoice: InvoiceEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertInvoices(invoices: List<InvoiceEntity>)

    @Query("SELECT * FROM invoices WHERE deleted = 0 ORDER BY invoiceDate DESC")
    suspend fun getInvoices(): List<InvoiceEntity>

    @Query("SELECT * FROM invoices WHERE id = :id")
    suspend fun getInvoice(id: String): InvoiceEntity?

    @Query("UPDATE invoices SET deleted = 1 WHERE id = :id")
    suspend fun softDeleteInvoice(id: String)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertItems(items: List<InvoiceItemEntity>)

    @Query("SELECT * FROM invoice_items WHERE invoiceId = :invoiceId")
    suspend fun getItems(invoiceId: String): List<InvoiceItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertProducts(products: List<ProductEntity>)

    @Query("SELECT * FROM products WHERE deleted = 0")
    suspend fun getProducts(): List<ProductEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertParties(parties: List<PartyEntity>)

    @Query("SELECT * FROM parties WHERE deleted = 0")
    suspend fun getParties(): List<PartyEntity>

    // ----- sync queue -----
    @Insert
    suspend fun enqueue(entry: SyncQueueEntry)

    @Query("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY id ASC")
    suspend fun getPending(): List<SyncQueueEntry>

    @Query("UPDATE sync_queue SET status = :status WHERE id = :id")
    suspend fun markStatus(id: Long, status: String)

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun remove(id: Long)

    @Query("SELECT COALESCE(MAX(updatedAt), 0) FROM invoices")
    suspend fun lastInvoiceSync(): Long
}
