package com.billease.app.network

import com.google.gson.JsonObject
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Headers
import retrofit2.http.POST
import retrofit2.http.PATCH
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Minimal Supabase REST client.
 *
 * Supabase exposes a PostgREST API; we talk to it directly with Retrofit:
 *   GET    /rest/v1/{table}?select=*&id=eq.{id}       -> read
 *   POST   /rest/v1/{table}                           -> insert (Prefer: return=representation)
 *   PATCH  /rest/v1/{table}?id=eq.{id}                -> update
 *   DELETE /rest/v1/{table}?id=eq.{id}                -> delete
 *
 * Set BASE_URL and ANON_KEY to your own Supabase project values.
 */
object SupabaseConfig {
    const val BASE_URL = "https://vgipghqejzbcoighktij.supabase.co"
    const val ANON_KEY = "YOUR_SUPABASE_ANON_KEY"
}

interface SupabaseApi {

    @Headers("apikey: ${SupabaseConfig.ANON_KEY}")
    @GET("/rest/v1/{table}")
    suspend fun list(
        @Path("table") table: String,
        @Query("select") select: String = "*",
        @Query("id") idFilter: String? = null,
        @Query("order") order: String? = "updated_at.desc",
        @Header("Authorization") auth: String = "Bearer ${SupabaseConfig.ANON_KEY}"
    ): List<JsonObject>

    @Headers("apikey: ${SupabaseConfig.ANON_KEY}")
    @POST("/rest/v1/{table}")
    suspend fun insert(
        @Path("table") table: String,
        @Body body: JsonObject,
        @Header("Prefer") prefer: String = "return=representation",
        @Header("Authorization") auth: String = "Bearer ${SupabaseConfig.ANON_KEY}"
    ): List<JsonObject>

    @Headers("apikey: ${SupabaseConfig.ANON_KEY}")
    @PATCH("/rest/v1/{table}")
    suspend fun update(
        @Path("table") table: String,
        @Query("id") idFilter: String,
        @Body body: JsonObject,
        @Header("Prefer") prefer: String = "return=representation",
        @Header("Authorization") auth: String = "Bearer ${SupabaseConfig.ANON_KEY}"
    ): List<JsonObject>

    @Headers("apikey: ${SupabaseConfig.ANON_KEY}")
    @DELETE("/rest/v1/{table}")
    suspend fun delete(
        @Path("table") table: String,
        @Query("id") idFilter: String,
        @Header("Authorization") auth: String = "Bearer ${SupabaseConfig.ANON_KEY}"
    )
}
