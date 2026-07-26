import org.gradle.api.tasks.Sync

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.aidanqiu.meh"
    compileSdk {
        version = release(36)
    }

    defaultConfig {
        applicationId = "com.aidanqiu.meh"
        minSdk = 24
        targetSdk = 36
        // Must increase for every APK that should install over an older release.
        versionCode = 3
        versionName = "1.1.2"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        buildConfig = true
    }
}

val webProjectRoot = rootProject.projectDir.parentFile
val syncWebAssets by tasks.registering(Sync::class) {
    group = "build setup"
    description = "Synchronize the canonical web build into the APK asset directory."
    from(webProjectRoot) {
        include(
            "index.html",
            "app.js",
            "pwa-update.js",
            "style.css",
            "service-worker.js",
            "version.json",
            "manifest.webmanifest",
            "manifest-meh.webmanifest",
            "manifest-zh.webmanifest",
            "favicon.ico",
            "fonts/**",
            "icons/icon_monochrome.svg",
            "icons/meh_background.svg",
            "icons/meh_foreground.svg",
            "icons/meh_icon.png"
        )
    }
    into(layout.projectDirectory.dir("src/main/assets/www"))
}

tasks.named("preBuild").configure {
    dependsOn(syncWebAssets)
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)
    implementation("androidx.webkit:webkit:1.14.0")
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
