(function () {
  var DEFAUTS_PROPRIO = {
    proprietaire: "Mme Arlette Detry",
    proprioAdresse: "44, rue de la Station\n4880 Aubel",
    proprioTel: "+32495771387",
    proprioEmail: "arlettedetry@hotmail.com",
    logement: "8670 Koksijde  Résidence LAS PALMAS\n215 Zeedijk - digue de Mer\nAppartement n°7  3ème étage\nGarage n°6",
    iban: "BE87 7320 1153 7694",
    bic: "CREGBEBB"
  };
  var CHAMPS_CONTRAT = ["civilite", "nom", "adresse", "email", "tel", "debut", "heureDebut", "fin", "heureFin",
    "prix", "acompte", "delaiAcompte", "delaiSolde", "lieu", "dateDoc"];
  var CLE_PROPRIO = "coxyde.proprio";
  var CLE_HISTO = "coxyde.historique";

  var form = document.getElementById("form");
  var iframe = document.getElementById("preview");
  var message = document.getElementById("message");
  var jsPDF = window.jspdf.jsPDF;
  var urlApercu = null;

  function lire(cle, defaut) {
    try { var v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; } catch (e) { return defaut; }
  }
  function ecrire(cle, val) {
    try { localStorage.setItem(cle, JSON.stringify(val)); } catch (e) { /* navigateur privé */ }
  }
  function aujourdhui() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function donnees() {
    var d = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "radio") { if (el.checked) d[el.name] = el.value; return; }
      d[el.name] = el.value;
    });
    if (d.civilite === undefined) d.civilite = "";
    return d;
  }
  function remplir(d) {
    Object.keys(d).forEach(function (k) {
      var el = form.elements[k];
      if (el && d[k] !== undefined) el.value = d[k];
    });
  }

  function afficherMessage(texte, type) {
    message.textContent = texte;
    message.className = "message " + type;
    message.hidden = !texte;
  }

  // Valeurs initiales
  remplir(Object.assign({}, DEFAUTS_PROPRIO, lire(CLE_PROPRIO, {})));
  form.elements.dateDoc.value = aujourdhui();

  function infos(d) {
    var n = Contrat.nuits(d.debut, d.fin);
    var el = document.getElementById("nuits");
    el.className = "note strong";
    el.textContent = n === null ? "" : n > 0
      ? "Du " + Contrat.dateLongue(d.debut) + " au " + Contrat.dateLongue(d.fin) + " : " + n + " nuit" + (n > 1 ? "s" : "")
      : "Attention : le départ doit être après l'arrivée.";
    var solde = (+d.prix || 0) - (+d.acompte || 0);
    var s = document.getElementById("solde");
    s.className = "note strong";
    s.textContent = d.prix ? "Il restera " + Contrat.montant(solde) + " à payer après l'acompte." : "";
  }

  var timer;
  function rafraichir() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var d = donnees();
      infos(d);
      var proprio = {};
      Object.keys(DEFAUTS_PROPRIO).forEach(function (k) { proprio[k] = d[k]; });
      ecrire(CLE_PROPRIO, proprio);
      var blob = Contrat.generer(jsPDF, d).output("blob");
      if (urlApercu) URL.revokeObjectURL(urlApercu);
      urlApercu = URL.createObjectURL(blob);
      iframe.src = urlApercu + "#toolbar=0&navpanes=0&view=FitH";
    }, 350);
  }
  form.addEventListener("input", function (e) {
    if (e.target.classList) e.target.classList.remove("invalid");
    afficherMessage("", "");
    rafraichir();
  });
  form.addEventListener("change", rafraichir);

  function valider(d) {
    var manque = [];
    function verifier(nom, libelle) {
      if (!String(d[nom] || "").trim()) { manque.push(libelle); form.elements[nom].classList.add("invalid"); }
    }
    verifier("nom", "le nom");
    verifier("debut", "la date d'arrivée");
    verifier("fin", "la date de départ");
    verifier("prix", "le prix");
    if (manque.length) {
      afficherMessage("Il manque " + manque.join(", ") + ". Les cases en rouge sont à remplir.", "err");
      return false;
    }
    if (Contrat.nuits(d.debut, d.fin) <= 0) {
      form.elements.fin.classList.add("invalid");
      afficherMessage("La date de départ doit être après la date d'arrivée.", "err");
      return false;
    }
    return true;
  }

  // Contrats déjà faits (gardés dans ce navigateur)
  function historique() { return lire(CLE_HISTO, []); }
  function afficherHistorique() {
    var ul = document.getElementById("history");
    var h = historique();
    ul.innerHTML = "";
    if (!h.length) { ul.innerHTML = '<li class="note">Aucun pour l\'instant.</li>'; return; }
    h.forEach(function (c, i) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.textContent = c.nom + ", du " + Contrat.dateSimple(c.debut) + " au " + Contrat.dateSimple(c.fin);
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "Rouvrir";
      b.addEventListener("click", function () {
        remplir(historique()[i]);
        afficherMessage("", "");
        rafraichir();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      li.appendChild(span); li.appendChild(b); ul.appendChild(li);
    });
  }
  function memoriser(d) {
    var h = historique().filter(function (c) { return !(c.nom === d.nom && c.debut === d.debut && c.fin === d.fin); });
    var c = {};
    CHAMPS_CONTRAT.forEach(function (k) { c[k] = d[k]; });
    h.unshift(c);
    ecrire(CLE_HISTO, h.slice(0, 30));
    afficherHistorique();
  }

  document.getElementById("download").addEventListener("click", function () {
    var d = donnees();
    if (!valider(d)) return;
    var nom = Contrat.nomFichier(d);
    Contrat.generer(jsPDF, d).save(nom);
    memoriser(d);
    afficherMessage("C'est fait ! Le contrat « " + nom + " » est dans vos Téléchargements.", "ok");
  });

  document.getElementById("mail").addEventListener("click", function () {
    var d = donnees();
    if (!valider(d)) return;
    var sujet = "Convention de location Coxyde du " + Contrat.dateSimple(d.debut) + " au " + Contrat.dateSimple(d.fin);
    var corps =
      "Bonjour,\n\n" +
      "Veuillez trouver en pièce jointe la convention de location pour l'appartement de Coxyde " +
      "du " + Contrat.dateLongue(d.debut) + " au " + Contrat.dateLongue(d.fin) + ".\n\n" +
      "Pour confirmer la réservation, merci de verser un acompte de " + Contrat.montant(d.acompte) +
      " dans les " + d.delaiAcompte + " jours sur le compte " + d.iban + " (BIC " + d.bic + "), " +
      "en indiquant votre nom et la période réservée.\n\n" +
      "Je vous remercie de me renvoyer la convention signée.\n\n" +
      "Bien à vous,\n" + Contrat.nomSignature(d.proprietaire) + "\n" + d.proprioTel;
    document.getElementById("mailHint").hidden = false;
    window.location.href = "mailto:" + encodeURIComponent(d.email || "") +
      "?subject=" + encodeURIComponent(sujet) + "&body=" + encodeURIComponent(corps);
  });

  document.getElementById("clear").addEventListener("click", function () {
    if (!confirm("Effacer ce contrat et en commencer un nouveau ?")) return;
    ["nom", "adresse", "email", "tel", "debut", "fin", "prix"].forEach(function (k) {
      form.elements[k].value = "";
      form.elements[k].classList.remove("invalid");
    });
    form.elements.civilite.value = "Monsieur";
    form.elements.acompte.value = "250";
    form.elements.heureDebut.value = "17h00";
    form.elements.heureFin.value = "11h00";
    form.elements.dateDoc.value = aujourdhui();
    document.getElementById("mailHint").hidden = true;
    afficherMessage("", "");
    rafraichir();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("resetProprio").addEventListener("click", function () {
    remplir(DEFAUTS_PROPRIO);
    rafraichir();
  });

  document.getElementById("logout").addEventListener("click", function (e) {
    e.preventDefault();
    document.cookie = "coxyde_admin=; Path=/; Max-Age=0";
    location.href = "/connexion/";
  });

  afficherHistorique();
  rafraichir();
})();
