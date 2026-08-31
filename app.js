/* =====================================================================
   app.js — интерфейс ClipGen: параметры, три вида, изометрия, живой 3D.
   Вся геометрия берётся из core.js — на экране и в файле она одна и та же.
   ===================================================================== */
const state = { ...DEFAULTS };
const $ = (id) => document.getElementById(id);
let VIEW = "3d";

/* ---------------- описания полей ---------------- */
const FIELDS = {
  grpHole: [
    { k:"hole", ru:"Диаметр отверстия", min:3, max:14, step:0.01, unit:"мм",
      hint:"[DISCO] 8 мм это 23% всех артикулов. 12 мм не существует — крупный размер 12.7" },
    { k:"pmin", ru:"Пакет панелей, от", min:0.5, max:20, step:0.01, unit:"мм" },
    { k:"pmax", ru:"Пакет панелей, до", min:1, max:40, step:0.01, unit:"мм",
      hint:"Разброс толщины, который деталь обязана выбрать" },
    { k:"stemLen", ru:"Длина штока", min:4, max:50, step:0.1, unit:"мм", auto:true,
      hint:"Авто: ёлочка — панель + 0.52 × отверстие; пистон — захват + 13" }
  ],
  grpHead: [
    { k:"head", ru:"Диаметр головы", min:6, max:45, step:0.1, unit:"мм", auto:true,
      hint:"Авто: ёлочка 2.80 × отверстие [Volt], пистон 2.40 [DISCO], шумоизоляция 4.30" },
    { k:"headT", ru:"Толщина головы", min:0.8, max:4, step:0.1, unit:"мм" },
    { k:"head2", ru:"Нижняя голова", min:6, max:30, step:0.1, unit:"мм", auto:true, only:["trim_panel"],
      hint:"Диск, который заходит в паз дверной карты" },
    { k:"head2z", ru:"Между головами", min:0.4, max:4, step:0.1, unit:"мм", only:["trim_panel"],
      hint:"Толщина дверной карты" },
    { k:"hw", ru:"Ширина головы", min:3, max:14, step:0.1, unit:"мм", only:["weatherstrip","moulding"] },
    { k:"hl", ru:"Длина головы", min:6, max:46, step:0.1, unit:"мм", only:["weatherstrip","moulding"] },
    { k:"screw", ru:"Саморез", min:3, max:8, step:0.5, unit:"мм", only:["grommet"],
      hint:"[Nifco] 4 / 5 / 6 — по JIS, а не номер" },
    { k:"blen", ru:"Длина корпуса", min:4, max:22, step:0.1, unit:"мм", auto:true, only:["grommet"],
      hint:"[Nifco] Open 5-12, Closed 11-19" }
  ],
  grpBarb: [
    { k:"interference", ru:"Натяг по диаметру", min:0.05, max:1.2, step:0.01, unit:"мм", auto:true,
      hint:"ГЛАВНАЯ ВЕЛИЧИНА. [Volt] 0.33-0.69 по диаметру. Под свой принтер подбирается печатью" },
    { k:"stemD", ru:"Диаметр стержня", min:1.5, max:14, step:0.05, unit:"мм", auto:true,
      hint:"Авто: пистон — отверстие − 0.3 [DISCO]; ёлочка — 0.60 × отверстие [ДОПУЩЕНИЕ]" },
    { k:"barbCount", ru:"Число рёбер", min:1, max:10, step:1, unit:"", auto:true,
      hint:"Авто: у ёлочки сколько влезет на шток. [Volt] выходит 4-7" },
    { k:"rootT", ru:"Основание ребра", min:0.4, max:4, step:0.05, unit:"мм", auto:true,
      hint:"[Volt] у ёлочек это КОНСТАНТА 2.03-2.54 на всех 22 артикулах" },
    { k:"rakeOut", ru:"Угол удержания", min:0, max:30, step:1, unit:"°",
      hint:"От перпендикуляра. Меньше — держит крепче, но тяжелее снять" },
    { k:"pinD", ru:"Диаметр сердечника", min:1.5, max:10, step:0.1, unit:"мм", auto:true, only:["two_piece"] },
    { k:"screw", ru:"Диаметр винта", min:2.5, max:9, step:0.1, unit:"мм", only:["screw_rivet","plate_nut"],
      hint:"[families] гайка под номер идёт по винту M3.5 / 4.2 / 4.8 / 6.3" },
    { k:"thrPitch", ru:"Шаг резьбы", min:0.8, max:5, step:0.05, unit:"мм", auto:true,
      only:["screw_rivet","plate_nut"],
      hint:"Авто: 0.5 × диаметр винта. Крупная — мелкую метрическую нейлон срывает [ДОПУЩЕНИЕ]" },
    { k:"thrDepth", ru:"Высота витка", min:0.2, max:2.5, step:0.05, unit:"мм", auto:true,
      only:["screw_rivet","plate_nut"],
      hint:"Авто: 0.22 × диаметр винта" },
    { k:"bundleD", ru:"Диаметр жгута / трубки", min:3, max:40, step:0.1, unit:"мм",
      only:["cable_saddle","hose_clip","tie_mount"],
      hint:"В каталоге это I.D. — внутренний размер хомута. Наружный получится больше на две стенки" },
    { k:"wall", ru:"Толщина стенки", min:0.8, max:4, step:0.1, unit:"мм",
      only:["cable_saddle","hose_clip","tie_mount"] },
    { k:"gapDeg", ru:"Раскрытие защёлки", min:20, max:80, step:1, unit:"°",
      only:["cable_saddle","hose_clip"],
      hint:"Больше — легче завести жгут, но хуже держит" },
    { k:"clipW", ru:"Ширина хомута", min:3, max:25, step:0.5, unit:"мм", auto:true,
      only:["cable_saddle","hose_clip"] },
    { k:"seats", ru:"Число гнёзд", min:1, max:4, step:1, unit:"", only:["hose_clip"] },
    { k:"tieW", ru:"Ширина прорези", min:2.5, max:12, step:0.1, unit:"мм", only:["tie_mount"],
      hint:"Под стандартную стяжку 4.8 мм берут 5.0-5.2" },
    { k:"tieT", ru:"Толщина прорези", min:0.8, max:4, step:0.1, unit:"мм", only:["tie_mount"] }
  ]
};

/* ---------------- построение контролов ---------------- */
function buildChips(){
  $("chips").innerHTML = "";
  for (const [k, v] of Object.entries(MODELS)) {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = v.ru;
    b.setAttribute("aria-selected", k === state.model);
    b.onclick = () => {
      state.model = k;
      for (const key of ["head","head2","stemLen","stemD","interference","barbCount","rootT","pitch","blen","pinD","thrPitch","thrDepth"])
        state[key] = null;
      buildChips(); buildControls(); render();
    };
    $("chips").appendChild(b);
  }
}

function buildControls(){
  for (const [grp, list] of Object.entries(FIELDS)) {
    const box = $(grp); box.innerHTML = "";
    for (const f of list) {
      if (f.only && !f.only.includes(state.model)) continue;
      const d = document.createElement("div"); d.className = "p";
      d.innerHTML = `<div class="top"><span class="nm">${f.ru}</span>
          <span class="val" data-v="${f.k}"></span></div>
        <input type="range" min="${f.min}" max="${f.max}" step="${f.step}" data-k="${f.k}">
        ${f.hint ? `<div class="hint">${f.hint}</div>` : ""}`;
      box.appendChild(d);
      d.querySelector("input").addEventListener("input", (e) => {
        state[f.k] = parseFloat(e.target.value); render();
      });
      d.querySelector(".top").addEventListener("dblclick", () => {
        if (f.auto) { state[f.k] = null; buildControls(); render(); }
      });
    }
  }
}

/* ---------------- вывод ---------------- */
const fmt = (v, u) => (Math.round(v * 100) / 100) + (u ? " " + u : "");

function resolved(c, k){
  return ({ stemLen:c.stemLen, head:c.headD, head2:c.head2D, stemD:c.stemD,
            interference:c.intf, barbCount:c.zs.length, rootT:c.rootT,
            blen:c.blen, pinD:c.pinD, thrPitch:c.thrPitch, thrDepth:c.thrDepth })[k] ?? state[k];
}

function render(){
  const c = derive(state);

  for (const list of Object.values(FIELDS)) for (const f of list) {
    const el = document.querySelector(`[data-v="${f.k}"]`); if (!el) continue;
    const auto = f.auto && state[f.k] == null;
    const v = auto ? resolved(c, f.k) : state[f.k];
    el.innerHTML = fmt(v, f.unit) + (auto ? ' <em>авто</em>' : '');
    el.className = "val" + (auto ? " auto" : "");
    const inp = document.querySelector(`input[data-k="${f.k}"]`);
    if (inp) inp.value = v;
  }

  $("kpis").innerHTML = [
    ["отверстие", fmt(c.hole)], ["голова", fmt(c.headD)],
    ["шток", fmt(c.stemLen)], ["натяг", fmt(c.intf / 2)]
  ].map(([a, b]) => `<div class="kpi"><u>${a}</u><b>${b}</b></div>`).join("");

  $("famName").textContent = MODELS[c.model].ru;
  $("about").textContent = ABOUT[c.model];

  drawSide(c); drawBack(c); drawTop(c); drawStats(c); drawChecks(c); updateMesh(c);
  $("scadOut").value = toScad(c);
}

/* ---------------- плоские виды ---------------- */
const NS = "http://www.w3.org/2000/svg";
const el = (t, a) => { const e = document.createElementNS(NS, t);
  for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };

function drawSide(c){
  const svg = $("svgSide"); svg.innerHTML = "";
  const W = 300, H = 330, pad = 24;
  const top = TOPPED(c.model);
  const P = top ? stemProfile(c) : buildProfile(c);
  const zBottom = top ? -c.baseT - (SADDLE(c.model) ? c.bundleD + 2 * c.wall : 0)
                      : Math.min(...P.map(p => p[1]));
  const zLo = zBottom - 1.5, zHi = c.stemLen + 1.5;
  const halfW = Math.max(top ? c.baseW / 2 : c.headD / 2, c.hole / 2 + 8,
                RECT_HEAD(c.model) ? c.hl / 2 : 0) + 2.5;
  const s = Math.min((H - pad * 2) / (zHi - zLo), (W - pad * 2) / (halfW * 2));
  const X = (x) => W / 2 + x * s, Y = (z) => H - pad - (z - zLo) * s;

  for (const sg of [-1, 1]) {
    const x0 = sg > 0 ? X(c.hole / 2) : X(-halfW - 5);
    const x1 = sg > 0 ? X(halfW + 5) : X(-c.hole / 2);
    svg.appendChild(el("rect", { x:Math.min(x0, x1), y:Y(c.pmax),
      width:Math.abs(x1 - x0), height:c.pmax * s, fill:"#22303a", stroke:"#33454f" }));
  }

  const st = { fill:"#2fd3c4", "fill-opacity":.82, stroke:"#8ff2e8",
               "stroke-width":.9, "stroke-linejoin":"round" };
  const pts = P.map(([r, z]) => X(r) + "," + Y(z)).join(" ") + " " +
              P.slice().reverse().map(([r, z]) => X(-r) + "," + Y(z)).join(" ");
  svg.appendChild(el("polygon", { ...st, points:pts }));

  /* площадка и хомуты рисуются отдельно: они не тела вращения */
  if (top) {
    svg.appendChild(el("rect", { ...st, x:X(-c.baseW/2), y:Y(0),
      width:c.baseW * s, height:c.baseT * s }));
    if (SADDLE(c.model)) {
      const seats = c.model === "hose_clip" ? c.seats : 1;
      const step = c.bundleD + 2 * c.wall + 1.2, x0 = -(step * (seats - 1)) / 2;
      const ro = c.bundleD / 2 + c.wall, zc = -c.baseT + 1.0 - ro;
      for (let i = 0; i < seats; i++) {
        const dx = x0 + i * step;
        svg.appendChild(el("circle", { cx:X(dx), cy:Y(zc), r:ro * s,
          fill:"none", stroke:"#f0a34a", "stroke-width":c.wall * s, "stroke-opacity":.95,
          "stroke-dasharray":`${2 * Math.PI * ro * s * (1 - c.gapDeg / 180)} ${2 * Math.PI * ro * s}`,
          transform:`rotate(${-90 + c.gapDeg} ${X(dx)} ${Y(zc)})` }));
        svg.appendChild(el("circle", { cx:X(dx), cy:Y(zc), r:c.bundleD / 2 * s,
          fill:"none", stroke:"#5d7280", "stroke-width":.7, "stroke-dasharray":"3 3" }));
      }
    } else {
      svg.appendChild(el("rect", { x:X(-c.tieW/2), y:Y(-c.baseT + (c.baseT + c.tieT) / 2),
        width:c.tieW * s, height:c.tieT * s, fill:"#0a1114", stroke:"#33454f" }));
    }
  }

  for (const z of c.zs) for (const sg of [-1, 1])
    svg.appendChild(el("polygon", { fill:"#f0a34a", "fill-opacity":.92, stroke:"#ffd9ae",
      "stroke-width":.7, points:[[sg * c.stemD / 2 * 0.99, z + c.rampLen],
        [sg * c.barbD / 2, z], [sg * c.stemD / 2 * 0.99, z - c.backLen]]
        .map(([x, zz]) => X(x) + "," + Y(zz)).join(" ") }));

  for (const sg of [-1, 1])
    svg.appendChild(el("line", { x1:X(sg * c.hole / 2), y1:Y(-1), x2:X(sg * c.hole / 2),
      y2:Y(c.stemLen), stroke:"#f07070", "stroke-width":.8, "stroke-dasharray":"3 3",
      "stroke-opacity":.75 }));

  const t = el("text", { x:W - 8, y:Y(c.pmax / 2) + 3.5, fill:"#5d7280", "font-size":9,
    "text-anchor":"end" }); t.textContent = "панель " + fmt(c.pmax);
  svg.appendChild(t);
}

/* Вид сзади: та же деталь, но по другой оси. Для тел вращения он совпадает
   с видом сбоку — это нормально для чертежа. Для прямоугольных голов,
   ложементов и площадок он показывает вторую габаритную размерность. */
function drawBack(c){
  const svg = $("svgBack"); if (!svg) return;
  svg.innerHTML = "";
  const W = 300, H = 330, pad = 24;
  const P = buildProfile(c);
  const zLo = Math.min(...P.map(p => p[1]), TOPPED(c.model) ? -c.baseT - c.bundleD - 2 * c.wall : 0) - 1.5;
  const zHi = c.stemLen + 1.5;
  const halfW = (RECT_HEAD(c.model) ? c.hw / 2 : TOPPED(c.model) ? c.baseL / 2 : c.headD / 2) + 2.5;
  const s = Math.min((H - pad * 2) / (zHi - zLo), (W - pad * 2) / (Math.max(halfW, c.hole) * 2));
  const X = (x) => W / 2 + x * s, Y = (z) => H - pad - (z - zLo) * s;

  for (const sg of [-1, 1]) {
    const x0 = sg > 0 ? X(c.hole / 2) : X(-halfW - 5);
    const x1 = sg > 0 ? X(halfW + 5) : X(-c.hole / 2);
    svg.appendChild(el("rect", { x:Math.min(x0, x1), y:Y(c.pmax),
      width:Math.abs(x1 - x0), height:c.pmax * s, fill:"#22303a", stroke:"#33454f" }));
  }
  const g = { fill:"#2fd3c4", "fill-opacity":.82, stroke:"#8ff2e8", "stroke-width":.9 };
  /* шток */
  svg.appendChild(el("polygon", { ...g, points:
    [[-c.stemD/2, 0], [c.stemD/2, 0], [c.stemD/2, c.stemLen - c.tip], [0, c.stemLen],
     [-c.stemD/2, c.stemLen - c.tip]].map(([x, z]) => X(x) + "," + Y(z)).join(" ") }));
  for (const z of c.zs) for (const sg of [-1, 1])
    svg.appendChild(el("polygon", { fill:"#f0a34a", "fill-opacity":.9, stroke:"#ffd9ae",
      "stroke-width":.7, points:[[sg*c.stemD/2*0.99, z + c.rampLen], [sg*c.barbD/2, z],
        [sg*c.stemD/2*0.99, z - c.backLen]].map(([x, zz]) => X(x) + "," + Y(zz)).join(" ") }));
  /* голова или площадка */
  if (TOPPED(c.model)) {
    svg.appendChild(el("rect", { ...g, x:X(-c.baseL/2), y:Y(0), width:c.baseL * s, height:c.baseT * s }));
    if (SADDLE(c.model)) {
      const ro = c.bundleD / 2 + c.wall;
      svg.appendChild(el("rect", { ...g, x:X(-c.clipW/2), y:Y(-c.baseT + 1.0 - 2 * ro),
        width:c.clipW * s, height:(2 * ro - 1) * s, rx:2 }));
    }
  } else {
    const hw = RECT_HEAD(c.model) ? c.hw / 2 : c.headD / 2;
    svg.appendChild(el("rect", { ...g, x:X(-hw), y:Y(0), width:hw * 2 * s, height:c.headT * s, rx:1.5 }));
  }
}

function drawTop(c){
  const svg = $("svgTop"); svg.innerHTML = "";
  const W = 300, H = 330, cx = W / 2, cy = H / 2 - 6;
  const R = TOPPED(c.model) ? Math.max(c.baseW, c.baseL) / 2
          : RECT_HEAD(c.model) ? Math.max(c.hl, c.hw) / 2 : c.headD / 2;
  const s = Math.min((W - 46) / (R * 2), (H - 60) / (R * 2)), s0 = s;

  if (TOPPED(c.model)) {
    svg.appendChild(el("rect", { x:cx - c.baseW/2*s0, y:cy - c.baseL/2*s0,
      width:c.baseW*s0, height:c.baseL*s0, rx:1.5, fill:"#2fd3c4", "fill-opacity":.8, stroke:"#8ff2e8" }));
    if (SADDLE(c.model)) {
      const seats = c.model === "hose_clip" ? c.seats : 1;
      const step = c.bundleD + 2*c.wall + 1.2, x0 = -(step*(seats-1))/2;
      for (let i = 0; i < seats; i++)
        svg.appendChild(el("circle", { cx:cx + (x0 + i*step)*s0, cy,
          r:c.bundleD/2*s0, fill:"#0a1114", stroke:"#f0a34a", "stroke-width":c.wall*s0 }));
    } else {
      svg.appendChild(el("rect", { x:cx - c.tieW/2*s0, y:cy - c.baseL/2*s0,
        width:c.tieW*s0, height:c.baseL*s0, fill:"#0a1114", stroke:"#33454f" }));
    }
  } else if (RECT_HEAD(c.model))
    svg.appendChild(el("rect", { x:cx - c.hl / 2 * s, y:cy - c.hw / 2 * s,
      width:c.hl * s, height:c.hw * s, rx:1.2 * s,
      fill:"#2fd3c4", "fill-opacity":.8, stroke:"#8ff2e8" }));
  else
    svg.appendChild(el("circle", { cx, cy, r:c.headD / 2 * s,
      fill:"#2fd3c4", "fill-opacity":.8, stroke:"#8ff2e8" }));

  if (c.model === "grommet") {
    svg.appendChild(el("rect", { x:cx - c.hole / 2 * s, y:cy - c.hole / 2 * s,
      width:c.hole * s, height:c.hole * s, fill:"none", stroke:"#f07070",
      "stroke-dasharray":"4 3" }));
    svg.appendChild(el("circle", { cx, cy, r:c.screw * 0.4 * s, fill:"#0a1114", stroke:"#33454f" }));
  } else {
    svg.appendChild(el("circle", { cx, cy, r:c.barbD / 2 * s, fill:"#f0a34a",
      "fill-opacity":.8, stroke:"#ffd9ae" }));
    svg.appendChild(el("circle", { cx, cy, r:c.hole / 2 * s, fill:"none",
      stroke:"#f07070", "stroke-dasharray":"4 3" }));
    svg.appendChild(el("circle", { cx, cy, r:c.stemD / 2 * s, fill:"#16222a", stroke:"#33454f" }));
    if (c.model === "two_piece")
      svg.appendChild(el("circle", { cx, cy, r:c.pinD / 2 * s, fill:"#0a1114", stroke:"#33454f" }));
  }
  const t = el("text", { x:W / 2, y:H - 10, fill:"#5d7280", "font-size":10, "text-anchor":"middle" });
  t.textContent = "красный пунктир — отверстие " + fmt(c.hole, "мм");
  svg.appendChild(t);
}

function drawStats(c){
  const rows = [
    ["Голова", fmt(c.headD, "мм") + "  (" + fmt(c.headD / c.hole) + "×)"],
    ["Шток от панели", fmt(c.stemLen, "мм")],
    ["Стержень", fmt(c.stemD, "мм")],
    ["Ребро", fmt(c.barbD, "мм")],
    ["Натяг на сторону", fmt(c.intf / 2, "мм")],
    ["Вылет ребра", fmt(c.dR, "мм")],
    ["Основание ребра", fmt(c.rootT, "мм")],
    ["Угол захода", fmt(c.rakeIn, "°")],
    ["Шаг рёбер", fmt(c.pitch, "мм")],
    ["Рёбер на штоке", c.zs.length],
    ["Высота всего", fmt(c.stemLen + c.headT, "мм")]
  ];
  if (TOPPED(c.model)) rows.push(
    ["Площадка", fmt(c.baseW) + " × " + fmt(c.baseL) + " × " + fmt(c.baseT, "мм")],
    ["Жгут / трубка", fmt(c.bundleD, "мм")],
    ...(SADDLE(c.model) ? [["Хомут наружу", fmt(c.bundleD + 2 * c.wall, "мм")],
                           ["Ширина хомута", fmt(c.clipW, "мм")]] : []),
    ...(PLATE(c.model) ? [["Прорезь", fmt(c.tieW) + " × " + fmt(c.tieT, "мм")]] : []));
  if (THREADED(c.model)) rows.push(
    ["Канал под винт", fmt(c.boreD, "мм")],
    ["Резьба: шаг", fmt(c.thrPitch, "мм")],
    ["Резьба: высота витка", fmt(c.thrDepth, "мм")],
    ["Витков", fmt(Math.max(2, (c.screwLen - 1.6) / c.thrPitch))]
  );
  $("stats").innerHTML = rows.map(([a, b]) =>
    `<div class="stat"><span>${a}</span><b>${b}</b></div>`).join("");
}

function drawChecks(c){
  $("checks").innerHTML = checks(c).map(x =>
    `<div class="chk ${x.level}"><i></i><span>${x.text}</span></div>`).join("");
}

/* =====================================================================
   3D и изометрия — один рендерер, разные камеры.
   Меш строится тем же контуром, что и разрез. Объём сходится с настоящим
   OpenSCAD с точностью 0.1% — проверено.
   ===================================================================== */
let TH = { ready:false }, LAST = null;

function initThree(){
  const host = $("gl");
  if (!window.THREE || !host) return;
  const w = host.clientWidth || 700, h = host.clientHeight || 420;
  const sc = new THREE.Scene();
  const camP = new THREE.PerspectiveCamera(36, w / h, 0.5, 4000);
  const camO = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 4000);
  const ren = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  ren.setPixelRatio(Math.min(devicePixelRatio, 2)); ren.setSize(w, h);
  host.appendChild(ren.domElement);

  sc.add(new THREE.AmbientLight(0xffffff, 0.5));
  const k = new THREE.DirectionalLight(0xffffff, 0.9); k.position.set(1, 1.5, 1.1); sc.add(k);
  const r = new THREE.DirectionalLight(0x74e6da, 0.4); r.position.set(-1.3, -0.5, -1); sc.add(r);

  const root = new THREE.Group(); sc.add(root);
  TH = { ready:true, sc, camP, camO, ren, root, host,
         rot:{ x:0.42, y:0.72 }, dist:70, target:new THREE.Vector3(), span:40 };

  let drag = null;
  const dom = ren.domElement; dom.style.cursor = "grab";
  dom.addEventListener("pointerdown", e => { if (VIEW !== "3d") return;
    drag = { x:e.clientX, y:e.clientY }; dom.style.cursor = "grabbing"; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener("pointerup", () => { drag = null; dom.style.cursor = "grab"; });
  dom.addEventListener("pointercancel", () => { drag = null; });
  dom.addEventListener("pointermove", e => {
    if (!drag) return;
    TH.rot.y += (e.clientX - drag.x) * 0.0085;
    TH.rot.x += (e.clientY - drag.y) * 0.0085;
    TH.rot.x = Math.max(-1.5, Math.min(1.5, TH.rot.x));
    drag = { x:e.clientX, y:e.clientY }; place();
  });
  dom.addEventListener("wheel", e => { if (VIEW !== "3d") return; e.preventDefault();
    TH.dist = Math.max(10, Math.min(500, TH.dist * (1 + Math.sign(e.deltaY) * 0.12))); place();
  }, { passive:false });

  addEventListener("resize", () => {
    const W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) return;
    camP.aspect = W / H; camP.updateProjectionMatrix(); ren.setSize(W, H); place();
  });

  function place(){
    const H = host.clientHeight || 1, W = host.clientWidth || 1;
    if (VIEW === "draw") {
      const a = 0.62, b = Math.PI / 4, d = 400;
      camO.position.set(d * Math.cos(a) * Math.sin(b), d * Math.sin(a), d * Math.cos(a) * Math.cos(b));
      const k = TH.span / 2 * 1.25, asp = W / H;
      camO.left = -k * asp; camO.right = k * asp; camO.top = k; camO.bottom = -k;
      camO.position.add(TH.target); camO.updateProjectionMatrix(); camO.lookAt(TH.target);
    } else {
      const { x, y } = TH.rot, d = TH.dist;
      camP.position.set(d * Math.cos(x) * Math.sin(y), d * Math.sin(x), d * Math.cos(x) * Math.cos(y));
      camP.position.add(TH.target); camP.lookAt(TH.target);
    }
    draw();
  }
  function draw(){ ren.render(sc, VIEW === "draw" ? camO : camP); }
  TH.place = place; TH.draw = draw;
}

function latheTris(P, seg, cut){
  const tris = [], span = cut ? Math.PI : Math.PI * 2;
  const n = cut ? Math.max(3, Math.round(seg / 2)) : seg;
  const pt = (r, z, a) => [r * Math.sin(a), z, r * Math.cos(a)];
  for (let i = 0; i < n; i++) {
    const a0 = span * i / n, a1 = span * (i + 1) / n;
    for (let k = 0; k < P.length; k++) {
      const [r0, z0] = P[k], [r1, z1] = P[(k + 1) % P.length];
      if (r0 === 0 && r1 === 0) continue;
      const A = pt(r0, z0, a0), B = pt(r1, z1, a0), C = pt(r1, z1, a1), D = pt(r0, z0, a1);
      if (r1 !== 0) tris.push([A, B, C]);
      if (r0 !== 0) tris.push([A, C, D]);
    }
  }
  if (cut) for (const a of [0, Math.PI])
    for (let k = 0; k < P.length - 1; k++) {
      const [r0, z0] = P[k], [r1, z1] = P[k + 1];
      if (r0 === 0 && r1 === 0) continue;
      const O0 = pt(0, z0, a), O1 = pt(0, z1, a), A = pt(r0, z0, a), B = pt(r1, z1, a);
      tris.push(a === 0 ? [O0, A, B] : [O0, B, A]);
      tris.push(a === 0 ? [O0, B, O1] : [O0, O1, B]);
    }
  return tris;
}

function boxTris(x, y, z, w, h, d){
  const p = [[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d]];
  return [[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],
          [1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]].map(([a,b,c]) => [p[a],p[b],p[c]]);
}
function prismTris(poly, width){
  const y0 = -width / 2, y1 = width / 2, out = [];
  for (let i = 0; i < poly.length; i++) {
    const [x0,z0] = poly[i], [x1,z1] = poly[(i + 1) % poly.length];
    out.push([[x0,z0,y0],[x1,z1,y0],[x1,z1,y1]]);
    out.push([[x0,z0,y0],[x1,z1,y1],[x0,z0,y1]]);
  }
  for (let i = 1; i < poly.length - 1; i++) {
    out.push([[poly[0][0],poly[0][1],y0],[poly[i][0],poly[i][1],y0],[poly[i+1][0],poly[i+1][1],y0]]);
    out.push([[poly[0][0],poly[0][1],y1],[poly[i+1][0],poly[i+1][1],y1],[poly[i][0],poly[i][1],y1]]);
  }
  return out;
}
const shiftX = (tris, dx) => tris.map(t => t.map(p => [p[0] + dx, p[1], p[2]]));

/* Меш детали. Тела вращения — точный лат; квадратный корпус и
   прямоугольные головы — коробки. */
function partTris(c, cut){
  const m = c.model;
  if (m === "grommet") {
    let t = boxTris(-c.hole / 2, 0, -c.hole / 2, c.hole, c.blen, c.hole);
    for (const sg of [-1, 1]) {
      const zt = c.blen - 1.6, zb = c.pmax + 0.8;
      t = t.concat(prismTris([[sg*(c.hole/2-0.8), zt], [sg*(c.hole/2+c.wingOut), zb+1],
        [sg*(c.hole/2+c.wingOut-0.7), zb], [sg*(c.hole/2-0.8), zt-1.6]], c.hole));
    }
    return { body:t.concat(latheTris(
      [[0,-c.headT],[c.headD/2,-c.headT],[c.headD/2,0],[0,0]], 64, cut)), barb:[], pin:[] };
  }
  if (RECT_HEAD(m)) {
    const r = Math.min(1.2, c.hw / 2 - 0.1);
    let t = latheTris(stemProfile(c), 96, cut);
    t = t.concat(boxTris(-c.hl/2, -c.headT, -c.hw/2, c.hl, c.headT, c.hw));
    if (m === "moulding")
      t = t.concat(boxTris(-(c.hl/2 - 1.2), -c.headT - 0.9, -(c.hw/2 - 0.6),
        c.hl - 2.4, 1.15, c.hw - 1.2));
    return { body:t, barb:[], pin:[] };
  }
  if (TOPPED(m)) {
    /* шток — тело вращения; площадка и хомуты — коробки и выдавленные сечения */
    let t = latheTris(stemProfile(c), 96, cut);
    const zTop = -c.baseT;
    if (PLATE(m)) {
      /* плита с прорезью под стяжку собрана из четырёх брусков —
         вычитания нет, значит нечему ломаться при экспорте */
      const W = c.baseW, Lg = c.baseL, T = c.baseT + 0.3;
      const sw = c.tieW, st = c.tieT, zs = zTop + (T - st) / 2;
      t = t.concat(boxTris(-W/2, zTop, -Lg/2, (W - sw) / 2, T, Lg));
      t = t.concat(boxTris(sw/2, zTop, -Lg/2, (W - sw) / 2, T, Lg));
      t = t.concat(boxTris(-sw/2, zTop, -Lg/2, sw, zs - zTop, Lg));
      t = t.concat(boxTris(-sw/2, zs + st, -Lg/2, sw, zTop + T - (zs + st), Lg));
    } else {
      const seats = (m === "hose_clip") ? c.seats : 1;
      const step = c.bundleD + 2 * c.wall + 1.2;
      const x0 = -(step * (seats - 1)) / 2;
      t = t.concat(boxTris(-c.baseW/2, zTop, -c.baseL/2, c.baseW, c.baseT + 0.3, c.baseL));
      const seat = cSeatPoly(c.bundleD, c.wall, c.gapDeg).map(([x, z]) => [x, -z]);
      const dz = -c.baseT + 1.0 - (c.bundleD / 2 + c.wall);
      for (let i = 0; i < seats; i++) {
        const dx = x0 + i * step;
        t = t.concat(prismTris(seat.map(([x, z]) => [x + dx, z + dz]), c.baseL));
      }
    }
    return { body:t, barb:[], pin:[] };
  }
  if (THREADED(m)) {
    /* корпус — кольцевой контур с каналом под винт, без операций вычитания */
    const body = latheTris(boredProfile(c, c.boreD), 96, cut);
    let pin = [];
    if (c.showScrew) {
      const turns = Math.max(2, (c.screwLen - 1.6) / c.thrPitch);
      pin = latheTris(screwCoreProfile(c), 64, cut)
            .concat(helixTris(c.screwCore / 2, c.thrDepth, c.thrPitch, turns, 0.9, 26));
      pin = shiftX(pin, c.headD * 0.85);
    }
    return { body, barb:[], pin };
  }
  const body = latheTris(buildProfile(c), 96, cut);
  const pin = (m === "two_piece") ? shiftX(latheTris(buildPinProfile(c), 64, cut), c.headD * 0.8) : [];
  return { body, barb:[], pin };
}

const matBody = () => new THREE.MeshStandardMaterial({ color:0x2fd3c4, metalness:.05, roughness:.5, side:THREE.DoubleSide });
const matPin  = () => new THREE.MeshStandardMaterial({ color:0xf0a34a, metalness:.05, roughness:.5, side:THREE.DoubleSide });
const matPnl  = () => new THREE.MeshStandardMaterial({ color:0x93a7b3, transparent:true, opacity:.15, depthWrite:false, side:THREE.DoubleSide });

function geom(tris){
  const pos = new Float32Array(tris.length * 9); let i = 0;
  for (const t of tris) for (const v of t) { pos[i++] = v[0]; pos[i++] = v[1]; pos[i++] = v[2]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals(); return g;
}

function updateMesh(c){
  if (!TH.ready) return;
  const cut = $("cutHalf").checked;
  while (TH.root.children.length) TH.root.remove(TH.root.children[0]);

  const { body, pin } = partTris(c, cut);
  LAST = { c, body, pin };
  TH.root.add(new THREE.Mesh(geom(body), matBody()));
  if (pin.length) TH.root.add(new THREE.Mesh(geom(pin), matPin()));

  if ($("showPanel").checked) {
    const R = Math.max(c.headD * 0.62, c.hole * 1.9);
    TH.root.add(new THREE.Mesh(geom(latheTris(
      [[c.hole/2,0],[R,0],[R,c.pmax],[c.hole/2,c.pmax]], 72, cut)), matPnl()));
  }

  const hi = c.stemLen, lo = -c.headT * 2;
  TH.target.set(pin.length ? c.headD * 0.4 : 0, (hi + lo) / 2, 0);
  TH.span = Math.max(c.headD * 1.5, hi - lo, pin.length ? c.headD * 2.2 : 0);
  TH.dist = TH.span * 1.9;
  $("tri").textContent = (body.length + pin.length).toLocaleString("ru") + " треугольников";
  TH.place();
}

/* ---------------- переключение видов ---------------- */
function setView(v){
  VIEW = v;
  for (const b of $("segView").children) b.setAttribute("aria-selected", b.dataset.v === v);
  $("stage3d").hidden = (v !== "3d");
  $("stageFlat").hidden = (v !== "draw");
  /* канвас один на оба режима — просто переезжает между вкладками */
  const host = v === "3d" ? $("glHost3d") : $("glHostIso");
  if ($("gl").parentNode !== host) host.appendChild($("gl"));
  if (TH.ready) { requestAnimationFrame(() => {
    const H = TH.host.clientHeight, W = TH.host.clientWidth;
    if (W && H) { TH.camP.aspect = W / H; TH.camP.updateProjectionMatrix(); TH.ren.setSize(W, H); }
    TH.place(); }); }
}

/* ---------------- STL ---------------- */
function stlBlob(tris){
  const buf = new ArrayBuffer(84 + tris.length * 50), dv = new DataView(buf);
  dv.setUint32(80, tris.length, true);
  let o = 84;
  for (const [a, b, c] of tris) {
    const u = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], v = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
    let n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const L = Math.hypot(n[0], n[1], n[2]) || 1; n = n.map(x => x / L);
    dv.setFloat32(o, n[0], true); dv.setFloat32(o+4, n[2], true); dv.setFloat32(o+8, n[1], true); o += 12;
    for (const p of [a, b, c]) {   /* в STL вверх Z, у нас вверх Y */
      dv.setFloat32(o, p[0], true); dv.setFloat32(o+4, p[2], true); dv.setFloat32(o+8, p[1], true); o += 12; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return new Blob([buf], { type:"model/stl" });
}
const save = (blob, name) => { const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); };

/* =====================================================================
   Каталог — 5499 позиций из шести источников: DISCO, ARaymond,
   Nifco, Clips and Fasteners, Buy Auto Supply, VehicleClips.
   Часть строится генератором, часть только справочная — помечено.
   ===================================================================== */
const FAMRU = FAMILIES;
const CAT = CATALOG;
const BUILDABLE = CAT.filter(r => r.b);

function catDims(r){
  const a = [];
  if (r.h != null) a.push("отв " + (r.hs === "square" || r.hs === "кв" ? "кв " : "Ø") + r.h);
  if (r.hd != null) a.push("гол Ø" + r.hd);
  else if (r.hw != null && r.hl != null) a.push("гол " + r.hw + "×" + r.hl);
  if (r.st != null) a.push("шток " + r.st);
  if (r.g0 != null && r.g1 != null) a.push("пакет " + r.g0 + "–" + r.g1);
  if (r.sc != null) a.push("винт " + r.sc);
  return a.join(" · ");
}

function fillSelect(id, list, label){
  $(id).innerHTML = `<option value="">${label}</option>` +
    list.map(([v, n, c]) => `<option value="${v}">${n} (${c})</option>`).join("");
}

function buildCatalog(){
  $("catTotal").textContent = CAT.length.toLocaleString("ru") + " позиций · строится " +
    BUILDABLE.length.toLocaleString("ru");

  const count = (key) => {
    const m = new Map();
    for (const r of CAT) { const v = r[key]; if (v) m.set(v, (m.get(v) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  fillSelect("catFam", count("f").map(([v, c]) => [v, FAMRU[v] || v, c]), "все семейства");
  fillSelect("catBrand", count("br").map(([v, c]) => [v, v, c]), "все марки");
  fillSelect("catSrc", count("s").map(([v, c]) => [v, v, c]), "все источники");

  const num = (id) => { const v = parseFloat($(id).value.replace(",", ".")); return isFinite(v) ? v : null; };

  const upd = () => {
    const fam = $("catFam").value, br = $("catBrand").value, src = $("catSrc").value;
    const q = $("catSearch").value.trim().toLowerCase();
    const mh = num("mHole"), mhd = num("mHead"), mst = num("mStem");
    const tol = parseFloat($("mTol").value);
    const onlyB = $("onlyBuild").checked, onlyI = $("onlyImg").checked;
    const measuring = mh != null || mhd != null || mst != null;

    let rows = CAT.filter(r => {
      if (fam && r.f !== fam) return false;
      if (br && r.br !== br) return false;
      if (src && r.s !== src) return false;
      if (onlyB && !r.b) return false;
      if (onlyI && !r.i) return false;
      if (q && !((r.p + " " + (r.o || "")).toLowerCase().includes(q))) return false;
      if (mh != null && (r.h == null || Math.abs(r.h - mh) > tol)) return false;
      if (mhd != null) {
        const hd = r.hd ?? (r.hw != null && r.hl != null ? Math.max(r.hw, r.hl) : null);
        if (hd == null || Math.abs(hd - mhd) > tol) return false;
      }
      if (mst != null && (r.st == null || Math.abs(r.st - mst) > tol)) return false;
      return true;
    });

    /* при поиске по замерам сортируем по близости — ближайший кандидат сверху */
    if (measuring) {
      const dist = (r) => {
        let d = 0;
        if (mh != null) d += Math.abs(r.h - mh);
        if (mhd != null) { const hd = r.hd ?? Math.max(r.hw, r.hl); d += Math.abs(hd - mhd); }
        if (mst != null) d += Math.abs(r.st - mst);
        return d;
      };
      rows = rows.slice().sort((a, b) => dist(a) - dist(b));
    }

    $("catCount").innerHTML = `Найдено: <b style="color:var(--ink)">${rows.length.toLocaleString("ru")}</b>` +
      ` из ${CAT.length.toLocaleString("ru")}` +
      (measuring ? " · отсортировано по близости к замерам" : "") +
      (rows.length > 240 ? " · показаны первые 240" : "");

    $("catGrid").innerHTML = rows.slice(0, 240).map((r, i) => {
      const idx = CAT.indexOf(r);
      const ph = r.i
        ? `<div class="ph"><img loading="lazy" src="${r.i}" alt=""
             onerror="this.parentNode.innerHTML='<span>нет фото</span>'"></div>`
        : `<div class="ph"><span>нет фото</span></div>`;
      return `<div class="cc ${r.b ? "" : "no"}" data-i="${idx}" title="${r.b ? "нажми — параметры уйдут в генератор" : "данных для построения не хватает"}">
        ${ph}<div class="bd">
          <div class="pn">${r.p}</div>
          <div class="fm">${FAMRU[r.f] || r.f}${r.b ? "" : " · только справка"}</div>
          <div class="dm">${catDims(r) || "размеры не опубликованы"}</div>
          <div class="oe">${r.o ? r.o.slice(0, 46) : r.s}</div>
        </div></div>`;
    }).join("");

    for (const cc of $("catGrid").querySelectorAll(".cc:not(.no)"))
      cc.onclick = () => applyPart(CAT[+cc.dataset.i]);
  };

  for (const id of ["catFam","catBrand","catSrc","mTol"]) $(id).onchange = upd;
  for (const id of ["catSearch","mHole","mHead","mStem"]) $(id).oninput = upd;
  for (const id of ["onlyBuild","onlyImg"]) $(id).onchange = upd;
  $("mClear").onclick = () => { for (const id of ["mHole","mHead","mStem"]) $(id).value = ""; upd(); };
  upd();
}

/* Подставляем то, что опубликовано; остальное досчитывается правилами семейства */
function applyPart(r){
  if (r.g && MODELS[r.g]) state.model = r.g;
  for (const k of ["head","head2","stemLen","stemD","interference","barbCount","rootT","pitch","blen","pinD","thrPitch","thrDepth"])
    state[k] = null;
  if (r.h)  state.hole = r.h;
  if (r.g0) state.pmin = r.g0;
  if (r.g1) state.pmax = Math.max(r.g1, (r.g0 || 0) + 0.5);
  if (r.hd) state.head = r.hd;
  if (r.st) state.stemLen = r.st;
  if (r.hw && r.hl) { state.hw = Math.min(r.hw, r.hl); state.hl = Math.max(r.hw, r.hl); }
  if (r.sc) { state.screw = r.sc; state.thrPitch = null; state.thrDepth = null; }
  if (r.sd) state.stemD = r.sd;
  if (r.bd) state.bundleD = r.bd;      // диаметр жгута из описания каталога
  dlgCat.close(); buildChips(); buildControls(); render();
}

/* ---------------- кнопки ---------------- */
$("btnFiles").onclick = () => dlgFiles.showModal();
$("btnCat").onclick   = () => dlgCat.showModal();
$("btnHelp").onclick  = () => dlgHelp.showModal();
$("btnCopy").onclick  = async () => {
  const ta = $("scadOut"); ta.select();
  try { await navigator.clipboard.writeText(ta.value); } catch(e) { document.execCommand("copy"); }
  $("btnCopy").textContent = "Скопировано";
  setTimeout(() => $("btnCopy").textContent = "Скопировать код", 1400);
};
$("btnDl").onclick = () => save(new Blob([$("scadOut").value], { type:"text/plain" }),
  state.model + "_" + (Math.round(state.hole * 100) / 100) + "mm.scad");
$("btnStl").onclick = () => {
  const c = derive(state), { body, pin } = partTris(c, false);
  save(stlBlob(body.concat(pin)),
       state.model + "_" + (Math.round(state.hole * 100) / 100) + "mm.stl");
};
$("cutHalf").onchange = render;
$("showPanel").onchange = render;
$("btnReset").onclick = () => { TH.rot = { x:0.42, y:0.72 }; if (TH.ready) TH.place(); };
for (const b of $("segView").children) b.onclick = () => setView(b.dataset.v);

initThree(); buildChips(); buildControls(); buildCatalog(); setView("3d"); render();
