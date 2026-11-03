package app.zero.widget

import android.Manifest
import android.annotation.SuppressLint
import android.appwidget.AppWidgetManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.ContentValues
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.view.View
import android.view.WindowInsets
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.webkit.WebViewAssetLoader
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import org.json.JSONObject

/** The whole app: Zerodocs control's interface, bundled inside the APK, with Google sign-in done natively. */
class MainActivity : ComponentActivity() {

    companion object {
        const val HOST = "appassets.androidplatform.net"
        const val HOME = "https://$HOST/assets/www/index.html"
        const val EXTRA_QUERY = "q"
    }

    private lateinit var web: WebView
    private val bg = Color.parseColor("#1D202C")

    private val authLauncher = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { r ->
        try {
            onAuthorized(Identity.getAuthorizationClient(this).getAuthorizationResultFromIntent(r.data))
        } catch (e: Exception) {
            deliver(null, "cancelled")
        }
    }

    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private val fileLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data))
        fileCallback = null
    }

    private val calLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) {
        ZeroWidget.render(this)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = bg
        window.navigationBarColor = bg

        val loader = WebViewAssetLoader.Builder()
            .setDomain(HOST)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web = WebView(this).apply {
            setBackgroundColor(bg)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.setSupportMultipleWindows(false)
            settings.allowFileAccess = false
            settings.textZoom = 100
            overScrollMode = View.OVER_SCROLL_NEVER
            addJavascriptInterface(Bridge(), "ZeroNative")
            webChromeClient = object : WebChromeClient() {
                // lets "Add image" in a task open the phone's gallery / camera picker
                override fun onShowFileChooser(view: WebView, cb: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = cb
                    return try {
                        val i = params.createIntent()
                        if (params.mode == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                        fileLauncher.launch(i); true
                    } catch (e: Exception) {
                        fileCallback = null; false
                    }
                }
            }
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, req: WebResourceRequest): WebResourceResponse? =
                    loader.shouldInterceptRequest(req.url)

                override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                    val u = req.url
                    if (u.host == HOST) return false
                    openExternal(u)
                    return true
                }
            }
        }

        val root = FrameLayout(this).apply {
            setBackgroundColor(bg)
            addView(web, FrameLayout.LayoutParams(-1, -1))
            // Android 15 draws apps edge to edge: keep the page clear of the status bar, nav bar and keyboard.
            setOnApplyWindowInsetsListener { v, insets ->
                val i = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime() or WindowInsets.Type.displayCutout())
                v.setPadding(i.left, i.top, i.right, i.bottom)
                WindowInsets.CONSUMED
            }
        }
        setContentView(root)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.__zeroBack ? window.__zeroBack() : false") { r ->
                    if (r != "true") moveTaskToBack(true)
                }
            }
        })

        if (savedInstanceState != null) web.restoreState(savedInstanceState)
        else web.loadUrl(urlFor(intent))

        Sync.schedule(this)
        val p = getSharedPreferences("app", MODE_PRIVATE)
        if (!Data.hasCalendar(this) && !p.getBoolean("askedCal", false)) {
            p.edit().putBoolean("askedCal", true).apply()
            calLauncher.launch(Manifest.permission.READ_CALENDAR)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val q = query(intent)
        if (q != null) web.loadUrl("$HOME?$q")
    }

    override fun onResume() {
        super.onResume()
        // take in notes written on the pen page
        if (::web.isInitialized) web.evaluateJavascript("window.__zeroInkPull && window.__zeroInkPull()", null)
    }

    override fun onPause() {
        super.onPause()
        if (Prefs(this).connected) Sync.now(this) // the widget picks up changes made in the app
    }

    private fun query(i: Intent?): String? {
        i ?: return null
        i.getStringExtra(EXTRA_QUERY)?.let { if (it.isNotBlank()) return it }
        val d = i.data ?: return null
        return d.encodedQuery?.takeIf { it.isNotBlank() }
    }

    private fun urlFor(i: Intent?): String = query(i)?.let { "$HOME?$it" } ?: HOME

    private fun openExternal(u: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (e: ActivityNotFoundException) {
            toast("No app can open this link")
        }
    }

    /* ---------- Google sign-in ---------- */

    private fun auth(interactive: Boolean) {
        val p = Prefs(this)
        Identity.getAuthorizationClient(this)
            .authorize(Drive.request(p.email))
            .addOnSuccessListener { res ->
                val pi = res.pendingIntent
                if (res.hasResolution() && pi != null) {
                    if (interactive) authLauncher.launch(IntentSenderRequest.Builder(pi.intentSender).build())
                    else deliver(null, "needs_signin")
                } else onAuthorized(res)
            }
            .addOnFailureListener { deliver(null, "network") }
    }

    @Suppress("DEPRECATION")
    private fun onAuthorized(res: AuthorizationResult) {
        val tok = res.accessToken
        if (tok.isNullOrEmpty()) { deliver(null, "no_token"); return }
        val p = Prefs(this)
        val email = try { res.toGoogleSignInAccount()?.email } catch (e: Exception) { null }
        if (!email.isNullOrBlank()) p.email = email
        val first = !p.connected
        p.connected = true
        p.needsSignIn = false
        if (first) Sync.now(this)
        deliver(tok, null, p.email)
    }

    private fun deliver(token: String?, err: String?, email: String? = null) {
        val js = "window.__zeroAuth && window.__zeroAuth(${q(token)}, ${q(err)}, ${q(email)})"
        runOnUiThread { web.evaluateJavascript(js, null) }
    }

    private fun q(s: String?) = if (s == null) "null" else JSONObject.quote(s)

    private fun pinWidget() {
        if (!Data.hasCalendar(this)) calLauncher.launch(Manifest.permission.READ_CALENDAR)
        val mgr = AppWidgetManager.getInstance(this)
        if (mgr.isRequestPinAppWidgetSupported) {
            mgr.requestPinAppWidget(ComponentName(this, ZeroWidget::class.java), null, null)
        } else toast("Long-press your home screen › Widgets › Zerodocs control")
    }

    private fun save(name: String, mime: String, text: String) {
        try {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, name)
                put(MediaStore.Downloads.MIME_TYPE, mime.substringBefore(';'))
            }
            val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: throw IllegalStateException()
            contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray(Charsets.UTF_8)) }
            toast("Saved to Downloads › $name")
        } catch (e: Exception) {
            toast("Couldn't save the file")
        }
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_SHORT).show()

    /** Called from the page's JavaScript (on a background thread). */
    inner class Bridge {
        @JavascriptInterface fun auth(interactive: Boolean) = runOnUiThread { this@MainActivity.auth(interactive) }

        @JavascriptInterface fun clearToken(token: String) {
            try { GoogleAuthUtil.clearToken(this@MainActivity, token) } catch (e: Exception) { }
        }

        @JavascriptInterface fun signOut() {
            val p = Prefs(this@MainActivity)
            p.connected = false; p.email = null; p.fileId = null
            runOnUiThread { ZeroWidget.render(this@MainActivity) }
        }

        @JavascriptInterface fun pinWidget() = runOnUiThread { this@MainActivity.pinWidget() }

        @JavascriptInterface fun save(name: String, mime: String, text: String) = runOnUiThread { this@MainActivity.save(name, mime, text) }

        @JavascriptInterface fun isTablet(): Boolean = resources.configuration.smallestScreenWidthDp >= 600

        /** Opens a note on the native pen page. The note travels through a file: handwriting can be large. */
        @JavascriptInterface fun openInk(json: String) {
            val id = try { JSONObject(json).getString("id") } catch (e: Exception) { return }
            InkActivity.openFile(this@MainActivity).writeText(json)
            runOnUiThread {
                startActivity(Intent(this@MainActivity, InkActivity::class.java).putExtra(InkActivity.EXTRA_ID, id))
                overridePendingTransition(0, 0)
            }
        }

        @JavascriptInterface fun takeInk(): String = org.json.JSONArray(InkActivity.pending(this@MainActivity)).toString()

        @JavascriptInterface fun ackInk(id: String, updatedAt: String) {
            InkActivity.ack(this@MainActivity, id, updatedAt.toLongOrNull() ?: return)
        }

        @JavascriptInterface fun version(): String = packageManager.getPackageInfo(packageName, 0).versionName ?: ""
    }
}
