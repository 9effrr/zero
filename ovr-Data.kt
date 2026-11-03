package app.zero.widget

import android.Manifest
import android.content.ContentUris
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CalendarContract
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

object Zero {
    const val BASE = "https://9effrr.github.io/zero/"
    const val DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
    /** Same access the web app asks for, so one sign-in covers the app and the widget. */
    val SCOPES = listOf(
        DRIVE_SCOPE,
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "openid"
    )
    const val DATA_FILE = "zero-data.json"

    val BLUE = 0xFF93AFC2.toInt()
    val ORANGE = 0xFFE5916B.toInt()
    val GRAY = 0xFFC29B78.toInt()
}

data class Row(val title: String, val meta: String, val color: Int, val url: String)

class Prefs(ctx: Context) {
    private val sp = ctx.getSharedPreferences("zero", Context.MODE_PRIVATE)

    var email: String?
        get() = sp.getString("email", null)
        set(v) = sp.edit().putString("email", v).apply()
    var connected: Boolean
        get() = sp.getBoolean("connected", false)
        set(v) = sp.edit().putBoolean("connected", v).apply()
    var needsSignIn: Boolean
        get() = sp.getBoolean("needsSignIn", false)
        set(v) = sp.edit().putBoolean("needsSignIn", v).apply()
    var fileId: String?
        get() = sp.getString("fileId", null)
        set(v) = sp.edit().putString("fileId", v).apply()
    var lastSync: Long
        get() = sp.getLong("lastSync", 0L)
        set(v) = sp.edit().putLong("lastSync", v).apply()
    var lastError: String?
        get() = sp.getString("lastError", null)
        set(v) = sp.edit().putString("lastError", v).apply()
}

object Data {
    private fun key(c: Calendar): String =
        String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))

    fun todayKey(): String = key(Calendar.getInstance())

    private fun hm(ms: Long): String = SimpleDateFormat("HH:mm", Locale.US).format(ms)

    fun hasCalendar(ctx: Context): Boolean =
        ctx.checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED

    /** Today's events from the phone's calendar (synced from Google Calendar). Null when permission is missing. */
    fun todayEvents(ctx: Context): List<Row>? = eventsOn(ctx, Calendar.getInstance())

    /** Events on one day. Null when calendar permission is missing. */
    fun eventsOn(ctx: Context, day: Calendar): List<Row>? {
        if (!hasCalendar(ctx)) return null
        val start = (day.clone() as Calendar).apply {
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }
        val end = (start.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, 1) }
        val today = key(start)

        val uri = CalendarContract.Instances.CONTENT_URI.buildUpon().also {
            ContentUris.appendId(it, start.timeInMillis)
            ContentUris.appendId(it, end.timeInMillis)
        }.build()
        val proj = arrayOf(
            CalendarContract.Instances.TITLE,
            CalendarContract.Instances.BEGIN,
            CalendarContract.Instances.END,
            CalendarContract.Instances.ALL_DAY,
            CalendarContract.Instances.SELF_ATTENDEE_STATUS
        )
        val allDay = mutableListOf<Row>()
        val timed = mutableListOf<Pair<Long, Row>>()
        val utc = TimeZone.getTimeZone("UTC")
        try {
            ctx.contentResolver.query(
                uri, proj, "${CalendarContract.Instances.VISIBLE}=1", null,
                "${CalendarContract.Instances.BEGIN} ASC"
            )?.use { c ->
                while (c.moveToNext()) {
                    val title = c.getString(0)?.takeIf { it.isNotBlank() } ?: "(No title)"
                    val begin = c.getLong(1)
                    val stop = c.getLong(2)
                    val isAllDay = c.getInt(3) == 1
                    val status = c.getInt(4)
                    if (status == CalendarContract.Attendees.ATTENDEE_STATUS_DECLINED) continue
                    if (isAllDay) {
                        // All-day events are stored in UTC; keep only those that cover this date.
                        val s = key(Calendar.getInstance(utc).apply { timeInMillis = begin })
                        val e = key(Calendar.getInstance(utc).apply { timeInMillis = stop })
                        if (today < s || today >= e) continue
                        allDay += Row(title, "All day", Zero.BLUE, Zero.BASE + "?d=" + today)
                    } else {
                        timed += begin to Row(title, "${hm(begin)} – ${hm(stop)}", Zero.BLUE, Zero.BASE + "?d=" + today)
                    }
                }
            }
        } catch (e: SecurityException) {
            return null
        }
        return allDay + timed.sortedBy { it.first }.map { it.second }
    }

    /** Dates (yyyy-MM-dd) in [from, to) that have at least one calendar event. */
    fun eventDays(ctx: Context, from: Calendar, to: Calendar): Set<String> {
        if (!hasCalendar(ctx)) return emptySet()
        val out = HashSet<String>()
        val uri = CalendarContract.Instances.CONTENT_URI.buildUpon().also {
            ContentUris.appendId(it, from.timeInMillis)
            ContentUris.appendId(it, to.timeInMillis)
        }.build()
        val proj = arrayOf(
            CalendarContract.Instances.BEGIN,
            CalendarContract.Instances.END,
            CalendarContract.Instances.ALL_DAY,
            CalendarContract.Instances.SELF_ATTENDEE_STATUS
        )
        val lo = key(from); val hi = key(to)
        val utc = TimeZone.getTimeZone("UTC")
        try {
            ctx.contentResolver.query(uri, proj, "${CalendarContract.Instances.VISIBLE}=1", null, null)?.use { c ->
                while (c.moveToNext()) {
                    if (c.getInt(3) == CalendarContract.Attendees.ATTENDEE_STATUS_DECLINED) continue
                    val allDay = c.getInt(2) == 1
                    val tz = if (allDay) utc else TimeZone.getDefault()
                    val d = Calendar.getInstance(tz).apply { timeInMillis = c.getLong(0) }
                    val endMs = c.getLong(1).let { if (allDay) it - 1 else maxOf(it - 1, c.getLong(0)) }
                    var n = 0
                    while (d.timeInMillis <= endMs && n < 45) {
                        val k = key(d)
                        if (k >= lo && k < hi) out += k
                        d.add(Calendar.DAY_OF_MONTH, 1); n++
                    }
                }
            }
        } catch (e: SecurityException) { }
        return out
    }

    fun cacheFile(ctx: Context) = File(ctx.filesDir, Zero.DATA_FILE)

    private fun JSONObject.str(name: String): String = if (isNull(name)) "" else optString(name, "")

    /** Urgent tasks (flagged or overdue) then tasks due today, from the cached Drive file. Null when never synced. */
    fun tasks(ctx: Context): List<Row>? {
        val f = cacheFile(ctx)
        if (!f.exists()) return null
        val root = try { JSONObject(f.readText()) } catch (e: Exception) { return null }
        val ts = root.optJSONObject("tasks") ?: return emptyList()
        val ps = root.optJSONObject("projects")
        val today = todayKey()

        data class T(val id: String, val title: String, val due: String, val time: String, val project: String, val urgent: Boolean, val overdue: Boolean)
        val list = mutableListOf<T>()
        val keys = ts.keys()
        while (keys.hasNext()) {
            val id = keys.next()
            val t = ts.optJSONObject(id) ?: continue
            if (t.optBoolean("deleted") || t.optBoolean("done")) continue
            val due = t.str("due")
            val pid = t.str("projectId")
            val p = if (pid.isNotEmpty()) ps?.optJSONObject(pid) else null
            val project = if (p != null && !p.optBoolean("deleted")) p.str("name") else ""
            val overdue = due.isNotEmpty() && due < today
            list += T(id, t.str("title").ifBlank { "Untitled" }, due, t.str("time"), project, t.optBoolean("urgent") || overdue, overdue)
        }

        fun meta(t: T): String {
            val bits = mutableListOf<String>()
            if (t.project.isNotEmpty()) bits += t.project
            when {
                t.overdue -> bits += "Overdue"
                t.due == today && t.time.isNotEmpty() -> bits += t.time
                t.due.isNotEmpty() && t.due != today -> bits += t.due.substring(5).replace('-', '/')
            }
            return bits.joinToString(" · ")
        }

        val urgent = list.filter { it.urgent }
            .sortedWith(compareBy({ it.due.ifEmpty { "9999" } }, { it.time.ifEmpty { "99" } }))
            .map { Row(it.title, meta(it), Zero.ORANGE, Zero.BASE + "?t=" + it.id) }
        val todays = list.filter { !it.urgent && it.due == today }
            .sortedBy { it.time.ifEmpty { "99" } }
            .map { Row(it.title, meta(it), Zero.GRAY, Zero.BASE + "?t=" + it.id) }
        return urgent + todays
    }

    private fun openTasks(ctx: Context): Pair<JSONObject, JSONObject?>? {
        val f = cacheFile(ctx)
        if (!f.exists()) return null
        val root = try { JSONObject(f.readText()) } catch (e: Exception) { return null }
        return (root.optJSONObject("tasks") ?: JSONObject()) to root.optJSONObject("projects")
    }

    /** Tasks shown under a chosen date: today uses the urgent + today list; other days list what is due then. */
    fun tasksOn(ctx: Context, day: String): List<Row>? {
        if (day == todayKey()) return tasks(ctx)
        val (ts, ps) = openTasks(ctx) ?: return null
        val out = mutableListOf<Pair<String, Row>>()
        val keys = ts.keys()
        while (keys.hasNext()) {
            val id = keys.next()
            val t = ts.optJSONObject(id) ?: continue
            if (t.optBoolean("deleted") || t.str("due") != day) continue
            val pid = t.str("projectId")
            val p = if (pid.isNotEmpty()) ps?.optJSONObject(pid) else null
            val bits = mutableListOf<String>()
            if (p != null && !p.optBoolean("deleted")) bits += p.str("name")
            if (t.str("time").isNotEmpty()) bits += t.str("time")
            if (t.optBoolean("done")) bits += "Done"
            val color = when { t.optBoolean("done") -> 0xFF56606E.toInt(); t.optBoolean("urgent") -> Zero.ORANGE; else -> Zero.GRAY }
            out += t.str("time").ifEmpty { "99" } to Row(t.str("title").ifBlank { "Untitled" }, bits.joinToString(" · "), color, Zero.BASE + "?t=" + id)
        }
        return out.sortedBy { it.first }.map { it.second }
    }

    /** Dates that have an open task due. */
    fun taskDays(ctx: Context): Set<String> {
        val (ts, _) = openTasks(ctx) ?: return emptySet()
        val out = HashSet<String>()
        val keys = ts.keys()
        while (keys.hasNext()) {
            val t = ts.optJSONObject(keys.next()) ?: continue
            if (t.optBoolean("deleted") || t.optBoolean("done")) continue
            val d = t.str("due"); if (d.isNotEmpty()) out += d
        }
        return out
    }

    fun keyOf(c: Calendar): String = key(c)
}
