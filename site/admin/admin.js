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
  var CLE_PROPRIO = "coxyde.proprio";
  var CLE_HISTO = "coxyde.historique";

  var form = document.getElementById("form");
  var iframe = document.getElementById("preview");
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
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name) d[el.name] = el.value; });
    return d;
  }
  function remplir(d) {
    Object.keys(d).forEach(function (k) { if (form.elements[k]) form.elements[k].value = d[k]; });
  }

  // Valeurs initiales
  remplir(Object.assign({}, DEFAUTS_PROPRIO, lire(CLE_PROPRIO, {})));
  form.elements.dateDoc.value = aujourdhui();

  function infos(d) {
    var n = Contrat.nuits(d.debut, d.fin);
    document.getElementById("nuits").textContent =
      n === null ? "" : n > 0 ? n + " nuit" + (n > 1 ? "s" : "") : "Attention : le départ doit être après l'arrivée.";
    var solde = (+d.prix || 0) - (+d.acompte || 0);
    document.getElementById("solde").textContent = d.prix ? "Solde à payer : " + Contrat.montant(solde) : "";
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
  form.addEventListener("input", rafraichir);
  form.addEventListener("change", rafraichir);

  function valider(d) {
    var manque = [];
    if (!d.nom.trim()) manque.push("le nom du locataire");
    if (!d.debut) manque.push("la date d'arrivée");
    if (!d.fin) manque.push("la date de départ");
    if (!d.prix) manque.push("le prix");
    if (manque.length) { alert("Il manque " + manque.join(", ") + "."); return false; }
    if (Contrat.nuits(d.debut, d.fin) <= 0) { alert("La date de départ doit être après la date d'arrivée."); return false; }
    return true;
  }

  // Historique (dans ce navigateur)
  function historique() { return lire(CLE_HISTO, []); }
  function afficherHistorique() {
    var ul = document.getElementById("history");
    var h = historique();
    ul.innerHTML = "";
    if (!h.length) { ul.innerHTML = '<li class="hint">Aucun contrat pour l\'instant.</li>'; return; }
    h.forEach(function (c, i) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.textContent = c.nom + " · " + Contrat.dateSimple(c.debut) + " → " + Contrat.dateSimple(c.fin) + " · " + Contrat.montant(c.prix);
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "Rouvrir";
      b.addEventListener("click", function () { remplir(historique()[i]); rafraichir(); window.scrollTo(0, 0); });
      li.appendChild(span); li.appendChild(b); ul.appendChild(li);
    });
  }
  function memoriser(d) {
    var h = historique().filter(function (c) { return !(c.nom === d.nom && c.debut === d.debut && c.fin === d.fin); });
    var c = {};
    ["civilite", "nom", "adresse", "email", "tel", "debut", "heureDebut", "fin", "heureFin",
     "prix", "acompte", "delaiAcompte", "delaiSolde", "lieu", "dateDoc"].forEach(function (k) { c[k] = d[k]; });
    h.unshift(c);
    ecrire(CLE_HISTO, h.slice(0, 30));
    afficherHistorique();
  }

  document.getElementById("download").addEventListener("click", function () {
    var d = donnees();
    if (!valider(d)) return;
    Contrat.generer(jsPDF, d).save(Contrat.nomFichier(d));
    memoriser(d);
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
    ["nom", "adresse", "email", "tel", "debut", "fin", "prix"].forEach(function (k) { form.elements[k].value = ""; });
    form.elements.civilite.value = "Monsieur";
    form.elements.dateDoc.value = aujourdhui();
    rafraichir();
  });

  document.getElementById("resetProprio").addEventListener("click", function () {
    remplir(DEFAUTS_PROPRIO);
    rafraichir();
  });

  afficherHistorique();
  rafraichir();
})();
