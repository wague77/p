(function () {
  var BASE = "https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/";
  var state = {
    date: inputToday(),
    reunions: [],
    reunion: 0,
    course: 0,
    parts: [],
    selection: [],
    comment: "",
    loading: false,
    error: "",
    detailError: "",
    view: "programme"
  };

  function pad(n) {
    return String(n).length < 2 ? "0" + n : String(n);
  }

  function inputToday() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function stampFromInput(value) {
    var m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return stampFromInput(inputToday());
    return m[3] + m[2] + m[1];
  }

  function longDate(value) {
    var m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    try {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch (e) {
      return value;
    }
  }

  function heure(value) {
    if (value === undefined || value === null || value === "") return "—";
    if (typeof value === "string" && value.indexOf(":") > 0) return value.slice(0, 5);
    var n = Number(value);
    if (!isFinite(n)) return String(value);
    if (n > 1e11) {
      var d = new Date(n);
      if (isNaN(d.getTime())) return "—";
      return pad(d.getHours()) + ":" + pad(d.getMinutes());
    }
    if (n >= 10000 && n < 240000) {
      return pad(Math.floor(n / 10000)) + ":" + pad(Math.floor((n % 10000) / 100));
    }
    if (n >= 0 && n < 2400) return pad(Math.floor(n / 100)) + ":" + pad(Math.round(n % 100));
    return String(value);
  }

  function hippo(r) {
    var h = r && r.hippodrome ? r.hippodrome : {};
    return String(h.libelleCourt || h.libelleLong || "Hippodrome").toUpperCase();
  }

  function cote(value) {
    var n = Number(value);
    if (!isFinite(n) || n <= 0) return "—";
    return n.toFixed(1).replace(".", ",");
  }

  function cleanCode(code) {
    return String(code || "").replace(/^E_/i, "").replace(/_/g, " ").trim();
  }

  function horsesFor(code) {
    var key = String(code || "").toUpperCase().replace(/\s+/g, "_");
    if (!key) return 0;
    if (key.indexOf("SIMPLE_GAGNANT") >= 0 || key.indexOf("SIMPLE_PLACE") >= 0) return 1;
    if (key.indexOf("COUPLE") >= 0 || key.indexOf("COUPL") >= 0 || key.indexOf("DEUX_SUR") >= 0 || key.indexOf("2SUR4") >= 0) return 2;
    if (key.indexOf("TRIO") >= 0 || key.indexOf("TIERC") >= 0) return 3;
    if (key.indexOf("SUPER") >= 0 || key.indexOf("QUARTE") >= 0 || key.indexOf("MULTI") >= 0) return 4;
    if (key.indexOf("QUINTE") >= 0 || key.indexOf("PICK") >= 0) return 5;
    return 0;
  }

  function pariLabel(code) {
    var key = String(code || "").toUpperCase().replace(/\s+/g, "_");
    var map = {
      SIMPLE_GAGNANT: "Simple gagnant",
      SIMPLE_PLACE: "Simple placé",
      COUPLE_GAGNANT: "Couplé gagnant",
      COUPLE_PLACE: "Couplé placé",
      COUPLE_ORDRE: "Couplé ordre",
      DEUX_SUR_QUATRE: "2 sur 4",
      TRIO: "Trio",
      TIERCE: "Tiercé",
      SUPER_QUATRE: "Super 4",
      QUARTE_PLUS: "Quarté+",
      MULTI: "Multi",
      QUINTE_PLUS: "Quinté+",
      PICK5: "Pick 5"
    };
    return map[key] || String(code || "Jeu");
  }

  function jeux(course) {
    var paris = course && Array.isArray(course.paris) ? course.paris : [];
    var seen = {};
    var out = [];
    paris.forEach(function (p) {
      var raw = cleanCode(p && p.codePari);
      var count = horsesFor(raw);
      if (!raw || count <= 0) return;
      var label = pariLabel(raw);
      if (seen[label]) return;
      seen[label] = true;
      out.push({ label: label, count: count });
    });
    return out;
  }

  function discipline(course) {
    var d = String((course && course.discipline) || "").toUpperCase();
    if (d.indexOf("ATTELE") >= 0) return "Attelé";
    if (d.indexOf("MONTE") >= 0) return "Monté";
    if (d.indexOf("PLAT") >= 0) return "Plat";
    if (d.indexOf("OBSTACLE") >= 0 || d.indexOf("HAIES") >= 0) return "Obstacle";
    return (course && course.discipline) || "Course";
  }

  function nonPartant(p) {
    var s = String((p && p.statut) || "").toUpperCase();
    return s.indexOf("NON_PARTANT") >= 0 || s === "NP" || s.indexOf("NON PARTANT") >= 0;
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function button(label, active, onClick) {
    var b = el("button", "chip" + (active ? " on" : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  function currentReunion() {
    var list = state.reunions;
    for (var i = 0; i < list.length; i++) {
      if (Number(list[i].numOfficiel) === Number(state.reunion)) return list[i];
    }
    return list[0] || null;
  }

  function currentCourse(reunion) {
    var courses = reunion && Array.isArray(reunion.courses) ? reunion.courses : [];
    for (var i = 0; i < courses.length; i++) {
      if (Number(courses[i].numOrdre) === Number(state.course)) return courses[i];
    }
    return courses[0] || null;
  }

  function getJson(path) {
    var href = BASE + path;
    var requester = window.nova && typeof window.nova.fetch === "function" ? window.nova.fetch.bind(window.nova) : window.fetch.bind(window);
    return requester(href, { method: "GET", headers: { Accept: "application/json" } }).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) throw new Error("Le service PMU a répondu " + res.status + ".");
        if (!text) throw new Error("Réponse vide du service PMU.");
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error("Réponse PMU illisible.");
        }
      });
    }).catch(function (err) {
      var msg = err && err.message ? err.message : "Connexion au service PMU impossible.";
      if (/failed to fetch|network|cors/i.test(msg)) {
        throw new Error("Le programme PMU n'est pas joignable depuis ce lien. Ouvrez l'application dans l'atelier NOVA, ou réessayez.");
      }
      throw new Error(msg);
    });
  }

  function loadProgramme() {
    state.loading = true;
    state.error = "";
    render();
    return getJson(stampFromInput(state.date)).then(function (data) {
      var list = data && data.programme && Array.isArray(data.programme.reunions) ? data.programme.reunions : [];
      if (!list.length && data && Array.isArray(data.reunions)) list = data.reunions;
      list.sort(function (a, b) { return Number(a.numOfficiel || 0) - Number(b.numOfficiel || 0); });
      list.forEach(function (r) {
        if (Array.isArray(r.courses)) {
          r.courses.sort(function (a, b) { return Number(a.numOrdre || 0) - Number(b.numOrdre || 0); });
        } else {
          r.courses = [];
        }
      });
      state.reunions = list;
      if (!currentReunion() && list[0]) state.reunion = Number(list[0].numOfficiel) || 0;
      var reunion = currentReunion();
      if (reunion && !currentCourse(reunion) && reunion.courses[0]) state.course = Number(reunion.courses[0].numOrdre) || 0;
    }).catch(function (err) {
      state.reunions = [];
      state.error = err && err.message ? err.message : "Programme indisponible.";
    }).then(function () {
      state.loading = false;
      render();
      if (state.view === "partants") return loadDetail();
    });
  }

  function loadDetail() {
    var reunion = currentReunion();
    var course = currentCourse(reunion);
    if (!reunion || !course) {
      state.parts = [];
      state.selection = [];
      state.comment = "";
      render();
      return;
    }
    state.loading = true;
    state.detailError = "";
    render();
    var path = stampFromInput(state.date) + "/R" + reunion.numOfficiel + "/C" + course.numOrdre + "/";
    return Promise.all([
      getJson(path + "participants").catch(function (err) { throw err; }),
      getJson(path + "pronostics").catch(function () { return { selection: [] }; }),
      getJson(path + "pronostics-detailles").catch(function () { return { commentaire: { texte: "" } }; })
    ]).then(function (all) {
      var parts = Array.isArray(all[0]) ? all[0] : (all[0] && all[0].participants) || [];
      var sel = Array.isArray(all[1]) ? all[1] : (all[1] && all[1].selection) || [];
      var comment = "";
      if (all[2] && typeof all[2].commentaire === "string") comment = all[2].commentaire;
      else if (all[2] && all[2].commentaire) comment = all[2].commentaire.texte || "";
      state.parts = Array.isArray(parts) ? parts : [];
      state.selection = Array.isArray(sel) ? sel.slice().sort(function (a, b) { return Number(a.rang || 99) - Number(b.rang || 99); }) : [];
      state.comment = String(comment || "");
    }).catch(function (err) {
      state.parts = [];
      state.selection = [];
      state.comment = "";
      state.detailError = err && err.message ? err.message : "Partants indisponibles.";
    }).then(function () {
      state.loading = false;
      render();
    });
  }

  function openCourse(reunionNum, courseNum) {
    state.reunion = Number(reunionNum);
    state.course = Number(courseNum);
    state.view = "partants";
    render();
    loadDetail();
  }

  function render() {
    var root = document.getElementById("app");
    if (!root) return;
    root.innerHTML = "";
    root.appendChild(header());
    var main = el("main", "wrap");
    main.appendChild(warning());
    if (state.view === "aide") main.appendChild(aide());
    else if (state.loading && !state.reunions.length) main.appendChild(el("p", "card", "Chargement du programme PMU…"));
    else if (state.error) main.appendChild(errorBox(state.error));
    else if (state.view === "partants") main.appendChild(partantsView());
    else main.appendChild(programmeView());
    root.appendChild(main);
    root.appendChild(nav());
  }

  function header() {
    var head = el("header", "top");
    var brand = el("div", "brand");
    brand.appendChild(el("span", "logo", "P"));
    var titles = el("div");
    titles.appendChild(el("p", "kicker", "Turf · Programme officiel"));
    titles.appendChild(el("h1", "", "Partants PMU"));
    brand.appendChild(titles);
    head.appendChild(brand);
    var tools = el("div", "tools");
    var input = document.createElement("input");
    input.type = "date";
    input.value = state.date;
    input.addEventListener("change", function () {
      state.date = input.value || inputToday();
      state.reunion = 0;
      state.course = 0;
      loadProgramme();
    });
    var refresh = el("button", "gold", state.loading ? "…" : "Actualiser");
    refresh.type = "button";
    refresh.disabled = state.loading;
    refresh.addEventListener("click", function () { loadProgramme(); });
    tools.appendChild(input);
    tools.appendChild(refresh);
    head.appendChild(tools);
    head.appendChild(el("p", "when", longDate(state.date)));
    return head;
  }

  function warning() {
    return el("aside", "warn", "Jouer comporte des risques : endettement, dépendance… Appelez le 09 74 75 13 13 (appel non surtaxé).");
  }

  function errorBox(message) {
    var box = el("div", "card err");
    box.appendChild(el("p", "", message));
    var retry = el("button", "gold", "Réessayer");
    retry.type = "button";
    retry.addEventListener("click", function () { loadProgramme(); });
    box.appendChild(retry);
    return box;
  }

  function chips(items) {
    var row = el("div", "row");
    items.forEach(function (item) { row.appendChild(item); });
    return row;
  }

  function programmeView() {
    var box = el("section");
    if (!state.reunions.length) {
      box.appendChild(el("p", "card", "Aucune réunion n'est publiée pour cette date."));
      return box;
    }
    box.appendChild(el("h2", "", "Réunions du jour"));
    var reunion = currentReunion();
    box.appendChild(chips(state.reunions.map(function (r) {
      return button("R" + r.numOfficiel + " · " + hippo(r), reunion && r.numOfficiel === reunion.numOfficiel, function () {
        state.reunion = Number(r.numOfficiel);
        state.course = r.courses && r.courses[0] ? Number(r.courses[0].numOrdre) : 0;
        render();
      });
    })));
    if (!reunion) return box;
    var card = el("div", "card");
    card.appendChild(el("p", "kicker", "Réunion " + reunion.numOfficiel));
    card.appendChild(el("h3", "", hippo(reunion)));
    box.appendChild(card);
    var courses = reunion.courses || [];
    if (!courses.length) {
      box.appendChild(el("p", "card", "Cette réunion ne contient aucune course."));
      return box;
    }
    box.appendChild(chips(courses.map(function (c) {
      return button("C" + c.numOrdre + " · " + heure(c.heureDepart), false, function () {
        openCourse(reunion.numOfficiel, c.numOrdre);
      });
    })));
    courses.forEach(function (c) {
      var item = el("button", "course");
      item.type = "button";
      item.appendChild(el("span", "num", String(c.numOrdre || "")));
      var text = el("span", "grow");
      text.appendChild(el("strong", "", c.libelle || ("Course " + c.numOrdre)));
      text.appendChild(el("small", "", heure(c.heureDepart) + " · " + (c.distance ? c.distance + " m" : "Distance n.c.") + " · " + discipline(c) + " · " + (c.nombreDeclaresPartants || "?") + " partants"));
      item.appendChild(text);
      item.addEventListener("click", function () { openCourse(reunion.numOfficiel, c.numOrdre); });
      box.appendChild(item);
    });
    return box;
  }

  function partantsView() {
    var box = el("section");
    var reunion = currentReunion();
    if (!state.reunions.length) {
      box.appendChild(el("p", "card", "Aucune course pour cette date."));
      return box;
    }
    box.appendChild(chips(state.reunions.map(function (r) {
      return button("R" + r.numOfficiel + " · " + hippo(r), reunion && r.numOfficiel === reunion.numOfficiel, function () {
        state.reunion = Number(r.numOfficiel);
        state.course = r.courses && r.courses[0] ? Number(r.courses[0].numOrdre) : 0;
        loadDetail();
      });
    })));
    if (!reunion) return box;
    var courses = reunion.courses || [];
    var course = currentCourse(reunion);
    box.appendChild(chips(courses.map(function (c) {
      return button("C" + c.numOrdre + " · " + heure(c.heureDepart), course && c.numOrdre === course.numOrdre, function () {
        state.course = Number(c.numOrdre);
        loadDetail();
      });
    })));
    if (!course) {
      box.appendChild(el("p", "card", "Sélectionnez une course."));
      return box;
    }
    var fiche = el("div", "card goldline");
    fiche.appendChild(el("p", "kicker", "R" + reunion.numOfficiel + " · " + hippo(reunion) + " · C" + course.numOrdre));
    fiche.appendChild(el("h2", "", course.libelle || ("Course " + course.numOrdre)));
    fiche.appendChild(el("p", "", heure(course.heureDepart) + " · " + (course.distance ? course.distance + " m" : "—") + " · " + discipline(course) + " · " + (course.nombreDeclaresPartants || "—") + " partants"));
    box.appendChild(fiche);
    if (state.loading) box.appendChild(el("p", "card", "Chargement des partants et du pronostic…"));
    if (state.detailError) box.appendChild(errorBox(state.detailError));
    box.appendChild(pronostic(course));
    if (!state.loading && !state.parts.length && !state.detailError) {
      box.appendChild(el("p", "card", "Les partants de cette course ne sont pas encore publiés."));
    }
    state.parts.slice().sort(function (a, b) { return Number(a.numPmu || 99) - Number(b.numPmu || 99); }).forEach(function (p) {
      var row = el("article", "partant" + (nonPartant(p) ? " off" : ""));
      row.appendChild(el("span", "badge", String(p.numPmu || "–")));
      var body = el("div", "grow");
      var title = el("div", "between");
      title.appendChild(el("strong", "", (p.nom || "Cheval") + (nonPartant(p) ? " · Non-partant" : "")));
      title.appendChild(el("b", "cote", cote(p.dernierRapportDirect && p.dernierRapportDirect.rapport)));
      body.appendChild(title);
      body.appendChild(el("p", "", [p.age ? p.age + " ans" : "", p.sexe || ""].filter(Boolean).join(" · ") || "Âge n.c."));
      body.appendChild(el("p", "", "Jockey / driver · " + (p.driver || p.jockey || "—")));
      body.appendChild(el("p", "", "Entraîneur · " + (p.entraineur || "—")));
      body.appendChild(el("p", "music", "Musique " + (p.musique || "—")));
      row.appendChild(body);
      box.appendChild(row);
    });
    return box;
  }

  function pronostic(course) {
    var box = el("section", "card");
    box.appendChild(el("h3", "", "Pronostic PMU"));
    var byNum = {};
    state.parts.forEach(function (p) { byNum[Number(p.numPmu)] = p; });
    if (!state.selection.length) {
      box.appendChild(el("p", "", "Le pronostic détaillé n'est pas encore disponible pour cette course."));
    } else {
      state.selection.forEach(function (item, index) {
        var num = Number(item.num_partant || item.numPartant || 0);
        var horse = byNum[num];
        var line = el("div", "pick");
        line.appendChild(el("span", "badge sm", String(item.rang || index + 1)));
        line.appendChild(el("span", "", String(num || "–")));
        line.appendChild(el("strong", "grow", (horse && horse.nom) || item.nom || ("N°" + num)));
        line.appendChild(el("b", "cote", cote(item.cote_prob || item.coteProb || (horse && horse.dernierRapportDirect && horse.dernierRapportDirect.rapport))));
        box.appendChild(line);
      });
    }
    box.appendChild(el("p", "", state.comment || "Commentaire PMU non publié."));
    box.appendChild(el("h4", "", "Combinaisons proposées"));
    var list = jeux(course);
    if (!list.length) box.appendChild(el("p", "", "Aucun jeu chiffré n'est proposé sur cette course."));
    else if (!state.selection.length) box.appendChild(el("p", "", "Les combinaisons s'afficheront dès que la sélection PMU sera publiée."));
    else {
      list.forEach(function (jeu) {
        var nums = state.selection.slice(0, jeu.count).map(function (s) { return s.num_partant || s.numPartant; }).filter(Boolean);
        var line = el("div", "combo");
        line.appendChild(el("span", "", jeu.label + " · " + jeu.count + " cheval" + (jeu.count > 1 ? "x" : "")));
        line.appendChild(el("strong", "", nums.length ? nums.join(" - ") : "—"));
        box.appendChild(line);
      });
    }
    return box;
  }

  function aide() {
    var box = el("section", "card");
    box.appendChild(el("h2", "", "Comment lire Partants PMU"));
    box.appendChild(el("p", "", "Choisissez la date, une réunion puis une course. Le pronostic classe la sélection PMU. Les combinaisons prennent les premiers chevaux : 1 en simple, 2 en couplé ou 2 sur 4, 3 en trio ou tiercé, 4 en super 4, quarté+ ou multi, 5 en quinté+ ou pick 5."));
    box.appendChild(el("p", "", "Les non-partants sont grisés. Cette page ne prend aucun pari."));
    return box;
  }

  function nav() {
    var bar = el("nav", "nav");
    [["programme", "Programme"], ["partants", "Partants"], ["aide", "Aide"]].forEach(function (item) {
      var b = el("button", state.view === item[0] ? "on" : "", item[1]);
      b.type = "button";
      b.addEventListener("click", function () {
        state.view = item[0];
        render();
        if (item[0] === "partants" && !state.parts.length) loadDetail();
      });
      bar.appendChild(b);
    });
    return bar;
  }

  document.addEventListener("DOMContentLoaded", function () {
    render();
    loadProgramme();
  });
  if (document.readyState !== "loading") {
    render();
    loadProgramme();
  }
})();
