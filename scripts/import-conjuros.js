'use strict';
// Genera data/conjuros.json a partir de spells.csv de awesomeSheet (MIT).
// Uso: node scripts/import-conjuros.js <ruta a awesomesheet/src/db/spells.csv>
//
// Qué se copia: nombre, escuela, descriptor, nivel por lista de clase, tiempo de lanzamiento, componentes,
// alcance, objetivo (objetivo, área o efecto), duración, salvación, resistencia a conjuros y libro.
// Qué NO se copia: el texto de la descripción (ni el resumen). Mismo criterio que los feats (docs/FUENTES.md):
// el texto sigue pendiente de la decisión sobre la OGL. El visor enlaza a Archives of Nethys.
//
// Alcance: los libros que Paizo publica como contenido abierto y que ya usa el catálogo de feats, más la
// Advanced Class Guide (trae las listas de las clases híbridas).
const fs = require('node:fs');
const path = require('node:path');

const origen = process.argv[2];
if (!origen) {
  console.error('Uso: node scripts/import-conjuros.js <ruta a spells.csv>');
  process.exit(1);
}
const raiz = path.join(__dirname, '..');

const LIBROS = {
  'PFRPG Core': 'CRB',
  'APG': 'APG',
  'Ultimate Magic': 'UM',
  'Ultimate Combat': 'UC',
  'Advanced Race Guide': 'ARG',
  'Advanced Class Guide': 'ACG',
};
const ESCUELAS = {
  abjuration: 'Abjuración', conjuration: 'Conjuración', divination: 'Adivinación', enchantment: 'Encantamiento',
  evocation: 'Evocación', illusion: 'Ilusión', necromancy: 'Nigromancia', transmutation: 'Transmutación', universal: 'Universal',
};
// Las columnas de lista de clase, tal como las trae el CSV, y el id de clase de data/classes.json.
const LISTAS_CSV = ['sorcerer', 'wizard', 'cleric', 'druid', 'ranger', 'bard', 'paladin', 'alchemist', 'summoner', 'witch', 'inquisitor', 'oracle',
  'antipaladin', 'magus', 'bloodrager', 'shaman', 'skald', 'investigator', 'hunter', 'adept'];

const norm = (s) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const slug = (s) => norm(s).replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const limpio = (s) => (s === undefined || s === 'NULL' ? '' : s.replace(/\s+/g, ' ').trim());

const lineas = fs.readFileSync(origen, 'utf8').split(/\r?\n/).filter(Boolean);
const cab = lineas[0].split('|');
const col = (n) => {
  const i = cab.indexOf(n);
  if (i < 0) throw new Error('falta la columna ' + n);
  return i;
};

const clases = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'classes.json'), 'utf8')).clases.map((c) => c.id);
// Solo se guardan las listas de clases que existen en data/classes.json (antipaladin y adept no).
const LISTAS = LISTAS_CSV.filter((k) => clases.indexOf(k) >= 0);

const vistos = new Set();
const conjuros = [];
let sinLista = 0;
lineas.slice(1).forEach((l) => {
  const r = l.split('|');
  if (r.length !== cab.length) throw new Error('fila con ' + r.length + ' columnas: ' + r[0]);
  const libro = LIBROS[r[col('source')]];
  if (!libro) return;
  const nombre = limpio(r[0]);
  const id = slug(nombre);
  if (vistos.has(id)) return; // el CSV repite hechizos que salen en dos libros; vale el primero
  const nivel = {};
  LISTAS.forEach((k) => {
    const v = r[col(k)];
    if (v !== 'NULL' && v !== '' && /^\d$/.test(v)) nivel[k] = Number(v);
  });
  if (!Object.keys(nivel).length) { sinLista++; return; }
  vistos.add(id);
  const escuela = ESCUELAS[limpio(r[col('school')]).toLowerCase()] || limpio(r[col('school')]);
  const c = { id: id, nombre: nombre, escuela: escuela };
  const sub = limpio(r[col('subschool')]);
  const desc = limpio(r[col('descriptor')]);
  if (sub) c.subescuela = sub;
  if (desc) c.descriptor = desc;
  c.nivel = nivel;
  const campos = [['tiempo', 'casting_time'], ['componentes', 'components'], ['alcance', 'range'], ['duracion', 'duration'],
    ['salvacion', 'saving_throw'], ['rc', 'spell_resistence']];
  campos.forEach(([k, n]) => { const v = limpio(r[col(n)]); if (v) c[k] = v; });
  const objetivo = limpio(r[col('targets')]) || limpio(r[col('area')]) || limpio(r[col('effect')]);
  if (objetivo) c.objetivo = objetivo;
  c.libro = libro;
  conjuros.push(c);
});

conjuros.sort((a, b) => a.nombre.localeCompare(b.nombre, 'en'));
const listasUsadas = LISTAS.filter((k) => conjuros.some((c) => c.nivel[k] !== undefined));

const salida = {
  version: '0.1.0',
  nota: 'Catálogo de conjuros de Pathfinder 1e importado con scripts/import-conjuros.js. Trae datos de reglas (nivel por lista de clase, escuela, tiempo, alcance, duración, salvación, RC) y NO el texto de la descripción. Los conjuros propios se crean en el registro del personaje.',
  fuente: 'awesomeSheet (MIT), src/db/spells.csv',
  listas: listasUsadas,
  conjuros: conjuros,
};
fs.writeFileSync(path.join(raiz, 'data', 'conjuros.json'), JSON.stringify(salida) + '\n');
console.log('conjuros: ' + conjuros.length + ' (sin lista de clase, omitidos: ' + sinLista + ')');
console.log('listas: ' + listasUsadas.join(', '));
