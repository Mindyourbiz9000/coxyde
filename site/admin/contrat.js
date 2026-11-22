// Génération de la convention de location en PDF (jsPDF).
// Fonctionne dans le navigateur (window.Contrat) et dans Node (module.exports) pour les tests.
(function (root) {
  var JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  var MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet",
              "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  // "2027-03-15" -> Date locale (sans décalage de fuseau)
  function parseDate(iso) {
    if (!iso) return null;
    var p = String(iso).split("-");
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d) ? null : d;
  }
  function dateLongue(iso) {   // Lundi 15 Mars 2027
    var d = parseDate(iso);
    return d ? JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear() : "…";
  }
  function dateSimple(iso) {   // 22 Novembre 2026
    var d = parseDate(iso);
    return d ? d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear() : "…";
  }
  function nuits(debut, fin) {
    var a = parseDate(debut), b = parseDate(fin);
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  }
  function montant(v) {
    if (v === "" || v === null || v === undefined || isNaN(+v)) return "…€";
    var n = +v;
    var s = (Math.round(n * 100) / 100).toString().replace(".", ",");
    return s + "€";
  }
  function lignes(txt) {
    return String(txt || "").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  }
  function sansAccents(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function nomFichier(d) {
    var a = parseDate(d.debut), b = parseDate(d.fin);
    var nom = sansAccents(d.nom || "locataire").trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
    var periode = "";
    if (a && b) {
      periode = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
        ? a.getDate() + "-" + b.getDate() + "_" + MOIS[a.getMonth()] + "_" + a.getFullYear()
        : a.getDate() + "_" + MOIS[a.getMonth()] + "-" + b.getDate() + "_" + MOIS[b.getMonth()] + "_" + b.getFullYear();
    }
    return sansAccents("Convention_" + nom + (periode ? "_" + periode : "")) + ".pdf";
  }
  function nomSignature(proprio) {
    return String(proprio || "").replace(/^(Mme|Mme\.|Madame|M\.|Mr|Mr\.|Monsieur)\s+/i, "");
  }

  function generer(jsPDF, d) {
    var doc = new jsPDF({ unit: "pt", format: "a4" });
    var X = 72, IND = 126, W = 596 - 2 * X, LH = 14.5;
    var y = 80;

    doc.setProperties({ title: "Convention de location", author: nomSignature(d.proprietaire) });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    function ligne(txt, x) { doc.text(txt, x === undefined ? X : x, y); y += LH; }
    function vide(n) { y += LH * (n || 1); }
    function paragraphe(txt) {
      doc.splitTextToSize(txt, W).forEach(function (l) { ligne(l); });
    }
    function lien(txt, x) {
      if (!txt) return;
      doc.setTextColor(17, 85, 204);
      doc.text(txt, x, y);
      var w = doc.getTextWidth(txt);
      doc.setDrawColor(17, 85, 204);
      doc.setLineWidth(0.6);
      doc.line(x, y + 1.5, x + w, y + 1.5);
      doc.link(x, y - 10, w, 13, { url: "mailto:" + txt });
      doc.setTextColor(0, 0, 0);
      y += LH;
    }

    doc.setFont("helvetica", "bold");
    ligne("CONVENTION DE LOCATION");
    doc.setFont("helvetica", "normal");
    vide();
    ligne("Entre les soussignés :");
    vide();

    ligne("D’une part, le propriétaire : " + (d.proprietaire || ""));
    lignes(d.proprioAdresse).forEach(function (l) { ligne(l, IND); });
    if (d.proprioTel) ligne(d.proprioTel, IND);
    lien(d.proprioEmail, IND);
    vide();

    ligne("Et d’autre part, le locataire dénommé :");
    ligne(((d.civilite ? d.civilite + " " : "") + (d.nom || "…")).trim(), IND);
    lignes(d.adresse).forEach(function (l) { ligne(l, IND); });
    if (d.email) ligne(d.email, IND);
    if (d.tel) ligne(d.tel, IND);
    vide(2);

    ligne("Le propriétaire déclare louer au second un appartement meublé situé à");
    lignes(d.logement).forEach(function (l) { ligne(l, IND); });
    vide();

    ligne("La période de location prend cours le " + dateLongue(d.debut) + " à " + (d.heureDebut || "12h00"));
    ligne("pour se terminer le " + dateLongue(d.fin) + " à " + (d.heureFin || "12h00"), 160);
    ligne("Le prix de location pour cette période, charges comprises, s’élève à " + montant(d.prix));
    vide();

    paragraphe("Pour garantir la réservation, le locataire verse au maximum " + (d.delaiAcompte || 7) +
      " jours à dater de ce mail, la somme de " + montant(d.acompte) + ".");
    vide();

    var solde = (+d.prix || 0) - (+d.acompte || 0);
    var texteSolde = d.prix !== "" && d.prix !== undefined && solde > 0 ? "Le solde de " + montant(solde) : "Le solde";
    paragraphe(texteSolde + " sera versé au plus tard " + (d.delaiSolde || 15) +
      " jours avant la date de début de séjour sur le compte " + (d.iban || "…") +
      (d.bic ? "  BIC/" + d.bic : "") + " en indiquant en référence le nom et la période réservée.");
    vide();

    ligne("Fait à " + (d.lieu || "…") + ", le " + dateSimple(d.dateDoc));
    var yS = y;
    doc.text("Pour accord", 108, yS);
    doc.text("Pour accord", 288, yS);
    doc.text("Le locataire", 108, yS + LH);
    doc.text("Le propriétaire", 288, yS + LH);
    doc.text(nomSignature(d.proprietaire), 288, yS + 2 * LH);

    return doc;
  }

  var api = {
    generer: generer, nomFichier: nomFichier, dateLongue: dateLongue,
    dateSimple: dateSimple, nuits: nuits, montant: montant, nomSignature: nomSignature
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Contrat = api;
})(this);
