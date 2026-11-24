(function () {
  "use strict";

  var root = document.documentElement;
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Theme: follows the phone or computer setting until the visitor picks one */
  var toggle = document.querySelector("[data-theme-toggle]");
  var sysDark = window.matchMedia("(prefers-color-scheme: dark)");
  function labelToggle() {
    if (toggle) toggle.setAttribute("aria-label", root.dataset.theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
  function setTheme(t) { root.dataset.theme = t; labelToggle(); }
  labelToggle();
  sysDark.addEventListener("change", function (ev) {
    var saved = null; try { saved = localStorage.getItem("hrm-theme"); } catch (e) {}
    if (!saved) setTheme(ev.matches ? "dark" : "light");
  });
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("hrm-theme", next); } catch (e) {}
      if (!document.startViewTransition || calm) { setTheme(next); return; }
      var r = toggle.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.startViewTransition(function () { setTheme(next); }).ready.then(function () {
        root.animate({ clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + end + "px at " + x + "px " + y + "px)"] },
          { duration: 750, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" });
      });
    });
  }

  /* Viewer-only note for the preview. Remove before launch. */
  var note = document.querySelector("[data-vnote]");
  var noteTab = document.querySelector("[data-vnote-open]");
  var lastFocus = null;
  function openNote() {
    if (!note) return;
    lastFocus = document.activeElement;
    note.hidden = false; noteTab.hidden = true;
    note.querySelector(".x").focus();
    if (window.gsap && !calm) gsap.fromTo(note.querySelector(".vnote-card"), { y: 40, opacity: 0, rotate: -1.5 }, { y: 0, opacity: 1, rotate: 0, duration: 0.8, ease: "expo.out" });
  }
  function closeNote() {
    note.hidden = true; noteTab.hidden = false;
    try { localStorage.setItem("hrm-note", "1"); } catch (e) {}
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (note) {
    note.querySelectorAll("[data-vnote-close]").forEach(function (b) { b.addEventListener("click", closeNote); });
    note.addEventListener("click", function (ev) { if (ev.target === note) closeNote(); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !note.hidden) closeNote(); });
    noteTab.addEventListener("click", openNote);
  }
  function maybeShowNote(delay) {
    if (!note) return;
    var seen = null; try { seen = localStorage.getItem("hrm-note"); } catch (e) {}
    if (seen) { noteTab.hidden = false; return; }
    setTimeout(openNote, delay);
  }

  /* Live slab calculator: cubic yards = L(ft) x W(ft) x T(in)/12 / 27 */
  var calc = document.querySelector("[data-calc]");
  if (calc) {
    var out = calc.querySelector("[data-out]");
    var inputs = calc.querySelectorAll("input");
    var shown = 0;
    var update = function () {
      var v = Array.prototype.map.call(inputs, function (i) { return Math.max(0, parseFloat(i.value) || 0); });
      var yards = (v[0] * v[1] * (v[2] / 12)) / 27;
      if (window.gsap && !calm) {
        var o = { n: shown };
        gsap.to(o, { n: yards, duration: 0.5, ease: "power3.out", overwrite: true, onUpdate: function () { out.textContent = o.n.toFixed(2); } });
      } else {
        out.textContent = yards.toFixed(2);
      }
      shown = yards;
    };
    inputs.forEach(function (i) { i.addEventListener("input", update); });
    update();
  }

  /* Full calculator: three shapes, mixed units, result in cubic yards */
  var full = document.querySelector("[data-fullcalc]");
  if (full) {
    var toYd = { ft: 1 / 3, in: 1 / 36, yd: 1, m: 1 / 0.9144, cm: 1 / 91.44 };
    var tabs = full.querySelectorAll('[role="tab"]');
    var panels = full.querySelectorAll('[role="tabpanel"]');
    var totalOut = full.querySelector("[data-total]");
    var qLink = full.querySelector("[data-quote-link]");
    var current = 0;
    var dims = function (panel) {
      return Array.prototype.map.call(panel.querySelectorAll(".dim"), function (d) {
        var v = Math.max(0, parseFloat(d.querySelector("[data-v]").value) || 0);
        return v * toYd[d.querySelector("[data-u]").value];
      });
    };
    var compute = function () {
      var panel = panels[0];
      panels.forEach(function (p) { if (!p.hidden) panel = p; });
      var d = dims(panel), q = Math.max(0, parseFloat(panel.querySelector("[data-q]").value) || 0), v = 0;
      if (panel.dataset.shape === "slab") v = d[0] * d[1] * d[2];
      if (panel.dataset.shape === "round") v = Math.PI * Math.pow(d[0] / 2, 2) * d[1];
      if (panel.dataset.shape === "tube") v = Math.max(0, Math.PI * (Math.pow(d[0] / 2, 2) - Math.pow(d[1] / 2, 2)) * d[2]);
      var yards = v * q;
      if (window.gsap && !calm) {
        var o = { n: current };
        gsap.to(o, { n: yards, duration: 0.5, ease: "power3.out", overwrite: true, onUpdate: function () { totalOut.textContent = o.n.toFixed(2); } });
      } else totalOut.textContent = yards.toFixed(2);
      current = yards;
      qLink.href = "quote-credit.html?yards=" + yards.toFixed(2) + "#quote";
    };
    var select = function (i, focus) {
      tabs.forEach(function (t, k) {
        t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1;
        panels[k].hidden = k !== i;
      });
      if (focus) tabs[i].focus();
      compute();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i); });
      t.addEventListener("keydown", function (ev) {
        if (ev.key === "ArrowRight") select((i + 1) % tabs.length, true);
        if (ev.key === "ArrowLeft") select((i - 1 + tabs.length) % tabs.length, true);
      });
    });
    full.addEventListener("input", compute);
    full.addEventListener("change", compute);
    compute();
  }

  /* Quote form: carry yards over from the calculator */
  var yardsField = document.getElementById("yards");
  if (yardsField) {
    var y = new URLSearchParams(location.search).get("yards");
    if (y && !isNaN(parseFloat(y))) yardsField.value = y;
  }

  /* Preview forms: validate, then show the thank-you state (nothing is sent in the preview) */
  document.querySelectorAll("[data-demo-form]").forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      form.classList.add("sent");
      var done = form.querySelector(".done");
      done.setAttribute("tabindex", "-1"); done.focus();
      if (window.gsap && !calm) gsap.fromTo(done, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out" });
    });
    var again = form.querySelector("[data-reset]");
    if (again) again.addEventListener("click", function () { form.reset(); form.classList.remove("sent"); form.querySelector("input, select, textarea").focus(); });
  });

  /* Town list, built from the map so the two never disagree */
  var townList = document.querySelector(".towns");
  var townGs = Array.prototype.slice.call(document.querySelectorAll(".map .town"));
  townGs.sort(function (a, b) { return a.dataset.i - b.dataset.i; });
  if (townList) {
    townGs.forEach(function (g) {
      var li = document.createElement("li");
      li.textContent = g.querySelector("text").textContent;
      townList.appendChild(li);
    });
  }
  var townLis = townList ? townList.querySelectorAll("li") : [];

  /* Route lines from the nearest location to each town */
  var routes = document.querySelector(".map .routes") || document.createElementNS("http://www.w3.org/2000/svg", "g");
  var yards = Array.prototype.map.call(document.querySelectorAll(".map .yard"), function (y) {
    return { x: +y.dataset.x, y: +y.dataset.y };
  });
  var lines = townGs.map(function (g) {
    var c = g.querySelector("circle");
    var tx = +c.getAttribute("cx"), ty = +c.getAttribute("cy");
    var best = yards[0], bd = Infinity;
    yards.forEach(function (y) { var d = Math.hypot(y.x - tx, y.y - ty); if (d < bd) { bd = d; best = y; } });
    var l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", best.x); l.setAttribute("y1", best.y);
    l.setAttribute("x2", tx); l.setAttribute("y2", ty);
    l.setAttribute("class", "route");
    l.setAttribute("pathLength", "1");
    routes.appendChild(l);
    return l;
  });

  function finishIntro() {
    root.classList.remove("intro");
    try { sessionStorage.setItem("hrm-intro", "1"); } catch (e) {}
  }

  if (!window.gsap || calm) {
    finishIntro();
    townLis.forEach(function (li) { li.classList.add("on"); });
    maybeShowNote(1200);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out" });

  /* 1. Intro: the logo alone, then it flies into the header while the page builds in */
  var lines$ = document.querySelectorAll(".hero-title .ln > span");
  var navBits = document.querySelectorAll(".site-header .nav a, .site-header .hdr-tools > *");
  var barBits = document.querySelectorAll(".hero-bar > *");
  var brand = document.querySelector(".site-header .brand");
  if (root.classList.contains("intro")) {
    var screen = document.querySelector(".intro-screen");
    var logo = screen.querySelector(".intro-logo");
    var heroImg = document.querySelector(".hero-media img");
    gsap.set(lines$, { yPercent: 135, opacity: 1 });
    gsap.set([navBits, barBits, brand], { opacity: 0 });
    gsap.set(logo, { transformOrigin: "0 0" });
    var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(logo.querySelector("svg"), { scale: 0.4, rotate: -60, opacity: 0, duration: 1.1, transformOrigin: "50% 50%" }, 0.15)
      .from(logo.querySelectorAll(".brand-word b, .brand-word small"), { y: 30, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.3)
      .add(function () {
        var s = logo.getBoundingClientRect(), t = brand.getBoundingClientRect();
        var k = t.width / s.width;
        gsap.to(logo, { x: t.left - s.left, y: t.top - s.top, scale: k, duration: 1.15, ease: "expo.inOut" });
      }, 1.35)
      .to(screen.querySelector(".intro-bg"), { clipPath: "inset(0% 0% 100% 0%)", duration: 1.15, ease: "expo.inOut" }, 1.45)
      .to(heroImg, { scale: 1, duration: 2, ease: "expo.out" }, 1.5)
      .add(function () {
        gsap.set(brand, { opacity: 1 });
        finishIntro();
      }, 2.55)
      .to(navBits, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, startAt: { y: -14 } }, 2.3)
      .to(lines$, { yPercent: 0, duration: 1.1, stagger: 0.09 }, 2.05)
      .to(barBits, { opacity: 1, y: 0, duration: 0.9, stagger: 0.07, startAt: { y: 18 } }, 2.45)
      .add(function () { maybeShowNote(700); }, 3.2);
  } else {
    gsap.from(lines$, { yPercent: 135, duration: 1, stagger: 0.08, ease: "expo.out", delay: 0.1 });
    gsap.from(barBits, { opacity: 0, y: 18, duration: 0.8, stagger: 0.06, delay: 0.35 });
    maybeShowNote(1400);
  }

  /* Inner page header: title rises, photo settles */
  if (document.querySelector(".page-hero")) {
    gsap.from(".page-title .ln > span", { yPercent: 120, duration: 1.1, stagger: 0.09, ease: "expo.out", delay: 0.05 });
    gsap.from(".page-lede", { opacity: 0, y: 16, duration: 0.9, delay: 0.35 });
    gsap.fromTo(".page-hero picture img", { scale: 1.12 }, { scale: 1, duration: 1.8, ease: "expo.out" });
    gsap.to(".page-hero picture img", { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".page-hero", start: "top top", end: "bottom top", scrub: true } });
    maybeShowNote(1600);
  }

  /* Hero photo drifts slower than the page */
  if (document.querySelector(".hero-media")) gsap.to(".hero-media img", {
    yPercent: 8, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });

  /* 2. Statement: words rise, the drum turns with scroll */
  var split = document.querySelector("[data-split]");
  if (split) {
    gsap.from(split, {
      opacity: 0, y: 40, duration: 1.1,
      scrollTrigger: { trigger: split, start: "top 85%", once: true }
    });
  }
  if (document.querySelector(".statement-subject")) gsap.fromTo(".statement-subject img",
    { rotate: -14, yPercent: 10, scale: 0.92 },
    { rotate: 6, yPercent: -8, scale: 1, ease: "none",
      scrollTrigger: { trigger: ".statement", start: "top bottom", end: "bottom top", scrub: 0.6 } });

  /* 3. Image reveals: clip from the bottom edge up */
  gsap.utils.toArray(".reveal-img").forEach(function (fig) {
    var im = fig.querySelector("img");
    gsap.fromTo(fig, { clipPath: "inset(100% 0% 0% 0%)" }, {
      clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.inOut",
      scrollTrigger: { trigger: fig, start: "top 88%", once: true }
    });
    if (im) gsap.fromTo(im, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: "expo.out", scrollTrigger: { trigger: fig, start: "top 88%", once: true } });
  });

  /* 4. Delivery area: pin, draw routes, count towns */
  var mm = gsap.matchMedia();
  if (document.querySelector("[data-area]")) mm.add("(min-width: 1081px)", function () {
    var count = document.querySelector("[data-count]");
    var state = { n: 0 };
    gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(".map .town", { opacity: 0.12 });
    var atl = gsap.timeline({
      scrollTrigger: { trigger: "[data-area]", start: "top top", end: "+=150%", pin: true, scrub: 0.5 },
      defaults: { ease: "none" }
    });
    atl.to(state, {
      n: townGs.length, duration: 1, onUpdate: function () {
        var n = Math.round(state.n);
        count.textContent = n;
        townLis.forEach(function (li, i) { li.classList.toggle("on", i < n); });
      }
    }, 0);
    townGs.forEach(function (g, i) {
      var at = (i / townGs.length) * 0.92;
      atl.to(lines[i], { strokeDashoffset: 0, duration: 0.12 }, at);
      atl.to(g, { opacity: 1, duration: 0.06 }, at + 0.06);
    });
    return function () { townLis.forEach(function (li) { li.classList.remove("on"); }); count.textContent = "18"; };
  });
  if (document.querySelector("[data-area]")) mm.add("(max-width: 1080px)", function () {
    townLis.forEach(function (li) { li.classList.add("on"); });
  });

  /* Town ticker: steady drift that speeds up and reverses with scroll */
  var track = document.querySelector(".ticker-track");
  if (track) {
    var loop = gsap.to(track, { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
    var dir = 1;
    ScrollTrigger.create({
      trigger: ".ticker", start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        dir = self.direction;
        var v = Math.min(Math.abs(self.getVelocity()) / 300, 6);
        gsap.to(loop, { timeScale: dir * (1 + v), duration: 0.3, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.3, ease: "power2.out" });
      }
    });
  }

  /* Section headings ease up as they arrive */
  gsap.utils.toArray(".h2").forEach(function (h) {
    gsap.from(h, { y: 36, opacity: 0, duration: 1, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
