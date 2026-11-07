'use strict';
// Genera data/feats.pf1.json a partir de feats.csv de awesomeSheet (MIT).
// Uso: node scripts/import-feats.js <ruta a awesomesheet/src/db/feats.csv>
//
// Qué se copia: nombre, tipo, libro, si se puede tomar varias veces y los requisitos
// (separados en atributos, ataque base, niveles y feats previos; lo demás queda como texto).
// Qué NO se copia: el texto del beneficio ni la descripción. Se usan solo para marcar
// "candidatoActivo" y no se guardan. Motivo: ver docs/FUENTES.md.
//
// Alcance: solo libros que Paizo publica como contenido abierto (los seis de LIBROS) y solo
// los tipos de feat que puede tomar un personaje. Quedan fuera los feats raciales (la raza
// se sustituye por méritos raciales), los míticos, los de historia (story), los de monstruo
// y los achievement (el proyecto tiene los suyos).
const fs = require('node:fs');
const path = require('node:path');

const origen = process.argv[2];
if (!origen) {
  console.error('Uso: node scripts/import-feats.js <ruta a feats.csv>');
  process.exit(1);
}
const raiz = path.join(__dirname, '..');

const LIBROS = [ // el orden es la prioridad cuando un feat sale en varios libros
  ['PFRPG Core', 'CRB'],
  ["Advanced Player's Guide", 'APG'],
  ['Ultimate Magic', 'UM'],
  ['Ultimate Combat', 'UC'],
  ['Advanced Race Guide', 'ARG'],
  ['Ultimate Campaign', 'UCa'],
];
const TIPOS = { General: 'general', Combat: 'combate', Metamagic: 'metamagia', 'Item Creation': 'creacion-de-objetos' };
const ETIQUETAS = { teamwork: 'trabajo-en-equipo', critical: 'critico', style: 'estilo', performance: 'actuacion' };
const ATRIBUTOS = { str: 'STR', strength: 'STR', dex: 'DEX', dexterity: 'DEX', con: 'CON', constitution: 'CON', int: 'INT', intelligence: 'INT', wis: 'WIS', wisdom: 'WIS', cha: 'CHA', charisma: 'CHA' };

const norm = (s) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const slug = (s) => norm(s).replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ---------------------------------------------------------------- lectura del CSV
const lineas = fs.readFileSync(origen, 'utf8').split(/\r?\n/).filter(Boolean);
const cab = lineas[0].split('|');
const esperadas = cab.length;
let reparadas = 0;
const filas = lineas.slice(1).map((l) => {
  let c = l.split('|');
  if (c.length === esperadas + 1) {
    // Una columna de más: o sobra una al final (el libro está en 8) o el texto de "special" se partió (el libro está en 9).
    if (c[9] !== '' && c[9] !== undefined && !/^[01]$/.test(c[9])) c = c.slice(0, 7).concat([c[7] + ' ' + c[8]], c.slice(9));
    else c = c.slice(0, esperadas);
    reparadas += 1;
  }
  if (c.length !== esperadas) throw new Error('fila con ' + c.length + ' columnas: ' + l.slice(0, 60));
  const o = {};
  cab.forEach((h, i) => { o[h] = c[i]; });
  return o;
});

const todosLosNombres = new Set(filas.map((f) => norm(f.name)));
const clases = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'classes.json'), 'utf8')).clases;
const claseDeNombre = {};
clases.forEach((c) => { claseDeNombre[norm(c.nombre)] = c.id; });

// ------------------------------------------------------------------- selección
const excluidos = { libro: 0, tipo: 0, racial: 0, duplicado: 0 };
const prioridad = (f) => LIBROS.findIndex((x) => x[0] === f.source);
const elegibles = [];
filas.forEach((f) => {
  if (prioridad(f) < 0) { excluidos.libro += 1; return; }
  if (!TIPOS[f.type]) { excluidos.tipo += 1; return; }
  if (f.racial === '1') { excluidos.racial += 1; return; }
  elegibles.push(f);
});
elegibles.sort((a, b) => prioridad(a) - prioridad(b));
const vistos = new Map();
elegibles.forEach((f) => {
  const k = norm(f.name);
  if (vistos.has(k)) { excluidos.duplicado += 1; return; }
  vistos.set(k, f);
});

// ids estables: el slug del nombre; si dos nombres distintos dan el mismo slug, se añade el libro
const idDeNombre = new Map();
const idsUsados = new Set();
Array.from(vistos.values()).forEach((f) => {
  let id = slug(f.name);
  if (idsUsados.has(id)) id += '-' + LIBROS[prioridad(f)][1].toLowerCase();
  idsUsados.add(id);
  idDeNombre.set(norm(f.name), id);
});

// --------------------------------------------------------------- requisitos
function partirSuperior(texto) { // coma o punto y coma fuera de paréntesis
  const out = [];
  let prof = 0;
  let cur = '';
  for (const ch of texto) {
    if (ch === '(') prof += 1;
    if (ch === ')') prof -= 1;
    if ((ch === ',' || ch === ';') && prof === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((t) => t.trim()).filter(Boolean);
}

function leerRequisitos(texto) {
  const req = {};
  const otros = [];
  partirSuperior(texto).forEach((crudo) => {
    const tok = crudo.replace(/\*+/g, '').replace(/[.\s]+$/, '').trim();
    if (!tok) return;
    let m;
    // "base attack bonus +6 or monk level 6": el ataque base, o ser de esa clase con ese nivel
    if ((m = /^(?:base attack bonus|bab)\s*\+?(\d+)\s+or\s+([a-z ]+?)\s+level\s+(\d+)(?:st|nd|rd|th)?$/i.exec(tok)) && claseDeNombre[norm(m[2])]) {
      req.bab = Math.max(req.bab || 0, Number(m[1]));
      req.babAlt = { clase: claseDeNombre[norm(m[2])], nivel: Number(m[3]) };
      return;
    }
    if (/ or /i.test(tok)) { otros.push(tok); return; }
    if ((m = /^(strength|dexterity|constitution|intelligence|wisdom|charisma|str|dex|con|int|wis|cha)\s+(\d+)$/i.exec(tok))) {
      req.atributos = req.atributos || {};
      const k = ATRIBUTOS[m[1].toLowerCase()];
      req.atributos[k] = Math.max(req.atributos[k] || 0, Number(m[2]));
      return;
    }
    if ((m = /^(?:base attack bonus|bab)\s*\+?(\d+)$/i.exec(tok))) { req.bab = Math.max(req.bab || 0, Number(m[1])); return; }
    if ((m = /^character level\s+(\d+)(?:st|nd|rd|th)?$/i.exec(tok))) { req.nivelPj = Math.max(req.nivelPj || 0, Number(m[1])); return; }
    const porClase = (nombre, nivel) => {
      const id = claseDeNombre[norm(nombre)];
      if (!id) return false;
      if (req.nivelClase && req.nivelClase.clase !== id) { otros.push(tok); return true; }
      req.nivelClase = { clase: id, nivel: Math.max((req.nivelClase && req.nivelClase.nivel) || 0, Number(nivel)) };
      return true;
    };
    if ((m = /^([a-z ]+?)\s+level\s+(\d+)(?:st|nd|rd|th)?$/i.exec(tok)) && porClase(m[1], m[2])) return;
    if ((m = /^(\d+)(?:st|nd|rd|th)?-level\s+([a-z ]+)$/i.exec(tok)) && porClase(m[2], m[1])) return;
    if ((m = /^([a-z]+)\s+(\d+)(?:st|nd|rd|th)?$/i.exec(tok)) && claseDeNombre[norm(m[1])] && porClase(m[1], m[2])) return;
    // feat previo: el nombre exacto
    const clave = norm(tok);
    if (idDeNombre.has(clave)) {
      req.feats = req.feats || [];
      const id = idDeNombre.get(clave);
      if (req.feats.indexOf(id) < 0) req.feats.push(id);
      return;
    }
    // "Weapon Focus with selected weapon": el feat cuenta y el resto queda por verificar
    if ((m = /^(.+?)\s+(?:with|in|for)\s+/i.exec(tok)) && idDeNombre.has(norm(m[1]))) {
      req.feats = req.feats || [];
      const id = idDeNombre.get(norm(m[1]));
      if (req.feats.indexOf(id) < 0) req.feats.push(id);
      otros.push(tok);
      return;
    }
    otros.push(tok);
  });
  if (otros.length) req.otros = otros;
  return req;
}

// ------------------------------------------------- candidatos a feat activo
const RE_ACTIVO = [
  /\bas an? (?:standard|move|swift|immediate|free|full-round|full round) action\b/i,
  /\b(?:standard|move|swift|immediate|free|full-round) action to\b/i,
  /\b(?:once|twice|\d+ times|times) (?:per|a|each) day\b/i,
  /\buses? per day\b/i,
];
const esCandidatoActivo = (beneficio) => RE_ACTIVO.some((re) => re.test(beneficio));

// ------------------------------------------------------------------- salida
const feats = Array.from(vistos.values()).map((f) => {
  const reg = {
    id: idDeNombre.get(norm(f.name)),
    nombre: f.name.trim(),
    fuente: 'pf1',
    libro: LIBROS[prioridad(f)][1],
    tipo: TIPOS[f.type],
  };
  const etiquetas = Object.keys(ETIQUETAS).filter((k) => f[k] === '1').map((k) => ETIQUETAS[k]);
  if (etiquetas.length) reg.etiquetas = etiquetas;
  if (f.multiples === '1') reg.multiple = true;
  reg.ejecucion = 'pasivo';
  if (esCandidatoActivo(f.benefit)) reg.candidatoActivo = true;
  reg.requisitos = leerRequisitos(f.prerequisites);
  return reg;
}).sort((a, b) => a.nombre.localeCompare(b.nombre));

const cuenta = (fn) => feats.filter(fn).length;
const salida = {
  version: '0.7',
  nota: 'Catálogo de Pathfinder 1e generado por scripts/import-feats.js. Sin texto de beneficios (ver docs/FUENTES.md). ejecucion es "pasivo" salvo lo que decida data/feats.conversiones.json; candidatoActivo marca los feats cuyo texto sugiere una acción o usos por día, para revisarlos.',
  libros: { CRB: 'Core Rulebook', APG: "Advanced Player's Guide", UM: 'Ultimate Magic', UC: 'Ultimate Combat', ARG: 'Advanced Race Guide', UCa: 'Ultimate Campaign' },
  feats: feats,
};
fs.writeFileSync(path.join(raiz, 'data', 'feats.pf1.json'), JSON.stringify(salida, null, 1) + '\n');

console.log('Filas leídas: ' + filas.length + ' (reparadas: ' + reparadas + ')');
console.log('Excluidas: ' + JSON.stringify(excluidos));
console.log('Feats escritos: ' + feats.length);
console.log('  por tipo: ' + JSON.stringify(feats.reduce((m, f) => { m[f.tipo] = (m[f.tipo] || 0) + 1; return m; }, {})));
console.log('  por libro: ' + JSON.stringify(feats.reduce((m, f) => { m[f.libro] = (m[f.libro] || 0) + 1; return m; }, {})));
console.log('  con feats previos: ' + cuenta((f) => f.requisitos.feats) + ', con atributos: ' + cuenta((f) => f.requisitos.atributos) +
  ', con BAB: ' + cuenta((f) => f.requisitos.bab !== undefined) + ', con nivel de clase: ' + cuenta((f) => f.requisitos.nivelClase) +
  ', con nivel de personaje: ' + cuenta((f) => f.requisitos.nivelPj !== undefined));
console.log('  con ataque base alternativo por clase: ' + cuenta((f) => f.requisitos.babAlt));
console.log('  con requisitos sin verificar: ' + cuenta((f) => f.requisitos.otros) + ', candidatos a activo: ' + cuenta((f) => f.candidatoActivo) + ', multiples: ' + cuenta((f) => f.multiple));
