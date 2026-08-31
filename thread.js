/* =====================================================================
   Модуль резьбы. Настоящая спираль, а не кольцевые витки:
   кольцами деталь просто не закрутится.

   Профиль витка — трапеция с наклонными боками (примерно 60°),
   она печатается без поддержек и режет резьбу в нейлоне.
   Одна и та же функция даёт и треугольники для 3D, и polyhedron для .scad,
   поэтому картинка и файл совпадают по определению.
   ===================================================================== */

/* Точки профиля витка: [смещение по радиусу, смещение по оси] */
function threadProfile(pitch, hT){
  return [
    [-0.12,        -0.34 * pitch],
    [ hT,          -0.15 * pitch],
    [ hT,           0.15 * pitch],
    [-0.12,         0.34 * pitch]
  ];
}

/* Вершины спирали. segPerTurn — сегментов на оборот. */
function helixVerts(rCore, hT, pitch, turns, z0, segPerTurn){
  const prof = threadProfile(pitch, hT);
  const N = Math.max(8, Math.round(turns * segPerTurn));
  const V = [];
  for (let i = 0; i <= N; i++) {
    const t = turns * i / N, a = 2 * Math.PI * t, z = z0 + pitch * t;
    const ca = Math.cos(a), sa = Math.sin(a);
    const ring = prof.map(([dr, dz]) => {
      const r = rCore + dr;
      return [r * ca, r * sa, z + dz];
    });
    V.push(ring);
  }
  return { V, N, M: prof.length };
}

/* Треугольники для three.js (ось вверх — Y, поэтому меняем местами z и y) */
function helixTris(rCore, hT, pitch, turns, z0, segPerTurn = 28){
  const { V, N, M } = helixVerts(rCore, hT, pitch, turns, z0, segPerTurn);
  const yUp = (p) => [p[0], p[2], p[1]];
  const T = [];
  for (let i = 0; i < N; i++)
    for (let j = 0; j < M; j++) {
      const j2 = (j + 1) % M;
      const A = yUp(V[i][j]), B = yUp(V[i][j2]), C = yUp(V[i+1][j2]), D = yUp(V[i+1][j]);
      T.push([A, B, C]); T.push([A, C, D]);
    }
  const cap = (ring, rev) => {
    const p = ring.map(yUp);
    const t = [[p[0], p[1], p[2]], [p[0], p[2], p[3]]];
    return rev ? t.map(x => [x[0], x[2], x[1]]) : t;
  };
  return T.concat(cap(V[0], true), cap(V[N], false));
}

/* polyhedron для OpenSCAD — те же вершины, те же грани */
function helixScad(rCore, hT, pitch, turns, z0, segPerTurn = 28, n = (v) => v.toFixed(3)){
  const { V, N, M } = helixVerts(rCore, hT, pitch, turns, z0, segPerTurn);
  const pts = [];
  for (const ring of V) for (const p of ring) pts.push(p);
  const idx = (i, j) => i * M + j;
  const faces = [];
  for (let i = 0; i < N; i++)
    for (let j = 0; j < M; j++) {
      const j2 = (j + 1) % M;
      faces.push([idx(i,j), idx(i,j2), idx(i+1,j2)]);
      faces.push([idx(i,j), idx(i+1,j2), idx(i+1,j)]);
    }
  faces.push([idx(0,0), idx(0,2), idx(0,1)]);
  faces.push([idx(0,0), idx(0,3), idx(0,2)]);
  faces.push([idx(N,0), idx(N,1), idx(N,2)]);
  faces.push([idx(N,0), idx(N,2), idx(N,3)]);
  return "polyhedron(points=[" +
    pts.map(p => "[" + p.map(n).join(",") + "]").join(",") +
    "], faces=[" + faces.map(f => "[" + f.join(",") + "]").join(",") + "], convexity=8)";
}

if (typeof module !== "undefined") module.exports = { helixTris, helixScad, threadProfile };
