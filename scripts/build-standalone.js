'use strict';
// Genera dist/visor.html: el visor en un solo archivo, con CSS, JS y datos embebidos.
// Sirve para abrirlo con doble clic o publicarlo como página única.
// Uso: node scripts/build-standalone.js [salida]
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../src/core.js');

const raiz = path.join(__dirname, '..');
const leer = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');

const data = {};
Object.keys(Core.ARCHIVOS).forEach((k) => { data[k] = JSON.parse(leer('data/' + Core.ARCHIVOS[k])); });
const indice = JSON.parse(leer('characters/index.json'));
const personajes = {};
indice.personajes.forEach((id) => { personajes[id] = JSON.parse(leer('characters/' + id + '.json')); });

// Habilidades por clase (6.5): el archivo único trae solo las de las clases de los personajes que empaqueta.
data.clasesDetalle = {};
Object.keys(personajes).forEach((id) => {
  const clase = personajes[id].clase;
  const ruta = path.join(raiz, 'data', Core.rutaClase(clase));
  if (clase && !data.clasesDetalle[clase] && fs.existsSync(ruta)) data.clasesDetalle[clase] = JSON.parse(fs.readFileSync(ruta, 'utf8'));
});

// El retrato (campo "imagen") puede ser una ruta relativa a characters/. En el archivo único no hay carpeta:
// se convierte en un data: URI. Una URL o un data: ya escrito se deja tal cual.
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
Object.keys(personajes).forEach((id) => {
  const ruta = personajes[id].imagen;
  if (typeof ruta !== 'string' || /^(data:|https?:|blob:)/i.test(ruta)) return;
  const abs = path.resolve(raiz, 'characters', ruta);
  if (!abs.startsWith(path.join(raiz, 'characters') + path.sep)) throw new Error(id + ': la imagen "' + ruta + '" sale de characters/');
  const mime = MIME[path.extname(abs).toLowerCase()];
  if (!mime) throw new Error(id + ': tipo de imagen no admitido en "' + ruta + '"');
  if (!fs.existsSync(abs)) throw new Error(id + ': no existe la imagen "' + ruta + '"');
  personajes[id].imagen = 'data:' + mime + ';base64,' + fs.readFileSync(abs).toString('base64');
});

// Evita que un "</script>" o "<!--" dentro de los datos cierre el bloque.
const embebido = JSON.stringify({ data, personajes }).replace(/</g, '\\u003c');

const css = '<style>\n' + leer('viewer/style.css') + '</style>';
const scripts = '<script>window.EWE_DATA = ' + embebido + ';</script>\n<script>\n' + leer('src/core.js') + '</script>\n<script>\n' + leer('viewer/app.js') + '</script>';
const tipografia = /<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/.exec(leer('viewer/index.html'))[0];

// Documento completo (dist/visor.html): se abre con doble clic.
let html = leer('viewer/index.html');
html = html.replace('<link rel="stylesheet" href="style.css">', () => css);
html = html.replace('<script src="../src/core.js"></script>', () => scripts.split('\n<script>\n' + leer('viewer/app.js'))[0]);
html = html.replace('<script src="app.js"></script>', () => '<script>\n' + leer('viewer/app.js') + '</script>');
if (/(href|src)="(style\.css|app\.js|\.\.\/)/.test(html)) throw new Error('quedó una referencia local sin inlinear');

// Fragmento para publicar como página (dist/visor.fragmento.html): sin <html>, <head> ni <body>.
const fragmento = [
  '<title>Visor de EverwhiteEmperor</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  tipografia,
  css,
  '<div id="app"><noscript>El visor necesita JavaScript.</noscript></div>',
  scripts,
  '',
].join('\n');

const salida = process.argv[2] || path.join(raiz, 'dist', 'visor.html');
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, html);
const salidaFrag = salida.replace(/\.html$/, '.fragmento.html');
fs.writeFileSync(salidaFrag, fragmento);
console.log('Escrito ' + salida + ' (' + Math.round(html.length / 1024) + ' KB)');
console.log('Escrito ' + salidaFrag + ' (' + Math.round(fragmento.length / 1024) + ' KB)');
