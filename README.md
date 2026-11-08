# EverwhiteEmperor

Tracker de personajes de TTRPG basado en Pathfinder 1e, para un sistema propio: una clase por personaje, atributos STR, DEX, PER, INT, WIS y CHA (CON, SPR y MND se derivan), HP y MP con dados, XP por tags y grados, subsistemas (zeo y mana), méritos y defectos, traits, feats, achievements, fate y equipo por extremidad. Todo se deriva de un registro por sesión.

Estado: borrador (v0.8.4). Las cifras de Mana (SX por Gate, Mana force y los 13 tags de ejemplo) son supuestos hasta que el diseñador las fije. La especificación está en [`docs/ESPECIFICACION.md`](docs/ESPECIFICACION.md).

## Qué hay

| Ruta | Contenido |
|---|---|
| `data/` | Reglas y catálogos en JSON: curva y tags de XP, zeo, mana (Mana force, SX por Gate y tabla de compatibilidad entre tags), vitalidad (fatiga, estados y descansos), razas, méritos y defectos, objetos, achievements, traits, y el catálogo de Pathfinder 1e (665 feats y 37 clases, importados). Los catálogos de ejemplo están marcados. |
| `characters/` | Un JSON por personaje (el registro por sesión). `ejemplo.json` es un personaje inventado de nivel 7; sus retratos van en `characters/retratos/` (campo `imagen`). |
| `src/core.js` | Motor de cálculo: reproduce el registro y devuelve XP, nivel, atributos derivados, HP y MP, zeo, mana (Gates, nodos, círculos y slots), la reserva de SX que comparten, fate, feats, méritos, equipo y avisos. |
| `viewer/` | Visor (HTML, CSS y JS sin dependencias): ficha con retrato, HP y MP y atributos, secciones plegadas y registro de sesiones; vistas Jugar (listas con tooltip, fatiga y descansos con Dados de Golpe al estilo D&D 5e) y Construir (selector de feats, asignación de achievements, tiradas de HP y MP, formularios de Mana force y de Gates, reparto del SX entre Zeo y Mana, e inscripción de habilidades en los slots de Mana). No escribe en los personajes: el borrador se copia como JSON. |
| `tests/` | Pruebas del motor con los casos de la sección 12 de la especificación. |
| `scripts/build-standalone.js` | Empaqueta el visor y los datos en un solo HTML. |
| `scripts/import-*.js` | Importan clases y feats de Pathfinder 1e desde otros repos (ver `docs/FUENTES.md`). |

## Usarlo

Pruebas (Node 18 o superior, sin instalar nada):

```
node --test tests/core.test.js
```

Visor, servido desde la raíz del repo (necesita `fetch`, así que no funciona con doble clic):

```
python3 -m http.server
# abrir http://localhost:8000/viewer/
```

Visor en un solo archivo, que sí se abre con doble clic:

```
node scripts/build-standalone.js
# dist/visor.html
```

El visor muestra arriba la ficha (retrato, nivel, HP y MP, atributos) y abajo el registro de sesiones; en medio, en **Jugar** van a la vista Feats, Equipo y Méritos y defectos (listas de una línea con tooltip) y plegados Achievements, SX, Zeo, Mana y Magia; en **Construir**, plegados Feats, Achievements, Equipo, Méritos y defectos, Tiradas de HP y MP, SX, Zeo, Mana y Magia. En la cabecera, **Jugar** es la versión reducida para la mesa (con fatiga, estados DOWN, K.O. y Deadly, y descansos corto y largo con Dados de Golpe; el descanso aún no recupera MP) y **Construir** la amplia, con los selectores de feats y achievements, el borrador y las tiradas. «Abrir otro personaje» carga cualquier `.json` con el mismo formato que `characters/ejemplo.json`; las entradas del registro que rompen una regla se listan como avisos y no se aplican.

## Licencia y avisos

MIT. Las reglas de Pathfinder 1e se usan bajo la OGL 1.0a. El proyecto es gratuito y no tiene afiliación con Paizo. Los feats se importaron sin su texto, y el texto de la OGL y los avisos de copyright de cada libro siguen pendientes: ver [`docs/FUENTES.md`](docs/FUENTES.md).
