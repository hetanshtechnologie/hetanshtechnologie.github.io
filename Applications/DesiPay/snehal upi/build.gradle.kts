// Root build file. Declares the plugins used across the project
// (applied with `false` so each module can enable them individually).

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}
