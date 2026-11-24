(function () {
  "use strict";

  var root = document.documentElement;
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Review-only palette switcher */
  var switches = document.querySelectorAll("[data-set-theme]");
  function markTheme() {
    switches.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.setTheme === root.dataset.theme)); });
  }
  switches.forEach(function (b) {
    b.addEventListener("click", function () {
      root.dataset.theme = b.dataset.setTheme;
      try { localStorage.setItem("hrm-theme", b.dataset.setTheme); } catch (e) {}
      markTheme();
    });
  });
  markTheme();

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
  var routes = document.querySelector(".map .routes");
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
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out" });

  /* 1. Intro: the year closes up, a slit opens across the middle, then the photo opens to full frame */
  var lines$ = document.querySelectorAll(".hero-title .ln > span");
  if (root.classList.contains("intro")) {
    var media = document.querySelector(".hero-media");
    var img = media.querySelector("img");
    var halves = document.querySelectorAll(".hero-year span");
    var tl = gsap.timeline({ onComplete: finishIntro });
    tl.fromTo(halves[0], { x: -60, opacity: 0 }, { x: -2, opacity: 1, duration: 0.8, ease: "expo.out" }, 0.1)
      .fromTo(halves[1], { x: 60, opacity: 0 }, { x: 2, opacity: 1, duration: 0.8, ease: "expo.out" }, 0.1)
      .to(media, { clipPath: "inset(49.6% 0% 49.6% 0%)", duration: 0.7, ease: "expo.inOut" }, 0.75)
      .to(halves, { opacity: 0, duration: 0.3, ease: "power1.out" }, 1.25)
      .to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "expo.inOut" }, 1.35)
      .to(img, { scale: 1, duration: 1.8, ease: "expo.out" }, 1.35)
      .to(lines$, { y: 0, duration: 1.1, stagger: 0.09, ease: "expo.out" }, 1.85)
      .to([".site-header", ".hero-bar"], { opacity: 1, duration: 0.8, ease: "power2.out" }, 2.05);
  } else {
    gsap.from(lines$, { yPercent: 135, duration: 1, stagger: 0.08, ease: "expo.out", delay: 0.1 });
  }

  /* Hero photo drifts slower than the page */
  gsap.to(".hero-media img", {
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
  gsap.fromTo(".statement-subject img",
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
  mm.add("(min-width: 1081px)", function () {
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
  mm.add("(max-width: 1080px)", function () {
    townLis.forEach(function (li) { li.classList.add("on"); });
  });

  /* Section headings ease up as they arrive */
  gsap.utils.toArray(".h2").forEach(function (h) {
    gsap.from(h, { y: 36, opacity: 0, duration: 1, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
