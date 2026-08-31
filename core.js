/* =====================================================================
   core.js — расчётное ядро ClipGen.
   Один файл считает и превью в браузере, и выгрузку .scad, и 3D-меш.
   Правила семейств взяты из ClipBase; источник каждой цифры помечен.
   [Volt] [DISCO] [Nifco] — из каталога. [ДОПУЩЕНИЕ] — нигде не опубликовано.
   ===================================================================== */

const MODELS = {
  firtree:      { ru:"Ёлочка",                 short:"Ёлочка",      head:"round" },
  push:         { ru:"Пистон нажимной",        short:"Пистон",      head:"round" },
  two_piece:    { ru:"Пистон двухсоставной",   short:"Двухсост.",   head:"round" },
  trim_panel:   { ru:"Клипса обшивки",         short:"Обшивка",     head:"double" },
  headliner:    { ru:"Клипса потолка",         short:"Потолок",     head:"round" },
  weatherstrip: { ru:"Клипса уплотнителя",     short:"Уплотнитель", head:"rect" },
  moulding:     { ru:"Клипса молдинга",        short:"Молдинг",     head:"rect" },
  hood:         { ru:"Пистон шумоизоляции",    short:"Шумоизол.",   head:"round" },
  hole_plug:    { ru:"Заглушка отверстия",     short:"Заглушка",    head:"round" },
  grommet:      { ru:"Закладная гайка",        short:"Гайка",       head:"round" }
};

/* Что делает каждое семейство и где стоит — показывается в подсказке */
const ABOUT = {
  firtree:      "Стопка гибких конических рёбер проходит отверстие трещоткой. Один размер закрывает огромный диапазон толщин: [Volt] от 1.6 до 38 мм.",
  push:         "Гибкие зазубрины продавливаются сквозь отверстие и распираются за панелью. Бампер, подкрылок, брызговик, защита.",
  two_piece:    "Втулка в отверстие, забиваемый штифт распирает лепестки. Многоразовая. ВНИМАНИЕ: внутреннюю геометрию не публикует ни один производитель.",
  trim_panel:   "Две головы: диск в паз карты, подпружиненный диск в кузов. Дверные карты, накладки салона, стойки.",
  headliner:    "Большая плоская голова, обычно белый нейлон. Обивка потолка, поперечины крыши.",
  weatherstrip: "Плоская прямоугольная голова внутри канала резинки, короткий шток во фланец. [DISCO] доминирует голова 5.00x15.00.",
  moulding:     "Голова захвачена в Т-паз молдинга, шток в кузов. Часто с бутиловым герметиком.",
  hood:         "Очень большая голова при коротком штоке — распределяет нагрузку по мягкому материалу.",
  hole_plug:    "Несущей функции нет, просто закрывает технологическое отверстие кузова.",
  grommet:      "Нейлоновый корпус в КВАДРАТНОЕ отверстие, саморез нарезает резьбу внутри. Вся японская защита картера."
};

const RULES = {
  /* Голова к отверстию. [Volt] ёлочка 2.67-2.85 на 22 артикулах;
     [DISCO] пистон 2.0-2.5. Общего коэффициента не существует. */
  headRatio: { firtree:2.80, push:2.40, two_piece:2.40, trim_panel:2.20,
               headliner:2.20, weatherstrip:2.40, moulding:2.60,
               hood:4.30, hole_plug:1.35, grommet:2.40 },

  stemLen: {
    firtree:      (p) => p.pmax + 0.52 * p.hole,   // [Volt] 22 артикула, 0.48-0.56
    push:         (p) => p.pmax + 13,              // [DISCO] Ford/GM, три семейства
    two_piece:    (p) => p.pmax + 12,
    trim_panel:   (p) => p.pmax + 7,               // [families] захват 0.6-2.7
    headliner:    (p) => p.pmax + 9,
    weatherstrip: (p) => p.pmax + 6,               // [DISCO S13] штоки 5-17
    moulding:     (p) => p.pmax + 7,
    hood:         (p) => p.pmax + 11,              // Toyota 90467-09008: 17 при панели 6
    hole_plug:    (p) => p.pmax + 3,
    grommet:      (p) => p.pmax + 8
  },

  /* Натяг ПО ДИАМЕТРУ. [Volt] 0.33-0.69; семейство 7.92 ровно 0.34 на всех шести */
  interference: {
    firtree: (p) => (p.hole > 7.6 && p.hole < 8.2) ? 0.34 : 0.55,
    push: () => 0.40, two_piece: () => 0.35, trim_panel: () => 0.45,
    headliner: () => 0.45, weatherstrip: () => 0.45, moulding: () => 0.45,
    hood: () => 0.45, hole_plug: () => 0.30, grommet: () => 0.45
  },

  stemD: {
    push:      (p) => p.hole - 0.3,    // [DISCO] работают только рёбра
    two_piece: (p) => p.hole - 0.4,
    firtree:   (p) => p.hole * 0.60,   // [ДОПУЩЕНИЕ]
    hole_plug: (p) => p.hole - 0.5,
    _default:  (p) => p.hole * 0.62
  },

  barbCount: { firtree:5, push:2, two_piece:2, trim_panel:2, headliner:3,
               weatherstrip:3, moulding:3, hood:4, hole_plug:2, grommet:3 }
};

const DEFAULTS = {
  model:"firtree", hole:7.92, pmin:1.57, pmax:6.35,
  head:null, headT:1.8, hw:5.0, hl:15.0,
  head2:null, head2z:1.5,               // вторая голова у клипсы обшивки
  stemD:null, stemLen:null,
  barbCount:null, barbD:null, interference:null,
  rootT:null, pitch:null, rakeOut:10, rakeInTgt:32,
  skirt:false, screw:5.0, blen:null, closed:false, wingOut:0.9,
  pinD:null
};

const r2 = (v) => Math.round(v * 100) / 100;
const TWO_HEAD = (m) => m === "trim_panel";
const RECT_HEAD = (m) => m === "weatherstrip" || m === "moulding";

function derive(p) {
  const m = p.model;
  const headD   = p.head    ?? p.hole * RULES.headRatio[m];
  const stemD   = p.stemD   ?? (RULES.stemD[m] || RULES.stemD._default)(p);
  const stemLen = p.stemLen ?? RULES.stemLen[m](p);
  const intf    = p.interference ?? RULES.interference[m](p);
  const barbD   = p.barbD   ?? p.hole + intf;
  const nBarb   = p.barbCount ?? RULES.barbCount[m];
  const head2D  = p.head2   ?? headD * 0.72;

  const dR = barbD / 2 - stemD / 2;
  const backLen = dR * Math.tan(p.rakeOut * Math.PI / 180);
  const rootT = p.rootT ?? (m === "firtree" ? 2.5
              : backLen + dR / Math.tan(p.rakeInTgt * Math.PI / 180));
  const rampLen = Math.max(0.3, rootT - backLen);
  const rakeIn = Math.atan(dR / rampLen) * 180 / Math.PI;

  const pitchRaw = p.pitch ?? (nBarb > 1 ? (p.pmax - p.pmin) / (nBarb - 1) : 2.0);
  /* Шаг не может быть меньше самого ребра, иначе соседние рёбра
     наезжают друг на друга и контур идёт назад по оси. */
  const pitch = Math.max(1.5, Math.min(3.0, pitchRaw), rootT + 0.25);
  const tip = m === "hole_plug" ? Math.max(0.8, p.hole * 0.14) : Math.max(1.2, p.hole * 0.30);

  /* Ёлочка — трещотка: рёбра идут от ТОНКОЙ границы пакета и держат на любой
     толщине из диапазона. Остальные рассчитаны на конкретный захват — там
     первое ребро встаёт сразу за ТОЛСТОЙ границей. */
  const zBase = TWO_HEAD(m) ? p.pmax + 0.4 : (m === "firtree" ? p.pmin : p.pmax) + 0.4;
  const firstZ = zBase + backLen;

  /* Если шток короче, чем нужно даже одному ребру, удлиняем его:
     деталь без единого ребра держать не будет. */
  const needLen = firstZ + rampLen + tip + 0.3;
  const stemLenFix = Math.max(stemLen, needLen);

  const zs = [];
  const maxN = (p.barbCount != null) ? nBarb : (m === "firtree" ? 12 : nBarb);
  for (let i = 0; i < maxN; i++) {
    const z = firstZ + i * pitch;
    if (z + rampLen <= stemLenFix - tip - 0.15) zs.push(z); else break;
  }

  return { ...p, headD, head2D, stemD, stemLen: stemLenFix, intf, barbD, nBarb, dR, backLen,
           rootT, rampLen, rakeIn, pitch, firstZ, tip, zs,
           blen: p.blen ?? (p.closed ? 14.0 : 8.0),
           pinD: p.pinD ?? Math.max(2.2, stemD * 0.5) };
}

function checks(c) {
  const out = [];
  const push = (level, text) => out.push({ level, text });

  if (c.dR < 0.05) push("bad", "Ребро не выступает за стержень — деталь не будет держать");
  else if (c.dR < 0.15) push("warn", `Вылет ребра всего ${r2(c.dR)} мм — на печати исчезнет в допуске`);

  if (c.model !== "grommet") {
    if (c.rakeIn < 25) push("warn", `Угол захода ${r2(c.rakeIn)}° — меньше нормы 25-40°, вставлять туго`);
    else if (c.rakeIn > 40) push("warn", `Угол захода ${r2(c.rakeIn)}° — больше нормы 25-40°, ребро соскользнёт`);
    else push("ok", `Угол захода ${r2(c.rakeIn)}° — в норме 25-40°`);
  }

  if (c.stemLen < c.pmax + 1) push("bad", "Шток короче пакета панелей");
  if (c.zs.length === 0) push("bad", "Ни одно ребро не помещается на штоке");
  else if (c.barbCount != null && c.zs.length < c.nBarb)
    push("warn", `На штоке помещается ${c.zs.length} из ${c.nBarb} рёбер`);
  else push("ok", `Рёбер на штоке: ${c.zs.length}`);

  const side = c.intf / 2;
  if (c.model === "firtree") {
    if (side < 0.17 || side > 0.34) push("warn", `Натяг ${r2(side)} мм на сторону вне литьевого 0.17-0.34`);
    else push("ok", `Натяг ${r2(side)} мм на сторону — в диапазоне Volt`);
  }

  const ratio = c.headD / c.hole;
  const norm = { firtree:[2.67,2.85], push:[2.0,2.5], hood:[3.5,5.0] }[c.model];
  if (norm && (ratio < norm[0] || ratio > norm[1]))
    push("warn", `Голова ${r2(ratio)} × отверстие — вне каталожного ${norm[0]}-${norm[1]}`);

  if (c.model === "firtree" && c.rootT < 2.0)
    push("warn", `Основание ребра ${r2(c.rootT)} — у Volt это константа 2.03-2.54`);

  if (c.hole > 11.5 && c.hole < 12.6)
    push("warn", "12 мм не существует как стандарт — крупный размер это 12.7 (полдюйма)");

  if (c.model === "two_piece")
    push("warn", "Внутреннюю пару втулка-штифт не публикует ни один производитель. Без образца не рассчитать");

  return out;
}

/* =====================================================================
   Профиль — один замкнутый контур [r, z]. От него живут разрез, 3D и STL.
   ===================================================================== */
function buildProfile(c) {
  const P = [];
  const add = (r, z) => P.push([Math.max(0, r), z]);
  const m = c.model;

  if (TWO_HEAD(m)) {
    /* нижняя голова в паз карты, зазор, верхняя подпружиненная в кузов */
    add(0, -c.headT * 2 - c.head2z);
    add(c.head2D / 2, -c.headT * 2 - c.head2z);
    add(c.head2D / 2, -c.headT - c.head2z);
    add(c.stemD / 2 * 1.15, -c.headT - c.head2z);
    add(c.stemD / 2 * 1.15, -c.headT);
    add(c.headD / 2, -c.headT);
    add(c.headD / 2, 0);
  } else if (m === "hole_plug") {
    add(0, -c.headT);
    add(c.headD / 2, -c.headT);
    add(c.headD / 2 - c.headT * 0.6, 0);
  } else {
    add(0, -c.headT);
    add(c.headD / 2, -c.headT);
    add(c.headD / 2, 0);
  }
  add(c.stemD / 2, 0);

  for (const z of c.zs) {
    add(c.stemD / 2, z - c.backLen);
    add(c.barbD / 2, z);
    add(c.stemD / 2, z + c.rampLen);
  }
  add(c.stemD / 2, c.stemLen - c.tip);
  add(Math.max(0.6, c.stemD * 0.45) / 2, c.stemLen);
  add(0, c.stemLen);
  return P;
}

/* Контур одного штока без головы, замкнутый на ось —
   нужен там, где голова не круглая и лепится отдельной коробкой. */
function stemProfile(c) {
  const P = [[0, 0], [c.stemD / 2, 0]];
  for (const z of c.zs) {
    P.push([c.stemD / 2, z - c.backLen]);
    P.push([c.barbD / 2, z]);
    P.push([c.stemD / 2, z + c.rampLen]);
  }
  P.push([c.stemD / 2, c.stemLen - c.tip]);
  P.push([Math.max(0.6, c.stemD * 0.45) / 2, c.stemLen]);
  P.push([0, c.stemLen]);
  return P;
}

/* Втулка двухсоставной: тот же контур, но с осевым каналом под штифт */
function buildSleeveProfile(c) {
  const P = buildProfile(c);
  const rb = c.pinD / 2 + 0.12;
  const zTop = c.stemLen - 0.8, zBot = -c.headT;
  const inner = [[0, c.stemLen], [rb, c.stemLen], [rb, zBot], [0, zBot]];
  return { outer: P, bore: inner, boreR: rb, zTop, zBot };
}

function buildPinProfile(c) {
  const d = c.pinD, len = c.stemLen * 0.94;
  const hd = Math.min(c.headD * 0.5, c.hole * 1.15);
  return [[0, -c.headT], [hd / 2, -c.headT], [hd / 2, 0],
          [d / 2, 0], [d / 2, len - 1.0], [d / 2 * 0.45, len], [0, len]];
}

/* =====================================================================
   .scad — самодостаточный, вставляется в OpenSCAD или MakerWorld как есть
   ===================================================================== */
function toScad(c) {
  const n = (v) => r2(v).toFixed(2);
  const L = [];
  L.push(`// ${MODELS[c.model].ru} — ClipGen`);
  L.push(`// отверстие ${n(c.hole)} · панель ${n(c.pmin)}-${n(c.pmax)} · голова ${n(c.headD)}`);
  L.push(`// натяг ${n(c.intf)} по диаметру = ${n(c.intf / 2)} на сторону`);
  L.push(`// Натяг выведен из ЛИТЬЯ. Под свой принтер подбирается печатью.`);
  L.push(``, `$fn = 96;`, ``);

  if (c.model === "grommet") {
    L.push(`head_t = ${n(c.headT)}; body_w = ${n(c.hole)}; body_len = ${n(c.blen)};`);
    L.push(`panel_max = ${n(c.pmax)}; wing_out = ${n(c.wingOut)};`);
    L.push(`module wing(s){`);
    L.push(`  z_top = body_len - 1.6; z_bot = panel_max + 0.8;`);
    L.push(`  translate([0, body_w/2, 0]) rotate([90,0,0]) linear_extrude(body_w)`);
    L.push(`    polygon([[s*(body_w/2-0.8), z_top], [s*(body_w/2+wing_out), z_bot+1.0],`);
    L.push(`             [s*(body_w/2+wing_out-0.7), z_bot], [s*(body_w/2-0.8), z_top-1.6]]);`);
    L.push(`}`);
    L.push(`difference(){`);
    L.push(`  union(){`);
    L.push(`    translate([0,0,-head_t]) cylinder(h=head_t, d=${n(c.headD)});`);
    L.push(`    translate([-body_w/2,-body_w/2,0]) cube([body_w, body_w, body_len]);`);
    L.push(`    wing(1); wing(-1);`);
    L.push(`  }`);
    L.push(`  translate([0,0,-head_t-0.01]) cylinder(`);
    L.push(`    h=${c.closed ? "body_len-1.2+head_t" : "body_len+head_t+0.02"}, d=${n(c.screw * 0.8)});`);
    L.push(`}`);
    return L.join("\n");
  }

  const P = buildProfile(c);
  L.push(`// контур детали: [радиус, высота]`);
  L.push(`profile = [`);
  L.push(P.map(([r, z]) => `  [${n(r)}, ${n(z)}]`).join(",\n"));
  L.push(`];`, ``);

  if (RECT_HEAD(c.model)) {
    const r = Math.min(1.2, c.hw / 2 - 0.1);
    L.push(`// прямоугольная голова ${n(c.hw)} x ${n(c.hl)}`);
    L.push(`union(){`);
    L.push(`  rotate_extrude() polygon([`);
    L.push(stemProfile(c).map(([r, z]) => `    [${n(r)}, ${n(z)}]`).join(",\n"));
    L.push(`  ]);`);
    L.push(`  translate([0,0,${n(-c.headT)}]) hull() for(dx=[-1,1], dy=[-1,1])`);
    L.push(`    translate([dx*${n(c.hl/2 - r)}, dy*${n(c.hw/2 - r)}, 0])`);
    L.push(`      cylinder(h=${n(c.headT)}, r=${n(r)});`);
    if (c.model === "moulding") {
      L.push(`  // Т-паз молдинга: подрез под кромку`);
      L.push(`  translate([0,0,${n(-c.headT - 0.9)}]) hull() for(dx=[-1,1])`);
      L.push(`    translate([dx*${n(c.hl/2 - r - 1.2)}, 0, 0]) cylinder(h=1.15, r=${n(r)});`);
    }
    L.push(`}`);
  } else if (c.model === "two_piece") {
    L.push(`// ВТУЛКА (корпус)`);
    L.push(`difference(){`);
    L.push(`  rotate_extrude() polygon(profile);`);
    L.push(`  translate([0,0,${n(-c.headT - 0.01)}]) cylinder(h=${n(c.stemLen + c.headT)}, d=${n(c.pinD + 0.24)});`);
    L.push(`}`);
    L.push(``, `// СЕРДЕЧНИК (штифт) — стоит рядом, печатается вместе`);
    const pin = buildPinProfile(c);
    L.push(`translate([${n(c.headD * 0.8)}, 0, 0]) rotate_extrude() polygon([`);
    L.push(pin.map(([r, z]) => `  [${n(r)}, ${n(z)}]`).join(",\n"));
    L.push(`]);`);
  } else {
    L.push(`rotate_extrude() polygon(profile);`);
  }
  return L.join("\n");
}

/*__NODE__*/
if (typeof module !== "undefined")
  module.exports = { MODELS, ABOUT, RULES, DEFAULTS, derive, checks, toScad, r2,
                     buildProfile, stemProfile, buildPinProfile, buildSleeveProfile, TWO_HEAD, RECT_HEAD };
/*__ENDNODE__*/
