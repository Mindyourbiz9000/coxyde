(function () {
  document.getElementById("year").textContent = new Date().getFullYear();

  // Galerie
  var gallery = document.getElementById("gallery");
  var photos = window.PHOTOS || [];
  var loaded = [];

  photos.forEach(function (p) {
    var fig = document.createElement("figure");
    var img = new Image();
    img.loading = "lazy";
    img.alt = p.caption || "";
    img.src = p.src;
    img.onerror = function () { fig.classList.add("missing"); };
    img.onload = function () {
      loaded.push(p);
      fig.addEventListener("click", function () { open(p); });
    };
    fig.appendChild(img);
    gallery.appendChild(fig);
  });

  // Visionneuse
  var lb = document.getElementById("lightbox");
  var lbImg = lb.querySelector("img");
  var lbCap = lb.querySelector(".lb-caption");
  var current = 0;

  function list() { return photos.filter(function (p) { return loaded.indexOf(p) !== -1; }); }
  function show(i) {
    var l = list();
    if (!l.length) return;
    current = (i + l.length) % l.length;
    lbImg.src = l[current].src;
    lbImg.alt = l[current].caption || "";
    lbCap.textContent = l[current].caption || "";
  }
  function open(p) { show(list().indexOf(p)); lb.hidden = false; }
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
