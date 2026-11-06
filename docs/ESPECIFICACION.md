# EverwhiteEmperor — Especificación del tracker de personajes (v0.1)

Estado: borrador del 2026-11-06.

Convención del documento:
- **[PENDIENTE]**: falta un dato o una decisión del diseñador.
- **[SUPUESTO]**: interpretación que se tomó para poder avanzar; se puede corregir.

---

## 1. Propósito y alcance

Tracker de personajes para un TTRPG propio basado en Pathfinder 1e (referencia: d20pfsrd / Archives of Nethys). La historia avanza, se agregan feats y achievements, y hace falta un **registro contable de lo que ganó cada personaje en cada sesión**.

Del sistema Pathfinder se usan **atributos, feats y clases**. Se descartan las razas: en su lugar, el diseñador dicta *feats mayores* que funcionan como habilidades raciales.

Características del sistema que el tracker debe soportar:

- Una clase específica por personaje. Los personajes actuales son de nivel 7; el tracker soporta niveles 1–20.
- Experiencia con curva propia y reglas propias de ganancia (sección 3).
- Subsistemas paralelos de crecimiento, cada uno con su propia experiencia (sección 4).
- Sistema extendido de méritos y defectos (sección 5).
- Feats y *achievement feats*, con un máximo de 1 achievement feat por nivel (sección 6).
- Equipo limitado: 1 armadura, 1 arma y 3 objetos mágicos, que pueden tener cargas y habilidades (sección 7).
- Mucho material homebrew (sección 9).

Fuera de alcance de la v0 **[PENDIENTE confirmar]**: habilidades (skills), hechizos, combate y tiradas, mapas, multijugador en línea.

Restricciones:
- Se aloja en GitHub (sitio estático con GitHub Pages, sin backend).
- Es un proyecto gratuito. El contenido de Pathfinder 1e se usa bajo la OGL 1.0a y la Community Use Policy de Paizo, que no permite cobrar por el contenido. El sitio muestra el aviso de no afiliación con Paizo.

---

## 2. Base de código

**Candidato recomendado: `pixelkeep/pathfinder1e-sheet`** (licencia MIT, último commit 2026-05-27, JavaScript sin build, datos en `data/*.js`). Se importa conservando su licencia y atribución. **[PENDIENTE confirmar]**

Cambios necesarios sobre esa base:

1. Quitar la selección de raza.
2. Reemplazar la tabla de XP (hoy hardcodeada y duplicada en `data/tables.js`) por la configuración de la sección 3.
3. Pasar los requisitos de feats de texto libre (`prereqs:'STR 13, BAB +1'`) a un formato estructurado (sección 6).
4. Fijar los slots de equipo en 1 armadura, 1 arma y 3 objetos mágicos (sección 7).
5. Agregar el módulo de registro por sesión (sección 8).
6. Mover los datos homebrew a archivos de datos con validación (sección 9).

Alternativa descartada como base: `zombieFox/awesomeSheet` (MIT; sin commits en `master` desde 2021-02; build con Grunt y `node-sass` 5). Se usa solo como fuente de datos: `src/db/feats.csv` tiene del orden de 1,500 filas con una columna `prerequisite_feats` estructurada.

---

## 3. Experiencia

### 3.1 Curva de niveles

Cada nivel mide exactamente 1000 XP. El nivel N empieza en (N−1)×1000 y termina en N×1000.

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
XP ganada = redondeo( base(nivel_personaje) × mult_dif(Δ) × mult_actividad(tipo) )
```

| Δ (contenido − personaje) | `mult_dif` |
|---|---|
| +2 o más | ×1.50 |
| +1 | ×1.25 |
| 0 | ×1.00 (según tabla) |
| −1 | ×0.50 |
| −2 | ×0.25 |
| −3 o menos | **[PENDIENTE]** (por defecto configurable: ×0.25) |

Notas:

- **[SUPUESTO]** `base` se indexa por el nivel del *personaje*, no por el del contenido. La diferencia de nivel ya la expresa `mult_dif`; indexar también por el nivel del contenido contaría dos veces.
- **[PENDIENTE]** Tabla `base` (valores de recompensa con contenido de igual nivel).
- **[PENDIENTE]** Tipos de actividad y su `mult_actividad`. Algunas actividades dan menos XP y otras más; mientras no estén definidas, el valor por defecto es 1.0.
- **[PENDIENTE]** Redondeo (por defecto: al entero más cercano).
- **[PENDIENTE]** Si el nivel usado para Δ se evalúa por entrada, en orden (por defecto), o al inicio de la sesión.
- **[PENDIENTE]** Si la XP se divide entre los personajes del grupo o cada uno recibe el valor completo.

Todos los valores viven en `data/xp-config.json`, nunca en el código.

---

## 4. Subsistemas paralelos de crecimiento

Cada subsistema tiene su propia experiencia, independiente de la XP principal. Modelo genérico:

```json
{
  "id": "slug-del-subsistema",
  "nombre": "Nombre",
  "curva": { "tipo": "lineal | tabla", "...": "..." },
  "recompensas": [ { "nivel": 1, "otorga": ["id-de-feat-o-merito"] } ]
}
```

- Cada personaje tiene un nivel y una XP por subsistema.
- El registro por sesión (sección 8) tiene un tipo de entrada específico para XP de subsistema.
- **[PENDIENTE]** Cuáles son los subsistemas, su curva, qué desbloquea cada nivel y si interactúan con la XP principal.

---

## 5. Méritos y defectos (sistema extendido)

Modelo propuesto (inspirado en la forma en que GCS y Open Legend modelan rasgos con costo y requisitos):

```json
{
  "id": "slug",
  "nombre": "Nombre",
  "tipo": "merito | defecto",
  "costo": 0,
  "requisitos": { },
  "efectos": [ ],
  "fuente": "homebrew"
}
```

- Un personaje tiene una lista de méritos y defectos; cada uno se registra en el registro por sesión cuando se gana o se pierde.
- **[PENDIENTE]** Reglas de costo y balance (por ejemplo, si los defectos compensan puntos o tienen topes), cuántos puede tener un personaje y cuándo se ganan.

---

## 6. Feats y achievement feats

### 6.1 Catálogo de feats

- Catálogo Pathfinder 1e importado (`fuente: "pf1"`) más homebrew (`fuente: "homebrew"`).
- Los requisitos pasan a un formato estructurado, validable:

```json
{
  "id": "great-cleave",
  "nombre": "Great Cleave",
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
- **[PENDIENTE]** Slots de feats por nivel (¿regla estándar de PF1: niveles 1, 3, 5, 7…, o propia?).

### 6.2 Feats mayores (reemplazo de razas)

- Tipo especial `mayor`, dictado por el diseñador y asignado a cada personaje como habilidad racial.
- **[PENDIENTE]** Cuántos tiene cada personaje, cuándo se otorgan y cuáles existen.

### 6.3 Achievement feats

- Se ganan por logros de la historia.
- **Regla: máximo 1 achievement feat por nivel de personaje.** Se registra el nivel en que se ganó; una segunda ganancia en el mismo nivel es un error de validación.
- **[SUPUESTO]** "Por nivel" significa por cada nivel del personaje: si ganó uno siendo nivel 7, el siguiente solo puede ganarse a partir del nivel 8.
- **[PENDIENTE]** Lista de achievement feats, condiciones de cada uno y sus efectos.

---

## 7. Equipo

Límites por personaje: **1 armadura, 1 arma y 3 objetos mágicos.**

```json
{
  "id": "slug",
  "tipo": "armadura | arma | magico",
  "cargas": { "max": 3, "actuales": 3, "recarga": "diaria" },
  "habilidades": [ ]
}
```

- Los objetos mágicos pueden tener cargas y habilidades; el registro por sesión anota usos, recargas y cambios.
- El tracker impide superar los límites (validación al equipar).
- **[PENDIENTE]** Si una armadura o un arma mágica cuenta dentro de los 3 objetos mágicos; si el escudo cuenta como armadura; qué pasa con los slots corporales de PF1 (anillo, cinturón, etc.).

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
        { "tipo": "xp", "actividad": "dungeon", "nivelContenido": 9, "nota": "" },
        { "tipo": "xp-subsistema", "subsistema": "slug", "cantidad": 250 },
        { "tipo": "feat", "id": "power-attack" },
        { "tipo": "achievement", "id": "slug" },
        { "tipo": "rasgo", "id": "slug", "accion": "ganar | perder" },
        { "tipo": "objeto", "id": "slug", "accion": "equipar | desequipar | usar-carga | recargar" },
        { "tipo": "ajuste", "campo": "xp", "cantidad": -100, "motivo": "..." }
      ]
    }
  ]
}
```

Reglas:

1. Las entradas de XP guardan sus **datos de entrada** (actividad, nivel de contenido), no solo el resultado. Al cambiar una tabla o un multiplicador, el historial se recalcula.
2. El nivel nunca se registra: siempre se deriva de la XP.
3. Cada sesión muestra un resumen: XP ganada, nivel antes y después, y feats, achievements y rasgos ganados.
4. Validaciones al reproducir el registro:
   - achievement feats: máximo 1 por nivel;
   - los feats cumplen sus requisitos en el momento de ganarlos;
   - límites de equipo (1/1/3);
   - nivel máximo 20.
5. Los ajustes manuales exigen un motivo.

Persistencia v0: un archivo JSON por personaje (`characters/<id>.json`) que se exporta e importa desde el navegador; el historial de Git sirve de auditoría. Se usa `localStorage` solo como borrador. **[PENDIENTE]** Confirmar si basta con exportar/importar y hacer commit manual.

---

## 9. Datos y homebrew

Estructura propuesta:

```
data/
  xp-config.json        # curva, tabla base, multiplicadores
  classes.json
  feats.pf1.json        # importado
  feats.homebrew.json
  traits.json           # méritos y defectos
  items.json
  achievements.json
  subsystems.json
characters/
  <id>.json
```

- Cada registro tiene `id` estable (slug) y `fuente` (`pf1` | `homebrew`).
- Un **validador** (script de Node) comprueba referencias entre archivos, requisitos de feats y la consistencia de cada personaje. Se ejecuta en GitHub Actions en cada push.
- Fuentes para la importación inicial: `data/feats.js` de pixelkeep (171 feats) y `src/db/feats.csv` de awesomeSheet (~1,500 filas, incluye duplicados entre categorías).
- Opcional: autoría de homebrew en CSV con conversor y validador, igual que el flujo que ya existe en el feat builder de Spiral.

---

## 10. Hitos

| Hito | Contenido | Criterio de aceptación |
|---|---|---|
| M0 | Importar la base, quitar razas, `xp-config.json` con la curva de 1000 por nivel | XP 0 → nivel 1; 14,000 → nivel 15; 15,000 → nivel 16 |
| M1 | Registro por sesión y resumen por sesión | Cambiar un multiplicador recalcula todo el historial |
| M2 | Feats estructurados, disponibles/activos, achievement feats | Un segundo achievement en el mismo nivel es rechazado |
| M3 | Equipo con límites y cargas | No se puede equipar un segundo arma ni un cuarto objeto mágico |
| M4 | Méritos/defectos y subsistemas | Cada subsistema lleva su propia XP y nivel |
| M5 | Pipeline de homebrew, validador y CI | Un push con una referencia rota falla el CI |

---

## 11. Casos de prueba de XP

Personaje de nivel 7 con `base(7) = B` y `mult_actividad = 1`:

| Nivel de contenido | Δ | XP ganada |
|---|---|---|
| 10 | +3 | 1.50 × B |
| 9 | +2 | 1.50 × B |
| 8 | +1 | 1.25 × B |
| 7 | 0 | 1.00 × B |
| 6 | −1 | 0.50 × B |
| 5 | −2 | 0.25 × B |

Fronteras de nivel: 6,999 XP → nivel 7 (progreso 99.9%); 7,000 XP → nivel 8 (progreso 0%).

---

## 12. Lista de pendientes

1. Tabla `base` de recompensa por nivel (1–20).
2. Tipos de actividad y sus multiplicadores.
3. `mult_dif` para Δ ≤ −3.
4. Comportamiento de la XP sobre 20,000.
5. Redondeo, evaluación del nivel por entrada o por sesión, y reparto de XP en grupo.
6. Subsistemas: lista, curvas y recompensas.
7. Méritos y defectos: costos, topes y cuándo se ganan.
8. Slots de feats por nivel y feats mayores (cuántos y cuáles).
9. Lista y condiciones de los achievement feats.
10. Equipo: qué cuenta dentro de los 3 objetos mágicos; escudos; slots corporales.
11. Persistencia: ¿exportar/importar JSON y commit manual?
12. Alcance de estadísticas derivadas (HP, skills, hechizos).
13. Confirmar `pixelkeep/pathfinder1e-sheet` como base de código.
