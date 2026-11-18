// Viktorovy kostky (online dice). Plain JS, no build. Faces come from steny.js (generated from the print).
"use strict";

// ---------------------------------------------------------------- fair randomness

// Uniform integer in [0, n): crypto.getRandomValues with rejection sampling (no modulo bias).
function nahodne(n) {
  const limit = Math.floor(256 / n) * n;
  const buf = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

// One roll of a printed die: a face object of STENY[key] (each of the 6 faces equally likely).
function hodKostkou(key) {
  const faces = STENY[key].faces;
  const i = nahodne(faces.length);
  return { index: i, face: faces[i] };
}

// ---------------------------------------------------------------- what the page offers

const VOLBY = {
  boj: { nazev: "Boj", popis: "pivní + sportovní", kostky: ["pivni", "sportovni"], ikona: [["pivni", "6"], ["sportovni", "5"]] },
  suroviny: { nazev: "Suroviny", popis: "po vyhraném souboji", kostky: ["suroviny"], ikona: [["suroviny", "chmel + slad"]] },
  bus: { nazev: "Bus 332", popis: "na zastávce", kostky: ["bus"], ikona: [["bus", "jede"]] },
  drinkoteka: { nazev: "Drinkotéka", popis: "dnešní nabídka", kostky: ["drinkoteka"], ikona: [["drinkoteka", "pivo"]] },
  kocovina: { nazev: "Kocovina", popis: "rozlité pivo", kostky: ["kocovina"], ikona: [["kocovina", "−1 život"]] },
};

// Result texts per face label (labels come from make_kostky.dice()). [headline, what to do]
const TEXTY = {
  suroviny: {
    "nic": ["Nic", "Tentokrát žádná surovina."],
    "chmel": ["Chmel", "Polož chmel na desku. Vejdou se tam 2 chmele."],
    "slad": ["Slad", "Polož slad na desku. Vejdou se tam 2 slady."],
    "chmel + slad": ["Chmel i slad", "Vezmi si obojí: chmel i slad."],
    _pozn: "Co se na desku nevejde, propadá. Novou surovinu můžeš vyměnit za starou.",
  },
  bus: {
    "jede": ["Jede!", "Přejeď na kteroukoli jinou objevenou zastávku. Tah tam končí."],
    "zpoždění": ["Zpoždění", "Autobus nejel. Zkusit to můžeš v příštím tahu."],
    "přejel zastávku": ["Přejel jsi zastávku", "Soupeř po tvé levici vybere, na které jiné zastávce vystoupíš."],
  },
  drinkoteka: {
    "pivo": ["Pivo", "1 pivo za 3 libovolné suroviny."],
    "zavřeno": ["Zavřeno", "Dnes nic. Akce propadla."],
    "zbraň": ["Padelová raketa", "Zbraň +2 za 2 suroviny."],
    "kouzlo": ["Kapsle Taxík", "Za 1 surovinu. Přesuň se na kteroukoli objevenou Varnu, Drinkotéku nebo Bazén (použití akci nestojí)."],
    "chmel": ["Chmel", "Vyměň 1 svou surovinu za chmel."],
    "slad": ["Slad", "Vyměň 1 svou surovinu za slad."],
    _pozn: "Nabídku můžeš odmítnout, tah ale končí. Další hod až v příštím tahu.",
  },
  kocovina: {
    "−1 život": ["−1 život", "Ztrať 1 život a vezmi si žeton Kocoviny."],
    "voda (nic)": ["Voda", "Kocovině ses vyhnul. Nic se neděje."],
    "vynecháš tah": ["Vynecháš tah", "Příští tah vynecháš. Vezmi si žeton Kocoviny."],
    "ztratíš surovinu": ["Ztratíš surovinu", "Ztrať 1 surovinu. Vezmi si žeton Kocoviny."],
    "−1 v příštím boji": ["−1 v příštím souboji", "V příštím souboji si odečti 1. Vezmi si žeton Kocoviny."],
    _pozn: "S Kocovinou nemůžeš používat schopnosti hrdiny. Kdo už žeton má, nehází. Po hodu smíš pokračovat ve zbylých akcích.",
  },
};

// for node tests (tools/test_web_kostky.mjs)
if (typeof globalThis !== "undefined") Object.assign(globalThis, { nahodne, hodKostkou, VOLBY, TEXTY });

// ---------------------------------------------------------------- page

if (typeof document !== "undefined") (function () {
  const $ = (id) => document.getElementById(id);
  const klidne = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DOBA = klidne ? 250 : 1200; // ms, must match --doba in styl.css

  // print normal -> CSS cube side: [transform of the side, cube rotation (x, y) that brings it to the front]
  function strana(n) {
    const k = n.join(",");
    return {
      "0,0,1": ["rotateY(0deg)", 0, 0], "0,0,-1": ["rotateY(180deg)", 0, -180],
      "1,0,0": ["rotateY(90deg)", 0, -90], "-1,0,0": ["rotateY(-90deg)", 0, 90],
      "0,1,0": ["rotateX(90deg)", -90, 0], "0,-1,0": ["rotateX(-90deg)", 90, 0],
    }[k];
  }

  function stena(key, label, tag) {
    const f = STENY[key].faces.find((x) => x.label === label);
    const el = document.createElement(tag || "span");
    el.className = "plocha";
    el.style.background = STENY[key].body;
    el.innerHTML = f.svg;
    return el;
  }

  // ---- menu
  const tlacitka = $("tlacitka");
  for (const [id, v] of Object.entries(VOLBY)) {
    const a = document.createElement("a");
    a.href = "#" + id;
    a.className = "volba volba-" + id;
    const ik = document.createElement("span");
    ik.className = "ikona";
    for (const [k, lab] of v.ikona) ik.appendChild(stena(k, lab));
    a.appendChild(ik);
    const t = document.createElement("span");
    t.className = "text";
    t.innerHTML = `<strong>${v.nazev}</strong><small>${v.popis}</small>`;
    a.appendChild(t);
    a.addEventListener("click", () => { klikZMenu = true; });
    tlacitka.appendChild(a);
  }

  // ---- 3D cubes
  function novaKrychle(key) {
    const obal = document.createElement("div");
    obal.className = "kostka";
    const skok = document.createElement("div");
    skok.className = "skok";
    const k = document.createElement("div");
    k.className = "krychle";
    for (const f of STENY[key].faces) {
      const s = document.createElement("div");
      s.className = "strana";
      s.style.background = STENY[key].body;
      s.style.transform = strana(f.normal)[0] + " translateZ(var(--pul))";
      s.innerHTML = f.svg;
      k.appendChild(s);
    }
    skok.appendChild(k);
    obal.appendChild(skok);
    return { key, obal, skok, krychle: k, x: 0, y: 0, z: 0 };
  }

  // spin to the rolled face: whole extra turns + the rotation that puts the face to the front
  function zatoc(c, face) {
    const [, rx, ry] = strana(face.normal);
    const tocky = (v, base) => Math.ceil(v / 360) * 360 + 360 * (1 + Math.floor(Math.random() * 2)) + base;
    c.x = tocky(c.x, rx);
    c.y = tocky(c.y, ry);
    c.z = Math.round(c.z / 360) * 360 + 360 * Math.floor(Math.random() * 2) + (Math.random() * 12 - 6);
    c.krychle.style.transform = `rotateZ(${c.z}deg) rotateX(${c.x}deg) rotateY(${c.y}deg)`;
    c.skok.classList.remove("hazi");
    void c.skok.offsetWidth; // restart the hop animation
    c.skok.classList.add("hazi");
  }

  // ---- roll view
  let volba = null, krychle = [], vysledky = [], mod = 0, casovac = 0;
  // zMenu: this view was opened from the menu, so "Zpět" can simply go back in the history
  let zMenu = false, klikZMenu = false;

  function otevri(id) {
    volba = id;
    const v = VOLBY[id];
    $("nazev").textContent = v.nazev;
    const stul = $("stul");
    stul.replaceChildren();
    krychle = v.kostky.map(novaKrychle);
    for (const c of krychle) stul.appendChild(c.obal);
    stul.classList.toggle("dve", krychle.length > 1);
    $("modifikator").hidden = id !== "boj";
    hod();
  }

  function hod() {
    clearTimeout(casovac);
    vysledky = krychle.map((c) => hodKostkou(c.key));
    krychle.forEach((c, i) => zatoc(c, vysledky[i].face));
    const out = $("vysledek");
    out.classList.add("ceka");
    $("dalsi").replaceChildren();
    casovac = setTimeout(ukaz, DOBA);
    $("znovu").focus({ preventScroll: true });
  }

  function ukaz() {
    const out = $("vysledek");
    out.classList.remove("ceka");
    out.replaceChildren();
    const dalsi = $("dalsi");
    dalsi.replaceChildren();
    if (volba === "boj") {
      ukazBoj();
      return;
    }
    const key = krychle[0].key, lab = vysledky[0].face.label;
    const [titul, text] = TEXTY[key][lab];
    const radek = document.createElement("div");
    radek.className = "radek";
    radek.appendChild(stena(key, lab));
    const h = document.createElement("strong");
    h.className = "titul";
    h.textContent = titul;
    radek.appendChild(h);
    out.appendChild(radek);
    const p = document.createElement("p");
    p.className = "co";
    p.textContent = text;
    out.appendChild(p);
    if (TEXTY[key]._pozn) dalsi.textContent = TEXTY[key]._pozn;
  }

  function ukazBoj() {
    const out = $("vysledek");
    out.replaceChildren();
    const [a, b] = vysledky.map((r) => Number(r.face.label));
    const soucet = a + b + mod;
    const radek = document.createElement("div");
    radek.className = "radek boj";
    radek.appendChild(stena("pivni", String(a)));
    radek.appendChild(Object.assign(document.createElement("span"), { className: "op", textContent: "+" }));
    radek.appendChild(stena("sportovni", String(b)));
    if (mod) radek.appendChild(Object.assign(document.createElement("span"), {
      className: "op bonus", textContent: (mod > 0 ? "+ " : "− ") + Math.abs(mod) }));
    radek.appendChild(Object.assign(document.createElement("span"), { className: "op", textContent: "=" }));
    radek.appendChild(Object.assign(document.createElement("strong"), { className: "soucet", textContent: soucet }));
    out.appendChild(radek);
    const p = document.createElement("div");
    p.className = "co pravidla-boje";
    p.innerHTML =
      `<p><b>Víc</b> než síla potvory: výhra. Vezmi odměnu a <a href="#suroviny">hoď surovinami</a>.</p>` +
      `<p><b>Stejně</b>: remíza, vrať se, odkud jsi přišel. Život neztrácíš.</p>` +
      `<p><b>Míň</b>: prohra, ztrať 1 život a vrať se.</p>`;
    out.appendChild(p);
    $("dalsi").textContent = mod ? "" : "Bonusy zbraní a kapslí přidej tlačítky + a −.";
  }

  function nastavMod(d) {
    mod = Math.max(-9, Math.min(15, mod + d));
    $("mod").textContent = (mod >= 0 ? "+" : "−") + Math.abs(mod);
    if (volba === "boj" && !$("vysledek").classList.contains("ceka")) ukazBoj();
  }

  function domu() {
    if (zMenu) history.back(); else location.replace("#");
  }

  function trasa() {
    clearTimeout(casovac);
    const id = location.hash.slice(1);
    const vHodu = id in VOLBY;
    $("menu").hidden = vHodu;
    $("hod").hidden = !vHodu;
    $("zpet").hidden = !vHodu;
    zMenu = vHodu && klikZMenu;
    klikZMenu = false;
    if (vHodu) otevri(id);
    else volba = null;
    window.scrollTo(0, 0);
  }

  $("znovu").addEventListener("click", hod);
  $("navrat").addEventListener("click", domu);
  $("zpet").addEventListener("click", domu);
  $("plus").addEventListener("click", () => nastavMod(1));
  $("minus").addEventListener("click", () => nastavMod(-1));
  window.addEventListener("hashchange", trasa);
  trasa();

  // offline after the first visit (only on http(s); file:// has no service workers)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
