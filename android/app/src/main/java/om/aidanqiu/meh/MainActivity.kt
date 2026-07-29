package com.aidanqiu.meh

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.edit
import androidx.core.graphics.ColorUtils
import androidx.core.graphics.toColorInt
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max
import kotlin.math.round

@Suppress("DEPRECATION")
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var rootContainer: ViewGroup
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private val updateExecutor = Executors.newSingleThreadExecutor()
    private val updateInFlight = AtomicBoolean(false)
    private var updateDialog: AlertDialog? = null
    private var pageInitialized = false
    private val systemBackInFlight = AtomicBoolean(false)
    @Volatile
    private var latestInsets = InsetsSnapshot.EMPTY

    private val imagePicker = registerForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia(MAX_WALLPAPERS)
    ) { uris ->
        val callback = fileChooserCallback
        fileChooserCallback = null
        if (uris.isEmpty()) {
            Log.i(TAG, "Image picker cancelled")
            callback?.onReceiveValue(null)
        } else {
            Log.i(TAG, "Image picker returned ${uris.size} image(s)")
            callback?.onReceiveValue(uris.toTypedArray())
        }
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (EDGE_TO_EDGE_ENABLED) configureEdgeToEdgeWindow()
        setContentView(R.layout.activity_main)

        rootContainer = findViewById(R.id.rootContainer)
        webView = findViewById(R.id.webView)
        applySystemBarColor(DEFAULT_SURFACE_COLOR, false)
        applyWindowInsets()

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                if (!url.startsWith(APP_URL)) return
                pushSafeAreaToWeb(view, latestInsets)
                if (pageInitialized) return
                pageInitialized = true
                Log.i(
                    TAG,
                    "Runtime environment: Android WebView; page initialized; " +
                        "version=${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})"
                )
                view.postDelayed({ checkForUpdates(manual = false) }, AUTO_CHECK_START_DELAY_MS)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                Log.i(TAG, "Custom background file chooser requested")
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback
                return try {
                    imagePicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    Log.i(TAG, "System photo picker opened")
                    true
                } catch (error: RuntimeException) {
                    Log.e(TAG, "Unable to open image picker", error)
                    fileChooserCallback = null
                    filePathCallback.onReceiveValue(null)
                    false
                }
            }
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // The application shell is packaged locally. Never restore a stale
            // stylesheet after an Android Studio incremental reinstall.
            cacheMode = WebSettings.LOAD_NO_CACHE
            allowFileAccess = false
            allowContentAccess = true
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        webView.setBackgroundColor(DEFAULT_SURFACE_COLOR.toColorInt())
        webView.addJavascriptInterface(AndroidBridge(), ANDROID_BRIDGE_NAME)

        webView.loadUrl(APP_URL)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                handleSystemBack()
            }
        })
    }

    private fun applyWindowInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(rootContainer) { _, windowInsets ->
            val statusBars = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val systemGestures = windowInsets.getInsets(WindowInsetsCompat.Type.systemGestures())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())
            val safeArea = if (EDGE_TO_EDGE_ENABLED) {
                windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
                )
            } else {
                androidx.core.graphics.Insets.NONE
            }
            val snapshot = InsetsSnapshot(
                leftPx = safeArea.left,
                topPx = safeArea.top,
                rightPx = safeArea.right,
                bottomPx = safeArea.bottom,
                statusBarTopPx = statusBars.top,
                navigationBarBottomPx = navigationBars.bottom,
                gestureBottomPx = systemGestures.bottom,
                cutoutTopPx = displayCutout.top,
                imeBottomPx = ime.bottom,
                density = resources.displayMetrics.density
            )
            if (snapshot != latestInsets) {
                latestInsets = snapshot
                pushSafeAreaToWeb(webView, snapshot)
                logInsetDiagnostics(snapshot)
            }
            windowInsets
        }
        ViewCompat.requestApplyInsets(rootContainer)
    }

    private fun configureEdgeToEdgeWindow() {
        // Configure edge-to-edge before the first content frame. The WebView owns the whole
        // window; insets only protect interactive web content and never shrink the native view.
        WindowCompat.enableEdgeToEdge(window)
        configureTransparentSystemBars()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode =
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                    } else {
                        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                    }
            }
        }
    }

    private fun configureTransparentSystemBars() {
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.navigationBarDividerColor = Color.TRANSPARENT
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
        }
    }

    private fun pushSafeAreaToWeb(target: WebView, snapshot: InsetsSnapshot) {
        if (target.url?.startsWith(APP_URL) != true) return
        val payload = snapshot.toJson().toString()
        val script = """
            (() => {
              const insets = JSON.parse(${JSONObject.quote(payload)});
              window.MehPlatform?.applyAndroidInsets(insets);
            })();
        """.trimIndent()
        target.post { target.evaluateJavascript(script, null) }
    }

    private fun logInsetDiagnostics(snapshot: InsetsSnapshot) {
        if (!BuildConfig.DEBUG) return
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        Log.d(
            TAG,
            "Insets: api=${Build.VERSION.SDK_INT}, navigationMode=${navigationMode()}, " +
                "statusTop=${snapshot.statusBarTopPx}px, navigationBottom=${snapshot.navigationBarBottomPx}px, " +
                "gestureBottom=${snapshot.gestureBottomPx}px, cutoutTop=${snapshot.cutoutTopPx}px, " +
                "imeBottom=${snapshot.imeBottomPx}px, density=${snapshot.density}, " +
                "cssSafe=[${snapshot.leftCssPx},${snapshot.topCssPx}," +
                "${snapshot.rightCssPx},${snapshot.bottomCssPx}], decorFitsSystemWindows=false, " +
                "statusBarColor=${colorString(window.statusBarColor)}, " +
                "navigationBarColor=${colorString(window.navigationBarColor)}, " +
                "lightStatusBars=${controller.isAppearanceLightStatusBars}, " +
                "lightNavigationBars=${controller.isAppearanceLightNavigationBars}"
        )
        rootContainer.post {
            val params = webView.layoutParams as? ViewGroup.MarginLayoutParams
            Log.d(
                TAG,
                "Layout: rootBounds=${rootContainer.width}x${rootContainer.height}, " +
                    "rootPadding=[${rootContainer.paddingLeft},${rootContainer.paddingTop}," +
                    "${rootContainer.paddingRight},${rootContainer.paddingBottom}], " +
                    "webViewBounds=[${webView.left},${webView.top},${webView.right},${webView.bottom}], " +
                    "webViewPadding=[${webView.paddingLeft},${webView.paddingTop}," +
                    "${webView.paddingRight},${webView.paddingBottom}], " +
                    "webViewMargins=[${params?.leftMargin ?: 0},${params?.topMargin ?: 0}," +
                    "${params?.rightMargin ?: 0},${params?.bottomMargin ?: 0}]"
            )
        }
    }

    private fun navigationMode(): String {
        val resourceId = resources.getIdentifier("config_navBarInteractionMode", "integer", "android")
        return when (if (resourceId != 0) resources.getInteger(resourceId) else -1) {
            0 -> "three-button"
            1 -> "two-button"
            2 -> "gesture"
            else -> "unknown"
        }
    }

    private fun colorString(color: Int): String = String.format(Locale.US, "#%08X", color)

    private fun handleSystemBack() {
        if (!::webView.isInitialized) {
            Log.i(TAG, "System back: WebView unavailable; exiting Activity")
            finish()
            return
        }
        if (!systemBackInFlight.compareAndSet(false, true)) {
            Log.i(TAG, "System back ignored while the previous request is still resolving")
            return
        }

        Log.i(TAG, "System back received")
        webView.evaluateJavascript(
            """
                (() => {
                  try {
                    return window.mehNavigation?.canGoBack() === true;
                  } catch (_) {
                    return false;
                  }
                })()
            """.trimIndent()
        ) { result ->
            if (!isJavascriptTrue(result)) {
                systemBackInFlight.set(false)
                Log.i(TAG, "System back reached SPA home; exiting Activity (result=$result)")
                finish()
                return@evaluateJavascript
            }

            webView.evaluateJavascript(
                """
                    (() => {
                      try {
                        return window.mehNavigation?.back("android-back") === true;
                      } catch (_) {
                        return false;
                      }
                    })()
                """.trimIndent()
            ) { backResult ->
                systemBackInFlight.set(false)
                if (isJavascriptTrue(backResult)) {
                    Log.i(TAG, "System back delegated to the SPA navigation stack")
                } else {
                    Log.w(TAG, "SPA declined back after reporting a child screen; exiting Activity")
                    finish()
                }
            }
        }
    }

    private fun isJavascriptTrue(result: String?): Boolean =
        result?.trim()?.trim('"')?.equals("true", ignoreCase = true) == true

    private inner class AndroidBridge {
        @JavascriptInterface
        fun getVersionName(): String = BuildConfig.VERSION_NAME

        @JavascriptInterface
        fun getSafeAreaInsets(): String = latestInsets.toJson().toString()

        @JavascriptInterface
        fun isInsetDebugEnabled(): Boolean = BuildConfig.DEBUG

        @JavascriptInterface
        fun checkForUpdates() {
            runOnUiThread { this@MainActivity.checkForUpdates(manual = true) }
        }

        @JavascriptInterface
        fun openProjectPage() {
            runOnUiThread {
                openGitHubPage(GITHUB_PROJECT_URL, "GitHub project", R.string.project_open_failed)
            }
        }

        @JavascriptInterface
        fun setSystemBarColor(color: String, darkBackground: Boolean) {
            runOnUiThread { applySystemBarColor(color, darkBackground) }
        }
    }

    private fun applySystemBarColor(colorText: String, darkBackground: Boolean) {
        val color = try {
            colorText.toColorInt()
        } catch (_: IllegalArgumentException) {
            DEFAULT_SURFACE_COLOR.toColorInt()
        }
        configureTransparentSystemBars()
        window.decorView.setBackgroundColor(color)
        if (::rootContainer.isInitialized) rootContainer.setBackgroundColor(color)
        if (::webView.isInitialized) webView.setBackgroundColor(color)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = !darkBackground && ColorUtils.calculateLuminance(color) > 0.45
            isAppearanceLightNavigationBars = !darkBackground && ColorUtils.calculateLuminance(color) > 0.45
        }
        if (BuildConfig.DEBUG && latestInsets != InsetsSnapshot.EMPTY) {
            logInsetDiagnostics(latestInsets)
        }
    }

    private fun checkForUpdates(manual: Boolean) {
        if (isFinishing || isDestroyed) return
        val preferences = getSharedPreferences(UPDATE_PREFERENCES, MODE_PRIVATE)
        val now = System.currentTimeMillis()
        if (!manual && now - preferences.getLong(LAST_AUTO_CHECK_KEY, 0L) < AUTO_CHECK_INTERVAL_MS) {
            Log.i(TAG, "Automatic update check skipped: within 24-hour interval")
            return
        }
        if (!updateInFlight.compareAndSet(false, true)) {
            Log.i(TAG, "Update check skipped: request already in progress")
            if (manual) notifyWebUpdateStatus("idle")
            return
        }
        if (!manual) preferences.edit { putLong(LAST_AUTO_CHECK_KEY, now) }
        if (manual) notifyWebUpdateStatus("checking")
        Log.i(TAG, "${if (manual) "Manual" else "Automatic"} GitHub Release check started")

        updateExecutor.execute {
            val result = runCatching { fetchLatestRelease() }
            runOnUiThread {
                updateInFlight.set(false)
                if (isFinishing || isDestroyed) return@runOnUiThread
                result.onSuccess { release -> handleReleaseResult(release, manual) }
                    .onFailure { error ->
                        Log.w(TAG, "GitHub Release check failed: ${error.javaClass.simpleName}")
                        if (manual) {
                            notifyWebUpdateStatus("error")
                            Toast.makeText(this, R.string.update_check_failed, Toast.LENGTH_SHORT).show()
                        }
                    }
            }
        }
    }

    private fun fetchLatestRelease(): ReleaseInfo {
        val connection = (URL(GITHUB_LATEST_RELEASE_API).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = NETWORK_CONNECT_TIMEOUT_MS
            readTimeout = NETWORK_READ_TIMEOUT_MS
            instanceFollowRedirects = false
            setRequestProperty("Accept", "application/vnd.github+json")
            setRequestProperty("User-Agent", "Meh-Android/${BuildConfig.VERSION_NAME}")
            setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
        }
        try {
            val status = connection.responseCode
            if (status != HttpURLConnection.HTTP_OK) throw IllegalStateException("GitHub HTTP $status")
            val json = connection.inputStream.bufferedReader().use { it.readText() }
            val objectValue = JSONObject(json)
            return ReleaseInfo(
                tag = objectValue.optString("tag_name").trim(),
                name = objectValue.optString("name").trim(),
                body = objectValue.optString("body").trim().take(MAX_RELEASE_NOTES_LENGTH),
                url = validateReleaseUrl(objectValue.optString("html_url")) ?: GITHUB_RELEASES_URL,
                publishedAt = objectValue.optString("published_at").trim(),
                draft = objectValue.optBoolean("draft", false),
                prerelease = objectValue.optBoolean("prerelease", false)
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun handleReleaseResult(release: ReleaseInfo, manual: Boolean) {
        Log.i(TAG, "Release metadata received; publishedAt=${release.publishedAt.ifBlank { "unknown" }}")
        if (release.draft || release.prerelease) {
            Log.i(TAG, "Release ignored: draft=${release.draft}, prerelease=${release.prerelease}")
            showLatestResult(manual)
            return
        }
        val comparison = SemanticVersion.compare(release.tag, BuildConfig.VERSION_NAME)
        if (comparison == null) {
            Log.w(TAG, "Release tag could not be compared; update prompt skipped")
            if (manual) {
                notifyWebUpdateStatus("error")
                Toast.makeText(this, R.string.update_check_failed, Toast.LENGTH_SHORT).show()
            }
            return
        }
        if (comparison <= 0) {
            Log.i(TAG, "No newer Android release found")
            showLatestResult(manual)
            return
        }

        notifyWebUpdateStatus("available")
        if (!manual && !promptedVersions.add(release.tag)) {
            Log.i(TAG, "Update prompt skipped: version already prompted this run")
            return
        }
        showUpdateDialog(release)
    }

    private fun showLatestResult(manual: Boolean) {
        if (!manual) return
        notifyWebUpdateStatus("latest")
        Toast.makeText(this, R.string.update_latest, Toast.LENGTH_SHORT).show()
    }

    private fun showUpdateDialog(release: ReleaseInfo) {
        if (isFinishing || isDestroyed || updateDialog?.isShowing == true) return
        val latestLabel = release.name.ifBlank { release.tag }
        val notes = release.body.ifBlank { getString(R.string.update_notes_empty) }
        val message = getString(
            R.string.update_dialog_message,
            BuildConfig.VERSION_NAME,
            latestLabel,
            notes
        )
        val textView = TextView(this).apply {
            text = message
            textSize = 15f
            setTextIsSelectable(true)
            val padding = (24 * resources.displayMetrics.density).toInt()
            setPadding(padding, 0, padding, padding / 2)
        }
        val scrollView = ScrollView(this).apply { addView(textView) }
        updateDialog = MaterialAlertDialogBuilder(this)
            .setTitle(R.string.update_available_title)
            .setView(scrollView)
            .setNegativeButton(R.string.update_later, null)
            .setPositiveButton(R.string.update_open_release) { _, _ -> openReleasePage(release.url) }
            .setOnDismissListener { updateDialog = null }
            .show()
        Log.i(TAG, "Update prompt displayed for ${release.tag}")
    }

    private fun openReleasePage(releaseUrl: String) {
        val safeUrl = validateReleaseUrl(releaseUrl) ?: GITHUB_RELEASES_URL
        openGitHubPage(safeUrl, "GitHub Release")
    }

    private fun openGitHubPage(
        url: String,
        destination: String,
        failureMessage: Int = R.string.update_open_failed
    ) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, url.toUri())
            if (intent.resolveActivity(packageManager) == null) throw ActivityNotFoundException()
            startActivity(intent)
            Log.i(TAG, "Opened $destination in external browser")
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, failureMessage, Toast.LENGTH_SHORT).show()
            Log.w(TAG, "No Activity can open the $destination URL")
        }
    }

    private fun validateReleaseUrl(value: String): String? {
        val uri = runCatching { value.toUri() }.getOrNull() ?: return null
        return value.takeIf {
            uri.scheme.equals("https", ignoreCase = true) &&
                uri.host.equals("github.com", ignoreCase = true)
        }
    }

    private fun notifyWebUpdateStatus(status: String) {
        if (!::webView.isInitialized) return
        webView.evaluateJavascript(
            "window.MehAndroidUpdateResult && window.MehAndroidUpdateResult(${JSONObject.quote(status)})",
            null
        )
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        updateDialog?.dismiss()
        updateDialog = null
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = null
        updateExecutor.shutdownNow()
        webView.removeJavascriptInterface(ANDROID_BRIDGE_NAME)
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }

    private data class ReleaseInfo(
        val tag: String,
        val name: String,
        val body: String,
        val url: String,
        val publishedAt: String,
        val draft: Boolean,
        val prerelease: Boolean
    )

    private data class InsetsSnapshot(
        val leftPx: Int,
        val topPx: Int,
        val rightPx: Int,
        val bottomPx: Int,
        val statusBarTopPx: Int,
        val navigationBarBottomPx: Int,
        val gestureBottomPx: Int,
        val cutoutTopPx: Int,
        val imeBottomPx: Int,
        val density: Float
    ) {
        val leftCssPx: Double get() = toCssPx(leftPx)
        val topCssPx: Double get() = toCssPx(topPx)
        val rightCssPx: Double get() = toCssPx(rightPx)
        val bottomCssPx: Double get() = toCssPx(bottomPx)

        fun toJson(): JSONObject = JSONObject()
            .put("left", leftCssPx)
            .put("top", topCssPx)
            .put("right", rightCssPx)
            .put("bottom", bottomCssPx)
            .put("density", density.toDouble())
            .put("statusBarPx", statusBarTopPx)
            .put("navigationBarPx", navigationBarBottomPx)
            .put("systemGesturePx", gestureBottomPx)
            .put("displayCutoutPx", cutoutTopPx)
            .put("imePx", imeBottomPx)
            .put("edgeToEdge", EDGE_TO_EDGE_ENABLED)

        private fun toCssPx(value: Int): Double {
            val safeDensity = max(density.toDouble(), 0.1)
            return round((value / safeDensity) * 100.0) / 100.0
        }

        companion object {
            val EMPTY = InsetsSnapshot(0, 0, 0, 0, 0, 0, 0, 0, 0, 1f)
        }
    }

    companion object {
        private const val TAG = "MehMainActivity"
        private const val APP_URL = "https://appassets.androidplatform.net/assets/www/index.html"
        private const val ANDROID_BRIDGE_NAME = "MehAndroid"
        private const val DEFAULT_SURFACE_COLOR = "#D6E3E1"
        private const val EDGE_TO_EDGE_ENABLED = true
        private const val GITHUB_OWNER = "AidanQiu"
        private const val GITHUB_REPOSITORY = "Meh"
        private const val GITHUB_LATEST_RELEASE_API =
            "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPOSITORY/releases/latest"
        private const val GITHUB_PROJECT_URL =
            "https://github.com/$GITHUB_OWNER/$GITHUB_REPOSITORY"
        private const val GITHUB_RELEASES_URL =
            "https://github.com/$GITHUB_OWNER/$GITHUB_REPOSITORY/releases"
        private const val UPDATE_PREFERENCES = "meh_update_preferences"
        private const val LAST_AUTO_CHECK_KEY = "last_automatic_check_ms"
        private const val AUTO_CHECK_INTERVAL_MS = 24L * 60L * 60L * 1000L
        private const val AUTO_CHECK_START_DELAY_MS = 800L
        private const val NETWORK_CONNECT_TIMEOUT_MS = 8_000
        private const val NETWORK_READ_TIMEOUT_MS = 10_000
        private const val MAX_RELEASE_NOTES_LENGTH = 4_000
        private const val MAX_WALLPAPERS = 16
        private val promptedVersions = mutableSetOf<String>()
    }
}
