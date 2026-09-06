# BillEase Android App

Native Android (Kotlin) client with **offline-first** billing and push notifications.

## Architecture

```
android/
├── settings.gradle
├── build.gradle              # root build config
└── app/
    ├── build.gradle          # app module (Room, WorkManager, FCM, Retrofit)
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/billease/app/
        │   ├── MainActivity.kt          # entry, auth state, dashboard shell
        │   ├── data/
        │   │   ├── LocalDb.kt           # Room database (offline cache)
        │   │   ├── Entities.kt          # Invoice, InvoiceItem, Product, Party, SyncQueue
        │   │   └── SyncManager.kt       # offline-first sync engine
        │   ├── network/
        │   │   └── SupabaseApi.kt       # Retrofit interface for Supabase REST + Auth
        │   └── notification/
        │       └── ReminderWorker.kt    # daily due-invoice reminders (FCM)
        └── res/
            ├── layout/activity_main.xml
            └── values/themes.xml
```

## How offline sync works

1. All writes go to the **Room database first** (instant, works offline).
2. Every mutation is appended to the local `sync_queue` table with a status.
3. `SyncManager` runs via WorkManager on network-available conditions:
   - pulls remote rows newer than `last_synced_at` into Room, then
   - flushes queued writes to Supabase (insert/update by primary key).
4. Conflicts: newest `updated_at` wins (last-write-wins). The queue holds
   `entity_type`, `entity_id`, and the JSON payload for replay.

## Push notifications

- Firebase Cloud Messaging (FCM) token is stored per device.
- A Supabase Edge Function (or a scheduled worker) checks for overdue
  invoices daily and sends a push with the due amount.
- See `ReminderWorker.kt` for the local fallback that shows a notification
  when the app has cached data and the device is offline.

## Build & run

1. Open the `android/` folder in Android Studio.
2. In `network/SupabaseApi.kt`, set `BASE_URL` and your Supabase anon key
   (same values as `js/config.js`).
3. Add `google-services.json` from Firebase console for FCM.
4. Run on a device/emulator.

## Sync queue schema (Room)

```kotlin
@Entity(tableName = "sync_queue")
data class SyncQueueEntry(
  @PrimaryKey(autoGenerate = true) val id: Long = 0,
  val entityType: String,   // "invoice" | "product" | "party" | "payment"
  val entityId: String,     // remote UUID (generated client-side if new)
  val operation: String,    // "insert" | "update" | "delete"
  val payloadJson: String,
  val status: String = "pending",
  val createdAt: Long = System.currentTimeMillis()
)
```

Client-side UUIDs are generated with `UUID.randomUUID()` so offline inserts
can be replayed safely with the same id (idempotent on retry).
