# EverwhiteEmperor — Especificación del tracker de personajes (v0.2)

Estado: borrador del 2026-11-06. La v0.2 incorpora las respuestas del diseñador a los pendientes de la v0.1 (ver "Cambios respecto a v0.1" al final).

Convención del documento:
- **[PENDIENTE]**: falta un dato o una decisión del diseñador.
- **[SUPUESTO]**: interpretación que se tomó para poder avanzar; se puede corregir.
- **[DECIDIDO]**: confirmado por el diseñador.

---

## 1. Propósito y alcance

Tracker de personajes para un TTRPG propio basado en Pathfinder 1e (referencia: d20pfsrd / Archives of Nethys). La historia avanza, se agregan feats y achievements, y hace falta un **registro contable de lo que ganó cada personaje en cada sesión**.

Del sistema Pathfinder se usan **atributos, feats y clases**. Se descartan las razas: en su lugar, el diseñador dicta *feats mayores* que funcionan como habilidades raciales.

Características del sistema que el tracker debe soportar:

- Una clase específica por personaje. Los personajes actuales son de nivel 7; el tracker soporta niveles 1–20.
- Experiencia con curva propia y reglas propias de ganancia (sección 3).
- Seis subsistemas paralelos de crecimiento, cada uno con su propia experiencia (sección 4).
- Sistema extendido de méritos y defectos (sección 5).
- Feats de Pathfinder (con las habilidades activas reclasificadas como habilidades tipo conjuro), feats mayores y *achievement feats*, con un máximo de 1 achievement feat por nivel (sección 6).
- Equipo limitado: 1 armadura, 1 arma y 3 objetos mágicos, con la regla de una extremidad por objeto (sección 7).
- Un visor de personajes simple y atractivo (sección 10).
- Mucho material homebrew (sección 9).

Fuera de alcance de la v0 **[PENDIENTE confirmar]**: habilidades (skills), hechizos, combate y tiradas, mapas, multijugador en línea.

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
XP ganada = redondeo( base(nivel_personaje) × mult_dif(Δ) × mult_actividad(tipo) )     si Δ ≥ −2
XP ganada = 1                                                                            si Δ = −3
XP ganada = 0                                                                            si Δ ≤ −4
```

| Δ (contenido − personaje) | Resultado |
|---|---|
| +2 o más | ×1.50 |
| +1 | ×1.25 |
| 0 | ×1.00 (según tabla) |
| −1 | ×0.50 |
| −2 | ×0.25 |
| −3 | **[DECIDIDO]** 1 XP |
| −4 o menos | **[DECIDIDO]** 0 XP |

Notas:

- **[SUPUESTO]** "1 XP" en Δ = −3 es 1 punto fijo por entrada, sin multiplicar por la base ni por la actividad.
- **[SUPUESTO]** `base` se indexa por el nivel del *personaje*, no por el del contenido. La diferencia de nivel ya la expresa `mult_dif`; indexar también por el nivel del contenido contaría dos veces.
- **[PENDIENTE]** Tabla `base`: cuánta XP da una aventura de **igual nivel** que el personaje. Es distinta de los umbrales de nivel de 3.1 (los umbrales dicen cuándo subes; la base dice cuánto te da una aventura). Mientras no exista, cada entrada de XP puede llevar su `base` escrita a mano (sección 8) y el cálculo usa `entrada.base` si está presente.
- **[PENDIENTE]** Redondeo (por defecto: al entero más cercano).
- **[PENDIENTE]** Si el nivel usado para Δ se evalúa por entrada, en orden (por defecto), o al inicio de la sesión.
- **[PENDIENTE]** Si la XP se divide entre los personajes del grupo o cada uno recibe el valor completo.

### 3.3 Tipos de actividad

Un **tipo de actividad** es la clase de cosa que hizo el personaje para ganar XP (combate, explorar, cumplir una misión, interpretar, etc.). Cada tipo tiene un multiplicador: es la forma de expresar que "ciertas actividades dan menos experiencia y otras dan más".

Ejemplo de uso (valores ilustrativos, no propuestos): una misión completada con multiplicador 1.25 sobre una de combate con 1.0, y descansar o hacer downtime con 0.25. En `data/xp-config.json` cada tipo es una línea con `id`, `nombre` y `mult`; añadir o cambiar uno no toca el código.

Lista inicial de tipos propuesta **[PENDIENTE confirmar]**, todos con multiplicador 1.0 hasta que se decidan:

| id | Qué cubre |
|---|---|
| `combate` | Derrotar monstruos o enemigos |
| `exploracion` | Dungeons, rutas, descubrimiento de lugares |
| `mision` | Completar un objetivo de la historia |
| `social` | Negociación, interpretación, diplomacia |
| `descanso` | Downtime, viajes sin eventos, tiempo de espera |

Valores del archivo `data/xp-config.json` (forma prevista):

```json
{
  "nivelMax": 20,
  "xpPorNivel": 1000,
  "recompensaBase": null,
  "multDif": [
    { "delta": ">=2", "mult": 1.5 },
    { "delta": 1, "mult": 1.25 },
    { "delta": 0, "mult": 1.0 },
    { "delta": -1, "mult": 0.5 },
    { "delta": -2, "mult": 0.25 },
    { "delta": -3, "xpFija": 1 },
    { "delta": "<=-4", "xpFija": 0 }
  ],
  "actividades": [
    { "id": "combate", "nombre": "Combate", "mult": 1.0 }
  ]
}
```

---

## 4. Subsistemas paralelos de crecimiento

Hay seis subsistemas. Cada uno tiene su propia experiencia, independiente de la XP principal. **[DECIDIDO]** los nombres:

| id | Nombre | Nota |
|---|---|---|
| `zeo` | Zeo | **[SUPUESTO]** Es el sistema Xeno de los documentos del proyecto (técnicas personales). **[PENDIENTE confirmar]** |
| `mana` | Mana | |
| `magic` | Magic | **[SUPUESTO]** Se relaciona con las habilidades tipo conjuro (sección 6.2) |
| `racial` | Racial | **[SUPUESTO]** Reemplaza a la raza; se relaciona con los feats mayores (sección 6.3) |
| `achievement` | Achievement | **[SUPUESTO]** Se relaciona con los achievement feats (sección 6.4) |
| `fate` | Fate | |

Modelo genérico:

```json
{
  "id": "mana",
  "nombre": "Mana",
  "curva": { "tipo": "lineal | tabla", "...": "..." },
  "recompensas": [ { "nivel": 1, "otorga": ["id-de-feat-o-merito"] } ]
}
```

- Cada personaje tiene un nivel y una XP por subsistema.
- El registro por sesión (sección 8) tiene un tipo de entrada específico para XP de subsistema.
- **[PENDIENTE]** Para cada subsistema: qué representa, su curva, qué desbloquea cada nivel y si interactúa con la XP principal.

---

## 5. Méritos y defectos (sistema extendido)

Reglas **[DECIDIDO]**:

- **Los méritos solo se pagan con defectos.** Un defecto da puntos; un mérito cuesta puntos.
- **Los personajes parten con `floor(nivel / 2) + 1` puntos** (nivel 1 → 1; nivel 7 → 4; nivel 20 → 11).
- **10 puntos de mérito compran un mérito heroico.** Los méritos heroicos tienen seis rarezas: `normal`, `raro`, `extraordinario`, `epico`, `heroico`, `legendario`.

Interpretaciones **[SUPUESTO]** que hay que confirmar:

- Los puntos iniciales son el mismo fondo de puntos que producen los defectos (el saldo disponible para méritos es `puntos iniciales + valor de los defectos − costo de los méritos`).
- Un mérito heroico cuesta 10 puntos sea cual sea su rareza; la rareza describe el mérito, no su precio.

Modelo propuesto:

```json
{
  "id": "slug",
  "nombre": "Nombre",
  "tipo": "merito | defecto",
  "categoria": "comun | heroico",
  "rareza": "normal | raro | extraordinario | epico | heroico | legendario",
  "costo": 0,
  "valor": 0,
  "requisitos": { },
  "efectos": [ ],
  "fuente": "homebrew"
}
```

- `costo` se usa en méritos; `valor` en defectos. `rareza` solo aplica a méritos heroicos.
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
- **[SUPUESTO]** Las habilidades tipo conjuro usan los subsistemas Mana y Magic. **[PENDIENTE]** Qué recurso gastan, cómo se aprenden y cómo se miden en el registro.

### 6.3 Feats mayores (reemplazo de razas)

- Tipo especial `mayor`, dictado por el diseñador y asignado a cada personaje como habilidad racial.
- **[PENDIENTE]** Cuántos tiene cada personaje, cuándo se otorgan y cuáles existen.

### 6.4 Achievement feats

- Se ganan por logros de la historia.
- **Regla: máximo 1 achievement feat por nivel de personaje.** Se registra el nivel en que se ganó; una segunda ganancia en el mismo nivel es un error de validación.
- **[SUPUESTO]** "Por nivel" significa por cada nivel del personaje: si ganó uno siendo nivel 7, el siguiente solo puede ganarse a partir del nivel 8.
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
        { "tipo": "xp", "actividad": "combate", "nivelContenido": 9, "base": null, "nota": "" },
        { "tipo": "xp-subsistema", "subsistema": "mana", "cantidad": 250 },
        { "tipo": "feat", "id": "power-attack" },
        { "tipo": "achievement", "id": "slug" },
        { "tipo": "rasgo", "id": "slug", "accion": "ganar | perder" },
        { "tipo": "objeto", "id": "slug", "accion": "equipar | desequipar | usar-carga | recargar", "extremidad": "mano-izquierda" },
        { "tipo": "ajuste", "campo": "xp", "cantidad": -100, "motivo": "..." }
      ]
    }
  ]
}
```

Reglas:

1. Las entradas de XP guardan sus **datos de entrada** (actividad, nivel de contenido, `base` si se escribió a mano), no solo el resultado. Al cambiar una tabla o un multiplicador, el historial se recalcula.
2. El nivel nunca se registra: siempre se deriva de la XP.
3. Cada sesión muestra un resumen: XP ganada, nivel antes y después, y feats, achievements y rasgos ganados.
4. Validaciones al reproducir el registro:
   - achievement feats: máximo 1 por nivel;
   - los feats cumplen sus requisitos en el momento de ganarlos y no superan los slots del nivel;
   - límites de equipo (1 armadura, 1 arma, 3 objetos) y un solo objeto por extremidad;
   - saldo de puntos de méritos y defectos no negativo;
   - nivel máximo 20.
5. Los ajustes manuales exigen un motivo.

Persistencia v0: un archivo JSON por personaje (`characters/<id>.json`) que se exporta e importa desde el navegador; el historial de Git sirve de auditoría. Se usa `localStorage` solo como borrador. **[SUPUESTO]** Exportar e importar no basta: el visor (sección 10) lee esos mismos archivos.

---

## 9. Datos y homebrew

Estructura propuesta:

```
data/
  xp-config.json            # fórmula, multiplicadores, tipos de actividad
  classes.json
  feats.pf1.json            # importado
  feats.homebrew.json
  feats.conversiones.json   # feats activos reclasificados como habilidades tipo conjuro
  traits.json               # méritos y defectos
  items.json
  achievements.json
  subsystems.json           # zeo, mana, magic, racial, achievement, fate
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
- XP de cada subsistema.
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

**[SUPUESTO]** Construir el visor dentro de este repo, como página estática que lee los JSON del propio tracker. Así el diseño se adapta a los datos del sistema (subsistemas, méritos, extremidades) en lugar de adaptar los datos a una hoja de D&D. **[PENDIENTE]** Una referencia visual (una hoja o app cuyo estilo te guste) para fijar el diseño.

---

## 11. Hitos

| Hito | Contenido | Criterio de aceptación |
|---|---|---|
| M0 | Importar la base, quitar razas, `xp-config.json` con la curva de 1000 por nivel | XP 0 → nivel 1; 14,000 → nivel 15; 15,000 → nivel 16 |
| M1 | Registro por sesión, fórmula de XP con Δ y resumen por sesión | Cambiar un multiplicador recalcula todo el historial; Δ = −3 da 1 XP y Δ = −4 da 0 |
| M2 | Visor de solo lectura en GitHub Pages | Abrir `characters/<id>.json` muestra nivel, progreso y línea de tiempo de sesiones |
| M3 | Feats estructurados, activos → habilidades tipo conjuro, achievement feats | Un segundo achievement en el mismo nivel es rechazado |
| M4 | Equipo con límites, extremidades y cargas | No se puede equipar un segundo arma, un cuarto objeto ni dos objetos en la misma extremidad |
| M5 | Méritos/defectos y los seis subsistemas | Un mérito heroico exige 10 puntos; cada subsistema lleva su propia XP y nivel |
| M6 | Pipeline de homebrew, validador y CI | Un push con una referencia rota falla el CI |

---

## 12. Casos de prueba

### XP

Personaje de nivel 7 con `base(7) = B` y `mult_actividad = 1`:

| Nivel de contenido | Δ | XP ganada |
|---|---|---|
| 10 | +3 | 1.50 × B |
| 9 | +2 | 1.50 × B |
| 8 | +1 | 1.25 × B |
| 7 | 0 | 1.00 × B |
| 6 | −1 | 0.50 × B |
| 5 | −2 | 0.25 × B |
| 4 | −3 | 1 |
| 3 | −4 | 0 |

Fronteras de nivel: 6,999 XP → nivel 7 (progreso 99.9%); 7,000 XP → nivel 8 (progreso 0%).

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

1. Tabla `base`: XP que da una aventura de igual nivel que el personaje (no son los umbrales de nivel).
2. Tipos de actividad y sus multiplicadores (3.3 tiene una lista propuesta).
3. Confirmar que `zeo` es el sistema Xeno, y para cada subsistema su definición, curva y recompensas.
4. Méritos y defectos: significado exacto de los puntos iniciales, costo de los méritos comunes, valor de cada defecto, tope de defectos, y si la rareza de un mérito heroico cambia el costo.
5. Habilidades tipo conjuro: criterio y lista de feats convertidos, recurso que gastan y cómo se aprenden.
6. Feats mayores (cuántos y cuáles), lista y condiciones de los achievement feats, y confirmar los slots de feats de Pathfinder.
7. Extremidades de un personaje por defecto, armas a dos manos y escudos.
8. Referencia visual para el visor y confirmar que se construye dentro del repo.
9. XP sobre 20,000, redondeo, evaluación del nivel por entrada o por sesión, y reparto de XP en grupo.
10. Alcance de estadísticas derivadas (HP, skills, hechizos).

---

## Cambios respecto a v0.1

- Base de código confirmada: pixelkeep.
- Umbrales de nivel: se calculan con (N−1)×1000; ya no hay tabla.
- Δ = −3 da 1 XP y Δ ≤ −4 da 0 XP.
- Seis subsistemas definidos por nombre: zeo, mana, magic, racial, achievement, fate.
- Méritos y defectos: los méritos solo se pagan con defectos; puntos iniciales `floor(nivel/2)+1`; 10 puntos compran un mérito heroico con seis rarezas.
- Feats: catálogo de Pathfinder; los feats de ejecución activa se reclasifican como habilidades tipo conjuro.
- Equipo: la armadura y el arma mágicas no cuentan dentro de los 3 objetos; una extremidad solo puede tener un objeto y la armadura queda fuera de esa regla.
- Nueva sección 10: visor de personajes, con los repos revisados.
- Hitos reordenados (el visor es M2) y casos de prueba ampliados.
