/* =====================================================================
   core.js — расчётное ядро генератора клипс.
   Один и тот же файл считает превью в браузере и выдаёт .scad.
   Правила семейств те же, что в clipgen.scad — источник истины один.
   ===================================================================== */

const MODELS = {
  firtree:      { ru: "Ёлочка",              hole: "round",  head: "round" },
  push:         { ru: "Пистон",              hole: "round",  head: "round" },
  grommet:      { ru: "Закладная гайка",     hole: "square", head: "round" },
  weatherstrip: { ru: "Клипса уплотнителя",  hole: "round",  head: "rect"  },
  hood:         { ru: "Пистон шумоизоляции", hole: "round",  head: "round" }
};

/* Правила семейств. Каждое привязано к типу детали — общего правила нет,
   и именно на этом ломаются готовые генераторы. */
const RULES = {
  headRatio: { firtree: 2.80, push: 2.40, grommet: 2.40, weatherstrip: 2.40, hood: 4.30 },
  stemLen: {
    // [Volt] ёлочка: панель + 0.52 x отверстие (22 артикула, разброс 0.48-0.56)
    firtree:      (p) => p.pmax + 0.52 * p.hole,
    // [DISCO] пистон: захват + 13 (Ford W713610/W714040/W713331, GM 11589292/93/94)
    push:         (p) => p.pmax + 13,
    weatherstrip: (p) => p.pmax + 6,
    hood:         (p) => p.pmax + 11,
    grommet:      (p) => p.pmax + 8
  },
  // Натяг ПО ДИАМЕТРУ. [Volt] 0.33-0.69; семейство 7.92 идёт ровно на 0.34
  interference: {
    firtree:      (p) => (p.hole > 7.6 && p.hole < 8.2) ? 0.34 : 0.55,
    push:         () => 0.40,
    grommet:      () => 0.45,
    weatherstrip: () => 0.45,
    hood:         () => 0.45
  },
  stemD: {
    push:         (p) => p.hole - 0.3,   // [DISCO] работают только рёбра
    firtree:      (p) => p.hole * 0.60,  // [ДОПУЩЕНИЕ] нигде не опубликовано
    grommet:      (p) => p.hole * 0.62,
    weatherstrip: (p) => p.hole * 0.62,
    hood:         (p) => p.hole * 0.62
  },
  barbCount: { firtree: 5, push: 2, grommet: 3, weatherstrip: 3, hood: 4 }
};

const DEFAULTS = {
  model: "firtree", hole: 7.92, pmin: 1.57, pmax: 6.35,
  head: null, headT: 1.8, hw: 5.0, hl: 15.0,
  stemD: null, stemLen: null,
  barbCount: null, barbD: null, interference: null,
  rootT: null, pitch: null, rakeOut: 10, rakeInTgt: 32,
  skirt: false, screw: 5.0, blen: null, closed: false, wingOut: 0.9
};

const r2 = (v) => Math.round(v * 100) / 100;

/* Разрешение параметров: всё, что пользователь не задал, считается по правилу */
function derive(p) {
  const m = p.model;
  const headD = p.head    ?? p.hole * RULES.headRatio[m];
  const stemD = p.stemD   ?? RULES.stemD[m](p);
  const stemLen = p.stemLen ?? RULES.stemLen[m](p);
  const intf  = p.interference ?? RULES.interference[m](p);
  const barbD = p.barbD   ?? p.hole + intf;
  const nBarb = p.barbCount ?? RULES.barbCount[m];

  const dR = barbD / 2 - stemD / 2;                 // вылет ребра по радиусу
  const backLen = dR * Math.tan(p.rakeOut * Math.PI / 180);
  // У ёлочки толщина основания опубликована и задаёт угол.
  // У остальных не опубликована — задаём угол, получаем толщину.
  const rootT = p.rootT ?? (m === "firtree" ? 2.5
              : backLen + dR / Math.tan(p.rakeInTgt * Math.PI / 180));
  const rampLen = Math.max(0.3, rootT - backLen);
  const rakeIn = Math.atan(dR / rampLen) * 180 / Math.PI;

  const pitchRaw = p.pitch ?? (nBarb > 1 ? (p.pmax - p.pmin) / (nBarb - 1) : 2.0);
  const pitch = Math.max(1.5, Math.min(3.0, Math.max(pitchRaw, rootT + 0.2)));
  const tip = Math.max(1.5, p.hole * 0.30);

  /* Где начинается стопка рёбер — это принципиальная разница между семействами.
     Ёлочка работает трещоткой: рёбра идут от ТОНКОЙ границы пакета, и деталь
     держит на любой толщине из диапазона. Пистон рассчитан на конкретный
     захват — там первое ребро встаёт сразу за ТОЛСТОЙ границей. */
  const firstZ = (m === "firtree" ? p.pmin : p.pmax) + 0.4 + backLen;

  /* У ёлочки число рёбер не задаётся, а получается: сколько влезло на шток.
     [Volt] реально выходит 4-7 — сходится с каталогом. */
  const zs = [];
  const maxN = (p.barbCount != null) ? nBarb : (m === "firtree" ? 12 : nBarb);
  for (let i = 0; i < maxN; i++) {
    const z = firstZ + i * pitch;
    if (z + rampLen <= stemLen - tip * 0.5) zs.push(z); else break;
  }

  return { ...p, headD, stemD, stemLen, intf, barbD, nBarb, dR, backLen,
           rootT, rampLen, rakeIn, pitch, firstZ, tip, zs,
           blen: p.blen ?? (p.closed ? 14.0 : 8.0) };
}

/* Проверки — то, что нельзя увидеть глазами на картинке */
function checks(c) {
  const out = [];
  const push = (level, text) => out.push({ level, text });

  if (c.dR < 0.05) push("bad", "Ребро не выступает за стержень — деталь не будет держать");
  else if (c.dR < 0.15) push("warn", `Вылет ребра всего ${r2(c.dR)} мм — на печати это исчезнет в допуске`);

  if (c.model !== "grommet") {
    if (c.rakeIn < 25) push("warn", `Угол захода ${r2(c.rakeIn)}° — меньше нормы 25-40°, вставлять будет туго`);
    else if (c.rakeIn > 40) push("warn", `Угол захода ${r2(c.rakeIn)}° — больше нормы 25-40°, ребро соскользнёт`);
    else push("ok", `Угол захода ${r2(c.rakeIn)}° — в норме 25-40°`);
  }

  if (c.stemLen < c.pmax + 1) push("bad", "Шток короче пакета панелей");
  if (c.zs.length === 0) push("bad", "Ни одно ребро не помещается на штоке");
  else if (c.barbCount != null && c.zs.length < c.nBarb) push("warn", `На штоке помещается ${c.zs.length} ребра из ${c.nBarb}`);
  else push("ok", `Рёбер на штоке: ${c.zs.length}`);

  const side = c.intf / 2;
  if (c.model === "firtree") {
    if (side < 0.17 || side > 0.34)
      push("warn", `Натяг ${r2(side)} мм на сторону вне литьевого диапазона 0.17-0.34`);
    else push("ok", `Натяг ${r2(side)} мм на сторону — в диапазоне Volt 0.17-0.34`);
  }

  const ratio = c.headD / c.hole;
  const norm = { firtree: [2.67, 2.85], push: [2.0, 2.5], hood: [3.5, 5.0] }[c.model];
  if (norm && (ratio < norm[0] || ratio > norm[1]))
    push("warn", `Голова ${r2(ratio)} x отверстие — вне каталожного ${norm[0]}-${norm[1]}`);

  if (c.rootT < 2.0 && c.model === "firtree")
    push("warn", `Толщина ребра у основания ${r2(c.rootT)} — у Volt это константа 2.03-2.54`);

  return out;
}

/* =====================================================================
   Генерация .scad — самодостаточный файл, вставляется в OpenSCAD
   или в MakerWorld как есть
   ===================================================================== */
function toScad(c) {
  const n = (v) => r2(v).toFixed(2);
  const L = [];
  L.push(`// ${MODELS[c.model].ru} — сгенерировано ClipGen`);
  L.push(`// отверстие ${n(c.hole)}, панель ${n(c.pmin)}-${n(c.pmax)}, голова ${n(c.headD)}`);
  L.push(`// натяг ${n(c.intf)} по диаметру = ${n(c.intf/2)} на сторону`);
  L.push(`// ВНИМАНИЕ: натяг выведен из литья. Под свой принтер подбери печатью.`);
  L.push(``);
  L.push(`$fn = 96;`);
  L.push(`hole_d = ${n(c.hole)}; panel_max = ${n(c.pmax)};`);
  L.push(`head_t = ${n(c.headT)}; stem_d = ${n(c.stemD)}; stem_len = ${n(c.stemLen)};`);
  L.push(`barb_d = ${n(c.barbD)}; ramp = ${n(c.rampLen)}; back = ${n(c.backLen)};`);
  L.push(`tip_len = ${n(c.tip)};`);
  L.push(``);
  L.push(`module barb(zt){`);
  L.push(`  rotate_extrude() polygon([`);
  L.push(`    [stem_d/2*0.99, zt+ramp], [barb_d/2, zt], [stem_d/2*0.99, zt-back]]);`);
  L.push(`}`);
  L.push(``);

  if (c.model === "grommet") {
    L.push(`body_w = ${n(c.hole)}; body_len = ${n(c.blen)};`);
    L.push(`screw_d = ${n(c.screw)}; wing_out = ${n(c.wingOut)};`);
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
    L.push(`  translate([0,0,-head_t-0.01])`);
    L.push(`    cylinder(h=${c.closed ? "body_len-1.2+head_t" : "body_len+head_t+0.02"}, d=${n(c.screw * 0.8)});`);
    L.push(`}`);
  } else {
    L.push(`union(){`);
    if (c.model === "weatherstrip") {
      const r = Math.min(1.2, c.hw / 2 - 0.1);
      L.push(`  // прямоугольная голова ${n(c.hw)} x ${n(c.hl)} [DISCO S13: 20 строк из 71]`);
      L.push(`  translate([0,0,-head_t]) hull() for(dx=[-1,1], dy=[-1,1])`);
      L.push(`    translate([dx*(${n(c.hl/2 - r)}), dy*(${n(c.hw/2 - r)}), 0])`);
      L.push(`      cylinder(h=head_t, r=${n(r)});`);
    } else {
      L.push(`  translate([0,0,-head_t]) cylinder(h=head_t, d=${n(c.headD)});`);
    }
    if (c.skirt) {
      L.push(`  // юбка-пружина: выбирает разброс толщины панели`);
      L.push(`  rotate_extrude() polygon([`);
      L.push(`    [${n(c.headD/2 - 0.01)}, -head_t], [${n(c.headD/2 * 1.10)}, -0.05],`);
      L.push(`    [${n(c.headD/2 * 1.10 - 0.9)}, -0.05], [${n(c.headD/2 - 0.01)}, ${n(-c.headT + 0.9)}]]);`);
    }
    L.push(`  cylinder(h = stem_len - tip_len, d = stem_d);`);
    L.push(`  translate([0,0,stem_len-tip_len])`);
    L.push(`    cylinder(h = tip_len, d1 = stem_d, d2 = ${n(Math.max(1.2, c.stemD * 0.45))});`);
    c.zs.forEach((z) => L.push(`  barb(${n(z)});`));
    L.push(`}`);
  }
  return L.join("\n");
}

/*__NODE__*/if (typeof module !== "undefined") module.exports = { MODELS, RULES, DEFAULTS, derive, checks, toScad, r2 };/*__ENDNODE__*/

/* =====================================================================
   Профиль детали — один замкнутый контур [r, z].
   От него живут все три вещи сразу: SVG-разрез, 3D через LatheGeometry
   и экспорт STL. Один источник геометрии, три потребителя — поэтому
   картинка на экране и файл на печать не могут разойтись.
   ===================================================================== */
function buildProfile(c) {
  const P = [];
  const add = (r, z) => P.push([Math.max(0, r), z]);

  add(0, -c.headT);                       // низ головы на оси
  add(c.headD / 2, -c.headT);             // наружу по низу головы
  add(c.headD / 2, 0);                    // вверх по кромке головы
  add(c.stemD / 2, 0);                    // внутрь к стержню

  for (const z of c.zs) {                 // рёбра снизу вверх
    add(c.stemD / 2, z - c.backLen);
    add(c.barbD / 2, z);
    add(c.stemD / 2, z + c.rampLen);
  }

  add(c.stemD / 2, c.stemLen - c.tip);    // стержень до носика
  add(Math.max(0.6, c.stemD * 0.45) / 2, c.stemLen);
  add(0, c.stemLen);                      // на ось
  return P;
}

/* Двухсоставная: сердечник (штифт), который вставляется в тело.
   ВНИМАНИЕ: внутренняя геометрия кулачка не опубликована НИ ОДНИМ
   производителем. Здесь только видимая часть — сердечник как отдельная
   деталь рядом с корпусом. Рабочую пару без образца не рассчитать. */
function buildPinProfile(c) {
  const d = c.pinD ?? Math.max(2.5, c.stemD * 0.55);
  const len = c.stemLen * 0.92;
  const headD = Math.min(c.headD * 0.55, c.hole * 1.2);
  return [
    [0, -c.headT], [headD / 2, -c.headT], [headD / 2, 0],
    [d / 2, 0], [d / 2, len - 1.2], [d / 2 * 0.5, len], [0, len]
  ];
}

/* Тело под сердечник: тот же контур, но с осевым отверстием */
function pinBoreD(c) { return (c.pinD ?? Math.max(2.5, c.stemD * 0.55)) + 0.25; }

/*__NODE__*/if (typeof module !== "undefined")
  module.exports = { MODELS, RULES, DEFAULTS, derive, checks, toScad, r2,
                     buildProfile, buildPinProfile, pinBoreD };/*__ENDNODE__*/
