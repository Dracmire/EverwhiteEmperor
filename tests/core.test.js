'use strict';
// Pruebas del motor. Ejecutar con: node --test tests/core.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../src/core.js');

const RAIZ = path.join(__dirname, '..');
function leer(rel) {
  return JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
}
function contexto() {
  const raw = {};
  Object.keys(Core.ARCHIVOS).forEach((k) => { raw[k] = leer('data/' + Core.ARCHIVOS[k]); });
  // Habilidades por clase (data/clases/<id>.json): se cargan todas las que existan.
  raw.clasesDetalle = {};
  fs.readdirSync(path.join(RAIZ, 'data', 'clases')).filter((n) => n.endsWith('.json')).forEach((n) => {
    const c = leer('data/clases/' + n);
    raw.clasesDetalle[c.id] = c;
  });
  return Core.armarContexto(raw);
}
const ejemplo = () => leer('characters/ejemplo.json');

// Personaje mínimo para casos sintéticos.
function pj(entradasPorSesion, extra) {
  return Object.assign({
    personaje: 't', nombre: 'Test', raza: 'raza-ejemplo', clase: 'fighter',
    atributos: { STR: 17, DEX: 13, PER: 12, INT: 10, WIS: 12, CHA: 8 },
    extremidades: ['mano-derecha', 'mano-izquierda', 'pie-derecho', 'pie-izquierdo'],
    sesiones: entradasPorSesion.map((entradas, i) => ({ id: 's' + i, fecha: '2026-01-0' + (i + 1), titulo: 'S' + i, entradas: entradas })),
  }, extra || {});
}
const xp = (n) => ({ tipo: 'ajuste', campo: 'xp', cantidad: n, motivo: 'inicio' });
const errores = (r) => r.avisos.filter((a) => a.nivel === 'error').map((a) => a.mensaje);

// ----------------------------------------------------------------- XP y niveles

test('XP por criatura según Δ (nivel 7, base 40, heroico)', () => {
  const ctx = contexto();
  const tabla = { 10: 60, 9: 60, 8: 50, 7: 40, 6: 20, 5: 10, 4: 1, 3: 0 };
  Object.keys(tabla).forEach((nv) => {
    const r = Core.calcularXpEntrada(ctx.config, 7, {
      tags: [{ id: 'close-quarter-combat', grado: 'heroico' }], nivelContenido: Number(nv), cantidad: 1,
    });
    assert.equal(r.unidad, tabla[nv], 'contenido de nivel ' + nv);
  });
});

test('fronteras de nivel', () => {
  const cfg = contexto().config;
  assert.equal(Core.nivelDeXp(0, cfg).nivel, 1);
  assert.equal(Core.nivelDeXp(999, cfg).nivel, 1);
  assert.equal(Core.nivelDeXp(1000, cfg).nivel, 2);
  assert.equal(Core.nivelDeXp(14000, cfg).nivel, 15);
  assert.equal(Core.nivelDeXp(15000, cfg).nivel, 16);
  const a = Core.nivelDeXp(6999, cfg);
  assert.equal(a.nivel, 7);
  assert.ok(Math.abs(a.progreso - 0.999) < 1e-9);
  const b = Core.nivelDeXp(7000, cfg);
  assert.equal(b.nivel, 8);
  assert.equal(b.progreso, 0);
  assert.equal(Core.nivelDeXp(99999, cfg).nivel, 20);
});

test('grados de tag', () => {
  const ctx = contexto();
  const unidad = (tags) => Core.calcularXpEntrada(ctx.config, 7, { tags: tags, nivelContenido: 7, cantidad: 1 }).unidad;
  assert.equal(unidad([{ id: 'stealth', grado: 'cumple' }]), 10);
  assert.equal(unidad([{ id: 'stealth', grado: 'cumple', pct: 0.3 }]), 12);
  assert.equal(unidad([{ id: 'stealth', grado: 'heroico' }]), 40);
  assert.equal(unidad([{ id: 'close-quarter-combat', grado: 'cumple' }, { id: 'stealth', grado: 'heroico' }]), 40);
  assert.throws(() => unidad([{ id: 'stealth', grado: 'cumple', pct: 0.35 }]), /fuera del rango/);
  assert.throws(() => unidad([{ id: 'stealth', grado: 'heroico', pct: 0.5 }]), /solo se usa con el grado cumple/);
  assert.throws(() => unidad([{ id: 'stealth', grado: 'epico' }]), /no existe/);
});

test('no existe un tag global de combate; los tags de combate son específicos', () => {
  const ctx = contexto();
  assert.equal(ctx.config.tags.length, 41);
  assert.ok(!ctx.config.tags.some((t) => t.id === 'combat'));
  const ids = ctx.config.tags.filter((t) => t.grupo === 'combate').map((t) => t.id).sort();
  assert.deepEqual(ids, ['close-quarter-combat', 'combat-healer']);
  assert.throws(() => Core.calcularXpEntrada(ctx.config, 7, {
    tags: [{ id: 'combat', grado: 'heroico' }], nivelContenido: 7, cantidad: 1,
  }), /no existe en xp-config/);
  // El mismo contenido da XP distinta según el tag que se cumplió y con qué grado.
  const heroico = Core.calcularXpEntrada(ctx.config, 7, { tags: [{ id: 'combat-healer', grado: 'heroico' }], nivelContenido: 7, cantidad: 1 });
  const cumple = Core.calcularXpEntrada(ctx.config, 7, { tags: [{ id: 'close-quarter-combat', grado: 'cumple' }], nivelContenido: 7, cantidad: 1 });
  assert.equal(heroico.unidad, 40);
  assert.equal(cumple.unidad, 10);
});

test('caso de los esqueletos: 1,000 de nivel 1 suben de 4 a 5 y el siguiente da 0', () => {
  const ctx = contexto();
  const tags = [{ id: 'close-quarter-combat', grado: 'heroico' }];
  const r = Core.calcularPersonaje(ctx, pj([[
    xp(3000),
    { tipo: 'xp', tags: tags, nivelContenido: 1, cantidad: 1000 },
    { tipo: 'xp', tags: tags, nivelContenido: 1, cantidad: 1 },
  ]]));
  assert.deepEqual(errores(r), []);
  assert.equal(r.xp, 4000);
  assert.equal(r.nivel.nivel, 5);
  assert.equal(r.sesiones[0].filasXp[2].total, 0);
});

test('un ajuste manual exige motivo y no deja la XP en negativo', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[
    { tipo: 'ajuste', campo: 'xp', cantidad: 100 },
    xp(50),
    { tipo: 'ajuste', campo: 'xp', cantidad: -500, motivo: 'drenaje' },
  ]]));
  assert.equal(r.xp, 50);
  assert.equal(errores(r).length, 2);
});

// ------------------------------------------------------------------------- zeo

test('el costo de una técnica por rango es 10, 20, 30, 50 y 80 sx y no depende de las ramas', () => {
  const zeo = contexto().zeo;
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => Core.costoRango(zeo, n)), [10, 20, 30, 50, 80]);
  // Los sx no suben ramas: 500 sx en heaven sin técnicas dejan todo en 0.
  const r = Core.calcularPersonaje(contexto(), pj([[{ tipo: 'xp-subsistema', subsistema: 'zeo', rama: 'heaven', cantidad: 500 }]]));
  assert.deepEqual(r.zeo.ramas.map((x) => [x.rama, x.nivel, x.sx]), [['heaven', 0, 500], ['void', 0, 0], ['earth', 0, 0]]);
  assert.equal(r.zeo.nivel, 0);
});

test('niveles de zeo: la rama vale su técnica más alta y el nivel zeo es el promedio de las tres', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[
    tec('L01', 1, 'Sentir el Ki'), tec('L01', 2, 'Ki Mark'), tec('L01', 2, 'Ki Vision'), tec('L01', 3, 'Sense Burst'),
    tec('L02', 1, 'Katón'), tec('L02', 2, 'Hearthwarm'),
    tec('L03', 1, 'Meditación'), tec('L03', 2, 'Battle Mind'),
    tec('L04', 1, 'Blank Mind'),
    tec('L05', 1, 'Técnica del Escape'),
  ]]));
  assert.deepEqual(errores(r), []);
  assert.deepEqual(r.zeo.ramas.map((x) => [x.rama, x.nivel]), [['heaven', 3], ['void', 2], ['earth', 1]]);
  assert.equal(r.zeo.suma, 6);
  assert.equal(r.zeo.nivel, 2);
  assert.equal(r.zeo.nivelEntero, 2);
  assert.deepEqual([r.zeo.activas, r.zeo.porActivar], [5, 0]);
  // El nivel de una línea es el rango más alto que alcanzó.
  assert.deepEqual(r.zeo.lineas.slice(0, 5).map((l) => l.nivelMax), [3, 2, 2, 1, 1]);
  // Sin promedio exacto el nivel queda fraccionario y el entero baja.
  const r2 = Core.calcularPersonaje(ctx, pj([[tec('L01', 1, 'Sentir el Ki'), tec('L02', 1, 'Meditación')]]));
  assert.equal(r2.zeo.suma, 2);
  assert.ok(Math.abs(r2.zeo.nivel - 2 / 3) < 1e-9);
  assert.equal(r2.zeo.nivelEntero, 0);
});

test('líneas por activar: no cuentan hasta pagarse, cuestan 10 + activas + nivel zeo y no admiten mejoras', () => {
  const ctx = contexto();
  const base = [
    tec('L01', 1, 'Sentir el Ki'), tec('L01', 2, 'Ki Mark'),
    tec('L02', 1, 'Meditación'), tec('L02', 2, 'Battle Mind'),
    tec('L03', 1, 'Salto Flotante', { activa: false }),
    tec('L04', 1, 'Técnica de Muerte', { activa: false }),
  ];
  const r = Core.calcularPersonaje(ctx, pj([base]));
  assert.deepEqual(errores(r), []);
  // Heaven 2 y void 2; las dos líneas earth no cuentan: zeo = 4 / 3.
  assert.deepEqual(r.zeo.ramas.map((x) => [x.rama, x.nivel]), [['heaven', 2], ['void', 2], ['earth', 0]]);
  assert.equal(r.zeo.nivelEntero, 1);
  assert.deepEqual([r.zeo.activas, r.zeo.porActivar], [2, 2]);
  // Costo: 10 base + 2 líneas activas + nivel zeo 1.
  assert.equal(r.zeo.costoActivar, 13);
  assert.deepEqual(r.zeo.lineas.slice(0, 4).map((l) => [l.activa, l.costoActivar]), [[true, null], [true, null], [false, 13], [false, 13]]);
  assert.equal(r.zeo.lineas[2].raiz.nombre, 'Salto Flotante');
  assert.deepEqual(r.zeo.slots, { total: 10, ocupados: 4, libres: 6, primeraLibre: 'L05' });
  // Una mejora en una línea por activar se rechaza; activar sí y sube los niveles.
  const r2 = Core.calcularPersonaje(ctx, pj([base.concat([
    tec('L03', 2, 'Quickness'),
    { tipo: 'zeo-activar', linea: 'L03' },
    { tipo: 'zeo-activar', linea: 'L03' },
    { tipo: 'zeo-activar', linea: 'L09' },
  ])]));
  const msgs = errores(r2);
  assert.equal(msgs.length, 3);
  assert.match(msgs[0], /L03 está por activar \(cuesta 13 sx\)/);
  assert.match(msgs[1], /L03 ya está activa/);
  assert.match(msgs[2], /L09.*no tiene técnica raíz/);
  assert.equal(r2.zeo.lineas[2].activa, true);
  assert.deepEqual(r2.zeo.ramas.map((x) => [x.rama, x.nivel]), [['heaven', 2], ['void', 2], ['earth', 1]]);
  assert.deepEqual([r2.zeo.activas, r2.zeo.porActivar], [3, 1]);
  assert.equal(r2.zeo.costoActivar, 10 + 3 + 1);
  // El costo de cada activación sale en la sesión.
  assert.deepEqual(r2.sesiones[0].activaciones, [{ linea: 'L03', nombre: 'Salto Flotante', costo: 13 }]);
  // `activa` debe ser booleano y solo va en la raíz.
  const r3 = Core.calcularPersonaje(ctx, pj([[tec('L01', 1, 'Blank Mind', { activa: 'no' }), tec('L01', 1, 'Blank Mind', { activa: false }), tec('L01', 2, 'Dual Mind', { activa: false })]]));
  assert.equal(errores(r3).length, 2);
});

test('opciones visibles: 3 al abrir un nivel, +1 por técnica extra del nivel anterior y tope por nivel', () => {
  const zeo = contexto().zeo;
  assert.deepEqual(zeo.lineas.opcionesPorNivel, [1, 3, 5, 5, 3]);
  const ver = (nivel, previas) => Core.opcionesVisibles(zeo, nivel, previas);
  // El nivel 1 es la técnica inicial: una sola, desde el inicio.
  assert.equal(ver(1, 0), 1);
  // Sin técnica en el nivel anterior no hay nada abierto.
  assert.deepEqual([2, 3, 4, 5].map((n) => ver(n, 0)), [0, 0, 0, 0]);
  // Una técnica abre 3; la segunda suma 1 y la tercera 1 más (tope del nivel).
  assert.deepEqual([1, 2, 3].map((k) => ver(3, k)), [3, 4, 5]);
  assert.deepEqual([1, 2, 3, 4, 5].map((k) => ver(4, k)), [3, 4, 5, 5, 5]);
  // Los niveles 2 y 5 se quedan en 3 aunque se tomen más técnicas en el nivel anterior.
  assert.deepEqual([1, 2, 3].map((k) => ver(2, k)), [3, 3, 3]);
  assert.deepEqual([1, 2, 3].map((k) => ver(5, k)), [3, 3, 3]);
});

test('una línea de técnicas: 5 niveles, lo tomado y lo que queda por tomar', () => {
  const zeo = contexto().zeo;
  const t = (nivel, nombre) => ({ nivel, nombre: nombre || null });
  const vacia = Core.detalleLinea('L01', [], zeo);
  assert.equal(vacia.ocupada, false);
  assert.equal(vacia.nivelMax, 0);
  assert.deepEqual(vacia.niveles.map((n) => n.visibles), [1, 0, 0, 0, 0]);
  const l = Core.detalleLinea('L02', [t(1), t(2), t(2), t(2), t(3)], zeo);
  assert.equal(l.ocupada, true);
  assert.equal(l.total, 5);
  assert.equal(l.nivelMax, 3);
  assert.deepEqual(l.niveles.map((n) => n.tomadas.length), [1, 3, 1, 0, 0]);
  // L1: 1 visible (la inicial); L2: 3; L3: 3 + 2 extras = 5; L4: 3 con 1 técnica en L3; L5 cerrado.
  assert.deepEqual(l.niveles.map((n) => n.visibles), [1, 3, 5, 3, 0]);
  assert.deepEqual(l.niveles.map((n) => n.libres), [0, 0, 4, 3, 0]);
  assert.deepEqual(l.niveles.map((n) => n.abierto), [true, true, true, true, false]);
});

test('zeo exige rama; zeo-tecnica exige línea, nivel y cadena; zeo-linea ya no existe', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[
    { tipo: 'xp-subsistema', subsistema: 'zeo', cantidad: 5 },
    { tipo: 'xp-subsistema', subsistema: 'zeo', rama: 'sombra', cantidad: 5 },
    { tipo: 'xp-subsistema', subsistema: 'racial', cantidad: 5 },
    { tipo: 'zeo-tecnica', linea: 'L12', nivel: 1 },
    { tipo: 'zeo-tecnica', linea: 'L10', nivel: 6 },
    { tipo: 'zeo-linea', linea: 'L10', niveles: 1 },
    { tipo: 'zeo-tecnica', linea: 'L10', nivel: 2 },
    { tipo: 'zeo-tecnica', linea: 'L10', nivel: 1, tecnica: '  ' },
    { tipo: 'zeo-tecnica', linea: 'L10', nivel: 1, tecnica: 'Garra de escarcha' },
    { tipo: 'xp-subsistema', subsistema: 'zeo', rama: 'void', cantidad: 5 },
  ]]));
  assert.equal(errores(r).length, 8);
  assert.equal(r.zeo.ramas.find((x) => x.rama === 'void').sx, 5);
  assert.equal(r.zeo.lineas[9].total, 1);
  assert.equal(r.zeo.lineas[9].niveles[0].tomadas[0].nombre, 'Garra de escarcha');
});

test('zeo-tecnica: cadena de niveles, tope de opciones y nombres repetidos', () => {
  const ctx = contexto();
  const tec = (nivel, tecnica) => (tecnica ? { tipo: 'zeo-tecnica', linea: 'L03', nivel, tecnica } : { tipo: 'zeo-tecnica', linea: 'L03', nivel });
  // L1 (una sola técnica inicial) abre 3 opciones en L2; tomar 4 en L2 no cabe; repetir el nombre de L1 también da error.
  const r = Core.calcularPersonaje(ctx, pj([[
    tec(1, 'A'),
    tec(2), tec(2), tec(2), tec(2),
    tec(1, 'a'),
  ]]));
  const msgs = errores(r);
  assert.equal(msgs.length, 2);
  assert.match(msgs[0], /L03: el nivel 2 solo muestra 3 opciones y ya están tomadas/);
  assert.match(msgs[1], /la técnica "a" ya está tomada en L03/);
  const l = r.zeo.lineas[2];
  assert.deepEqual(l.niveles.map((n) => n.tomadas.length), [1, 3, 0, 0, 0]);
  // Cada técnica extra del nivel 2 suma una opción al 3, hasta 5.
  const r2 = Core.calcularPersonaje(ctx, pj([[tec(1), tec(2), tec(2), tec(2), tec(3), tec(3), tec(3), tec(3), tec(3), tec(3)]]));
  assert.equal(errores(r2).length, 1);
  assert.deepEqual(r2.zeo.lineas[2].niveles.map((n) => n.tomadas.length), [1, 3, 5, 0, 0]);
  assert.equal(r2.zeo.lineas[2].niveles[2].visibles, 5);
});

test('zeo: los slots de línea (ocupados y libres) y la primera libre', () => {
  const ctx = contexto();
  const vacio = Core.calcularPersonaje(ctx, pj([[xp(0)]]));
  assert.deepEqual(vacio.zeo.slots, { total: 10, ocupados: 0, libres: 10, primeraLibre: 'L01' });
  const algo = Core.calcularPersonaje(ctx, pj([[
    { tipo: 'zeo-tecnica', linea: 'L01', nivel: 1 },
    { tipo: 'zeo-tecnica', linea: 'L03', nivel: 1 },
  ]]));
  assert.deepEqual(algo.zeo.slots, { total: 10, ocupados: 2, libres: 8, primeraLibre: 'L02' });
  assert.deepEqual(algo.zeo.reglas, { opcionesPorNivel: [1, 3, 5, 5, 3], opcionesBase: 3, extraPorTecnica: 1 });
});

// ------------------------------------------------- catálogo de técnicas Zeo (data/zeo-tecnicas.json)

const tec = (linea, nivel, tecnica, extra) => Object.assign({ tipo: 'zeo-tecnica', linea, nivel, tecnica }, extra || {});

test('el catálogo de técnicas Zeo es consistente: ids únicos, ramas válidas y niveles 2 a 5', () => {
  const ctx = contexto();
  assert.ok(ctx.zeoTecnicas.length >= 14);
  const ids = new Set();
  ctx.zeoTecnicas.forEach((l) => {
    assert.ok(ctx.zeo.ramas.includes(l.rama), l.id + ': rama ' + l.rama);
    assert.ok(l.origen === null || typeof l.origen === 'string', l.id);
    [l].concat([2, 3, 4, 5].reduce((a, n) => a.concat(l.niveles[n] || []), [])).forEach((x) => {
      assert.ok(x.id && x.nombre, l.id);
      assert.ok(!ids.has(x.id), 'id repetido: ' + x.id);
      ids.add(x.id);
    });
  });
  assert.equal(ctx.zeoTecnicas.filter((l) => l.origen === null).length, 10);
});

test('zeo-tecnica con catálogo: la raíz se resuelve por nombre o id y la línea la muestra', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[tec('L01', 1, 'sentir el ki'), tec('L02', 1, 'traccion-de-ki'), tec('L01', 2, 'Ki Mark')]]));
  assert.deepEqual(errores(r), []);
  const l1 = r.zeo.lineas[0];
  assert.equal(l1.raiz.nombre, 'Sentir el Ki');
  assert.equal(l1.raiz.id, 'sentir-el-ki');
  assert.equal(l1.rama, 'heaven');
  assert.equal(l1.extra, false);
  assert.equal(l1.niveles[1].tomadas[0].nombre, 'Ki Mark');
  assert.equal(l1.niveles[1].tomadas[0].rama, 'heaven');
  assert.equal(l1.niveles[1].tomadas[0].catalogo, true);
  assert.equal(r.zeo.lineas[1].raiz.nombre, 'Tracción de Ki');
  // Las opciones del nivel 2 salen del catálogo y marcan lo tomado.
  assert.deepEqual(l1.niveles[1].opciones.map((o) => [o.nombre, o.tomada]), [['Ki Mark', true], ['Ki Vision', false], ['Sensitive Ki', false]]);
  assert.deepEqual(l1.niveles[0].opciones, []);
  // El catálogo del resultado dice qué raíces ya están en uso.
  const usada = (id) => r.zeo.catalogo.find((c) => c.id === id).usada;
  assert.equal(usada('sentir-el-ki'), 'L01');
  assert.equal(usada('tracción-de-ki'.normalize('NFD').replace(/[̀-ͯ]/g, '')), 'L02');
  assert.equal(usada('blank-mind'), null);
});

test('zeo-tecnica con catálogo: rechaza mejoras ajenas, de otro nivel o raíces repetidas', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[
    tec('L01', 1, 'Sentir el Ki'),
    tec('L01', 2, 'Wall Runner'),        // es de Tracción de Ki
    tec('L01', 2, 'Sense Burst'),        // es de nivel 3
    tec('L01', 2, 'Meditación'),         // es una raíz
    tec('L02', 1, 'Ki Mark'),            // es una mejora, no una raíz
    tec('L02', 1, 'Sentir el Ki'),       // ya es la raíz de L01
    tec('L01', 2, 'Ki Vision'),          // bien
    tec('L01', 2, 'ki vision'),          // repetida
  ]]));
  const msgs = errores(r);
  assert.equal(msgs.length, 6);
  assert.match(msgs[0], /Wall Runner.*mejora de Tracción de Ki.*no de la línea L01 \(Sentir el Ki\)/);
  assert.match(msgs[1], /Sense Burst.*es de nivel 3, no del 2/);
  assert.match(msgs[2], /Meditación.*técnica raíz/);
  assert.match(msgs[3], /Ki Mark.*mejora de nivel 2 de Sentir el Ki.*no una técnica raíz/);
  assert.match(msgs[4], /Sentir el Ki.*ya es la raíz de L01/);
  assert.match(msgs[5], /ya está tomada en L01/);
  assert.equal(r.zeo.lineas[0].total, 2);
});

test('zeo-tecnica: una línea con raíz libre acepta nombres libres, pero no mejoras de otra línea del catálogo', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[
    tec('L01', 1, 'Garra de escarcha', { rama: 'void', descripcion: 'Congela al tocar.' }),
    tec('L01', 2, 'Aliento helado'),
    tec('L01', 2, 'Ki Mark'),
    tec('L02', 1, 'Otra', { rama: 'sombra' }),
  ]]));
  const msgs = errores(r);
  assert.equal(msgs.length, 2);
  assert.match(msgs[0], /Ki Mark.*mejora de Sentir el Ki.*no de la línea L01 \(Garra de escarcha\)/);
  assert.match(msgs[1], /rama de la técnica/);
  const l = r.zeo.lineas[0];
  assert.equal(l.raiz.catalogo, false);
  assert.equal(l.raiz.descripcion, 'Congela al tocar.');
  assert.equal(l.rama, 'void');
  assert.equal(l.niveles[1].tomadas[0].rama, 'void');
  assert.deepEqual(l.niveles[1].opciones, []);
});

test('zeo-tecnica: más allá de los 10 slots las líneas siguen en orden (L11, L12…) y no piden origen', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[
    tec('L12', 1, 'Algo libre'),                                  // salta L11
    tec('L11', 1, 'Algo libre'),
    tec('L12', 1, 'Pasivo de logro', { origen: 'Round 1 - Evil Locket', descripcion: 'Dowsing.' }),
    tec('L11', 2, 'Segunda'),
    tec('L14', 1, 'Nada'),                                        // no existe todavía
  ]]));
  const msgs = errores(r);
  assert.equal(msgs.length, 2);
  assert.match(msgs[0], /la línea "L12" no existe/);
  assert.match(msgs[1], /la línea "L14" no existe/);
  assert.equal(r.zeo.lineas.length, 12);
  assert.deepEqual(r.zeo.slots, { total: 10, ocupados: 0, libres: 10, primeraLibre: 'L01' });
  assert.deepEqual(r.zeo.extras, { total: 2, proxima: 'L13' });
  assert.equal(r.zeo.lineas[10].extra, true);
  assert.equal(r.zeo.lineas[11].raiz.origen, 'Round 1 - Evil Locket');
});

test('zeo-tecnica: el origen es una nota del registro; una raíz «de fuera» cabe en cualquier slot y lo trae por defecto', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[tec('L05', 1, 'Jutsu de Sombras'), tec('L06', 1, 'Buki no Sendo', { origen: 'Ninja (ronda 2)' }), tec('L06', 2, 'Swift Sword Path')]]));
  assert.deepEqual(errores(r), []);
  assert.equal(r.zeo.lineas[4].raiz.origen, 'Werewolf');
  assert.equal(r.zeo.lineas[5].raiz.origen, 'Ninja (ronda 2)');
  assert.equal(r.zeo.lineas[4].extra, false);
});

test('zeo-tecnica: origen y descripcion deben ser textos; la descripción propia gana a la del catálogo', () => {
  const ctx = contexto();
  const copia = JSON.parse(JSON.stringify(ctx));
  copia.zeoTecnicas.find((l) => l.id === 'katon').descripcion = 'Ki en fuego.';
  const r = Core.calcularPersonaje(copia, pj([[
    tec('L01', 1, 'Katón'),
    tec('L02', 1, 'Blank Mind', { origen: ' ' }),
    tec('L02', 1, 'Blank Mind', { descripcion: 3 }),
    tec('L02', 1, 'Blank Mind', { descripcion: 'Mente en blanco.' }),
  ]]));
  assert.equal(errores(r).length, 2);
  assert.equal(r.zeo.lineas[0].raiz.descripcion, 'Ki en fuego.');
  assert.equal(r.zeo.lineas[1].raiz.descripcion, 'Mente en blanco.');
});

test('habilidades y tag de XP del personaje: deben existir como tags de xp-config', () => {
  const ctx = contexto();
  const ok = Core.calcularPersonaje(ctx, pj([[xp(0)]], { habilidades: ['stealth', 'climb'], tagXp: 'tracker' }));
  assert.deepEqual(errores(ok), []);
  assert.deepEqual(ok.personaje.habilidades.map((h) => h.id), ['stealth', 'climb']);
  assert.equal(ok.personaje.habilidades[0].nombre, 'Sigilo');
  assert.deepEqual(ok.personaje.tagXp, { id: 'tracker', nombre: 'Rastreo' });
  const mal = Core.calcularPersonaje(ctx, pj([[xp(0)]], { habilidades: ['stealth', 'volar-alto', 'stealth'], tagXp: 'nada' }));
  assert.equal(errores(mal).length, 3);
  const sin = Core.calcularPersonaje(ctx, pj([[xp(0)]]));
  assert.deepEqual([sin.personaje.habilidades, sin.personaje.tagXp], [[], null]);
});

// ------------------------------------------------------- feats y achievements

test('slots de feats de Pathfinder 1e', () => {
  const casos = [[1, 1], [2, 1], [3, 2], [7, 4], [15, 8], [20, 10]];
  casos.forEach(([nivel, slots]) => assert.equal(Core.slotsDeFeats(nivel), slots, 'nivel ' + nivel));
});

test('un feat sin slot libre o sin requisitos es rechazado', () => {
  const ctx = contexto();
  // Nivel 1 (0 XP): un slot.
  const r = Core.calcularPersonaje(ctx, pj([[
    { tipo: 'feat', id: 'toughness' },
    { tipo: 'feat', id: 'iron-will' },
  ]]));
  assert.equal(r.feats.lista.length, 1);
  assert.match(errores(r)[0], /no hay slot de feat libre en el nivel 1/);
  // Power Attack exige STR 13.
  const debil = Core.calcularPersonaje(ctx, pj([[{ tipo: 'feat', id: 'power-attack' }]], { atributos: { STR: 10, DEX: 10, PER: 10, INT: 10, WIS: 10, CHA: 10 } }));
  assert.match(errores(debil)[0], /exige STR 13/);
  // Un feat repetido o inexistente.
  const raro = Core.calcularPersonaje(ctx, pj([[xp(3000), { tipo: 'feat', id: 'toughness' }, { tipo: 'feat', id: 'toughness' }, { tipo: 'feat', id: 'no-existe' }]]));
  assert.equal(errores(raro).length, 2);
});

test('los feats activos se reclasifican como habilidades tipo conjuro', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[xp(6000), { tipo: 'feat', id: 'power-attack' }, { tipo: 'feat', id: 'iron-will' }]]));
  const pa = r.feats.lista.find((f) => f.id === 'power-attack');
  assert.equal(pa.tipo, 'habilidad-tipo-conjuro');
  assert.equal(pa.convertidoDe, 'power-attack');
  assert.equal(r.feats.lista.find((f) => f.id === 'iron-will').tipo, 'feat');
});

test('máximo 1 achievement feat por nivel', () => {
  const ctx = contexto();
  ctx.achievements = ctx.achievements.concat([{ id: 'otro', nombre: 'Otro' }, { id: 'tercero', nombre: 'Tercero' }]);
  const r = Core.calcularPersonaje(ctx, pj([
    [xp(6000), { tipo: 'achievement', id: 'guardian-del-paso', fate: 1 }, { tipo: 'achievement', id: 'otro' }],
    [xp(1000), { tipo: 'achievement', id: 'tercero', fate: 2 }],
  ]));
  assert.equal(errores(r).length, 1);
  assert.match(errores(r)[0], /máximo 1 por nivel/);
  assert.equal(r.logros.length, 2);
  assert.deepEqual(r.logros.map((l) => l.nivel), [7, 8]);
  assert.equal(r.fate, 3);
});

test('el saldo de fate no puede quedar negativo al cierre de la sesión', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[{ tipo: 'fate', cantidad: -1, motivo: 'gasto' }]]));
  assert.ok(errores(r).some((m) => /saldo de fate/.test(m)));
});

// ------------------------------------------------------- méritos y racials

test('puntos iniciales floor(n/2)+1', () => {
  const ctx = contexto();
  // XP → nivel 1, 2, 7, 15 y 20: puntos 1, 2, 4, 8 y 11 (spec sección 12).
  [[0, 1], [1000, 2], [6000, 4], [14000, 8], [19000, 11]].forEach(([x, iniciales]) => {
    const r = Core.calcularPersonaje(ctx, pj([[xp(x)]]));
    assert.equal(r.meritos.iniciales, iniciales, x + ' XP');
  });
});

test('racial: de otra raza se rechaza; de la propia baja el costo solo con perfil racial', () => {
  const ctx = contexto();
  ctx.razas = ctx.razas.concat([{ id: 'otra-raza', nombre: 'Otra', atributosPreferidos: ['DEX'], racials: [], descuentoPorRareza: { raro: 1 } }]);
  const ganar = [xp(6000), { tipo: 'rasgo', id: 'sangre-helada', accion: 'ganar' }];
  const ajena = Core.calcularPersonaje(ctx, pj([ganar], { raza: 'otra-raza' }));
  assert.match(errores(ajena)[0], /racial de otra raza/);
  const propia = Core.calcularPersonaje(ctx, pj([ganar]));
  assert.deepEqual(errores(propia), []);
  const sangre = propia.meritos.lista[0];
  assert.deepEqual([sangre.costoBase, sangre.descuento, sangre.puntos], [4, 1, 3]);
  // Sin el perfil (STR y DEX no son los más altos): sin descuento.
  const sinPerfil = Core.calcularPersonaje(ctx, pj([ganar], { atributos: { STR: 10, DEX: 10, PER: 16, INT: 10, WIS: 10, CHA: 10 } }));
  assert.equal(sinPerfil.personaje.perfilRacial, false);
  assert.deepEqual([sinPerfil.meritos.lista[0].descuento, sinPerfil.meritos.lista[0].puntos], [0, 4]);
});

test('el saldo de puntos no puede quedar negativo al cierre de la sesión', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[
    xp(0),
    { tipo: 'rasgo', id: 'reflejos-de-veterano', accion: 'ganar' },
    { tipo: 'rasgo', id: 'sangre-helada', accion: 'ganar' },
  ]]));
  assert.ok(errores(r).some((m) => /saldo de puntos/.test(m)));
  // 1 punto inicial − 2 (reflejos) − 3 (sangre helada con descuento) = −4
  assert.equal(r.meritos.total, -4);
});

// ------------------------------------------------------------------- equipo

test('equipo: arma y 3 objetos en 4 extremidades es válido y la armadura no usa extremidad', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[
    { tipo: 'objeto', id: 'espada-larga-1', accion: 'equipar', extremidad: 'mano-derecha' },
    { tipo: 'objeto', id: 'varita-curar-leves', accion: 'equipar', extremidad: 'mano-izquierda' },
    { tipo: 'objeto', id: 'botas-paso-silencioso', accion: 'equipar', extremidad: 'pie-derecho' },
    { tipo: 'objeto', id: 'tobillera-del-corredor', accion: 'equipar', extremidad: 'pie-izquierdo' },
    { tipo: 'objeto', id: 'cota-de-mallas-1', accion: 'equipar' },
  ]]));
  assert.deepEqual(errores(r), []);
  assert.deepEqual(r.equipo.conteo, { armadura: 1, arma: 1, objetos: 3 });
  assert.ok(r.equipo.porExtremidad.every((x) => x.item));
});

test('equipo: segundo objeto en una extremidad ocupada, cuarto objeto y segunda arma se rechazan', () => {
  const ctx = contexto();
  ctx.items = ctx.items.concat([
    { id: 'anillo', nombre: 'Anillo', tipo: 'objeto' },
    { id: 'daga', nombre: 'Daga', tipo: 'arma' },
    { id: 'gorro', nombre: 'Gorro', tipo: 'objeto' },
  ]);
  const base = [
    { tipo: 'objeto', id: 'espada-larga-1', accion: 'equipar', extremidad: 'mano-derecha' },
    { tipo: 'objeto', id: 'varita-curar-leves', accion: 'equipar', extremidad: 'mano-izquierda' },
    { tipo: 'objeto', id: 'botas-paso-silencioso', accion: 'equipar', extremidad: 'pie-derecho' },
  ];
  const ocupada = Core.calcularPersonaje(ctx, pj([base.concat([{ tipo: 'objeto', id: 'anillo', accion: 'equipar', extremidad: 'mano-izquierda' }])]));
  assert.match(errores(ocupada)[0], /ya sostiene/);
  const cuarto = Core.calcularPersonaje(ctx, pj([base.concat([
    { tipo: 'objeto', id: 'tobillera-del-corredor', accion: 'equipar', extremidad: 'pie-izquierdo' },
    { tipo: 'objeto', id: 'gorro', accion: 'equipar', extremidad: 'cabeza' },
  ])], { extremidades: ['mano-derecha', 'mano-izquierda', 'pie-derecho', 'pie-izquierdo', 'cabeza'] }));
  assert.match(errores(cuarto)[0], /objetos mágicos \(3\)/);
  const arma2 = Core.calcularPersonaje(ctx, pj([base.concat([{ tipo: 'objeto', id: 'daga', accion: 'equipar', extremidad: 'pie-izquierdo' }])]));
  assert.match(errores(arma2)[0], /arma \(1\)/);
  const sinMano = Core.calcularPersonaje(ctx, pj([[{ tipo: 'objeto', id: 'anillo', accion: 'equipar', extremidad: 'cola' }]]));
  assert.match(errores(sinMano)[0], /no tiene la extremidad/);
});

test('cargas: parten en el máximo, usar resta 1, recargar vuelve al máximo', () => {
  const ctx = contexto();
  const equipar = { tipo: 'objeto', id: 'tobillera-del-corredor', accion: 'equipar', extremidad: 'pie-izquierdo' };
  const usar = { tipo: 'objeto', id: 'tobillera-del-corredor', accion: 'usar-carga' };
  const r = Core.calcularPersonaje(ctx, pj([[equipar, usar, usar]]));
  assert.equal(r.equipo.objetos[0].cargas.actuales, 1);
  const r2 = Core.calcularPersonaje(ctx, pj([[equipar, usar, usar, usar, usar]]));
  assert.match(errores(r2)[0], /no tiene cargas disponibles/);
  const r3 = Core.calcularPersonaje(ctx, pj([[equipar, usar, usar, { tipo: 'objeto', id: 'tobillera-del-corredor', accion: 'recargar' }]]));
  assert.equal(r3.equipo.objetos[0].cargas.actuales, 3);
});

// ------------------------------------------------------------------- traits

test('traits: colecciones de ventajas o feats; los componentes deben existir', () => {
  const ctx = contexto();
  ctx.traits = [
    { id: 'linaje', nombre: 'Linaje de escarcha', incluye: [{ tipo: 'merito', id: 'sangre-helada' }, { tipo: 'feat', id: 'iron-will' }] },
    { id: 'roto', nombre: 'Trait roto', incluye: [{ tipo: 'feat', id: 'no-existe' }] },
  ];
  const r = Core.calcularPersonaje(ctx, pj([[
    { tipo: 'trait', id: 'linaje', accion: 'ganar' },
    { tipo: 'trait', id: 'roto', accion: 'ganar' },
    { tipo: 'trait', id: 'linaje', accion: 'ganar' },
  ]]));
  assert.equal(errores(r).length, 2);
  assert.equal(r.traits.length, 1);
  assert.deepEqual(r.traits[0].incluye.map((c) => c.nombre), ['Sangre helada', 'Iron Will']);
  const sinTrait = Core.calcularPersonaje(ctx, pj([[{ tipo: 'trait', id: 'linaje', accion: 'ganar' }, { tipo: 'trait', id: 'linaje', accion: 'perder' }]]));
  assert.equal(sinTrait.traits.length, 0);
});

test('tipos de entrada desconocidos se reportan', () => {
  const r = Core.calcularPersonaje(contexto(), pj([[{ tipo: 'baile' }]]));
  assert.match(errores(r)[0], /desconocido/);
});

// ---------------------------------------------- feats: catálogo y requisitos

test('slots de feats: 1 en el nivel 1 y uno más cada 2 niveles (4 en el nivel 7)', () => {
  const casos = [[1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3], [7, 4], [8, 4], [9, 5], [19, 10], [20, 10]];
  casos.forEach(([nivel, slots]) => assert.equal(Core.slotsDeFeats(nivel), slots, 'nivel ' + nivel));
});

test('ataque base por progresión de clase', () => {
  const clases = contexto().classes;
  const de = (id) => clases.find((c) => c.id === id);
  assert.deepEqual([1, 7, 20].map((n) => Core.babDeClase(de('fighter'), n)), [1, 7, 20]);
  assert.deepEqual([1, 7, 20].map((n) => Core.babDeClase(de('rogue'), n)), [0, 5, 15]);
  assert.deepEqual([1, 7, 20].map((n) => Core.babDeClase(de('wizard'), n)), [0, 3, 10]);
  assert.equal(Core.babDeClase(null, 5), null);
  assert.equal(Core.babDeClase({ id: 'x' }, 5), null);
});

test('el ataque base de la clase decide si se cumple un requisito de BAB', () => {
  const ctx = contexto();
  // Power Attack: STR 13 y ataque base +1. Un mago de nivel 1 tiene +0.
  const mago = Core.calcularPersonaje(ctx, pj([[{ tipo: 'feat', id: 'power-attack' }]], { clase: 'wizard' }));
  assert.equal(mago.feats.lista.length, 0);
  assert.match(errores(mago)[0], /exige Ataque base \+1/);
  // Un guerrero de nivel 1 tiene +1.
  const guerrero = Core.calcularPersonaje(ctx, pj([[{ tipo: 'feat', id: 'power-attack' }]]));
  assert.deepEqual(errores(guerrero), []);
  // Cadena Power Attack → Cleave → Great Cleave (BAB +4): un guerrero de nivel 7 la completa si tiene slots.
  const cadena = Core.calcularPersonaje(ctx, pj([[xp(6000), { tipo: 'feat', id: 'power-attack' }, { tipo: 'feat', id: 'cleave' }, { tipo: 'feat', id: 'great-cleave' }]]));
  assert.deepEqual(errores(cadena), []);
  // Sin el feat previo no hay Great Cleave.
  const salto = Core.calcularPersonaje(ctx, pj([[xp(6000), { tipo: 'feat', id: 'great-cleave' }]]));
  assert.match(errores(salto)[0], /exige .*Cleave/);
});

test('requisitos: ataque base alternativo por clase, nivel de clase y nivel de personaje', () => {
  const ctx = contexto();
  const clases = ctx.classes;
  const jug = (claseId, nivel, extra) => Object.assign({ atributos: {}, nivel: nivel, claseId: claseId, clase: clases.find((c) => c.id === claseId), feats: [] }, extra || {});
  const estados = (f, j) => Core.evaluarRequisitos(f, j, {}).detalle.map((d) => d.estado);
  // "ataque base +6 o monje nivel 5": un monje de nivel 5 tiene BAB +3 pero cumple por clase.
  const alt = { requisitos: { bab: 6, babAlt: { clase: 'monk', nivel: 5 } } };
  assert.deepEqual(estados(alt, jug('monk', 5)), ['cumple']);
  assert.deepEqual(estados(alt, jug('monk', 4)), ['falta']);
  assert.deepEqual(estados(alt, jug('fighter', 6)), ['cumple']);
  assert.deepEqual(estados(alt, jug('wizard', 6)), ['falta']);
  // Nivel de clase: otra clase nunca cumple.
  const nc = { requisitos: { nivelClase: { clase: 'fighter', nivel: 4 } } };
  assert.deepEqual(estados(nc, jug('fighter', 4)), ['cumple']);
  assert.deepEqual(estados(nc, jug('fighter', 3)), ['falta']);
  assert.deepEqual(estados(nc, jug('rogue', 10)), ['falta']);
  // Nivel de personaje.
  const np = { requisitos: { nivelPj: 11 } };
  assert.deepEqual([estados(np, jug('fighter', 10)), estados(np, jug('fighter', 11))], [['falta'], ['cumple']]);
  // Sin clase conocida el ataque base queda sin verificar, no se rechaza.
  assert.deepEqual(estados({ requisitos: { bab: 3 } }, jug('inventada', 7, { clase: null })), ['sin-verificar']);
});

test('feats que se pueden tomar varias veces llevan una elección', () => {
  const ctx = contexto();
  const base = [xp(2000), { tipo: 'feat', id: 'weapon-focus', eleccion: 'espada larga' }, { tipo: 'feat', id: 'weapon-focus', eleccion: 'arco corto' }];
  const r = Core.calcularPersonaje(ctx, pj([base]));
  assert.deepEqual(errores(r), []);
  assert.deepEqual(r.feats.lista.map((f) => f.nombre), ['Weapon Focus (espada larga)', 'Weapon Focus (arco corto)']);
  // La misma elección dos veces no vale.
  const igual = Core.calcularPersonaje(ctx, pj([[xp(2000), { tipo: 'feat', id: 'weapon-focus', eleccion: 'espada larga' }, { tipo: 'feat', id: 'weapon-focus', eleccion: ' espada larga ' }]]));
  assert.match(errores(igual)[0], /ya está ganado con la elección/);
  // Un feat que no es múltiple no se repite aunque cambie la elección.
  const unico = Core.calcularPersonaje(ctx, pj([[xp(2000), { tipo: 'feat', id: 'toughness' }, { tipo: 'feat', id: 'toughness', eleccion: 'otra' }]]));
  assert.match(errores(unico)[0], /ya está ganado/);
  // La elección debe ser texto.
  const malo = Core.calcularPersonaje(ctx, pj([[{ tipo: 'feat', id: 'weapon-focus', eleccion: 3 }]]));
  assert.match(errores(malo)[0], /eleccion debe ser un texto/);
});

test('los requisitos que el motor no evalúa quedan como "sin verificar" en el feat ganado', () => {
  const ctx = contexto();
  ctx.feats = ctx.feats.concat([{ id: 'rango-alto', nombre: 'Rango alto', requisitos: { otros: ['Acrobatics 3 ranks'] } }]);
  const r = Core.calcularPersonaje(ctx, pj([[{ tipo: 'feat', id: 'rango-alto' }]]));
  assert.deepEqual(errores(r), []);
  assert.deepEqual(r.feats.lista[0].sinVerificar, ['Acrobatics 3 ranks']);
});

test('las decisiones de data/feats.conversiones.json se aplican sobre el catálogo', () => {
  const raw = {};
  Object.keys(Core.ARCHIVOS).forEach((k) => { raw[k] = leer('data/' + Core.ARCHIVOS[k]); });
  const base = Core.armarContexto(raw);
  assert.equal(base.feats.find((f) => f.id === 'power-attack').ejecucion, 'activo');
  assert.equal(base.feats.find((f) => f.id === 'toughness').ejecucion, 'pasivo');
  raw.conversiones = { conversiones: { toughness: { ejecucion: 'activo' }, 'iron-will': { ejecucion: 'activo', excepcion: true } } };
  const ctx = Core.armarContexto(raw);
  const r = Core.calcularPersonaje(ctx, pj([[xp(3000), { tipo: 'feat', id: 'toughness' }, { tipo: 'feat', id: 'iron-will' }]]));
  assert.equal(r.feats.lista.find((f) => f.id === 'toughness').tipo, 'habilidad-tipo-conjuro');
  assert.equal(r.feats.lista.find((f) => f.id === 'iron-will').tipo, 'feat'); // excepción: se queda como feat
});

test('el catálogo importado es consistente', () => {
  const ctx = contexto();
  const ids = new Set(ctx.feats.map((f) => f.id));
  assert.equal(ids.size, ctx.feats.length, 'ids únicos');
  assert.ok(ctx.feats.length > 600, 'catálogo cargado');
  const tipos = new Set(['general', 'combate', 'metamagia', 'creacion-de-objetos']);
  const clases = new Set(ctx.classes.map((c) => c.id));
  const por = Object.fromEntries(ctx.feats.map((f) => [f.id, f]));
  ctx.feats.forEach((f) => {
    assert.ok(f.nombre && f.fuente, f.id);
    if (f.tipo !== undefined) assert.ok(tipos.has(f.tipo), f.id + ' tipo ' + f.tipo);
    const req = f.requisitos || {};
    (req.feats || []).forEach((p) => assert.ok(ids.has(p), f.id + ' exige un feat que no existe: ' + p));
    if (req.nivelClase) assert.ok(clases.has(req.nivelClase.clase), f.id + ' clase ' + req.nivelClase.clase);
    if (req.babAlt) assert.ok(clases.has(req.babAlt.clase), f.id + ' clase ' + req.babAlt.clase);
    Object.keys(req.atributos || {}).forEach((k) => assert.ok(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].indexOf(k) >= 0, f.id + ' atributo ' + k));
  });
  // Sin ciclos de feats previos.
  const estado = {};
  const visita = (id) => {
    assert.notEqual(estado[id], 1, 'ciclo en ' + id);
    if (estado[id] === 2) return;
    estado[id] = 1;
    ((por[id].requisitos || {}).feats || []).forEach(visita);
    estado[id] = 2;
  };
  ctx.feats.forEach((f) => visita(f.id));
  // Todas las clases tienen progresión de ataque base.
  ctx.classes.forEach((c) => assert.ok(['completa', 'media', 'baja'].indexOf(c.bab) >= 0, c.id));
  assert.ok(clases.has('fighter') && clases.has('wizard'));
});

// ---------------------------------------------------- atributos derivados

test('CON, SPR y MND se derivan como el menor de sus dos atributos base', () => {
  const base = { STR: 17, DEX: 13, PER: 12, INT: 10, WIS: 12, CHA: 8 };
  assert.deepEqual(Core.derivarAtributos(base), { CON: 13, SPR: 8, MND: 10 });
  assert.deepEqual(Core.derivarAtributos({ STR: 9, DEX: 14, PER: 7, INT: 15, WIS: 11, CHA: 18 }), { CON: 9, SPR: 11, MND: 7 });
  assert.equal(Object.keys(Core.atributosCompletos(base)).length, 9);
  assert.deepEqual([Core.modAtributo(10), Core.modAtributo(11), Core.modAtributo(8), Core.modAtributo(7), Core.modAtributo(17)], [0, 0, -1, -2, 3]);
  const r = Core.calcularPersonaje(contexto(), pj([[xp(6000)]]));
  assert.deepEqual(r.personaje.derivados, { CON: 13, SPR: 8, MND: 10 });
  assert.deepEqual(Object.keys(r.personaje.atributos), ['STR', 'DEX', 'PER', 'INT', 'WIS', 'CHA']);
});

test('escribir un atributo derivado o dejar un base sin valor es un error', () => {
  const ctx = contexto();
  const conCon = Core.calcularPersonaje(ctx, pj([[xp(6000)]], { atributos: { STR: 17, DEX: 13, CON: 15, PER: 12, INT: 10, WIS: 12, CHA: 8 } }));
  assert.ok(errores(conCon).some((m) => /CON se deriva/.test(m)));
  assert.deepEqual(conCon.personaje.derivados.CON, 13, 'el valor escrito se ignora');
  const sinPer = Core.calcularPersonaje(ctx, pj([[xp(6000)]], { atributos: { STR: 17, DEX: 13, INT: 10, WIS: 12, CHA: 8 } }));
  assert.ok(errores(sinPer).some((m) => /PER falta/.test(m)));
  const raro = Core.calcularPersonaje(ctx, pj([[xp(6000)]], { atributos: { STR: 17, DEX: 13, PER: 12, INT: 10, WIS: 12, CHA: 8, LCK: 5 } }));
  assert.ok(errores(raro).some((m) => /desconocido: LCK/.test(m)));
});

test('los requisitos de atributo de un feat usan el CON derivado', () => {
  const ctx = contexto();
  ctx.feats = ctx.feats.concat([
    { id: 'prueba-con-14', nombre: 'Prueba CON 14', tipo: 'general', libro: 'x', fuente: 'prueba', requisitos: { atributos: { CON: 14 } } },
    { id: 'prueba-con-13', nombre: 'Prueba CON 13', tipo: 'general', libro: 'x', fuente: 'prueba', requisitos: { atributos: { CON: 13 } } },
  ]);
  // STR 17 y DEX 13: CON derivado = 13.
  const r = Core.calcularPersonaje(ctx, pj([[xp(6000), { tipo: 'feat', id: 'prueba-con-14' }, { tipo: 'feat', id: 'prueba-con-13' }]]));
  assert.deepEqual(r.feats.lista.map((f) => f.id), ['prueba-con-13']);
  assert.match(errores(r)[0], /exige CON 14/);
});

// ------------------------------------------------------------- HP y MP (dados)

const tira = (recurso, dado, resultado, extra) => Object.assign({ tipo: 'tirada', recurso: recurso, dado: dado, resultado: resultado }, extra || {});

test('HP y MP: cada nivel suma max(1, tirada + modificador); CON da HP y SPR da MP', () => {
  const ctx = contexto();
  // CON 13 (mod +1) y SPR 8 (mod -1). Nivel 3.
  const r = Core.calcularPersonaje(ctx, pj([[
    xp(2000),
    tira('hp', 'd10', 7), tira('hp', 'd10', 1), tira('hp', 'd10', 10),
    tira('mp', 'd6', 4), tira('mp', 'd6', 1), tira('mp', 'd6', 6),
  ]]));
  assert.deepEqual(errores(r), []);
  assert.equal(r.nivel.nivel, 3);
  assert.deepEqual([r.recursos.hp.atributo, r.recursos.hp.mod, r.recursos.mp.atributo, r.recursos.mp.mod], ['CON', 1, 'SPR', -1]);
  assert.deepEqual(r.recursos.hp.tiradas.map((t) => [t.nivel, t.resultado, t.ganado]), [[1, 7, 8], [2, 1, 2], [3, 10, 11]]);
  assert.equal(r.recursos.hp.maximo, 21);
  // MP: 4-1=3, 1-1=0 -> mínimo 1, 6-1=5.
  assert.deepEqual(r.recursos.mp.tiradas.map((t) => t.ganado), [3, 1, 5]);
  assert.equal(r.recursos.mp.maximo, 9);
  assert.deepEqual(r.recursos.hp.pendientes, []);
  assert.deepEqual(r.avisos.filter((a) => a.nivel === 'aviso'), []);
  assert.equal(r.sesiones[0].tiradas.length, 6);
});

test('HP y MP: la tirada se asigna al primer nivel sin tirada, o al nivel indicado', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[xp(2000), tira('hp', 'd8', 5, { nivel: 3 }), tira('hp', 'd8', 4), tira('hp', 'd8', 6)]]));
  assert.deepEqual(errores(r), []);
  assert.deepEqual(r.recursos.hp.tiradas.map((t) => [t.nivel, t.resultado]), [[1, 4], [2, 6], [3, 5]]);
});

test('HP y MP: tiradas inválidas se rechazan y los niveles sin tirada avisan', () => {
  const ctx = contexto();
  const r = Core.calcularPersonaje(ctx, pj([[
    xp(1000),
    tira('hp', 'd8', 9),               // fuera del dado
    tira('hp', 'd8', 0),               // cero
    tira('hp', '8', 4),                // dado mal escrito
    tira('hp', 'd1', 1),               // dado de una cara
    tira('xx', 'd8', 4),               // recurso desconocido
    tira('hp', 'd8', 4, { nivel: 3 }), // nivel que aún no se alcanza
    tira('hp', 'd8', 4, { nivel: 1 }),
    tira('hp', 'd8', 5, { nivel: 1 }), // nivel repetido
    tira('hp', 'd8', 2, { nivel: 2 }),
    tira('hp', 'd8', 3),               // ya no queda nivel libre
  ]]));
  assert.equal(errores(r).length, 8);
  assert.deepEqual(r.recursos.hp.tiradas.map((t) => [t.nivel, t.resultado]), [[1, 4], [2, 2]]);
  // MP sin ninguna tirada: avisa de los niveles 1 y 2, sin ser un error.
  assert.deepEqual(r.recursos.mp.pendientes, [1, 2]);
  const aviso = r.avisos.find((a) => a.nivel === 'aviso');
  assert.match(aviso.mensaje, /faltan tiradas de MP en los niveles 1, 2/);
});

// ------------------------------------------------------------- achievements

test('achievement: el fate por defecto sale del catálogo y la entrada puede fijar otro', () => {
  const ctx = contexto();
  assert.equal(ctx.achievements.find((a) => a.id === 'primera-sangre').fate, 1);
  const a = Core.calcularPersonaje(ctx, pj([[xp(6000), { tipo: 'achievement', id: 'primera-sangre' }]]));
  assert.deepEqual(errores(a), []);
  assert.equal(a.fate, 1);
  const b = Core.calcularPersonaje(ctx, pj([[xp(6000), { tipo: 'achievement', id: 'primera-sangre', fate: 0 }]]));
  assert.equal(b.fate, 0);
  // Un achievement sin fate en el catálogo da 0.
  const c = Core.calcularPersonaje(ctx, pj([[xp(6000), { tipo: 'achievement', id: 'mano-firme' }]]));
  assert.equal(c.fate, 0);
  // Máximo 1 por nivel y sin repetir.
  const d = Core.calcularPersonaje(ctx, pj([[xp(6000), { tipo: 'achievement', id: 'mano-firme' }, { tipo: 'achievement', id: 'primera-sangre' }]]));
  assert.match(errores(d)[0], /máximo 1 por nivel/);
});

test('el catálogo de achievements es consistente', () => {
  const lista = contexto().achievements;
  assert.ok(lista.length >= 10, 'hay una lista con la que probar el scroll');
  assert.equal(new Set(lista.map((a) => a.id)).size, lista.length, 'ids únicos');
  lista.forEach((a) => {
    assert.ok(a.nombre && a.fuente, a.id);
    if (a.fate !== undefined) assert.ok(Number.isInteger(a.fate) && a.fate >= 0, a.id + ' fate');
  });
});

// ------------------------------------------------------------------ retrato

test('el retrato se pasa tal cual y es opcional', () => {
  const ctx = contexto();
  assert.equal(Core.calcularPersonaje(ctx, pj([[xp(0)]])).personaje.imagen, null);
  const uri = 'data:image/png;base64,AAAA';
  assert.equal(Core.calcularPersonaje(ctx, pj([[xp(0)]], { imagen: uri })).personaje.imagen, uri);
  assert.equal(Core.calcularPersonaje(ctx, pj([[xp(0)]], { imagen: 42 })).personaje.imagen, null);
});

// ------------------------------------------------------ HP actual: fatiga, estados y descansos

test('umbrales de vitalidad: porcentajes del diseñador convertidos a HP enteros', () => {
  const u = Core.umbralesVitales(56, contexto().vitalidad);
  assert.deepEqual(u.fatiga.map((t) => [t.pct, t.hp, t.penalizador, t.acumulado]), [[50, 28, -2, -2], [25, 14, -4, -6], [10, 5, -4, -10]]);
  assert.deepEqual(u.estados.map((e) => [e.id, e.hp]), [['down', 0], ['ko', -14], ['deadly', -28]]);
  // Con un máximo de 10, −25 % son −2,5: el primer entero que cumple es −3.
  assert.deepEqual(Core.umbralesVitales(10, contexto().vitalidad).estados.map((e) => e.hp), [0, -3, -5]);
});

test('fatiga: −2 con HP ≤ 50 %, −6 con ≤ 25 % y −10 con ≤ 10 %', () => {
  const cfg = contexto().vitalidad;
  const fatiga = (hp) => Core.estadoVital(hp, 56, cfg).fatiga;
  assert.deepEqual([56, 29, 28, 15, 14, 6, 5, 1].map(fatiga), [0, 0, -2, -2, -6, -6, -10, -10]);
  assert.equal(Core.estadoVital(28, 56, cfg).nivelFatiga, 1);
  assert.equal(Core.estadoVital(5, 56, cfg).nivelFatiga, 3);
  assert.equal(Core.estadoVital(56, 56, cfg).nivelFatiga, 0);
});

test('estados: DOWN en 0, K.O. en −25 % y Deadly en −50 %; con HP positivo no hay estado', () => {
  const cfg = contexto().vitalidad;
  const estado = (hp) => { const e = Core.estadoVital(hp, 56, cfg).estado; return e && e.nombre; };
  assert.deepEqual([1, 0, -13, -14, -27, -28, -56].map(estado), [null, 'DOWN', 'DOWN', 'K.O.', 'K.O.', 'Deadly', 'Deadly']);
  // En DOWN la fatiga sigue siendo la del último tramo.
  assert.equal(Core.estadoVital(0, 56, cfg).fatiga, -10);
});

test('sin máximo de HP no hay fatiga ni estado', () => {
  const e = Core.estadoVital(0, 0, contexto().vitalidad);
  assert.deepEqual([e.fatiga, e.estado], [0, null]);
});

test('recuperación por hora: V se despeja de H y C (el bono) y R = C + V/10, con la comprobación de H', () => {
  const cfg = contexto().vitalidad;
  const casos = [[5, 0], [5, 10], [500, 0], [500, 10], [56, 1], [56, 3], [1, 0], [20, 0]]; // [H, bono]
  casos.forEach(([h, bono]) => {
    const r = Core.recuperacionPorHora(h, bono, cfg, 'hp');
    const c = bono; // sin desplazamiento (v0.9.2): C es el bono tal cual
    const v = (h - 5 - 5 * c) / (5 + c);
    assert.equal(r.c, c);
    assert.ok(Math.abs(r.v - v) < 1e-9, 'V para H ' + h + ' y bono ' + bono);
    assert.ok(Math.abs(r.bruta - (c + v / 10)) < 1e-9, 'R para H ' + h + ' y bono ' + bono);
    // Volver a meter V en H = (2 + C + 3)·V + 5 + 5·C devuelve H.
    assert.ok(Math.abs((2 + c + 3) * r.v + 5 + 5 * c - h) < 1e-9, 'comprobación de H ' + h);
  });
  const hp = (h, b) => Core.recuperacionPorHora(h, b, cfg, 'hp').porHora;
  assert.ok(Math.abs(hp(56, 1) - 1.7666666667) < 1e-9);
  assert.equal(hp(5, 0), 0);
  assert.ok(Math.abs(hp(500, 0) - 9.9) < 1e-9);
  assert.ok(Math.abs(hp(500, 10) - 12.9666666667) < 1e-9);
});

test('el punto de 0: con bono 0 un máximo de 5 o menos no recupera y desde 6 sí', () => {
  const cfg = contexto().vitalidad;
  for (let h = 1; h <= 5; h++) assert.equal(Core.recuperacionPorHora(h, 0, cfg, 'hp').porHora, 0, 'H ' + h);
  // Con H menor a 5 la R bruta sale negativa y se recorta a 0 (`minimoPorHora`).
  assert.ok(Core.recuperacionPorHora(1, 0, cfg, 'hp').bruta < 0);
  assert.ok(Math.abs(Core.recuperacionPorHora(6, 0, cfg, 'hp').porHora - 0.02) < 1e-9);
});

test('subir el bono acelera la recuperación hasta H 270; con HP muy altos la enlentece (rareza conocida)', () => {
  const cfg = contexto().vitalidad;
  [10, 56, 100, 250, 270].forEach((h) => {
    let anterior = 0;
    for (let b = 0; b <= 12; b++) {
      const r = Core.recuperacionPorHora(h, b, cfg, 'hp').porHora;
      assert.ok(r >= anterior - 1e-12, 'H ' + h + ' bono ' + b);
      anterior = r;
    }
  });
  // H 500: bono 0 da 9,9 y bono +2 da 8,93.
  assert.ok(Core.recuperacionPorHora(500, 2, cfg, 'hp').porHora < Core.recuperacionPorHora(500, 0, cfg, 'hp').porHora);
});

test('recuperación: un bono negativo cuenta como 0 y sin máximo no hay recuperación', () => {
  const cfg = contexto().vitalidad;
  const neg = Core.recuperacionPorHora(56, -4, cfg, 'hp');
  const cero = Core.recuperacionPorHora(56, 0, cfg, 'hp');
  assert.deepEqual([neg.bono, neg.c, neg.porHora], [0, 0, cero.porHora]);
  assert.equal(Core.recuperacionPorHora(0, 3, cfg, 'hp').porHora, 0);
  assert.equal(Core.recuperacionPorHora(-5, 3, cfg, 'mp').porHora, 0);
});

test('MP: la misma fórmula con el multiplicador ×5 (los bonos los pone quien llama: SPR)', () => {
  const cfg = contexto().vitalidad;
  const hp = Core.recuperacionPorHora(20, 0, cfg, 'hp');
  const mp = Core.recuperacionPorHora(20, 0, cfg, 'mp');
  assert.equal(mp.multiplicador, 5);
  assert.ok(Math.abs(mp.porHora - 5 * hp.porHora) < 1e-9);
  assert.ok(Math.abs(mp.porHora - 1.5) < 1e-9);
  assert.equal(cfg.descanso.recursos.mp.atributo, 'SPR');
  assert.equal(cfg.descanso.recursos.hp.atributo, 'CON');
});

test('descansar: el corto recupera R × 2 h y el largo R × 8 h con un 50 % extra, hacia abajo y sin pasar del máximo', () => {
  const cfg = contexto().vitalidad;
  const { corto, largo } = cfg.descanso;
  // HP 56 y bono +1 → R = 1,7667 HP/h: corto 3,53 → 3; largo 1,7667 × 8 × 1,5 = 21,2 → 21.
  assert.equal(Core.descansar(10, 56, corto, 1, cfg, 'hp').recuperado, 3);
  assert.equal(Core.descansar(10, 56, largo, 1, cfg, 'hp').recuperado, 21);
  assert.equal(Core.descansar(10, 56, largo, 1, cfg, 'hp').valor, 31);
  assert.equal(largo.extra, 0.5);
  assert.equal(corto.extra, 0);
  // Llega al máximo y no pasa; un valor sobre el máximo no se baja; desde negativo se recupera igual.
  assert.deepEqual([Core.descansar(40, 56, largo, 1, cfg, 'hp').valor, Core.descansar(40, 56, largo, 1, cfg, 'hp').recuperado], [56, 16]);
  assert.equal(Core.descansar(60, 56, largo, 1, cfg, 'hp').valor, 60);
  assert.equal(Core.descansar(-10, 56, corto, 1, cfg, 'hp').valor, -7);
  // Sin máximo no recupera.
  assert.equal(Core.descansar(0, 0, largo, 3, cfg, 'hp').recuperado, 0);
});

test('descansar el MP: con MP 20 y bono SPR 0 son 1,5 por hora (3 en el corto, 18 en el largo)', () => {
  const cfg = contexto().vitalidad;
  assert.equal(Core.descansar(0, 20, cfg.descanso.corto, 0, cfg, 'mp').recuperado, 3);
  assert.equal(Core.descansar(0, 20, cfg.descanso.largo, 0, cfg, 'mp').recuperado, 18);
  // Con un MP máximo grande se ve el ×5: MP 500, bono 0 → 49,5 por hora → 99 en 2 h y, en 8 h con el 50 % extra, el tope de 500.
  assert.equal(Core.descansar(0, 500, cfg.descanso.corto, 0, cfg, 'mp').recuperado, 99);
  assert.equal(Core.descansar(0, 500, cfg.descanso.largo, 0, cfg, 'mp').recuperado, 500);
});

test('data/vitalidad.json: umbrales ordenados de mayor a menor, dos descansos y la fórmula completa', () => {
  const cfg = contexto().vitalidad;
  const pcts = cfg.fatiga.umbrales.map((u) => u.pct);
  assert.deepEqual(pcts.slice().sort((a, b) => b - a), pcts);
  assert.ok(cfg.fatiga.umbrales.every((u) => u.penalizador < 0));
  const est = cfg.estados.map((e) => e.pct);
  assert.deepEqual(est.slice().sort((a, b) => b - a), est);
  assert.deepEqual([cfg.descanso.corto.horas, cfg.descanso.largo.horas], [2, 8]);
  assert.ok(cfg.descanso.corto.horas > 0 && cfg.descanso.corto.horas < cfg.descanso.largo.horas);
  const f = cfg.descanso.formula;
  ['desplazamiento', 'minimoBono', 'sumaFija', 'constante', 'porBono', 'divisorV', 'minimoPorHora'].forEach((k) => assert.equal(typeof f[k], 'number', k));
  assert.equal(f.desplazamiento, 0);
  assert.deepEqual([cfg.descanso.recursos.hp.multiplicador, cfg.descanso.recursos.mp.multiplicador], [1, 5]);
  assert.ok(f.sumaFija > 0 && f.divisorV > 0 && f.minimoBono >= 0 && f.minimoPorHora >= 0);
  assert.deepEqual(Object.keys(cfg.descanso.recursos).sort(), ['hp', 'mp']);
});

// ------------------------------------------------------ Mana por Gates

const SX = (n) => ({ tipo: 'xp-subsistema', subsistema: 'mana', cantidad: n });
const MF = (n, fuente, nota) => ({ tipo: 'mana-fuerza', cantidad: n, fuente: fuente || 'otra', nota: nota || '' });
const gate = (id, tag, funcion, op) => ({ tipo: 'gate', id: id, funcion: funcion || 'capacidad', tag: tag, oportunidad: op || 'una oportunidad' });
// Un personaje con SX y Mana force de sobra para los casos.
const base = (entradas) => pj([[xp(3000), SX(700), MF(15, 'criatura-contratada', 'prueba')].concat(entradas)]);
const tagsDe = () => Object.fromEntries(contexto().manaTags.map((t) => [t.id, t]));

// ------------------------------------------------------ SX compartido: reserva y asignación

const SXR = (n) => ({ tipo: 'sx', cantidad: n });
const ASIG = (sub, n, rama) => Object.assign({ tipo: 'sx-asignar', subsistema: sub, cantidad: n }, rama ? { rama: rama } : {});

test('SX sin destino va a la reserva común y no mueve ni Zeo ni Mana', () => {
  const r = Core.calcularPersonaje(contexto(), pj([[xp(1000), SXR(30)]]));
  assert.deepEqual(errores(r), []);
  assert.deepEqual([r.sx.reserva, r.sx.ganadoEnReserva, r.sx.asignado, r.sx.directo, r.sx.total], [30, 30, 0, 0, 30]);
  assert.equal(r.mana.total, 0);
  assert.equal(r.zeo.ramas.every((x) => x.sx === 0), true);
});

test('sx-asignar saca de la reserva y suma al subsistema elegido (zeo por rama)', () => {
  const r = Core.calcularPersonaje(contexto(), pj([[xp(1000), SXR(30), ASIG('mana', 12), ASIG('zeo', 10, 'void')]]));
  assert.deepEqual(errores(r), []);
  assert.deepEqual([r.sx.reserva, r.sx.asignado, r.sx.total], [8, 22, 30]);
  assert.equal(r.mana.total, 12);
  assert.equal(r.zeo.ramas.find((x) => x.rama === 'void').sx, 10);
  assert.deepEqual(r.sx.zeo, { total: 10, ramas: { heaven: 0, void: 10, earth: 0 } });
  // La sesión anota lo asignado y lo suma a sus chips de Zeo y Mana.
  const s = r.sesiones[0];
  assert.deepEqual([s.sxGanado, s.mana, s.zeo.void], [30, 12, 10]);
  assert.deepEqual(s.sxAsignado, [{ subsistema: 'mana', rama: null, cantidad: 12 }, { subsistema: 'zeo', rama: 'void', cantidad: 10 }]);
});

test('xp-subsistema sigue valiendo: el SX nace con destino y no pasa por la reserva', () => {
  const r = Core.calcularPersonaje(contexto(), pj([[xp(1000), SX(40), SXR(5)]]));
  assert.deepEqual(errores(r), []);
  assert.deepEqual([r.sx.reserva, r.sx.directo, r.sx.total, r.mana.total], [5, 40, 45, 40]);
});

test('sx-asignar: más que la reserva, destino inválido, zeo sin rama o cantidad inválida son rechazados', () => {
  const casos = [
    [[xp(1000), SXR(10), ASIG('mana', 11)], /reserva de SX tiene 10/],
    [[xp(1000), ASIG('mana', 1)], /reserva de SX tiene 0/],
    [[xp(1000), SXR(10), ASIG('fate', 5)], /destino debe ser zeo o mana/],
    [[xp(1000), SXR(10), ASIG('zeo', 5)], /zeo exige rama/],
    [[xp(1000), SXR(10), ASIG('mana', 0)], /entero positivo/],
    [[xp(1000), SXR(0)], /entero positivo/],
  ];
  casos.forEach(([entradas, patron]) => {
    const e = errores(Core.calcularPersonaje(contexto(), pj([entradas])));
    assert.equal(e.length, 1, JSON.stringify(entradas));
    assert.match(e[0], patron);
  });
});

test('una entrada rechazada no cambia la reserva (zeo sin rama no consume SX)', () => {
  const r = Core.calcularPersonaje(contexto(), pj([[xp(1000), SXR(10), ASIG('zeo', 5)]]));
  assert.equal(errores(r).length, 1);
  assert.deepEqual([r.sx.reserva, r.sx.asignado], [10, 0]);
});

test('un Gate sin SX suficiente avisa de la reserva sin asignar', () => {
  const r = Core.calcularPersonaje(contexto(), pj([[xp(3000), SXR(30), MF(15, 'otra', 'prueba'), gate('g1', 'hielo')]]));
  const e = errores(r);
  assert.equal(e.length, 1);
  assert.match(e[0], /exige 10 SX de mana y el personaje tiene 0/);
  assert.match(e[0], /hay 30 SX sin asignar en la reserva/);
  // Asignando antes, el Gate se construye.
  const ok = Core.calcularPersonaje(contexto(), pj([[xp(3000), SXR(30), ASIG('mana', 10), MF(15, 'otra', 'prueba'), gate('g1', 'hielo')]]));
  assert.deepEqual(errores(ok), []);
  assert.equal(ok.mana.gates.length, 1);
});

test('grafo de Gates: n Gates conectados dan n + C(n,2) + C(n,3) slots', () => {
  const tags = tagsDe();
  const slots = (...ts) => Core.grafoMana(ts.map((t, i) => ({ id: 'g' + (i + 1), tag: t })), tags).slots.length;
  // Hielo, oscuridad, viento, rayo y vida no chocan entre sí.
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => slots.apply(null, ['hielo', 'oscuridad', 'viento', 'rayo', 'vida'].slice(0, n))), [1, 3, 7, 14, 25]);
});

test('los pares incompatibles restan slots y un círculo exige los tres pares', () => {
  const tags = tagsDe();
  const g = (...ts) => Core.grafoMana(ts.map((t, i) => ({ id: 'g' + (i + 1), tag: t })), tags);
  const dos = g('fuego', 'hielo'); // incompatibles
  assert.deepEqual([dos.nodos.length, dos.slots.length], [0, 2]);
  const tres = g('hielo', 'oscuridad', 'fuego'); // hielo–fuego no conectan
  assert.deepEqual([tres.nodos.map((n) => n.id), tres.circulos.length, tres.slots.length], [['g1-g2', 'g2-g3'], 0, 5]);
  assert.deepEqual(tres.conexiones.filter((c) => !c.conecta).map((c) => c.a + c.b), ['g1g3']);
  assert.equal(g('fuego', 'fuego', 'fuego').slots.length, 7); // un tag no choca consigo mismo
});

test('los tags se heredan: un nodo o un círculo lleva los tags de sus Gates', () => {
  const grafo = Core.grafoMana([{ id: 'g1', tag: 'hielo' }, { id: 'g2', tag: 'oscuridad' }, { id: 'g3', tag: 'hielo' }], tagsDe());
  assert.deepEqual(grafo.nodos.map((n) => [n.id, n.tags]), [['g1-g2', ['hielo', 'oscuridad']], ['g1-g3', ['hielo']], ['g2-g3', ['oscuridad', 'hielo']]]);
  assert.deepEqual(grafo.circulos.map((c) => [c.id, c.tags]), [['g1-g2-g3', ['hielo', 'oscuridad']]]);
});

test('Mana force: cada potencia de 2 compra un Gate; el SX es un umbral', () => {
  const cfg = contexto().mana;
  assert.deepEqual([0, 1, 2, 3, 4, 7, 8, 16].map((mf) => Core.gatesPermitidos(mf, cfg)), [0, 1, 2, 2, 3, 3, 4, 5]);
  assert.deepEqual([1, 2, 3, 4, 7, 8].map((k) => Core.mfDeGate(k, cfg)), [1, 2, 4, 8, 64, 128]);
  assert.deepEqual([1, 4, 7, 8, 9].map((k) => Core.sxDeGate(k, cfg)), [10, 80, 640, 1280, 2560]);
});

test('personaje de ejemplo: 3 Gates con un par incompatible dan 5 slots, uno inscrito', () => {
  const m = Core.calcularPersonaje(contexto(), ejemplo()).mana;
  assert.equal(m.total, 120);
  assert.deepEqual([m.fuerza.total, m.fuerza.base, m.fuerza.permitidos, m.fuerza.aportes.length], [4, 1, 3, 2]);
  assert.deepEqual(m.gates.map((g) => [g.id, g.tag, g.funcion]), [['g1', 'hielo', 'capacidad'], ['g2', 'oscuridad', 'potencia'], ['g3', 'fuego', 'intensidad']]);
  assert.deepEqual(m.slots.map((x) => [x.id, x.nivel]), [['g1', 1], ['g2', 1], ['g3', 1], ['g1-g2', 2], ['g2-g3', 2]]);
  assert.deepEqual([m.totales.paresSinConexion, m.totales.ocupados, m.totales.libres], [1, 1, 4]);
  assert.equal(m.slots.find((x) => x.id === 'g1').habilidad.id, 'power-attack');
  assert.deepEqual([m.siguiente.numero, m.siguiente.mfRequerida, m.siguiente.mfFalta, m.siguiente.sxFalta, m.siguiente.disponible], [4, 8, 4, 0, false]);
});

test('un Gate exige Mana force, SX de mana, oportunidad y datos válidos', () => {
  const ctx = contexto();
  // MF 1 (humano) solo permite el primer Gate.
  let r = Core.calcularPersonaje(ctx, pj([[xp(3000), SX(700), gate('g1', 'hielo'), gate('g2', 'viento')]]));
  assert.match(errores(r)[0], /Gate 2 exige Mana force 2 y el personaje tiene 1/);
  assert.equal(r.mana.totales.gates, 1);
  r = Core.calcularPersonaje(ctx, pj([[xp(3000), SX(5), gate('g1', 'hielo')]]));
  assert.match(errores(r)[0], /Gate 1 exige 10 SX de mana y el personaje tiene 5/);
  r = Core.calcularPersonaje(ctx, base([gate('g1', 'hielo'), gate('g1', 'viento')]));
  assert.match(errores(r)[0], /"g1" ya existe/);
  r = Core.calcularPersonaje(ctx, base([gate('g-1', 'hielo')]));
  assert.match(errores(r)[0], /sin guiones/);
  r = Core.calcularPersonaje(ctx, base([gate('g1', 'sabor')]));
  assert.match(errores(r)[0], /tag "sabor" no existe/);
  r = Core.calcularPersonaje(ctx, base([gate('g1', 'hielo', 'sabor')]));
  assert.match(errores(r)[0], /funcion debe ser capacidad, intensidad, potencia, sentidos/);
  // La función y la oportunidad pueden quedar sin definir (v0.9.5): el Gate se construye y las muestra vacías.
  r = Core.calcularPersonaje(ctx, base([{ tipo: 'gate', id: 'g1', tag: 'hielo' }]));
  assert.deepEqual([errores(r), r.mana.gates[0].funcion, r.mana.gates[0].oportunidad], [[], null, '']);
  r = Core.calcularPersonaje(ctx, base([{ tipo: 'gate', id: 'g1', tag: 'hielo', oportunidad: 5 }]));
  assert.match(errores(r)[0], /oportunidad debe ser un texto/);
  // Con MF y SX de sobra, tres Gates válidos se construyen sin errores (hielo y fuego no conectan: 5 slots).
  r = Core.calcularPersonaje(ctx, base([gate('g1', 'hielo'), gate('g2', 'fuego'), gate('g3', 'viento')]));
  assert.deepEqual([errores(r), r.mana.totales.slots], [[], 5]);
});

test('Mana force: fuente válida, y perderla exige nota y no baja de 0', () => {
  const ctx = contexto();
  let r = Core.calcularPersonaje(ctx, pj([[xp(3000), MF(1, 'sueño')]]));
  assert.match(errores(r)[0], /fuente debe ser criatura-contratada, contrato-magico, otra/);
  r = Core.calcularPersonaje(ctx, pj([[xp(3000), MF(0, 'otra')]]));
  assert.match(errores(r)[0], /distinto de 0/);
  r = Core.calcularPersonaje(ctx, pj([[xp(3000), MF(2, 'contrato-magico', 'pacto'), MF(-1, 'contrato-magico')]]));
  assert.match(errores(r)[0], /exige una nota/);
  r = Core.calcularPersonaje(ctx, pj([[xp(3000), MF(-2, 'otra', 'se rompió el pacto')]]));
  assert.match(errores(r)[0], /quedaría en -1/);
  r = Core.calcularPersonaje(ctx, pj([[xp(3000), MF(2, 'contrato-magico', 'pacto'), MF(-1, 'contrato-magico', 'se rompió')]]));
  assert.deepEqual([errores(r).length, r.mana.fuerza.total], [0, 2]);
});

test('inscribir: el slot debe existir y estar libre, y la habilidad ser del personaje', () => {
  const ctx = contexto();
  const con = (extra) => Core.calcularPersonaje(ctx, base([{ tipo: 'feat', id: 'power-attack' }, gate('g1', 'hielo'), gate('g2', 'viento')].concat(extra)));
  let r = con([{ tipo: 'inscribir', slot: 'g1-g2', habilidad: 'power-attack' }]);
  assert.deepEqual(errores(r), []);
  assert.equal(r.mana.slots.find((x) => x.id === 'g1-g2').habilidad.nombre, 'Power Attack');
  assert.match(errores(con([{ tipo: 'inscribir', slot: 'g9', habilidad: 'power-attack' }]))[0], /slot "g9" no existe \(hay g1, g2, g1-g2\)/);
  assert.match(errores(con([{ tipo: 'inscribir', slot: 'g1', habilidad: 'toughness' }]))[0], /no es una habilidad tipo conjuro ni una técnica de Mana del personaje/);
  assert.match(errores(con([{ tipo: 'inscribir', slot: 'g1', habilidad: 'power-attack' }, { tipo: 'inscribir', slot: 'g1', habilidad: 'power-attack' }]))[0], /ya tiene "Power Attack"; usa desinscribir/);
  // Desinscribir libera el slot; hacerlo en uno vacío es un error.
  r = con([{ tipo: 'inscribir', slot: 'g1', habilidad: 'power-attack' }, { tipo: 'desinscribir', slot: 'g1' }]);
  assert.deepEqual([errores(r), r.mana.totales.ocupados], [[], 0]);
  assert.match(errores(con([{ tipo: 'desinscribir', slot: 'g1' }]))[0], /no tiene ninguna habilidad/);
});

test('la Mana force inicial puede venir de la raza', () => {
  const ctx = contexto();
  ctx.razas = ctx.razas.map((r) => Object.assign({}, r, { manaFuerza: 4 }));
  const r = Core.calcularPersonaje(ctx, pj([[xp(3000)]]));
  assert.deepEqual([r.mana.fuerza.total, r.mana.fuerza.fuenteBase, r.mana.fuerza.permitidos], [4, 'raza', 3]);
});

test('data/mana-tags.json y data/mana.json: tags únicos, pares simétricos y tablas crecientes', () => {
  const ctx = contexto();
  const ids = ctx.manaTags.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'ids únicos');
  const tags = tagsDe();
  ctx.manaTags.forEach((t) => {
    assert.ok(!(t.incompatibles || []).includes(t.id), t.id + ' no puede chocar consigo mismo');
    (t.incompatibles || []).forEach((o) => {
      assert.ok(tags[o], t.id + ' cita el tag inexistente ' + o);
      assert.ok((tags[o].incompatibles || []).includes(t.id), t.id + ' y ' + o + ' deben listarse en los dos sentidos');
    });
  });
  const sx = ctx.mana.sxPorGate;
  assert.deepEqual(sx.slice().sort((a, b) => a - b), sx);
  assert.ok(ctx.mana.mfBase >= 2 && ctx.mana.mfInicial.valor >= 0);
  assert.ok(ctx.mana.funciones.length === 4 && ctx.mana.fuentesMF.length >= 1);
});

// ------------------------------------------------------ personaje de ejemplo

test('personaje de ejemplo: todo lo derivado coincide y no hay avisos', () => {
  const r = Core.calcularPersonaje(contexto(), ejemplo());
  assert.deepEqual(r.avisos, []);
  assert.equal(r.xp, 6986);
  assert.equal(r.nivel.nivel, 7);
  assert.equal(r.nivel.faltan, 14);
  assert.deepEqual(r.sesiones.map((s) => s.xpGanada), [6000, 260, 300, 156, 90, 180]);
  assert.deepEqual(r.sesiones.map((s) => s.xpAcumulada), [6000, 6260, 6560, 6716, 6806, 6986]);
  // Los sx de cada rama no cambian su nivel: lo da la técnica más alta de sus líneas (heaven 2, void 2, earth 2).
  assert.deepEqual(r.zeo.ramas.map((x) => [x.rama, x.sx, x.nivel]), [['heaven', 34, 2], ['void', 22, 2], ['earth', 15, 2]]);
  assert.equal(r.zeo.nivel, 2);
  assert.deepEqual([r.zeo.activas, r.zeo.porActivar], [8, 0]);
  assert.deepEqual(r.zeo.lineas.map((l) => l.total), [3, 2, 2, 1, 1, 1, 1, 1, 0, 0]);
  assert.deepEqual(r.zeo.lineas[0].niveles.map((n) => n.tomadas.length), [1, 2, 0, 0, 0]);
  assert.deepEqual(r.zeo.slots, { total: 10, ocupados: 8, libres: 2, primeraLibre: 'L09' });
  assert.equal(r.mana.total, 120);
  assert.equal(r.fate, 1);
  assert.deepEqual([r.feats.slotsUsados, r.feats.slotsTotales, r.feats.proximoSlot], [4, 4, 9]);
  assert.deepEqual(r.logros.map((l) => [l.id, l.nivel, l.fate]), [['guardian-del-paso', 7, 1]]);
  assert.deepEqual([r.meritos.iniciales, r.meritos.defectos, r.meritos.meritos, r.meritos.total], [4, 3, 5, 2]);
  assert.deepEqual(r.equipo.conteo, { armadura: 1, arma: 1, objetos: 3 });
  const cargas = Object.fromEntries(r.equipo.objetos.filter((o) => o.cargas).map((o) => [o.id, o.cargas.actuales]));
  assert.deepEqual(cargas, { 'varita-curar-leves': 9, 'tobillera-del-corredor': 3 });
  assert.equal(r.personaje.perfilRacial, true);
  // HP (d10, CON 13 → +1) y MP (d6, SPR 8 → −1) tirados en los siete niveles.
  assert.deepEqual([r.recursos.hp.pendientes, r.recursos.mp.pendientes], [[], []]);
  assert.equal(r.recursos.hp.maximo, 56);
  assert.deepEqual([r.recursos.hp.valor, r.recursos.mp.valor], [13, 8]);
  assert.equal(r.recursos.mp.maximo, 20);
  assert.deepEqual(r.personaje.derivados, { CON: 13, SPR: 8, MND: 10 });
});

// ------------------------------------- habilidades de clase, arquetipos y alineamiento (v0.9)

const detalleClase = (id) => leer('data/clases/' + id + '.json');
const nombresDe = (lista) => lista.map((h) => h.nombre);

test('habilidades de clase: las del nivel, sus mejoras y la próxima mejora', () => {
  const m1 = Core.habilidadesDeClase(detalleClase('monk'), null, 1);
  assert.deepEqual(nombresDe(m1.habilidades), ['Bonus Feat', 'Improved Unarmed Strike', 'Flurry of Blows', 'Stunning Fist', 'AC Bonus']);
  assert.equal(m1.arquetipo, null);
  assert.equal(m1.proximas[0].nombre, 'Evasion');
  const m7 = Core.habilidadesDeClase(detalleClase('monk'), null, 7);
  assert.ok(nombresDe(m7.habilidades).includes('Wholeness of Body'));
  assert.ok(!nombresDe(m7.habilidades).includes('Improved Evasion'));
  const fast = m7.habilidades.find((h) => h.id === 'fast-movement');
  assert.deepEqual(fast.mejoras.map((m) => [m.nivel, m.alcanzada]), [[6, true], [9, false], [12, false], [15, false], [18, false]]);
  assert.equal(fast.proximaMejora, 9);
  const evasion = m7.habilidades.find((h) => h.id === 'evasion');
  assert.equal(evasion.proximaMejora, null);
  assert.equal(Core.habilidadesDeClase(null, null, 7), null);
});

test('arquetipo Sombra asesina: sustituye cinco habilidades y no usa engaño', () => {
  const base = Core.habilidadesDeClase(detalleClase('monk'), null, 20);
  const arq = Core.habilidadesDeClase(detalleClase('monk'), 'sombra-asesina', 20);
  const ids = (r) => r.habilidades.map((h) => h.id);
  ['stunning-fist', 'maneuver-training', 'purity-of-body', 'wholeness-of-body', 'quivering-palm'].forEach((id) => {
    assert.ok(ids(base).includes(id), id + ' está en la clase base');
    assert.ok(!ids(arq).includes(id), id + ' lo sustituye el arquetipo');
  });
  ['sneak-attack', 'silent-step', 'poison-mastery', 'vanish', 'death-attack'].forEach((id) => assert.ok(ids(arq).includes(id), id));
  assert.equal(ids(arq).length, ids(base).length, 'sustituye una por una');
  assert.deepEqual(arq.arquetipo.reemplaza.map((r) => r.nombre), ['Stunning Fist', 'Maneuver Training', 'Purity of Body', 'Wholeness of Body', 'Quivering Palm']);
  const sneak = arq.habilidades.find((h) => h.id === 'sneak-attack');
  assert.equal(sneak.origen, 'arquetipo');
  assert.equal(sneak.sustituye.nombre, 'Stunning Fist');
  // En el nivel 7 todavía no tiene Death Attack, que llega al 15.
  const n7 = Core.habilidadesDeClase(detalleClase('monk'), 'sombra-asesina', 7);
  assert.ok(!n7.habilidades.some((h) => h.id === 'death-attack'));
  assert.ok(n7.proximas.some((h) => h.id === 'death-attack' && h.nivel === 15));
  // Sin engaño: ninguna habilidad del arquetipo es de Bluff, Disguise ni de fintar.
  detalleClase('monk').arquetipos[0].habilidades.forEach((h) => {
    assert.ok(!/bluff|disguise|deception|feint|engañ|disfraz|fint/i.test(h.id + ' ' + h.nombre), h.id);
  });
  assert.match(detalleClase('monk').arquetipos[0].resumen, /No usa engaño ni disfraz/);
});

test('arquetipo Polímata sin escuela: quita Arcane School y da feats extra que suman slots', () => {
  const c = contexto();
  const mago = (arquetipo, entradas) => ({
    personaje: 'm', nombre: 'M', raza: 'humano', clase: 'wizard', arquetipo: arquetipo,
    atributos: { STR: 10, DEX: 14, PER: 13, INT: 18, WIS: 13, CHA: 12 },
    extremidades: [], sesiones: [{ id: 's0', fecha: '2026-01-01', titulo: 'S0', entradas: entradas }],
  });
  const base = [xp(6000)];
  const r0 = Core.calcularPersonaje(c, mago('sin-escuela', base));
  assert.deepEqual(errores(r0), []);
  assert.equal(r0.nivel.nivel, 7);
  assert.equal(r0.feats.slotsTotales, 6, '4 normales + extras en los niveles 1 y 4');
  assert.deepEqual(r0.feats.nivelesExtra, [1, 4, 8]);
  assert.equal(r0.feats.proximoSlot, 8, 'el próximo slot es el extra del nivel 8, antes que el normal del 9');
  assert.ok(!r0.clase.habilidades.some((h) => h.id === 'arcane-school'));
  assert.ok(r0.clase.habilidades.some((h) => h.id === 'polymath-training'));
  // Sin arquetipo conserva la escuela y tiene 4 slots.
  const r1 = Core.calcularPersonaje(c, mago(undefined, base));
  assert.equal(r1.feats.slotsTotales, 4);
  assert.ok(r1.clase.habilidades.some((h) => h.id === 'arcane-school'));
  assert.equal(r1.personaje.arquetipo, null);
  // Seis feats caben y el séptimo no.
  const seis = ['combat-casting', 'spell-penetration', 'empower-spell', 'toughness', 'improved-initiative', 'extend-spell'].map((id) => ({ tipo: 'feat', id }));
  assert.deepEqual(errores(Core.calcularPersonaje(c, mago('sin-escuela', base.concat(seis)))), []);
  const siete = Core.calcularPersonaje(c, mago('sin-escuela', base.concat(seis, [{ tipo: 'feat', id: 'silent-spell' }])));
  assert.match(errores(siete).join(' '), /no hay slot de feat libre en el nivel 7 \(6 slots\)/);
  // Los slots por nivel: 1 → 2, 3 → 3, 4 → 4, 20 → 10 + 6.
  assert.deepEqual([1, 3, 4, 8, 20].map((n) => Core.slotsTotalesEn(n, [1, 4, 8, 12, 16, 20])), [2, 3, 4, 7, 16]);
  assert.equal(Core.proximoSlot(20, 20, [1, 4, 8, 12, 16, 20]), null);
  assert.equal(Core.proximoSlot(7, 20, []), 9);
});

test('arquetipo desconocido o sin archivo de la clase es un error; sin archivo no hay detalle', () => {
  const c = contexto();
  const base = (extra) => Object.assign({
    personaje: 'x', nombre: 'X', raza: 'humano', clase: 'monk', atributos: { STR: 14, DEX: 18, PER: 14, INT: 10, WIS: 14, CHA: 10 },
    extremidades: [], sesiones: [{ id: 's0', fecha: '2026-01-01', titulo: 'S0', entradas: [xp(6000)] }],
  }, extra);
  assert.match(errores(Core.calcularPersonaje(c, base({ arquetipo: 'nada' }))).join(' '), /el arquetipo "nada" no existe para la clase Monk \(hay: sombra-asesina\)/);
  assert.match(errores(Core.calcularPersonaje(c, base({ clase: 'rogue', arquetipo: 'nada' }))).join(' '), /falta data\/clases\/rogue\.json/);
  const sinDetalle = Core.calcularPersonaje(c, base({ clase: 'rogue' }));
  assert.equal(sinDetalle.clase, null);
  assert.deepEqual(errores(sinDetalle), []);
});

test('alineamiento ley.moral: se lee, se rotula y se valida', () => {
  assert.deepEqual(Core.etiquetaAlineamiento('L.N'), { codigo: 'L.N', texto: 'Legal neutral' });
  assert.deepEqual(Core.etiquetaAlineamiento('n.b'), { codigo: 'N.B', texto: 'Neutral bueno' });
  assert.deepEqual(Core.etiquetaAlineamiento('N.N'), { codigo: 'N.N', texto: 'Neutral puro' });
  assert.deepEqual(Core.etiquetaAlineamiento('C.M'), { codigo: 'C.M', texto: 'Caótico malo' });
  ['', 'LN', 'L.G', 'X.N', 'L.N.B', null, undefined].forEach((v) => assert.equal(Core.etiquetaAlineamiento(v), null, String(v)));
  const c = contexto();
  const r = Core.calcularPersonaje(c, pj([[xp(1000)]], { alineamiento: 'L.N' }));
  assert.equal(r.personaje.alineamiento.texto, 'Legal neutral');
  assert.equal(Core.calcularPersonaje(c, pj([[xp(1000)]])).personaje.alineamiento, null);
  assert.match(errores(Core.calcularPersonaje(c, pj([[xp(1000)]], { alineamiento: 'Legal' }))).join(' '), /el alineamiento "Legal" no es válido/);
});

test('data/clases: formato, niveles y arquetipos coherentes', () => {
  const archivos = fs.readdirSync(path.join(RAIZ, 'data', 'clases')).filter((n) => n.endsWith('.json'));
  assert.deepEqual(archivos.sort(), ['monk.json', 'wizard.json']);
  const clases = contexto().classes;
  archivos.forEach((n) => {
    const d = leer('data/clases/' + n);
    assert.equal(n, d.id + '.json');
    assert.ok(clases.some((x) => x.id === d.id), d.id + ' está en classes.json');
    assert.equal(Core.rutaClase(d.id), 'clases/' + n);
    const ids = d.habilidades.map((h) => h.id);
    assert.equal(new Set(ids).size, ids.length, d.id + ': ids repetidos');
    const comprobar = (h, donde) => {
      assert.ok(Number.isInteger(h.nivel) && h.nivel >= 1 && h.nivel <= 20, donde + ' ' + h.id + ': nivel');
      assert.ok(['pasivo', 'activo'].includes(h.ejecucion), donde + ' ' + h.id + ': ejecucion');
      assert.ok(h.nombre && h.detalle, donde + ' ' + h.id + ': nombre y detalle');
      let previo = h.nivel;
      (h.mejoras || []).forEach((m) => {
        assert.ok(m.nivel > previo && m.nivel <= 20, donde + ' ' + h.id + ': mejoras en orden y después del nivel');
        assert.ok(m.detalle, donde + ' ' + h.id + ': detalle de mejora');
        previo = m.nivel;
      });
    };
    d.habilidades.forEach((h) => comprobar(h, d.id));
    (d.arquetipos || []).forEach((a) => {
      assert.ok(a.id && a.nombre && a.resumen && a.fuente, a.id + ': campos');
      a.reemplaza.forEach((id) => assert.ok(ids.includes(id), a.id + ' reemplaza una habilidad que existe: ' + id));
      const propios = a.habilidades.map((h) => h.id);
      assert.equal(new Set(propios.concat(ids)).size, propios.length + ids.length, a.id + ': ids propios no chocan con la clase');
      a.habilidades.forEach((h) => {
        comprobar(h, a.id);
        if (h.sustituye) assert.ok(a.reemplaza.includes(h.sustituye), a.id + ' ' + h.id + ': sustituye algo que reemplaza');
      });
      (a.featsExtra || []).forEach((n, i, l) => {
        assert.ok(Number.isInteger(n) && n >= 1 && n <= 20, 'featsExtra en 1..20');
        if (i) assert.ok(n > l[i - 1], 'featsExtra ordenados y sin repetir');
      });
    });
  });
  // El Monk de Pathfinder 1e: los niveles de sus habilidades clave.
  const mk = Object.fromEntries(leer('data/clases/monk.json').habilidades.map((h) => [h.id, h.nivel]));
  assert.deepEqual([mk['evasion'], mk['ki-pool'], mk['wholeness-of-body'], mk['abundant-step'], mk['quivering-palm'], mk['perfect-self']], [2, 4, 7, 12, 15, 20]);
});

test('personajes de muestra: Musashi Nanaya (monje) y Herb\'Azzio (mago)', () => {
  const c = contexto();
  const indice = leer('characters/index.json').personajes;
  assert.deepEqual(indice, ['ejemplo', 'musashi-nanaya', 'herb-azzio']);
  indice.forEach((id) => {
    const r = Core.calcularPersonaje(c, leer('characters/' + id + '.json'));
    assert.deepEqual(errores(r), [], id);
    assert.equal(r.avisos.filter((a) => a.nivel === 'aviso').length, 0, id + ': sin avisos');
  });
  const mu = Core.calcularPersonaje(c, leer('characters/musashi-nanaya.json'));
  assert.equal(mu.personaje.nombre, 'Musashi Nanaya');
  assert.equal(mu.personaje.claseNombre, 'Monk');
  assert.equal(mu.personaje.alineamiento.texto, 'Legal neutral');
  assert.equal(mu.personaje.arquetipo.id, 'sombra-asesina');
  assert.equal(mu.nivel.nivel, 7);
  assert.deepEqual(mu.feats.lista.map((f) => f.id), ['dodge', 'stealthy', 'mobility', 'spring-attack']);
  assert.equal(mu.feats.slotsTotales, 4);
  assert.ok(mu.clase.habilidades.some((h) => h.id === 'vanish') && !mu.clase.habilidades.some((h) => h.id === 'stunning-fist'));
  const he = Core.calcularPersonaje(c, leer('characters/herb-azzio.json'));
  assert.equal(he.personaje.nombre, "Herb'Azzio");
  assert.equal(he.personaje.claseNombre, 'Wizard');
  assert.equal(he.personaje.alineamiento.texto, 'Neutral bueno');
  assert.equal(he.personaje.arquetipo.id, 'sin-escuela');
  assert.equal(he.feats.slotsTotales, 6);
  assert.equal(he.feats.slotsUsados, 6);
  assert.ok(!he.clase.habilidades.some((h) => h.id === 'arcane-school'));
  // Zeo: Musashi tiene ocupadas las 10 líneas iniciales; Herb'Azzio ninguna.
  assert.deepEqual(mu.zeo.slots, { total: 10, ocupados: 10, libres: 0, primeraLibre: null });
  assert.ok(mu.zeo.lineas.every((l) => l.ocupada && l.niveles[0].tomadas.length === 1));
  assert.deepEqual(mu.zeo.lineas.map((l) => l.raiz.nombre), ['Sentir el Ki', 'Tracción de Ki', 'Salto Flotante', 'Meditación', 'Ocultar el Ki', 'Blank Mind', 'Técnica de Muerte', 'Técnica del Escape', 'Katón', 'Tetsu no hada']);
  assert.ok(mu.zeo.lineas.every((l) => l.raiz.catalogo && !l.extra));
  assert.deepEqual(mu.zeo.extras, { total: 0, proxima: 'L11' });
  // Su hoja: heaven 3, void 2, earth 1 → nivel zeo 2; 7 líneas activas y 3 por activar (Salto Flotante, Técnica de Muerte, Tetsu no hada).
  assert.deepEqual(mu.zeo.ramas.map((x) => [x.rama, x.nivel]), [['heaven', 3], ['void', 2], ['earth', 1]]);
  assert.equal(mu.zeo.nivel, 2);
  assert.deepEqual([mu.zeo.activas, mu.zeo.porActivar, mu.zeo.costoActivar], [7, 3, 19]);
  assert.deepEqual(mu.zeo.lineas.filter((l) => !l.activa).map((l) => l.raiz.nombre), ['Salto Flotante', 'Técnica de Muerte', 'Tetsu no hada']);
  assert.deepEqual(mu.zeo.lineas.map((l) => l.niveles.flatMap((n) => n.tomadas.map((x) => x.nombre)).slice(1)).slice(0, 4),
    [['Ki Mark', 'Ki Vision', 'Sensitive Ki', 'Sense Burst'], ['Wall Runner'], [], ['Battle Mind', 'Deep Meditation']]);
  // Atributos de la Hoja 2 (K2:L12), skills y tag de XP.
  assert.deepEqual(mu.personaje.atributos, { STR: 14, DEX: 16, PER: 10, INT: 12, WIS: 16, CHA: 11 });
  // Tiradas de la hoja: HP d8 (8+2+6+8+4+7+8 = 43, más CON +2 por nivel = 14) y MP d6 (6+4+4+4+4+3+3 = 28; SPR 11 da +0, la hoja sumaba +3 por nivel).
  assert.deepEqual([mu.recursos.hp.maximo, mu.recursos.mp.maximo], [57, 28]);
  assert.deepEqual([mu.recursos.hp.tiradas.map((x) => x.dado)[0], mu.recursos.mp.tiradas.map((x) => x.dado)[0]], ['d8', 'd6']);
  assert.deepEqual(mu.personaje.habilidades.map((h) => h.id), ['stealth', 'sense-motive', 'climb', 'intimidate', 'perception']);
  assert.equal(mu.personaje.tagXp.id, 'tracker');
  assert.deepEqual(he.zeo.slots, { total: 10, ocupados: 0, libres: 10, primeraLibre: 'L01' });
  // Magia: el monje no lanza conjuros; el mago de nivel 7 llega al 3.º (un nivel de conjuro nuevo cada 3 niveles) y los trucos van a la mitad (4 → 2).
  assert.equal(mu.conjuros, null);
  assert.equal(he.conjuros.nivelMax, 3);
  assert.deepEqual(he.conjuros.porDia.map((x) => x.cantidad), [2, 4, 3, 2]);
  assert.deepEqual(he.conjuros.proximos, [{ nivelConjuro: 4, enNivel: 9 }, { nivelConjuro: 5, enNivel: 12 }]);
  // Herb'Azzio (v0.9.6): dados d4 y d10; Estrella Mana nivel 2 (Gate de Oro = Sentidos y de Fuego = Capacidad), contrato de Ashura (2 por nivel).
  assert.deepEqual([he.recursos.hp.tiradas[0].dado, he.recursos.mp.tiradas[0].dado], ['d4', 'd10']);
  assert.deepEqual([he.mana.nivel, he.mana.fuerza.total, he.mana.fuerza.aportes[0].porNivel, he.mana.fuerza.aportes[0].cantidad], [2, 15, 2, 14]);
  assert.deepEqual(he.mana.gates.map((g) => [g.id, g.tag, g.funcion]), [['g1', 'oro', 'sentidos'], ['g2', 'fuego', 'capacidad']]);
  // Las técnicas son de Mana, no de Magia: Sagita en el Gate de Oro, Heat Pulse en el de Fuego y Senderos en el nodo.
  assert.deepEqual(he.mana.slots.map((s) => [s.id, s.habilidad && s.habilidad.nombre]), [['g1', 'Sagita Lux Magica'], ['g2', 'Heat Pulse'], ['g1-g2', 'Senderos de la Magia']]);
  assert.deepEqual(he.mana.tecnicas.map((x) => [x.nombre, x.categoria, x.nivel, x.aprendiendo]), [
    ['Sagita Lux Magica', 'inscrita', 1, false], ['Senderos de la Magia', 'inscrita', 2, false], ['Heat Pulse', 'inscrita', 1, false],
    ['Circle Activation', 'activa', 1, false], ['Parallel World Casting', 'inscrita', 3, true]]);
  assert.deepEqual(he.mana.tecnicas.find((x) => x.id === 'circle-activation').costo, 'Mana 1');
  // Parallel World Casting es solo un contenedor de 200 SX, vacío todavía.
  const pwc = he.mana.tecnicas.find((x) => x.id === 'parallel-world-casting');
  assert.deepEqual([pwc.costoSx, pwc.acumulado, pwc.falta], [200, 0, 200]);
  assert.deepEqual(he.repertorio, { conjuros: [], porNivel: [], total: 0 });
  // El ejemplo (Fighter) no tiene archivo de clase: sigue funcionando sin detalle.
  assert.equal(Core.calcularPersonaje(c, ejemplo()).clase, null);
});

test('progresión de conjuros del mago: un nivel de conjuro nuevo cada 3 niveles (3, 6, 9, 12, 15…) y el nivel 1 da el 0 y el 1', () => {
  const mago = leer('data/clases/wizard.json');
  assert.equal(mago.conjuros.ritmo, 3);
  assert.equal(mago.conjuros.porDia.length, 20);
  const en = (n) => Core.progresionConjuros(mago, n);
  // La tabla sigue siendo la de PF (3 trucos y 1 conjuro en la fila 1); los trucos por día van a la mitad hacia arriba: 3 → 2.
  assert.deepEqual(mago.conjuros.porDia[0], [3, 1]);
  assert.deepEqual(mago.conjuros.trucos, { factor: 0.5, redondeo: 'arriba' });
  assert.deepEqual(en(1).porDia.map((x) => x.cantidad), [2, 1]);
  assert.deepEqual(en(1).porDia.map((x) => x.cantidadBase), [3, 1]);
  // El nivel de conjuro n >= 2 llega en el nivel 3 × (n − 1): 3, 6, 9, 12, 15, 18, 21, 24; el 0 y el 1 en el nivel 1.
  assert.deepEqual(en(1).llegadas.map((x) => x.enNivel), [1, 1, 3, 6, 9, 12, 15, 18, 21, 24]);
  assert.deepEqual([1, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20].map((n) => en(n).nivelMax), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);
  // Cantidades por día: salen de la fila de la tabla del nivel del personaje, sin contar los niveles de conjuro que aún no llegan.
  assert.deepEqual(en(3).porDia.map((x) => x.cantidad), [2, 2, 1]);
  assert.deepEqual(en(5).porDia.map((x) => x.cantidad), [2, 3, 2]);
  assert.deepEqual(en(6).porDia.map((x) => x.cantidad), [2, 3, 3, 2]);
  assert.deepEqual(en(7).porDia.map((x) => x.cantidad), [2, 4, 3, 2]);
  assert.deepEqual(en(9).porDia.map((x) => x.cantidad), [2, 4, 4, 3, 2]);
  assert.deepEqual(en(20).porDia.map((x) => x.cantidad), [2, 4, 4, 4, 4, 4, 4, 4]);
  // Un mago de nivel N tiene siempre al menos N conjuros por día (sin contar los trucos).
  for (let n = 1; n <= 20; n++) assert.ok(en(n).porDia.slice(1).reduce((a, x) => a + x.cantidad, 0) >= n, 'nivel ' + n);
  assert.deepEqual([1, 5, 9, 20].map((n) => en(n).porDia[0].cantidad), [2, 2, 2, 2]);
  assert.deepEqual(en(8).proximo, { nivelConjuro: 4, enNivel: 9 });
  // Nunca pierde conjuros por día al subir de nivel (el total no baja).
  for (let n = 2; n <= 20; n++) assert.ok(en(n).total >= en(n - 1).total, 'nivel ' + n);
  // Con el ritmo de 3, a los 7 niveles faltan los niveles de conjuro 4 y 5; con el ritmo de PF (sin `ritmo`) un mago de nivel 7 ya tiene el 4.
  assert.equal(Core.progresionConjuros(Object.assign({}, mago, { conjuros: Object.assign({}, mago.conjuros, { ritmo: undefined }) }), 7).nivelMax, 4);
  // Los dos próximos niveles de conjuro, con el nivel de personaje en que llegan.
  assert.deepEqual(en(7).proximos, [{ nivelConjuro: 4, enNivel: 9 }, { nivelConjuro: 5, enNivel: 12 }]);
  assert.deepEqual(en(1).proximos, [{ nivelConjuro: 2, enNivel: 3 }, { nivelConjuro: 3, enNivel: 6 }]);
  assert.deepEqual(en(18).proximos, [{ nivelConjuro: 8, enNivel: 21 }, { nivelConjuro: 9, enNivel: 24 }]);
  // El redondeo de los trucos es configurable; sin `trucos` quedan como en la tabla.
  const conTrucos = (t) => Core.progresionConjuros(Object.assign({}, mago, { conjuros: Object.assign({}, mago.conjuros, { trucos: t }) }), 1).porDia[0].cantidad;
  assert.deepEqual([conTrucos({ factor: 0.5, redondeo: 'abajo' }), conTrucos({ factor: 0.5, redondeo: 'cerca' }), conTrucos({ factor: 0.5 }), conTrucos(undefined)], [1, 2, 2, 3]);
  // Sin `ritmo` el personaje de nivel N usa la fila N de la tabla (el nivel de conjuro n llega con su fila).
  const sinRitmo = Object.assign({}, mago, { conjuros: Object.assign({}, mago.conjuros, { ritmo: undefined, trucos: undefined }) });
  assert.deepEqual(Core.progresionConjuros(sinRitmo, 5).porDia.map((x) => x.cantidad), [4, 3, 2, 1]);
  assert.deepEqual(Core.progresionConjuros(sinRitmo, 1).llegadas.map((x) => x.enNivel), [1, 1, 3, 5, 7, 9, 11, 13, 15, 17]);
  // Sin tabla (monje, sin archivo) no hay progresión.
  assert.equal(Core.progresionConjuros(leer('data/clases/monk.json'), 7), null);
  assert.equal(Core.progresionConjuros(null, 7), null);
});

// ---- v0.9.5 y v0.9.6: Mana force por nivel, nivel de Mana, conjuros del manual y propios, técnicas de Estrella Mana

const CJ = (extra) => Object.assign({ tipo: 'conjuro' }, extra);
const mago = (entradas, extra) => pj([[xp(6000), SX(40), MF(3, 'otra', 'p')].concat(entradas)], Object.assign({ clase: 'wizard', raza: 'raza-ejemplo' }, extra || {}));

test('Mana force por nivel: un contrato que crece (porNivel × nivel) y entradas inválidas', () => {
  const ctx = contexto();
  // Nivel 7 (6000 XP): 1 de base + 2 por nivel = 15, que permite 4 Gates.
  const aporte = { tipo: 'mana-fuerza', porNivel: 2, fuente: 'contrato-magico', nota: 'Contrato durmiente' };
  let r = Core.calcularPersonaje(ctx, pj([[xp(6000), aporte]]));
  assert.deepEqual([errores(r), r.nivel.nivel, r.mana.fuerza.total, r.mana.fuerza.permitidos], [[], 7, 15, 4]);
  assert.deepEqual([r.mana.fuerza.aportes[0].porNivel, r.mana.fuerza.aportes[0].cantidad], [2, 14]);
  assert.equal(r.sesiones[0].mf[0].cantidad, 14);
  // Crece con los niveles: una sesión más con XP y el aporte sube solo.
  r = Core.calcularPersonaje(ctx, pj([[xp(6000), aporte], [xp(2000)]]));
  assert.equal(r.nivel.nivel > 7 ? r.mana.fuerza.total : -1, 1 + 2 * r.nivel.nivel);
  // El Gate 2 exige MF 2: con el contrato a nivel 7 se puede (y sin él no).
  r = Core.calcularPersonaje(ctx, pj([[xp(6000), SX(20), aporte, gate('g1', 'hielo'), gate('g2', 'viento')]]));
  assert.deepEqual([errores(r), r.mana.nivel], [[], 2]);
  assert.match(errores(Core.calcularPersonaje(ctx, pj([[xp(6000), SX(20), gate('g1', 'hielo'), gate('g2', 'viento')]])))[0], /Gate 2 exige Mana force 2/);
  // Inválidas: cantidad y porNivel a la vez, porNivel no entero o no positivo, fuente desconocida.
  const mal = (x) => errores(Core.calcularPersonaje(ctx, pj([[xp(6000), Object.assign({}, aporte, x)]])))[0];
  assert.match(mal({ cantidad: 1 }), /cantidad o porNivel, no los dos/);
  assert.match(mal({ porNivel: 0 }), /porNivel debe ser un entero positivo/);
  assert.match(mal({ porNivel: 1.5 }), /porNivel debe ser un entero positivo/);
  assert.match(mal({ fuente: 'sueño' }), /fuente debe ser/);
});

test('nivel de Mana: 0 sin Gates, 1 con un Gate, 2 con un nodo y 3 con un círculo', () => {
  const ctx = contexto();
  const nivel = (g) => Core.calcularPersonaje(ctx, base(g)).mana.nivel;
  assert.equal(nivel([]), 0);
  assert.equal(nivel([gate('g1', 'hielo')]), 1);
  assert.equal(nivel([gate('g1', 'hielo'), gate('g2', 'viento')]), 2);
  assert.equal(nivel([gate('g1', 'hielo'), gate('g2', 'viento'), gate('g3', 'rayo')]), 3);
  // Con un par sin conexión (hielo y fuego) no hay círculo: sigue en 2.
  assert.equal(nivel([gate('g1', 'hielo'), gate('g2', 'fuego'), gate('g3', 'viento')]), 2);
});

test('conjuros del manual: se agregan por id y el nivel sale de la lista de la clase', () => {
  const ctx = contexto();
  let r = Core.calcularPersonaje(ctx, mago([CJ({ id: 'magic-missile' }), CJ({ id: 'fireball' }), CJ({ id: 'light' })]));
  assert.deepEqual(errores(r), []);
  const rep = r.repertorio;
  assert.deepEqual(rep.conjuros.map((c) => [c.id, c.nivel, c.origen]), [['magic-missile', 1, 'catalogo'], ['fireball', 3, 'catalogo'], ['light', 0, 'catalogo']]);
  assert.deepEqual(rep.porNivel.map((g) => [g.nivel, g.conjuros.map((c) => c.id)]), [[0, ['light']], [1, ['magic-missile']], [3, ['fireball']]]);
  const mm = rep.conjuros[0];
  assert.deepEqual([mm.escuela, mm.tiempo, mm.salvacion, mm.rc, mm.libro], ['Evocación', '1 standard action', 'none', 'yes', 'CRB']);
  assert.equal(rep.conjuros.some((c) => c.sobreNivel), false);
  assert.deepEqual(r.sesiones[0].conjuros.map((c) => c.nombre), ['Magic Missile', 'Fireball', 'Light']);
  // Errores: id desconocido, repetido, fuera de la lista de la clase y nivel inválido.
  const err = (e, extra) => errores(Core.calcularPersonaje(ctx, mago(e, extra)))[0];
  assert.match(err([CJ({ id: 'no-existe' })]), /no existe en data\/conjuros\.json/);
  assert.match(err([CJ({ id: 'light' }), CJ({ id: 'light' })]), /ya está en la Magia del personaje/);
  assert.match(err([CJ({ id: 'cure-light-wounds' })]), /no está en la lista de Wizard: indica el nivel con `nivel`/);
  assert.match(err([CJ({ id: 'light', nivel: 12 })]), /nivel debe ser un entero de 0 a 9/);
  // Con nivel explícito sí entra (un conjuro fuera de lista que el GM concede).
  r = Core.calcularPersonaje(ctx, mago([CJ({ id: 'cure-light-wounds', nivel: 2 })]));
  assert.deepEqual([errores(r), r.repertorio.conjuros[0].nivel], [[], 2]);
  // Un conjuro de nivel mayor al que la clase alcanza se marca sobreNivel (el mago de nivel 7 llega al 3).
  r = Core.calcularPersonaje(ctx, mago([CJ({ id: 'wish' })]));
  assert.deepEqual([errores(r), r.repertorio.conjuros[0].nivel, r.repertorio.conjuros[0].sobreNivel], [[], 9, true]);
  // Una clase sin lista de conjuros (monje) no puede tomar uno del manual sin nivel.
  assert.match(errores(Core.calcularPersonaje(ctx, pj([[xp(6000), CJ({ id: 'magic-missile' })]], { clase: 'monk' })))[0], /no está en la lista de Monk/);
});

test('conjuros propios: llevan nombre y nivel, y las técnicas de Mana ya no entran por aquí', () => {
  const ctx = contexto();
  const sagita = CJ({ nombre: 'Rayo Propio', nivel: 1, descripcion: 'Un rayo.', costo: 'Mana X' });
  const r = Core.calcularPersonaje(ctx, mago([sagita]));
  assert.deepEqual(errores(r), []);
  assert.deepEqual(r.repertorio.conjuros.map((c) => [c.id, c.nivel, c.origen, c.descripcion]), [['rayo-propio', 1, 'propio', 'Un rayo.']]);
  assert.equal(r.repertorio.total, 1);
  assert.deepEqual(Object.keys(r.repertorio).sort(), ['conjuros', 'porNivel', 'total']);
  const err = (e) => errores(Core.calcularPersonaje(ctx, mago(e)))[0];
  assert.match(err([CJ({ nombre: 'X' })]), /un conjuro propio necesita nivel/);
  assert.match(err([CJ({ nombre: 'X', nivel: 10 })]), /un conjuro propio necesita nivel/);
  // categoria, aprendiendo y requisitos se fueron con las técnicas: ahora son mana-tecnica.
  assert.match(err([CJ({ nombre: 'Y', nivel: 1, categoria: 'tecnica' })]), /"categoria" ya no existe; las técnicas de Mana se anotan con mana-tecnica/);
  assert.match(err([CJ({ nombre: 'Y', nivel: 1, aprendiendo: true })]), /"aprendiendo" ya no existe/);
  assert.match(err([CJ({ nombre: 'Y', nivel: 1, requisitos: { gates: 3 } })]), /"requisitos" ya no existe/);
  assert.match(err([CJ({ nombre: 'Y', nivel: 1, descripcion: '  ' })]), /descripcion debe ser un texto no vacío/);
  assert.match(err([CJ({ nombre: 'Y', nivel: 1, id: 'Mala Id' })]), /id debe ir en minúsculas/);
  assert.match(err([sagita, CJ({ nombre: 'rayo propio', nivel: 2 })]), /ya está en la Magia del personaje/);
});

const TM = (extra) => Object.assign({ tipo: 'mana-tecnica' }, extra);
const TMSX = (id, cantidad) => ({ tipo: 'mana-tecnica-sx', id: id, cantidad: cantidad });

test('técnicas de Estrella Mana: inscritas, activas y un contenedor de SX que se llena de a poco', () => {
  const ctx = contexto();
  const g = [gate('g1', 'oro', 'sentidos'), gate('g2', 'fuego', 'capacidad')];
  const sagita = TM({ nombre: 'Sagita Lux Magica', nivel: 1, costo: 'Magia invertida, máximo 12', descripcion: 'Crea 1 proyectil por punto invertido.' });
  const sendero = TM({ nombre: 'Senderos de la Magia', nivel: 2 });
  const pulso = TM({ nombre: 'Heat Pulse', nivel: 1 });
  const circle = TM({ nombre: 'Circle Activation', categoria: 'activa', nivel: 1, costo: 'Mana 1', descripcion: 'Circula magia.' });
  const pwc = TM({ nombre: 'Parallel World Casting', nivel: 3, costoSx: 200 });
  const calc = (e) => Core.calcularPersonaje(ctx, mago(g.concat(e)));
  let r = calc([sagita, sendero, pulso, circle, pwc]);
  assert.deepEqual(errores(r), []);
  assert.deepEqual(r.mana.tecnicas.map((t) => [t.id, t.categoria, t.nivel, t.aprendiendo, t.slots]), [
    ['sagita-lux-magica', 'inscrita', 1, false, []], ['senderos-de-la-magia', 'inscrita', 2, false, []], ['heat-pulse', 'inscrita', 1, false, []],
    ['circle-activation', 'activa', 1, false, []], ['parallel-world-casting', 'inscrita', 3, true, []]]);
  assert.deepEqual([r.mana.totales.tecnicas, r.sesiones[0].tecnicasMana.length], [5, 5]);
  assert.equal(r.repertorio.total, 0, 'las técnicas no cuentan como Magia');
  // Contenedor: acumula SX sin mirar Gates ni la reserva; al llenarse deja de estar aprendiendo.
  r = calc([pwc, TMSX('parallel-world-casting', 120)]);
  let c = r.mana.tecnicas[0];
  assert.deepEqual([errores(r), c.acumulado, c.falta, c.aprendiendo], [[], 120, 80, true]);
  assert.deepEqual(r.sesiones[0].tecnicasSx, [{ id: 'parallel-world-casting', nombre: 'Parallel World Casting', cantidad: 120, acumulado: 120, costoSx: 200 }]);
  r = calc([pwc, TMSX('parallel-world-casting', 120), TMSX('parallel-world-casting', 80)]);
  c = r.mana.tecnicas[0];
  assert.deepEqual([errores(r), c.acumulado, c.falta, c.aprendiendo], [[], 200, 0, false]);
  // El contenedor no toca los SX de mana ni la reserva.
  assert.equal(r.mana.total, 40);
  // Errores de la técnica.
  const err = (e) => errores(calc(e))[0];
  assert.match(err([TM({ nivel: 1 })]), /nombre debe ser un texto no vacío/);
  assert.match(err([TM({ nombre: 'X', nivel: 4 })]), /nivel debe ser 1 \(Gate\), 2 \(nodo\) o 3 \(círculo\)/);
  assert.match(err([TM({ nombre: 'X', nivel: 0 })]), /nivel debe ser 1/);
  assert.match(err([TM({ nombre: 'X', nivel: 1, categoria: 'pasiva' })]), /categoria debe ser inscrita o activa/);
  assert.match(err([TM({ nombre: 'X', nivel: 1, costoSx: 0 })]), /costoSx debe ser un entero positivo/);
  assert.match(err([TM({ nombre: 'X', nivel: 1, costo: ' ' })]), /costo debe ser un texto no vacío/);
  assert.match(err([TM({ nombre: 'X', nivel: 1, id: 'Mala Id' })]), /id debe ir en minúsculas/);
  assert.match(err([pulso, TM({ nombre: 'heat pulse', nivel: 2 })]), /ya existe/);
  // Errores del contenedor: técnica ajena, sin contenedor, cantidad inválida, pasarse de la meta o bajar de 0.
  assert.match(err([TMSX('nada', 5)]), /"nada" no es una técnica de Mana del personaje/);
  assert.match(err([pulso, TMSX('heat-pulse', 5)]), /no tiene contenedor de SX/);
  assert.match(err([pwc, TMSX('parallel-world-casting', 0)]), /cantidad debe ser un entero distinto de 0/);
  assert.match(err([pwc, TMSX('parallel-world-casting', 1.5)]), /cantidad debe ser un entero distinto de 0/);
  assert.match(err([pwc, TMSX('parallel-world-casting', 201)]), /solo admite 200 SX más/);
  assert.match(err([pwc, TMSX('parallel-world-casting', -5)]), /el contenedor quedaría en -5/);
  assert.deepEqual(errores(calc([pwc, TMSX('parallel-world-casting', 50), TMSX('parallel-world-casting', -20)])), []);
});

test('inscribir una técnica de Mana: su nivel no puede superar al del slot y solo una vez', () => {
  const ctx = contexto();
  const g = [gate('g1', 'oro'), gate('g2', 'fuego')];
  const sagita = TM({ nombre: 'Sagita Lux Magica', nivel: 1 });
  const sendero = TM({ nombre: 'Senderos de la Magia', nivel: 2 });
  const ins = (slot, tecnica) => ({ tipo: 'inscribir', slot: slot, tecnica: tecnica });
  const calc = (e) => Core.calcularPersonaje(ctx, mago(g.concat(e)));
  let r = calc([sagita, sendero, ins('g1', 'sagita-lux-magica'), ins('g1-g2', 'senderos-de-la-magia')]);
  assert.deepEqual(errores(r), []);
  assert.deepEqual(r.mana.slots.map((s) => [s.id, s.habilidad && s.habilidad.nombre, s.habilidad && s.habilidad.tipo]), [['g1', 'Sagita Lux Magica', 'tecnica'], ['g2', null, null], ['g1-g2', 'Senderos de la Magia', 'tecnica']]);
  assert.deepEqual(r.mana.tecnicas.map((t) => [t.id, t.slots]), [['sagita-lux-magica', ['g1']], ['senderos-de-la-magia', ['g1-g2']]]);
  assert.deepEqual([r.mana.totales.ocupados, r.sesiones[0].inscripciones.length], [2, 2]);
  // Una técnica de nivel 2 no cabe en un Gate; una de nivel 1 sí cabe en un nodo.
  assert.match(errores(calc([sendero, ins('g1', 'senderos-de-la-magia')]))[0], /es de nivel de Mana 2 y el slot g1 es de nivel 1/);
  assert.deepEqual(errores(calc([sagita, ins('g1-g2', 'sagita-lux-magica')])), []);
  // Errores: técnica ajena, activa, todavía en aprendizaje, habilidad y técnica a la vez, slot ocupado y técnica ya inscrita.
  assert.match(errores(calc([ins('g1', 'nada')]))[0], /"nada" no es una técnica de Mana del personaje/);
  assert.match(errores(calc([TM({ nombre: 'T', nivel: 1, categoria: 'activa' }), ins('g1', 't')]))[0], /técnica activa y no va en un slot/);
  assert.match(errores(calc([TM({ nombre: 'P', nivel: 1, costoSx: 50 }), TMSX('p', 20), ins('g1', 'p')]))[0], /todavía se está aprendiendo \(20\/50 SX\)/);
  assert.match(errores(calc([sagita, { tipo: 'inscribir', slot: 'g1', tecnica: 'sagita-lux-magica', habilidad: 'x' }]))[0], /habilidad o tecnica, no las dos/);
  assert.match(errores(calc([sagita, ins('g1', 'sagita-lux-magica'), ins('g1', 'sagita-lux-magica')]))[0], /ya tiene "Sagita Lux Magica"/);
  assert.match(errores(calc([sagita, ins('g1', 'sagita-lux-magica'), ins('g2', 'sagita-lux-magica')]))[0], /ya está inscrita en el slot g1/);
  // Aprendida del todo (contenedor lleno), ya se puede inscribir.
  assert.deepEqual(errores(calc([TM({ nombre: 'P', nivel: 1, costoSx: 50 }), TMSX('p', 50), ins('g1', 'p')])), []);
  // Quitar y volver a inscribir.
  r = calc([sagita, ins('g1', 'sagita-lux-magica'), { tipo: 'desinscribir', slot: 'g1' }]);
  assert.deepEqual([errores(r), r.mana.totales.ocupados, r.mana.tecnicas[0].slots], [[], 0, []]);
  r = calc([sagita, ins('g1', 'sagita-lux-magica'), { tipo: 'desinscribir', slot: 'g1' }, ins('g2', 'sagita-lux-magica')]);
  assert.deepEqual([errores(r), r.mana.tecnicas[0].slots], [[], ['g2']]);
});

test('data/conjuros.json: ids únicos, niveles de 0 a 9 y listas de clases que existen', () => {
  const cat = leer('data/conjuros.json');
  const clases = new Set(leer('data/classes.json').clases.map((c) => c.id));
  assert.ok(cat.conjuros.length > 1000);
  assert.equal(new Set(cat.conjuros.map((c) => c.id)).size, cat.conjuros.length);
  cat.conjuros.forEach((c) => {
    assert.ok(c.nombre && c.escuela && c.libro, c.id);
    const lista = Object.keys(c.nivel);
    assert.ok(lista.length > 0, c.id);
    lista.forEach((k) => {
      assert.ok(clases.has(k), c.id + ': lista ' + k);
      assert.ok(Number.isInteger(c.nivel[k]) && c.nivel[k] >= 0 && c.nivel[k] <= 9, c.id + ': nivel ' + k);
    });
    assert.ok(!('descripcion' in c), c.id + ': el catálogo no copia el texto');
  });
  assert.deepEqual(cat.listas.filter((k) => !clases.has(k)), []);
});

// ------------------------------------------------------- ventajas pasivas (6.6)

test('ventajas pasivas: lo que no se activa se suma y se desglosa por grupo (Musashi, nivel 7)', () => {
  const c = contexto();
  const mu = Core.calcularPersonaje(c, leer('characters/musashi-nanaya.json'));
  const v = mu.ventajas;
  const linea = (grupo, texto) => (v.grupos.find((g) => g.id === grupo) || { lineas: [] }).lineas.find((l) => l.texto === texto);
  // WIS 16 = +3, más +1 a los niveles 4 (y 8…): +4 a la CA y a la DMC solo sin armadura; el +1 de Dodge y el +4 de Mobility son otras líneas.
  const defensaTodas = v.grupos.find((g) => g.id === 'defensa').lineas;
  const caMonk = defensaTodas.find((l) => l.texto === '+4 a la CA' && l.condicion === 'sin armadura, sin escudo y con carga ligera');
  assert.ok(caMonk, 'CA de Monk');
  assert.deepEqual(caMonk.partes.map((p) => p.nombre), ['AC Bonus']);
  assert.ok(defensaTodas.find((l) => l.texto === '+4 a la DMC' && l.condicion));
  assert.equal(linea('defensa', '+1 a la CA').condicion, null);
  assert.ok(defensaTodas.some((l) => l.texto === '+4 a la CA' && l.condicion === 'contra ataques de oportunidad por moverse'));
  assert.equal(defensaTodas.filter((l) => l.texto === '+4 a la CA').length, 2, 'dos líneas de +4 a la CA con condiciones distintas, no una de +8');
  // Los números van antes que los textos, sin condición antes que con ella, y el valor viene aparte para destacarlo.
  const defensa = v.grupos.find((g) => g.id === 'defensa').lineas;
  assert.equal(defensa[0].condicion, null);
  assert.equal(defensa[0].valorTexto, '+1');
  // Velocidad: +10 pies cada 3 niveles desde el 3 → +20 a nivel 7. La caída se reemplaza (30 pies), no se suma.
  assert.ok(linea('movimiento', '+20 pies de velocidad'));
  assert.ok(linea('movimiento', 'Reduce 30 pies el daño por caída'));
  assert.equal(linea('movimiento', 'Reduce 30 pies el daño por caída').valorTexto, '30 pies');
  // El daño sin armas pasa de 1d6 a 1d8 a nivel 4: solo queda la línea del nivel más alto alcanzado.
  const dano = v.grupos.find((g) => g.id === 'ataque').lineas.filter((l) => /Daño sin armas/.test(l.texto));
  assert.deepEqual(dano.map((l) => l.texto), ['Daño sin armas 1d8']);
  // Salvaciones con condición separadas.
  assert.ok(linea('salvaciones', '+2 a las salvaciones'));
  assert.ok(v.grupos.find((g) => g.id === 'salvaciones').lineas.some((l) => l.valor === 4 && l.condicion === 'contra veneno'));
  // Los feats y habilidades activas no entran: Spring Attack y Sneak Attack van a Magia y habilidades.
  const nombres = v.titulos.feats.map((t) => t.nombre).concat(v.titulos.clase.map((t) => t.nombre));
  assert.ok(nombres.indexOf('Dodge') >= 0 && nombres.indexOf('AC Bonus') >= 0);
  assert.equal(nombres.indexOf('Spring Attack'), -1);
  assert.equal(nombres.indexOf('Sneak Attack'), -1);
  assert.equal(nombres.indexOf('Flurry of Blows'), -1);
  assert.deepEqual(v.sinDesglose, []);
  // Cada línea dice de qué salen sus números.
  assert.deepEqual(linea('defensa', '+1 a la CA').partes.map((p) => p.nombre), ['Dodge']);
});

test('ventajas pasivas: Herb\'Azzio suma lo suyo y Empower Spell es una habilidad, no una pasiva', () => {
  const c = contexto();
  const he = Core.calcularPersonaje(c, leer('characters/herb-azzio.json'));
  const todas = [].concat(...he.ventajas.grupos.map((g) => g.lineas));
  const texto = (t) => todas.find((l) => l.texto === t);
  assert.ok(texto('+4 a la iniciativa'));
  assert.ok(texto('+7 pg'), 'Toughness: el mayor entre 3 y el nivel (7)');
  assert.ok(texto('+4 a las pruebas de concentración'));
  assert.ok(texto('+2 para vencer la resistencia a conjuros'));
  assert.equal(he.ventajas.titulos.feats.some((t) => t.id === 'empower-spell'), false);
  assert.ok(he.feats.lista.some((x) => x.id === 'empower-spell' && x.tipo === 'habilidad-tipo-conjuro'));
  assert.ok(he.feats.lista.some((x) => x.id === 'spring-attack') === false);
  const mu = Core.calcularPersonaje(c, leer('characters/musashi-nanaya.json'));
  assert.ok(mu.feats.lista.some((x) => x.id === 'spring-attack' && x.tipo === 'habilidad-tipo-conjuro'));
  // Sneak Attack del arquetipo es activo: aparece entre las habilidades activas de la clase, no entre las pasivas.
  assert.equal(mu.clase.habilidades.find((h) => h.id === 'sneak-attack').ejecucion, 'activo');
});

test('ventajas pasivas: valores por atributo, por nivel, mínimo y reemplazo con un catálogo propio', () => {
  const cat = { grupos: [{ id: 'g', nombre: 'G' }], objetivos: { x: { grupo: 'g', formato: '{v} a X' }, y: { grupo: 'g', unidad: 'pies', formato: 'Y {n}' } } };
  const clase = (nivel) => ({
    habilidades: [{ id: 'h', nombre: 'H', nivel: 1, ejecucion: 'pasivo', origen: 'clase', efectos: [
      { objetivo: 'x', atributo: 'WIS' }, { objetivo: 'x', valor: 1, nivel: 4, cadaNiveles: 4 },
      { objetivo: 'x', porNivel: 1, minimo: 3, condicion: 'mínimo' },
      { objetivo: 'y', valor: 10, nivel: 1, reemplaza: 'k' }, { objetivo: 'y', valor: 20, nivel: 5, reemplaza: 'k' },
      { objetivo: 'x', valor: 0, condicion: 'cero' },
    ] }],
  });
  const calc = (nivel, wis) => Core.calcularVentajas({ catalogo: cat, clase: clase(nivel), feats: [], nivel: nivel, atributos: { WIS: wis } });
  const lineas = (r) => r.grupos[0].lineas.map((l) => l.texto + (l.condicion ? ' [' + l.condicion + ']' : ''));
  assert.deepEqual(lineas(calc(1, 16)), ['+3 a X', '+3 a X [mínimo]', 'Y 10 pies']);
  assert.deepEqual(lineas(calc(4, 16)), ['+4 a X', '+4 a X [mínimo]', 'Y 10 pies']);
  assert.deepEqual(lineas(calc(8, 8)), ['+2 a X', '+8 a X [mínimo]', 'Y 20 pies']);   // WIS 8 = −1: un atributo bajo no resta
  assert.equal(calc(1, 16).grupos[0].lineas.length, 3, 'un valor 0 no genera línea');
});

test('ventajas pasivas: feats con elección, feats sin desglose y un grupo desconocido', () => {
  const cat = { grupos: [{ id: 'g', nombre: 'G' }], objetivos: { x: { grupo: 'g', formato: '{v} a X' } } };
  const r = Core.calcularVentajas({
    catalogo: cat, nivel: 3, atributos: {}, clase: null,
    efectosFeats: { 'wf': [{ objetivo: 'x', valor: 1, condicion: 'con {eleccion}' }, { grupo: 'zzz', texto: 'algo raro' }] },
    feats: [{ id: 'wf', nombre: 'Weapon Focus (espada)', eleccion: 'espada', tipo: 'feat' }, { id: 'nuevo', nombre: 'Nuevo', tipo: 'feat' }, { id: 'act', nombre: 'Act', tipo: 'habilidad-tipo-conjuro' }],
  });
  assert.equal(r.grupos[0].lineas[0].condicion, 'con espada');
  assert.deepEqual(r.sinDesglose.map((x) => x.id), ['nuevo']);
  assert.equal(r.grupos[r.grupos.length - 1].id, 'otros', 'un grupo que el catálogo no conoce no se pierde');
  assert.deepEqual(r.titulos.feats.map((t) => t.id), ['wf', 'nuevo']);
});

test('data/efectos.json y los efectos de feats y clases usan objetivos y grupos del catálogo', () => {
  const c = contexto();
  const grupos = c.efectos.grupos.map((g) => g.id);
  Object.keys(c.efectos.objetivos).forEach((k) => assert.ok(grupos.indexOf(c.efectos.objetivos[k].grupo) >= 0, 'objetivo ' + k));
  const revisar = (nombre, efs) => efs.forEach((e) => {
    if (e.objetivo) assert.ok(c.efectos.objetivos[e.objetivo], nombre + ': objetivo ' + e.objetivo);
    else { assert.ok(e.texto, nombre + ': un efecto sin objetivo lleva texto'); assert.ok(grupos.indexOf(e.grupo || 'capacidades') >= 0, nombre + ': grupo ' + e.grupo); }
    if (e.objetivo === 'habilidad') assert.ok(e.etiqueta, nombre + ': una habilidad lleva etiqueta');
  });
  const idsFeats = new Set(c.feats.map((f) => f.id));
  Object.keys(c.efectosFeats).forEach((id) => {
    assert.ok(idsFeats.has(id), 'el feat ' + id + ' existe');
    assert.notEqual(c.feats.find((f) => f.id === id).ejecucion, 'activo', id + ' es activo: no lleva efectos pasivos');
    revisar(id, c.efectosFeats[id]);
  });
  Object.keys(c.clasesDetalle).forEach((id) => {
    const d = c.clasesDetalle[id];
    d.habilidades.concat([].concat(...(d.arquetipos || []).map((a) => a.habilidades || []))).forEach((h) => {
      if (h.ejecucion === 'activo') assert.equal(h.efectos, undefined, id + '/' + h.id + ' es activa: no lleva efectos');
      if (h.efectos) revisar(id + '/' + h.id, h.efectos);
    });
  });
});

// ------------------------------------------- notas, resumen y opciones por sesión (6.7)

test('sesión: resumen e imagen del GM, y el campo notas de siempre vale como resumen', () => {
  const c = contexto();
  const base = pj([[xp(0)], [{ tipo: 'resumen', texto: ' Cruzaron la sierra. ', imagen: 'sesiones/s1.jpg' }], []]);
  base.sesiones[0].notas = 'Inicio de campaña.';
  base.sesiones[2].resumen = 'Los hornos de escarcha.';
  base.sesiones[2].imagen = 'https://ejemplo.org/horno.png';
  const r = Core.calcularPersonaje(c, base);
  assert.deepEqual(errores(r), []);
  assert.equal(r.sesiones[0].resumen, 'Inicio de campaña.', '`notas` vale como resumen');
  assert.equal(r.sesiones[0].imagen, null);
  assert.equal(r.sesiones[1].resumen, 'Cruzaron la sierra.');
  assert.equal(r.sesiones[1].imagen, 'sesiones/s1.jpg');
  assert.equal(r.sesiones[2].resumen, 'Los hornos de escarcha.');
  assert.equal(r.sesiones[2].imagen, 'https://ejemplo.org/horno.png');
  // Una entrada de resumen puede apuntar a una sesión anterior (el GM completa una sesión ya cerrada).
  const tarde = Core.calcularPersonaje(c, pj([[xp(0)], [], [{ tipo: 'resumen', sesion: 's1', texto: 'Contado después' }]]));
  assert.equal(tarde.sesiones[1].resumen, 'Contado después');
  assert.equal(tarde.sesiones[2].resumen, '');
  // Entradas inválidas.
  const mal = Core.calcularPersonaje(c, pj([[xp(0), { tipo: 'resumen' }, { tipo: 'resumen', texto: 5 }, { tipo: 'resumen', imagen: 7 }]]));
  assert.equal(errores(mal).length, 3);
  const malSes = pj([[xp(0)]]);
  malSes.sesiones[0].resumen = 5;
  malSes.sesiones[0].imagen = {};
  assert.equal(errores(Core.calcularPersonaje(c, malSes)).length, 2);
});

test('apuntes: notas por autor, de jugadores y del GM, que van a la sesión que dicen', () => {
  const c = contexto();
  const r = Core.calcularPersonaje(c, pj([
    [xp(0), { tipo: 'apunte', autor: ' Ana ', texto: 'El mapa estaba al revés.' }],
    [{ tipo: 'apunte', autor: 'GM', rol: 'gm', texto: 'Ojo con el favor del barón.' }, { tipo: 'apunte', autor: 'Luis', texto: 'Mi PJ desconfía.' }],
    [{ tipo: 'apunte', autor: 'Ana', sesion: 's0', texto: 'Se me olvidó anotar el nombre del posadero.' }, { tipo: 'apunte', autor: 'Ana', sesion: 'no-existe', texto: 'Esta se queda aquí.' }],
  ]));
  assert.deepEqual(errores(r), []);
  assert.deepEqual(r.sesiones[0].apuntes.map((a) => a.autor + ':' + a.rol), ['Ana:jugador', 'Ana:jugador']);
  assert.equal(r.sesiones[0].apuntes[1].desde, 's2', 'una nota atrasada dice dónde está escrita');
  assert.deepEqual(r.sesiones[1].apuntes.map((a) => a.autor + ':' + a.rol), ['GM:gm', 'Luis:jugador']);
  assert.deepEqual(r.sesiones[2].apuntes.map((a) => a.texto), ['Esta se queda aquí.'], 'una sesión que no existe: la nota se queda donde está');
  const mal = Core.calcularPersonaje(c, pj([[xp(0), { tipo: 'apunte', texto: 'sin autor' }, { tipo: 'apunte', autor: 'Ana' }, { tipo: 'apunte', autor: 'Ana', texto: 'x', rol: 'master' }, { tipo: 'apunte', autor: 'Ana', texto: 'x', sesion: 5 }]]));
  assert.equal(errores(mal).length, 4);
});

test('opciones: el GM ofrece, el jugador decide y la decisión queda en la sesión de la oferta (grupo o individual)', () => {
  const c = contexto();
  const oferta = (extra) => Object.assign({
    tipo: 'opciones', id: 'botin-jefe', titulo: 'Botín del jefe', alcance: 'grupo',
    opciones: [{ id: 'espada', texto: 'Espada +1' }, { id: 'anillo', texto: 'Anillo de protección' }, { id: 'oro', texto: '500 po' }],
  }, extra || {});
  const r = Core.calcularPersonaje(c, pj([
    [xp(0)],
    [oferta(), oferta({ id: 'favor', titulo: 'Favor del barón', alcance: 'individual', elige: 2 })],
    [{ tipo: 'decision', opciones: 'botin-jefe', elegidas: ['anillo'] }],
  ]));
  assert.deepEqual(errores(r), []);
  assert.equal(r.opciones.lista.length, 2);
  assert.equal(r.opciones.pendientes, 1);
  const botin = r.opciones.lista[0];
  assert.equal(botin.alcance, 'grupo');
  assert.equal(botin.sesion, 's1', 'la oferta pertenece a la sesión donde se ofreció');
  assert.deepEqual(botin.decision.elegidas, ['anillo']);
  assert.deepEqual(botin.decision.textos, ['Anillo de protección']);
  assert.equal(botin.decision.desde, 's2', 'pero se sabe en qué sesión se decidió');
  assert.deepEqual(botin.opciones.map((o) => o.elegida), [false, true, false]);
  assert.equal(r.sesiones[1].opciones.length, 2, 'la sesión de la oferta lleva sus opciones');
  assert.equal(r.sesiones[1].opciones[0].decision.elegidas[0], 'anillo', 'y ahí se ve lo decidido');
  assert.equal(r.opciones.lista[1].decision, null);
  assert.equal(r.opciones.lista[1].elige, 2);
  // Cambiar de idea: la última decisión manda y el historial las guarda todas.
  const cambio = Core.calcularPersonaje(c, pj([[xp(0), oferta(), { tipo: 'decision', opciones: 'botin-jefe', elegidas: ['espada'] }, { tipo: 'decision', opciones: 'botin-jefe', elegidas: ['oro'], nota: 'mejor vender' }]]));
  assert.deepEqual(errores(cambio), []);
  assert.deepEqual(cambio.opciones.lista[0].decision.elegidas, ['oro']);
  assert.equal(cambio.opciones.lista[0].decision.nota, 'mejor vender');
  assert.equal(cambio.opciones.lista[0].historial.length, 2);
  assert.equal(cambio.opciones.pendientes, 0);
});

test('opciones: entradas inválidas y decisiones que no encajan', () => {
  const c = contexto();
  const ok = { tipo: 'opciones', id: 'o1', titulo: 'T', opciones: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }, { id: 'c', texto: 'C' }] };
  const prueba = (entradas) => errores(Core.calcularPersonaje(c, pj([[xp(0)].concat(entradas)])));
  assert.deepEqual(prueba([ok]), []);
  assert.equal(Core.calcularPersonaje(c, pj([[xp(0), ok]])).opciones.lista[0].alcance, 'individual', 'sin alcance, individual');
  assert.equal(prueba([Object.assign({}, ok, { id: 'Mal Id' })]).length, 1);
  assert.equal(prueba([ok, ok]).length, 1, 'id repetido');
  assert.equal(prueba([Object.assign({}, ok, { titulo: '' })]).length, 1);
  assert.equal(prueba([Object.assign({}, ok, { alcance: 'mesa' })]).length, 1);
  assert.equal(prueba([Object.assign({}, ok, { opciones: [{ id: 'a', texto: 'A' }] })]).length, 1, 'con una sola opción no hay nada que elegir');
  assert.equal(prueba([Object.assign({}, ok, { opciones: [{ id: 'a', texto: 'A' }, { id: 'a', texto: 'B' }] })]).length, 1, 'opción repetida');
  assert.equal(prueba([Object.assign({}, ok, { opciones: [{ id: 'a' }, { id: 'b', texto: 'B' }] })]).length, 1);
  assert.equal(prueba([Object.assign({}, ok, { elige: 3 })]).length, 1, 'elegir todas no es elegir');
  assert.equal(prueba([Object.assign({}, ok, { elige: 0 })]).length, 1);
  assert.equal(prueba([{ tipo: 'decision', opciones: 'o1', elegidas: ['a'] }]).length, 1, 'decisión antes de la oferta');
  assert.equal(prueba([ok, { tipo: 'decision', opciones: 'o1', elegidas: ['z'] }]).length, 1, 'opción que no existe');
  assert.equal(prueba([ok, { tipo: 'decision', opciones: 'o1', elegidas: ['a', 'b'] }]).length, 1, 'pide elegir 1');
  assert.equal(prueba([ok, { tipo: 'decision', opciones: 'o1', elegidas: [] }]).length, 1);
  assert.equal(prueba([Object.assign({}, ok, { elige: 2 }), { tipo: 'decision', opciones: 'o1', elegidas: ['a', 'a'] }]).length, 1, 'repetida');
  assert.equal(prueba([Object.assign({}, ok, { elige: 2 }), { tipo: 'decision', opciones: 'o1', elegidas: ['a', 'c'] }]).length, 0);
  assert.equal(prueba([ok, { tipo: 'decision', opciones: 'o1', elegidas: 'a' }]).length, 1);
});

test('el personaje de ejemplo trae notas por autor, un resumen con imagen y dos ofertas de opciones (una pendiente)', () => {
  const c = contexto();
  const r = Core.calcularPersonaje(c, ejemplo());
  assert.deepEqual(errores(r), []);
  const mer = r.sesiones.find((x) => x.titulo === 'Mercado de sombras');
  assert.equal(mer.imagen, 'sesiones/mercado-de-sombras.svg');
  assert.ok(fs.existsSync(path.join(RAIZ, 'characters', mer.imagen)), 'la imagen de ejemplo existe');
  assert.deepEqual(mer.apuntes.map((a) => a.autor), ['GM', 'Ana', 'Luis']);
  assert.equal(r.opciones.lista.length, 2);
  assert.deepEqual(r.opciones.lista.map((o) => o.alcance + ':' + (o.decision ? 'decidida' : 'pendiente')), ['grupo:decidida', 'individual:pendiente']);
  assert.equal(r.opciones.pendientes, 1);
  // Los datos de XP y de nivel no cambian por llevar notas y opciones.
  assert.equal(r.nivel.nivel, 7);
});
