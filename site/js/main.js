(function () {
  document.getElementById("year").textContent = new Date().getFullYear();

  // Menu mobile
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { links.classList.remove("open"); toggle.setAttribute("aria-expanded", false); }
  });

  // Barre de navigation : fond blanc après le haut de page
  var nav = document.getElementById("nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 40 || links.classList.contains("open")); }
  window.addEventListener("scroll", onScroll, { passive: true });
  toggle.addEventListener("click", onScroll);
  onScroll();

  // Apparition des blocs au défilement
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  }

  // Galerie
  var gallery = document.getElementById("gallery");
  var photos = window.PHOTOS || [];
  var loaded = [];

  photos.forEach(function (p) {
    var fig = document.createElement("figure");
    fig.setAttribute("data-caption", p.caption || "");
    var img = new Image();
    img.loading = "lazy";
    img.alt = p.caption || "";
    img.src = p.src;
    img.onerror = function () {
      fig.classList.add("missing");
      fig.textContent = "Photo à venir : " + (p.caption || p.src);
    };
    img.onload = function () {
      loaded.push(p);
      fig.addEventListener("click", function () { openLightbox(p); });
    };
    fig.appendChild(img);
    gallery.appendChild(fig);
  });

  // Visionneuse
  var lb = document.getElementById("lightbox");
  var lbImg = lb.querySelector("img");
  var lbCap = lb.querySelector(".lb-caption");
  var current = 0;

  function ordered() {
    return photos.filter(function (p) { return loaded.indexOf(p) !== -1; });
  }
  function show(i) {
    var list = ordered();
    if (!list.length) return;
    current = (i + list.length) % list.length;
    lbImg.src = list[current].src;
    lbImg.alt = list[current].caption || "";
    lbCap.textContent = list[current].caption || "";
  }
  function openLightbox(p) {
    show(ordered().indexOf(p));
    lb.hidden = false;
  }
  function close() { lb.hidden = true; }

  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", function () { show(current - 1); });
  lb.querySelector(".lb-next").addEventListener("click", function () { show(current + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
})();
