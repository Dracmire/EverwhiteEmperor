'use strict';
// Genera data/classes.json a partir de data/classes.js de pixelkeep/pathfinder1e-sheet (MIT).
// Solo se toma lo que el motor usa hoy: id, nombre, libro y progresión de ataque base.
// Uso: node scripts/import-classes.js <ruta a pathfinder1e-sheet/data/classes.js>
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const origen = process.argv[2];
if (!origen) {
  console.error('Uso: node scripts/import-classes.js <ruta a pathfinder1e-sheet/data/classes.js>');
  process.exit(1);
}

const BAB = { full: 'completa', medium: 'media', slow: 'baja' };
const crudo = vm.runInNewContext(fs.readFileSync(origen, 'utf8') + '\nCLASSES');

const clases = Object.keys(crudo).map((id) => {
  const c = crudo[id];
  if (!BAB[c.bab]) throw new Error('progresión de ataque desconocida en ' + id + ': ' + c.bab);
  return { id: id, nombre: c.name, fuente: 'pf1', libro: c.source, bab: BAB[c.bab] };
}).sort((a, b) => a.nombre.localeCompare(b.nombre));

const salida = {
  version: '0.7',
  nota: 'bab: completa = nivel, media = 3/4 del nivel (redondeo hacia abajo), baja = 1/2 (redondeo hacia abajo). Fuente de la lista: pixelkeep/pathfinder1e-sheet (MIT).',
  clases: clases,
};
const destino = path.join(__dirname, '..', 'data', 'classes.json');
fs.writeFileSync(destino, JSON.stringify(salida, null, 2) + '\n');
console.log('Escrito ' + destino + ' (' + clases.length + ' clases)');
