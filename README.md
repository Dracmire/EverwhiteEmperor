# EverwhiteEmperor

Tracker de personajes de TTRPG basado en Pathfinder 1e, para un sistema propio: una clase por personaje, XP por tags y grados, subsistemas (zeo y mana), méritos y defectos, traits, feats, achievements, fate y equipo por extremidad. Todo se deriva de un registro por sesión.

Estado: borrador. La especificación está en [`docs/ESPECIFICACION.md`](docs/ESPECIFICACION.md).

## Qué hay

| Ruta | Contenido |
|---|---|
| `data/` | Reglas y catálogos en JSON: curva y tags de XP, zeo, razas, méritos y defectos, feats, objetos, achievements, traits. Los catálogos de ejemplo están marcados. |
| `characters/` | Un JSON por personaje (el registro por sesión). `ejemplo.json` es un personaje inventado de nivel 7. |
| `src/core.js` | Motor de cálculo: reproduce el registro y devuelve XP, nivel, zeo, mana, fate, feats, méritos, equipo y avisos. |
| `viewer/` | Visor de solo lectura (HTML, CSS y JS sin dependencias). |
| `tests/` | Pruebas del motor con los casos de la sección 12 de la especificación. |
| `scripts/build-standalone.js` | Empaqueta el visor y los datos en un solo HTML. |

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

En el visor, «Abrir otro personaje» carga cualquier `.json` con el mismo formato que `characters/ejemplo.json`; las entradas del registro que rompen una regla se listan como avisos y no se aplican.

## Licencia y avisos

MIT. Las reglas de Pathfinder 1e se usan bajo la OGL 1.0a. El proyecto es gratuito y no tiene afiliación con Paizo.
