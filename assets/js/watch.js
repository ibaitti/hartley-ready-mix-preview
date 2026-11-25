/* Visit alerts for the preview. Sends a short push to a private ntfy topic.
   Sends only: page name, device type, time zone and where the visit came from.
   Never sends anything typed into a form. Remove this file and its script tags before launch. */
(function () {
  "use strict";

  var TOPIC = "hartley-371a0c8ad91c788d6071";
  var ENDPOINT = "https://ntfy.sh/";
  var MAX_PER_SESSION = 20;

  var ls, ss;
  try { ls = window.localStorage; ss = window.sessionStorage; } catch (e) { return; }

  /* Only Ayoub sees this: a short on-screen confirmation */
  function toast(text) {
    var show = function () {
      var t = document.createElement("div");
      t.textContent = text; t.setAttribute("role", "status");
      t.style.cssText = "position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:999;max-width:calc(100% - 32px);padding:12px 16px;border-radius:8px;background:#111;color:#fff;font:600 15px/1.35 system-ui,sans-serif;text-align:center";
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 5000);
    };
    if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
  }

  /* Mark your own devices: open any page once with ?me. Use ?me=0 to undo.
     ?ping sends one test alert, even from a muted device. */
  var ping = false;
  try {
    var q = new URLSearchParams(location.search);
    if (q.has("me") || q.has("ping")) {
      if (q.has("me")) {
        if (q.get("me") === "0") { ls.removeItem("hrm-me"); toast("Alerts are back on for this device."); }
        else { ls.setItem("hrm-me", "1"); toast("This device is muted. Your own visits will not send alerts."); }
      }
      ping = q.has("ping");
      q.delete("me"); q.delete("ping");
      var rest = q.toString();
      history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    }
  } catch (e) {}
  if (ping) {
    try {
      fetch("https://ntfy.sh/", { method: "POST", keepalive: true, headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ topic: "hartley-371a0c8ad91c788d6071", title: "Test alert from your device", message: "Alerts are working. Howard's visits will show up like this.", priority: 4, tags: ["white_check_mark"] }) })
        .then(function (r) { toast(r.ok ? "Test alert sent. Check the ntfy app." : "Test alert failed (" + r.status + ")."); })
        .catch(function () { toast("Test alert could not be sent. Check the connection."); });
    } catch (e) {}
  }
  if (ls.getItem("hrm-me")) return;

  /* Ignore bots, link previews, test runners and local development */
  var ua = navigator.userAgent || "";
  if (navigator.webdriver || document.prerendering) return;
  if (/bot|crawl|spider|preview|headless|lighthouse|slurp|facebookexternalhit/i.test(ua)) return;
  var host = location.hostname;
  var local = host === "localhost" || host === "127.0.0.1" || host === "";
  if (local && !ls.getItem("hrm-watch-test")) return;

  var NAMES = {
    "": "Home", "index.html": "Home", "mixes-delivery.html": "Mixes & Delivery", "calculator.html": "Calculator",
    "quote-credit.html": "Quote & Credit", "careers-contact.html": "Careers & Contact"
  };
  var page = /^Still curing/.test(document.title) ? "404 page" : (NAMES[location.pathname.split("/").pop()] || "Other page");

  var os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "other";
  var device = (/Mobi|Android|iPhone|iPod/.test(ua) ? "Phone" : /iPad|Tablet/.test(ua) ? "Tablet" : "Computer") + " (" + os + ")";
  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  var ref = "direct";
  try { if (document.referrer) { var r = new URL(document.referrer).hostname; if (r && r !== host) ref = r; } } catch (e) {}

  function context() { return "Device: " + device + "\nTime zone: " + (tz || "unknown") + "\nCame from: " + ref; }
  function once(key) { key = "hrm-w-" + key; if (ss.getItem(key)) return false; ss.setItem(key, "1"); return true; }

  function send(title, message, priority, tag) {
    var n = +(ss.getItem("hrm-w-n") || 0);
    if (n >= MAX_PER_SESSION) return;
    ss.setItem("hrm-w-n", n + 1);
    var body = JSON.stringify({
      topic: TOPIC, title: (local ? "[TEST] " : "") + title, message: message,
      priority: priority || 3, tags: [tag || "eyes"]
    });
    try { fetch(ENDPOINT, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(function () {}); } catch (e) {}
  }

  /* Opened, came back, or moved to another page */
  var visits = +(ls.getItem("hrm-w-visits") || 0);
  if (!ss.getItem("hrm-w-s")) {
    ss.setItem("hrm-w-s", "1");
    visits += 1; ls.setItem("hrm-w-visits", String(visits));
    send(visits === 1 ? "Someone opened the Hartley preview" : "Back again, visit " + visits,
      "Landed on: " + page + "\n" + context(), 4, "eyes");
    once("pv-" + page);
  } else if (once("pv-" + page)) {
    send("Viewed " + page, context(), 2, "page_facing_up");
  }

  /* Reading depth, once per page */
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      if (max <= 0) return;
      var p = (scrollY / max) * 100;
      if (p >= 50 && once("sc50-" + page)) send("Halfway down " + page, "Still scrolling.", 2, "arrow_down");
      if (p >= 92 && once("sc90-" + page)) send("Reached the bottom of " + page, "He read to the end.", 3, "arrow_down");
    });
  }, { passive: true });

  /* Time on the site, counted only while the tab is visible */
  var secs = +(ss.getItem("hrm-w-t") || 0);
  setInterval(function () {
    if (document.visibilityState !== "visible") return;
    secs += 1;
    if (secs % 5 === 0) ss.setItem("hrm-w-t", String(secs));
    if (secs >= 30 && once("t30")) send("30 seconds on the site", "Page: " + page, 2, "hourglass");
    if (secs >= 120 && once("t120")) send("2 minutes on the site", "Page: " + page, 3, "hourglass");
    if (secs >= 300 && once("t300")) send("5 minutes on the site", "He is really looking.", 4, "fire");
  }, 1000);
  window.addEventListener("pagehide", function () { ss.setItem("hrm-w-t", String(secs)); });

  /* Intent: calls, payments, PDFs */
  var PHONES = { "+13367883928": "Winston-Salem 336-788-3928", "+13362945995": "Greensboro 336-294-5995", "+13367883522": "Business office 336-788-3522" };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("tel:") === 0) {
      var num = decodeURIComponent(href.slice(4));
      if (once("tel" + num)) send("Tapped to call", (PHONES[num] || num) + "\nOn: " + page, 5, "telephone_receiver");
    } else if (href.indexOf("quickclick.com") > -1) {
      if (once("pay")) send("Opened the pay-invoice page", "On: " + page, 3, "credit_card");
    } else if (/\.pdf/i.test(href)) {
      if (once("pdf" + href)) send("Opened a PDF", (/Employment/i.test(href) ? "Employment application" : "Credit application") + "\nOn: " + page, 4, "page_facing_up");
    }
  });

  /* Intent: calculator and forms. Field values are never sent. */
  document.addEventListener("input", function (e) {
    if (e.target.closest && e.target.closest("[data-calc], [data-fullcalc]") && once("calc")) send("Used the calculator", "On: " + page, 3, "abacus");
  });
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f.matches || !f.matches("[data-demo-form]")) return;
    var label = f.getAttribute("aria-label");
    if (!label && f.getAttribute("aria-labelledby")) { var h = document.getElementById(f.getAttribute("aria-labelledby")); label = h && h.textContent; }
    send("Filled in a form: " + (label || "form"), "On: " + page + "\nThis is the preview, so nothing was sent to Hartley.", 5, "white_check_mark");
  }, true);

  /* The note: how long it stayed open */
  var note = document.querySelector("[data-vnote]");
  if (note) {
    var openedAt = note.hidden ? 0 : Date.now();
    new MutationObserver(function () {
      if (!note.hidden) { openedAt = Date.now(); return; }
      if (!openedAt) return;
      var s = Math.round((Date.now() - openedAt) / 1000); openedAt = 0;
      send("Closed your note after " + s + " seconds", s < 8 ? "That was quick, he probably skipped it." : "He took the time to read it.", s < 8 ? 2 : 4, "memo");
    }).observe(note, { attributes: true, attributeFilter: ["hidden"] });
  }
})();
