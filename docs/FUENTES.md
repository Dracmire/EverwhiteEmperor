# Fuentes de los catálogos

Qué se importó, de dónde, qué se dejó fuera y en qué estado está la licencia. Los datos generados están en `data/`; los orígenes **no** forman parte de este repositorio.

## Orígenes

| Dato | Origen | Licencia del origen |
|---|---|---|
| `data/feats.pf1.json` | `src/db/feats.csv` de [awesomeSheet](https://github.com/zombieFox/awesomeSheet) (1,478 filas) | MIT, © 2016 Kuldeep Matharu (el archivo LICENSE está en ese repo) |
| `data/classes.json` | `data/classes.js` de [pixelkeep/pathfinder1e-sheet](https://github.com/pixelkeep/pathfinder1e-sheet) (37 clases) | El README indica MIT; en la copia revisada no hay archivo LICENSE |

Las reglas que describen esos datos son de Pathfinder 1e (Paizo), que las publica como contenido abierto bajo la OGL 1.0a.

## Cómo se regeneran

```
node scripts/import-classes.js <ruta a pathfinder1e-sheet/data/classes.js>
node scripts/import-feats.js   <ruta a awesomesheet/src/db/feats.csv>
```

`import-feats.js` lee `data/classes.json`, así que las clases se importan primero. Las decisiones de diseño sobre feats (conversión a habilidad tipo conjuro, resúmenes propios) viven en `data/feats.conversiones.json` y se aplican al cargar, así que volver a importar no las borra.

## Qué se copia y qué no

**Feats** (`feats.pf1.json`): nombre, tipo (general, combate, metamagia, creación de objetos), libro, si es repetible, etiquetas (trabajo en equipo, crítico, estilo, actuación) y los requisitos, separados en atributos, ataque base, nivel de personaje, nivel de clase y feats previos; lo que no encaja queda como texto en `requisitos.otros`.

**No se copia** el texto del beneficio ni la descripción. Se leen en la importación solo para marcar `candidatoActivo` (el texto sugiere una acción o usos por día) y no se guardan. El visor enlaza a Archives of Nethys para leer cada feat.

**Clases** (`classes.json`): id, nombre, libro y progresión de ataque base (completa, media o baja).

## Alcance de los feats

Se incluyen los libros Core Rulebook, Advanced Player's Guide, Ultimate Magic y Ultimate Combat, y los tipos general, combate, metamagia y creación de objetos: **665 feats**.

Se excluyen: los feats de otros libros (1,478 filas en total; 561 por libro, entre ellos los de ambientación y Player Companion), los feats raciales (223; la raza se sustituye por méritos raciales), los tipos míticos, de historia, de monstruo, achievement y grit (29), y los duplicados (ninguno dentro del alcance). Ultimate Campaign y Advanced Race Guide no aportan feats: los del primero son de historia y los del segundo son raciales.

Seis filas del CSV de origen venían con una columna de más; el importador las repara.

## Estado de la licencia [PENDIENTE]

El repo declara que usa las reglas de Pathfinder 1e bajo la OGL 1.0a, pero **todavía no incluye el texto de la licencia ni los avisos de copyright (sección 15) de cada libro**. No se pudo traer el texto oficial en la sesión en que se hizo la importación. Por eso:

- el catálogo contiene solo nombres de feats y requisitos (datos de reglas), sin texto de beneficios;
- antes de copiar texto de beneficios hay que añadir la OGL 1.0a completa y los avisos de Core Rulebook, Advanced Player's Guide, Ultimate Magic y Ultimate Combat, copiados de una fuente oficial;
- la alternativa es escribir resúmenes propios con el campo `resumen` de `data/feats.conversiones.json`.

El proyecto es gratuito y no tiene afiliación con Paizo.
