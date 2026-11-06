# EverwhiteEmperor — Especificación del tracker de personajes (v0.3)

Estado: borrador del 2026-11-06. La v0.3 incorpora la tabla base de XP, los tags de actividad y la reorganización de los subsistemas (ver "Cambios respecto a versiones anteriores" al final).

Convención del documento:
- **[PENDIENTE]**: falta un dato o una decisión del diseñador.
- **[SUPUESTO]**: interpretación que se tomó para poder avanzar; se puede corregir.
- **[DECIDIDO]**: confirmado por el diseñador.

---

## 1. Propósito y alcance

Tracker de personajes para un TTRPG propio basado en Pathfinder 1e (referencia: d20pfsrd / Archives of Nethys). La historia avanza, se agregan feats y achievements, y hace falta un **registro contable de lo que ganó cada personaje en cada sesión**.

Del sistema Pathfinder se usan **atributos, feats y clases**. Se descartan las razas: los rasgos raciales se expresan como méritos y defectos (sección 5).

Características del sistema que el tracker debe soportar:

- Una clase específica por personaje. Los personajes actuales son de nivel 7; el tracker soporta niveles 1–20.
- Experiencia con curva propia y reglas propias de ganancia, con tags de actividad (sección 3).
- Dos subsistemas con experiencia propia (zeo y mana), la regla de magia por mana, y una ganancia adicional que no es XP (achievement y fate) (sección 4).
- Sistema extendido de méritos y defectos, que incluye los rasgos raciales (sección 5).
- Feats de Pathfinder (con las habilidades activas reclasificadas como habilidades tipo conjuro), feats mayores y *achievement feats*, con un máximo de 1 achievement feat por nivel (sección 6).
- Equipo limitado: 1 armadura, 1 arma y 3 objetos mágicos, con la regla de una extremidad por objeto (sección 7).
- Un visor de personajes simple y atractivo (sección 10).
- Mucho material homebrew (sección 9).

Fuera de alcance de la v0 **[PENDIENTE confirmar]**: habilidades (skills; solo se usan sus nombres como tags), hechizos, combate y tiradas, mapas, multijugador en línea.

Restricciones:
- Se aloja en GitHub (sitio estático con GitHub Pages, sin backend).
- Es un proyecto gratuito. El contenido de Pathfinder 1e se usa bajo la OGL 1.0a y la Community Use Policy de Paizo, que no permite cobrar por el contenido. El sitio muestra el aviso de no afiliación con Paizo.

---

## 2. Base de código

**[DECIDIDO] Base: `pixelkeep/pathfinder1e-sheet`** (licencia MIT, último commit 2026-05-27, JavaScript sin build, datos en `data/*.js`). Se importa conservando su licencia y atribución.

Cambios necesarios sobre esa base:

1. Quitar la selección de raza.
2. Reemplazar la tabla de XP (hoy hardcodeada y duplicada en `data/tables.js`) por la fórmula y la configuración de la sección 3.
3. Pasar los requisitos de feats de texto libre (`prereqs:'STR 13, BAB +1'`) a un formato estructurado (sección 6).
4. Implementar los límites de equipo y la regla de extremidades (sección 7).
5. Agregar el módulo de registro por sesión (sección 8).
6. Mover los datos homebrew a archivos de datos con validación (sección 9).
7. Agregar el visor de solo lectura (sección 10).

Alternativa descartada como base: `zombieFox/awesomeSheet` (MIT; sin commits en `master` desde 2021-02; build con Grunt y `node-sass` 5). Se usa solo como fuente de datos: `src/db/feats.csv` tiene del orden de 1,500 filas con una columna `prerequisite_feats` estructurada.

---

## 3. Experiencia

### 3.1 Curva de niveles [DECIDIDO]

Cada nivel mide exactamente 1000 XP. El nivel N empieza en (N−1)×1000 y termina en N×1000. No hace falta una tabla: se calcula.

```
nivel(xp)    = min(20, floor(xp / 1000) + 1)
inicio(N)    = (N - 1) * 1000
fin(N)       = N * 1000
progreso(xp) = (xp mod 1000) / 1000
```

Ejemplos: nivel 1 empieza en 0; nivel 7 va de 6,000 a 7,000; nivel 15 va de 14,000 a 15,000; nivel 20 empieza en 19,000.

Con XP ≥ 20,000 el nivel queda en 20. **[PENDIENTE]** Definir si hay algo más allá del nivel 20.

La experiencia base **no cambia**: todo el balance se hace ajustando cuánta XP entrega cada aventura.

### 3.2 Ganancia de XP

Cada aventura, dungeon, misión o monstruo tiene un **nivel de contenido** de 1 a 20. Se compara con el nivel del personaje:

```
Δ = nivel_contenido - nivel_personaje
XP ganada = redondeo( base × mult_dif(Δ) × mult_actividad(tags) )     si Δ ≥ −2
XP ganada = 1                                                          si Δ = −3
XP ganada = 0                                                          si Δ ≤ −4
```

| Δ (contenido − personaje) | Resultado |
|---|---|
| +2 o más | ×1.50 |
| +1 | ×1.25 |
| 0 | ×1.00 (base) |
| −1 | ×0.50 |
| −2 | ×0.25 |
| −3 | **[DECIDIDO]** 1 XP |
| −4 o menos | **[DECIDIDO]** 0 XP |

Notas:

- **[DECIDIDO]** Δ = −3 da 1 XP por entrada, sin multiplicar. Ejemplo del diseñador: un personaje de nivel 4 puede matar 1000 esqueletos de nivel 1 y sube de nivel a 1 punto por muerte. Desde el esqueleto 1,001 (ya en nivel 5, Δ = −4) no gana nada.
- **[SUPUESTO]** `base` es un número único (40, ver 3.4). La configuración también admite una tabla por nivel del personaje si se necesitara.
- **[PENDIENTE]** Cuánto vale un dungeon o una misión completos: la misma tabla que una criatura de su nivel, o una escala por tamaño (Pathfinder 2e usa 10, 30 y 80 XP para logros menor, moderado y mayor).
- **[PENDIENTE]** Redondeo (por defecto: al entero más cercano).
- **[PENDIENTE]** Si el nivel usado para Δ se evalúa por entrada, en orden (por defecto), o al inicio de la sesión.
- **[PENDIENTE]** Si la XP se divide entre los personajes del grupo o cada uno recibe el valor completo.

### 3.3 Tags de actividad [DECIDIDO]

Una **actividad** se describe con **tags**, no con un tipo único. Cada tag tiene un multiplicador; así se expresa que "ciertas actividades dan menos experiencia y otras dan más". La lista de tags está inspirada en la lista de habilidades de Pathfinder 1e: los 35 nombres de habilidades más 4 tags propios (`combat`, `exploration`, `quest`, `rest`). Se guarda en `data/xp-config.json`; añadir, quitar o cambiar un tag no toca el código.

| Grupo | Tags |
|---|---|
| cuerpo | `acrobatics`, `climb`, `escape-artist`, `fly`, `ride`, `swim`, `stealth` |
| sentidos | `perception`, `sense-motive`, `appraise` |
| social | `bluff`, `diplomacy`, `disguise`, `intimidate`, `perform` |
| oficio | `craft`, `profession`, `disable-device`, `sleight-of-hand` |
| supervivencia | `handle-animal`, `heal`, `survival` |
| conocimiento | `knowledge-arcana`, `knowledge-dungeoneering`, `knowledge-engineering`, `knowledge-geography`, `knowledge-history`, `knowledge-local`, `knowledge-nature`, `knowledge-nobility`, `knowledge-planes`, `knowledge-religion`, `linguistics` |
| magia | `spellcraft`, `use-magic-device` |
| general (propios) | `combat`, `exploration`, `quest`, `rest` |

- Una entrada de XP puede llevar varios tags (por ejemplo, `["combat", "stealth"]`).
- **[SUPUESTO]** Con varios tags se aplica el **mayor** de sus multiplicadores (`combinarTags: "max"`), para que no se multipliquen entre sí. Se puede cambiar a `producto` o `promedio` en la configuración.
- **[PENDIENTE]** Multiplicador de cada tag: todos están en 1.0 hasta que el diseñador los defina.

### 3.4 Tabla base de XP [SUPUESTO]

La tabla base viene de **Pathfinder 2e**, que usa la misma regla de 1000 XP por nivel: la XP de una criatura depende solo de la diferencia entre su nivel y el del grupo. A nivel igual da 40 XP. Se toma **40** como valor inicial de `base` (editable).

Cifras del Core Rulebook de Pathfinder 2e según dos calculadoras en línea que coinciden entre sí ([pf2calc](https://pf2calc.pages.dev/gm-guide) y [West Games](https://west-games.com/pathfinder-2e-experience-calculator/)); no se pudo abrir Archives of Nethys para compararlas con la fuente oficial.

| Δ (criatura − grupo) | Pathfinder 2e | Esta regla (base 40) |
|---|---|---|
| −4 o menos | 10 | 0 |
| −3 | 15 | 1 |
| −2 | 20 | 10 |
| −1 | 30 | 20 |
| 0 | 40 | 40 |
| +1 | 60 | 50 |
| +2 | 80 | 60 |
| +3 | 120 | 60 |
| +4 | 160 | 60 |

Con base 40 hacen falta 25 criaturas de nivel igual para subir un nivel (1000 / 40). Las diferencias con Pathfinder 2e: aquí la reducción por nivel inferior es más fuerte y el aumento por nivel superior se detiene en +2.

Valores de `data/xp-config.json`:

```json
{
  "nivelMax": 20,
  "xpPorNivel": 1000,
  "recompensaBase": 40,
  "multDif": [
    { "delta": ">=2", "mult": 1.5 },
    { "delta": 1, "mult": 1.25 },
    { "delta": 0, "mult": 1.0 },
    { "delta": -1, "mult": 0.5 },
    { "delta": -2, "mult": 0.25 },
    { "delta": -3, "xpFija": 1 },
    { "delta": "<=-4", "xpFija": 0 }
  ],
  "redondeo": "nearest",
  "combinarTags": "max",
  "tags": [ { "id": "combat", "nombre": "Combate", "grupo": "general", "mult": 1.0, "origen": "propio" } ]
}
```

(El archivo real incluye los 39 tags de 3.3.)

---

## 4. Subsistemas y ganancias adicionales

**[DECIDIDO]** Solo **zeo** y **mana** tienen una tabla de XP independiente. El resto de los sistemas no usan XP propia:

| id | Qué es | XP propia |
|---|---|---|
| `zeo` | Subsistema de crecimiento | Sí, tabla independiente |
| `mana` | Subsistema de crecimiento; atributo gastable | Sí, tabla independiente |
| `magic` | Reemplaza el sistema de casteo por mana | No |
| `racial` | Se integra en méritos y defectos (sección 5) | No |
| `achievement` y `fate` | Ganancia adicional que no es XP | No |

### 4.1 Zeo y mana

- Cada uno tiene su propia tabla de XP y su propio nivel, independientes de la XP principal.
- **[SUPUESTO]** `zeo` es el sistema Xeno de los documentos del proyecto (técnicas personales). **[PENDIENTE confirmar]**
- **[SUPUESTO]** "Atributo expensive" de mana significa un atributo que se **gasta** al usarlo (un fondo de puntos que baja y se recupera). **[PENDIENTE confirmar]**
- **[PENDIENTE]** Las tablas de XP de zeo y de mana, qué desbloquea cada nivel y si reciben XP de las mismas actividades que la principal.

```json
{
  "id": "mana",
  "nombre": "Mana",
  "xp": { "tabla": [ { "nivel": 1, "desde": 0 } ] },
  "recompensas": [ { "nivel": 1, "otorga": ["id-de-feat-o-merito"] } ]
}
```

### 4.2 Magic

- Reemplaza el sistema de casteo de Pathfinder (espacios de conjuro, preparación) por **mana como recurso que se gasta**.
- **[SUPUESTO]** Las habilidades tipo conjuro (sección 6.2) cuestan mana.
- **[PENDIENTE]** Costo en mana de cada habilidad, tamaño del fondo de mana por nivel y regeneración.

### 4.3 Racial

No es un subsistema: los rasgos raciales se expresan como **méritos y defectos** (sección 5).

### 4.4 Achievement y fate

- **[DECIDIDO]** Trabajan juntos como una **ganancia adicional que no es XP**.
- **[SUPUESTO]** Un achievement puede otorgar fate. Fate es un contador (no tiene nivel ni XP) que se gana con achievements y se gasta.
- **[PENDIENTE]** Cuánto fate da cada achievement, si tiene tope y para qué se gasta.

---

## 5. Méritos y defectos (sistema extendido)

Reglas **[DECIDIDO]**:

- **Los méritos solo se pagan con defectos.** Un defecto da puntos; un mérito cuesta puntos.
- **Los personajes parten con `floor(nivel / 2) + 1` puntos** (nivel 1 → 1; nivel 7 → 4; nivel 20 → 11).
- **10 puntos de mérito compran un mérito heroico.** Los méritos heroicos tienen seis rarezas: `normal`, `raro`, `extraordinario`, `epico`, `heroico`, `legendario`.
- **Los rasgos raciales son méritos y defectos.** Reemplazan a la raza (los defectos raciales también dan puntos).

Interpretaciones **[SUPUESTO]** que hay que confirmar:

- Los puntos iniciales son el mismo fondo de puntos que producen los defectos (el saldo disponible para méritos es `puntos iniciales + valor de los defectos − costo de los méritos`).
- Un mérito heroico cuesta 10 puntos sea cual sea su rareza; la rareza describe el mérito, no su precio.

Modelo propuesto:

```json
{
  "id": "slug",
  "nombre": "Nombre",
  "tipo": "merito | defecto",
  "categoria": "comun | heroico | racial",
  "rareza": "normal | raro | extraordinario | epico | heroico | legendario",
  "costo": 0,
  "valor": 0,
  "requisitos": { },
  "efectos": [ ],
  "fuente": "homebrew"
}
```

- `costo` se usa en méritos; `valor` en defectos. `rareza` solo aplica a méritos heroicos. `racial` marca los que sustituyen a la raza.
- El registro por sesión anota cuándo se gana o se pierde cada mérito o defecto. El tracker calcula el saldo de puntos y rechaza un saldo negativo.
- **[PENDIENTE]** Costo de los méritos comunes (no heroicos), valor de cada defecto, si hay tope de defectos por personaje, y si los puntos iniciales se pueden gastar sin tomar defectos.

---

## 6. Feats y achievement feats

### 6.1 Catálogo de feats

**[DECIDIDO]** El catálogo son los feats de Pathfinder 1e (`fuente: "pf1"`) más los homebrew (`fuente: "homebrew"`). Los requisitos pasan a un formato estructurado, validable:

```json
{
  "id": "great-cleave",
  "nombre": "Great Cleave",
  "ejecucion": "pasivo | activo",
  "requisitos": {
    "atributos": { "STR": 13 },
    "bab": 4,
    "feats": ["cleave", "power-attack"],
    "nivelDeClase": { "fighter": 0 }
  },
  "efectos": [ { "tipo": "nota", "texto": "..." } ]
}
```

- Los feats con efecto numérico (ataque, daño, salvaciones, CA, iniciativa) aportan a las estadísticas derivadas. Los demás se muestran como notas.
- El tracker calcula, para cada personaje: **feats activos**, **feats disponibles** (los que cumple por requisitos) y los efectos acumulados.
- **[SUPUESTO]** Slots de feats como en Pathfinder 1e: uno a los niveles 1, 3, 5, 7, 9, 11, 13, 15, 17 y 19 (un personaje de nivel 7 tiene 4), más los feats adicionales que dé cada clase. **[PENDIENTE confirmar]**

### 6.2 Feats activos → habilidades tipo conjuro [DECIDIDO]

La mayoría de los feats de Pathfinder que representan una **ejecución activa** (maniobras y acciones que el personaje decide realizar) se reducen a **habilidades tipo conjuro**. Los feats pasivos (bonificaciones, condiciones, requisitos) siguen como feats.

- Cada feat lleva `ejecucion: "pasivo"` o `"activo"`.
- Un feat activo reclasificado se guarda como `tipo: "habilidad-tipo-conjuro"` con `convertidoDe: "<id del feat>"`.
- Hay excepciones: un feat activo puede quedar como feat con `excepcion: true` y un motivo.
- Procedimiento: el importador marca como *candidatos* los feats con texto de acción ("as a standard action", "as a swift action", "when you attack…"); el diseñador revisa la lista y confirma las conversiones (`data/feats.conversiones.json`).
- **[SUPUESTO]** Las habilidades tipo conjuro gastan mana (sección 4.2). **[PENDIENTE]** Costo de cada una y cómo se aprenden.

### 6.3 Feats mayores

- Tipo especial `mayor`, dictado por el diseñador. Se pensaron como habilidades raciales.
- **[PENDIENTE]** Con lo racial integrado en méritos y defectos (sección 5): ¿los feats mayores pasan a ser méritos heroicos, o siguen siendo un tipo de feat aparte? Y cuántos tiene cada personaje, cuándo se otorgan y cuáles existen.

### 6.4 Achievement feats

- Se ganan por logros de la historia.
- **Regla: máximo 1 achievement feat por nivel de personaje.** Se registra el nivel en que se ganó; una segunda ganancia en el mismo nivel es un error de validación.
- **[SUPUESTO]** "Por nivel" significa por cada nivel del personaje: si ganó uno siendo nivel 7, el siguiente solo puede ganarse a partir del nivel 8.
- Un achievement puede otorgar fate (sección 4.4).
- **[PENDIENTE]** Lista de achievement feats, condiciones de cada uno y sus efectos.

---

## 7. Equipo

Límites por personaje **[DECIDIDO]**: **1 armadura, 1 arma y 3 objetos mágicos.**

- La armadura mágica y el arma mágica **no cuentan** dentro de los 3 objetos: son categorías separadas.
- **Regla de extremidades:** cada extremidad del personaje puede sostener o llevar **un solo objeto**. La **armadura queda fuera de esta regla** (no ocupa extremidad).

```json
{
  "id": "slug",
  "tipo": "armadura | arma | objeto",
  "extremidad": "mano-derecha",
  "cargas": { "max": 3, "actuales": 3, "recarga": "diaria" },
  "habilidades": [ ]
}
```

- Los objetos mágicos pueden tener cargas y habilidades; el registro por sesión anota usos, recargas y cambios.
- El tracker impide superar los límites y rechaza equipar dos objetos en la misma extremidad.
- Cada personaje tiene una lista de extremidades (`extremidades: [...]`) que define dónde puede llevar objetos.
- **[SUPUESTO]** El arma ocupa una extremidad (una mano); los 3 objetos ocupan una extremidad cada uno.
- **[PENDIENTE]** Qué extremidades tiene un personaje humanoide por defecto (¿manos, pies, cabeza…?), cómo se trata un arma a dos manos, y si el escudo cuenta como armadura o como objeto.

---

## 8. Registro por sesión (ledger)

Es el núcleo del tracker. Es la **fuente de verdad**: el estado del personaje (XP, nivel, feats, equipo) se **deriva** reproduciendo el registro en orden.

```json
{
  "personaje": "slug",
  "sesiones": [
    {
      "id": "2026-11-06-01",
      "fecha": "2026-11-06",
      "titulo": "Título de la sesión",
      "notas": "",
      "entradas": [
        { "tipo": "xp", "tags": ["combat"], "nivelContenido": 9, "cantidad": 1, "nota": "" },
        { "tipo": "xp-subsistema", "subsistema": "mana", "cantidad": 250 },
        { "tipo": "feat", "id": "power-attack" },
        { "tipo": "achievement", "id": "slug", "fate": 1 },
        { "tipo": "fate", "cantidad": -1, "motivo": "gasto" },
        { "tipo": "rasgo", "id": "slug", "accion": "ganar | perder" },
        { "tipo": "objeto", "id": "slug", "accion": "equipar | desequipar | usar-carga | recargar", "extremidad": "mano-izquierda" },
        { "tipo": "ajuste", "campo": "xp", "cantidad": -100, "motivo": "..." }
      ]
    }
  ]
}
```

Reglas:

1. Las entradas de XP guardan sus **datos de entrada** (tags, nivel de contenido, cantidad de criaturas o de eventos), no solo el resultado. Al cambiar una tabla o un multiplicador, el historial se recalcula.
2. El nivel nunca se registra: siempre se deriva de la XP.
3. Cada sesión muestra un resumen: XP ganada, nivel antes y después, y feats, achievements, fate y rasgos ganados.
4. Validaciones al reproducir el registro:
   - achievement feats: máximo 1 por nivel;
   - `xp-subsistema` solo para zeo y mana;
   - los feats cumplen sus requisitos en el momento de ganarlos y no superan los slots del nivel;
   - límites de equipo (1 armadura, 1 arma, 3 objetos) y un solo objeto por extremidad;
   - saldo de puntos de méritos y defectos no negativo;
   - saldo de fate no negativo;
   - nivel máximo 20.
5. Los ajustes manuales exigen un motivo.

Persistencia v0: un archivo JSON por personaje (`characters/<id>.json`) que se exporta e importa desde el navegador; el historial de Git sirve de auditoría. Se usa `localStorage` solo como borrador. **[SUPUESTO]** Exportar e importar no basta: el visor (sección 10) lee esos mismos archivos.

---

## 9. Datos y homebrew

Estructura propuesta:

```
data/
  xp-config.json            # fórmula, base, multiplicadores y tags de actividad (ya creado)
  classes.json
  feats.pf1.json            # importado
  feats.homebrew.json
  feats.conversiones.json   # feats activos reclasificados como habilidades tipo conjuro
  traits.json               # méritos y defectos (incluye los raciales)
  items.json
  achievements.json
  subsystems.json           # zeo y mana (tablas de XP propias)
characters/
  <id>.json
```

- Cada registro tiene `id` estable (slug) y `fuente` (`pf1` | `homebrew`).
- Un **validador** (script de Node) comprueba referencias entre archivos, requisitos de feats y la consistencia de cada personaje. Se ejecuta en GitHub Actions en cada push.
- Fuentes para la importación inicial: `data/feats.js` de pixelkeep (171 feats) y `src/db/feats.csv` de awesomeSheet (~1,500 filas, incluye duplicados entre categorías).
- Opcional: autoría de homebrew en CSV con conversor y validador, igual que el flujo que ya existe en el feat builder de Spiral.

---

## 10. Visor de personajes

**Objetivo:** una página de solo lectura, simple y visualmente atractiva, que muestre un personaje a partir de `characters/<id>.json`. Se publica con GitHub Pages.

Contenido mínimo:

- Nombre, clase, nivel y barra de progreso al siguiente nivel.
- Atributos y estadísticas derivadas.
- XP y nivel de zeo y de mana; fate disponible.
- Feats (activos y disponibles), habilidades tipo conjuro, achievement feats.
- Méritos y defectos con el saldo de puntos.
- Equipo por extremidad, con cargas.
- Línea de tiempo de sesiones con lo ganado en cada una.

Requisitos: responsive (se lee bien en el celular), tema claro y oscuro, sin backend.

### 10.1 Repos revisados

Se buscó un visor existente. Ninguno cumple a la vez: estático, licencia compatible con MIT, mantenido y sencillo. No se pudo evaluar el aspecto visual de ninguno (no hay capturas en sus README y no se pudieron abrir sus demos desde el entorno de trabajo).

| Repo | Licencia | Estado | Motivo |
|---|---|---|---|
| `KeithP2019/PathfinderCharacterSheet` (React 19 + Vite + Tailwind 4, Pathfinder 1e) | Sin licencia | 1 commit (2026-08-16) | Sin licencia no se puede reutilizar; necesita servicios locales (puertos 3001–3004) para feats, clases y equipo; ~7,000 líneas |
| `derikb/character-sheet-app` (JS, 102★) | GPL-3.0 | Versión 4.6.0 (2026-06-13) | Su README anuncia que la versión alojada desaparece y que archivará el repo el 2027-01-01; centrado en D&D 5e; GPL-3.0 obligaría a cambiar la licencia |
| `brouberol/5esheets` (Python, 31★) | MIT | Último push 2025-12-02 | Solo se leyó su descripción; es para D&D 5e y su lenguaje principal es Python |
| `SkewedAspect/rpgkeeper` (TypeScript, 35★) | AGPL-3.0 | Último push 2026-02-09 | Solo se leyó su descripción; es un sitio con cuentas |
| `lucas-c/rpg-bonhomme` | APL-1.0 | 99 commits | Sirve hojas con imagen de fondo y CSS para cualquier juego; guarda personajes en JSON local; el servidor Python es opcional. Es de otro estilo (sobre una hoja impresa) |

### 10.2 Propuesta

**[SUPUESTO]** Construir el visor dentro de este repo, como página estática que lee los JSON del propio tracker. Así el diseño se adapta a los datos del sistema (zeo, mana, fate, méritos, extremidades) en lugar de adaptar los datos a una hoja de D&D. **[PENDIENTE]** Una referencia visual (una hoja o app cuyo estilo te guste) para fijar el diseño.

---

## 11. Hitos

| Hito | Contenido | Criterio de aceptación |
|---|---|---|
| M0 | Importar la base, quitar razas, leer `xp-config.json` con la curva de 1000 por nivel | XP 0 → nivel 1; 14,000 → nivel 15; 15,000 → nivel 16 |
| M1 | Registro por sesión, fórmula de XP con Δ y tags, resumen por sesión | Cambiar un multiplicador recalcula todo el historial; Δ = −3 da 1 XP y Δ = −4 da 0 |
| M2 | Visor de solo lectura en GitHub Pages | Abrir `characters/<id>.json` muestra nivel, progreso y línea de tiempo de sesiones |
| M3 | Feats estructurados, activos → habilidades tipo conjuro, achievement feats | Un segundo achievement en el mismo nivel es rechazado |
| M4 | Equipo con límites, extremidades y cargas | No se puede equipar un segundo arma, un cuarto objeto ni dos objetos en la misma extremidad |
| M5 | Méritos y defectos (con rasgos raciales), zeo y mana, achievement y fate | Un mérito heroico exige 10 puntos; zeo y mana llevan XP y nivel independientes; un achievement puede dar fate |
| M6 | Pipeline de homebrew, validador y CI | Un push con una referencia rota falla el CI |

---

## 12. Casos de prueba

### XP

Personaje de nivel 7, `base = 40`, todos los tags en 1.0:

| Nivel de contenido | Δ | XP por criatura |
|---|---|---|
| 10 | +3 | 60 |
| 9 | +2 | 60 |
| 8 | +1 | 50 |
| 7 | 0 | 40 |
| 6 | −1 | 20 |
| 5 | −2 | 10 |
| 4 | −3 | 1 |
| 3 | −4 | 0 |

Fronteras de nivel: 6,999 XP → nivel 7 (progreso 99.9%); 7,000 XP → nivel 8 (progreso 0%).

Caso de los esqueletos: un personaje con 3,000 XP (nivel 4) mata esqueletos de nivel 1 (Δ = −3). Cada uno da 1 XP; el número 1,000 lo deja en 4,000 XP (nivel 5); el 1,001 da 0 XP (Δ = −4).

Tags: con tags de multiplicadores 1.0 y 1.5 y `combinarTags: "max"`, la actividad multiplica por 1.5.

### Puntos de méritos y slots de feats

| Nivel | Puntos iniciales `floor(n/2)+1` | Slots de feats (PF1) |
|---|---|---|
| 1 | 1 | 1 |
| 2 | 2 | 1 |
| 7 | 4 | 4 |
| 15 | 8 | 8 |
| 20 | 11 | 10 |

### Equipo

- Equipar un arma y 3 objetos en 4 extremidades distintas: válido.
- Equipar un segundo objeto en una extremidad ocupada: rechazado.
- Equipar una armadura con todas las extremidades ocupadas: válido (la armadura no usa extremidad).

---

## 13. Lista de pendientes

1. Valor de un dungeon o una misión completos (tabla de criatura según su nivel, o escala por tamaño), y confirmar la base de 40.
2. Multiplicador de cada tag y confirmar la regla de combinación (`max`).
3. Confirmar que `zeo` es el sistema Xeno; tablas de XP de zeo y de mana y qué desbloquea cada nivel.
4. Mana: confirmar que es un atributo que se gasta; costo de las habilidades tipo conjuro, tamaño del fondo y regeneración.
5. Fate y achievement: cuánto fate da cada achievement, tope y en qué se gasta.
6. Méritos y defectos: significado exacto de los puntos iniciales, costo de los méritos comunes, valor de cada defecto, tope de defectos, si la rareza cambia el costo, y lista de rasgos raciales.
7. Feats mayores: si pasan a ser méritos heroicos, cuántos y cuáles.
8. Habilidades tipo conjuro: criterio y lista de feats convertidos y cómo se aprenden.
9. Lista y condiciones de los achievement feats; confirmar los slots de feats de Pathfinder.
10. Extremidades de un personaje por defecto, armas a dos manos y escudos.
11. Referencia visual para el visor y confirmar que se construye dentro del repo.
12. XP sobre 20,000, redondeo, evaluación del nivel por entrada o por sesión, y reparto de XP en grupo.
13. Alcance de estadísticas derivadas (HP, skills, hechizos).

---

## Cambios respecto a versiones anteriores

### v0.3

- Tabla base de XP tomada de Pathfinder 2e (40 XP a nivel igual, valor inicial editable) con comparación contra la regla del diseñador.
- Tags de actividad en lugar de tipos: 39 tags (35 habilidades de Pathfinder 1e y 4 propios) en `data/xp-config.json`.
- Δ = −3 da 1 XP queda confirmado (caso de los 1000 esqueletos).
- Solo zeo y mana tienen tablas de XP propias. Magic reemplaza el casteo por mana gastable. Racial se integra en méritos y defectos. Achievement y fate son una ganancia adicional que no es XP.
- Registro por sesión: entradas con `tags`, entrada `fate`, y `xp-subsistema` limitado a zeo y mana.
- Hitos y casos de prueba actualizados.

### v0.2

- Base de código confirmada: pixelkeep.
- Umbrales de nivel: se calculan con (N−1)×1000; ya no hay tabla.
- Δ ≤ −4 da 0 XP.
- Méritos y defectos: los méritos solo se pagan con defectos; puntos iniciales `floor(nivel/2)+1`; 10 puntos compran un mérito heroico con seis rarezas.
- Feats: catálogo de Pathfinder; los feats de ejecución activa se reclasifican como habilidades tipo conjuro.
- Equipo: la armadura y el arma mágicas no cuentan dentro de los 3 objetos; una extremidad solo puede tener un objeto y la armadura queda fuera de esa regla.
- Sección de visor de personajes, con los repos revisados.
