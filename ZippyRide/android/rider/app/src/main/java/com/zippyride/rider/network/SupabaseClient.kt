package com.zippyride.rider.network

import com.zippyride.rider.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime

object Supabase {
  val client: SupabaseClient = createSupabaseClient(
    supabaseUrl = BuildConfig.SUPABASE_URL,
    supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
  ) {
    install(Auth)
    install(Postgrest)
    install(Realtime)
  }

  val auth: Auth get() = client.auth
  val postgrest: Postgrest get() = client.postgrest
  val realtime: Realtime get() = client.realtime
}
