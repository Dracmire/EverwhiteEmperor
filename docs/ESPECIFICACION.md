# EverwhiteEmperor — Especificación del tracker de personajes (v0.8.2)

Estado: borrador del 2026-11-08. La v0.8.2 añade la fatiga, los estados DOWN, K.O. y Deadly y los descansos a la vista Jugar (1.2), convierte Equipo y Méritos y defectos en listas de una línea con tooltip, deja las tiradas de HP y MP solo en Construir, y fija que los Gates conectan por defecto salvo incompatibilidad (4.1.2). La v0.8.1 ajusta la vista Jugar (feats como lista, derivados en mini tarjetas) y documenta el diseño nuevo de Mana por Gates, Magia con conjuros y habilidades de clase por nivel, que todavía **no está implementado**. La v0.8 cambió los atributos (STR, DEX, PER, INT, WIS y CHA; CON, SPR y MND se derivan), añade HP y MP con tiradas de dados, y rehace la ficha del visor: retrato, base y atributos arriba, todo lo demás plegado y el registro de sesiones abajo, con achievements asignables desde una lista con scroll (ver "Cambios respecto a versiones anteriores" al final).

Convención del documento:
- **[PENDIENTE]**: falta un dato o una decisión del diseñador.
- **[SUPUESTO]**: interpretación que se tomó para poder avanzar; se puede corregir.
- **[DECIDIDO]**: confirmado por el diseñador.
- **[DIFERIDO]**: el diseñador decidió resolverlo más adelante (pulido); no bloquea nada.

---

## 1. Propósito y alcance

Tracker de personajes para un TTRPG propio basado en Pathfinder 1e (referencia: d20pfsrd / Archives of Nethys). La historia avanza, se agregan feats y achievements, y hace falta un **registro contable de lo que ganó cada personaje en cada sesión**.

Del sistema Pathfinder se usan **atributos, feats y clases**. De las razas de Pathfinder se descartan sus rasgos (modificadores, tamaño, velocidad): los rasgos raciales se expresan como méritos y defectos, y cada raza marca con exclusividad los suyos (sección 5).

Características del sistema que el tracker debe soportar:

- Una clase específica por personaje. Los personajes actuales son de nivel 7; el tracker soporta niveles 1–20.
- Experiencia con curva propia y reglas propias de ganancia, con tags de actividad y grados de cumplimiento (sección 3).
- Dos subsistemas con experiencia propia (zeo y mana), la regla de magia por mana, y una ganancia adicional que no es XP (achievement y fate) (sección 4).
- Sistema extendido de méritos y defectos, que incluye los rasgos raciales exclusivos de cada raza (sección 5).
- Feats de Pathfinder (con las habilidades activas reclasificadas como habilidades tipo conjuro), traits (feats mayores: colecciones de ventajas o feats) y *achievement feats*, con un máximo de 1 achievement feat por nivel (sección 6).
- Equipo limitado: 1 armadura, 1 arma y 3 objetos mágicos, con la regla de una extremidad por objeto (sección 7).
- Un visor de personajes simple y atractivo (sección 10).
- Mucho material homebrew (sección 9).

Fuera de alcance de la v0 **[PENDIENTE confirmar]**: habilidades (skills; solo se usan sus nombres como tags), hechizos, combate y tiradas, mapas, multijugador en línea.

Restricciones:
- Se aloja en GitHub (sitio estático con GitHub Pages, sin backend).
- Es un proyecto gratuito. El contenido de Pathfinder 1e se usa bajo la OGL 1.0a y la Community Use Policy de Paizo, que no permite cobrar por el contenido. El sitio muestra el aviso de no afiliación con Paizo.

### 1.1 Atributos, HP y MP (v0.8) [DECIDIDO salvo lo marcado]

**Atributos base**: STR, DEX, PER (percepción), INT, WIS y CHA. Son los únicos que se escriben en el JSON del personaje (`atributos`). **CON no se usa como atributo propio**: se deriva.

| Derivado | Regla | Para qué se usa |
|---|---|---|
| CON | menor de STR y DEX | bonifica HP **[SUPUESTO]** |
| SPR (espíritu) | menor de WIS y CHA | bonifica mana (MP) |
| MND (mente) | menor de PER e INT | sin efecto definido todavía **[PENDIENTE]** |

- Si el JSON trae CON, SPR o MND, o un atributo desconocido, o le falta uno de los seis base, el motor lo avisa como error. El valor escrito de un derivado se ignora.
- Los requisitos de feats de Pathfinder que piden CON usan el CON derivado (el catálogo no pide PER, SPR ni MND).
- El perfil racial (5.2) solo mira los seis atributos base.
- **[SUPUESTO]** El modificador de un atributo es `floor((valor − 10) / 2)`, como en Pathfinder 1e.

**HP y MP se tiran con dados.** Cada nivel tiene una tirada de HP y una de MP, y suma `max(1, resultado + modificador)`: el modificador de CON para HP y el de SPR para MP. El máximo es la suma de todos los niveles.

- Cada tirada es una entrada `tirada` del registro (sección 8) con `recurso` (`hp` o `mp`), `dado` (`dN`, por ejemplo `d10`) y `resultado` (entre 1 y N). Se guarda el resultado, no solo el máximo, igual que la XP guarda sus datos de entrada.
- **[SUPUESTO]** La tirada se asigna al primer nivel sin tirada que ya se alcanzó, o al `nivel` indicado en la entrada. No se puede tirar para un nivel que el personaje no alcanzó ni repetir un nivel.
- **[SUPUESTO]** El nivel 1 también se tira (no hay valor fijo) y el modificador se aplica a todos los niveles con el valor actual del atributo (si el atributo cambia, el máximo se recalcula).
- Los niveles sin tirada no son un error: el motor avisa («faltan tiradas de HP en los niveles…») y el máximo solo suma las tiradas hechas.
- **[SUPUESTO]** El HP y el MP *actuales* (el daño recibido o el mana gastado) no son parte del registro por sesión. El visor los lleva con botones −5, −1, +1, +5 y «Máx», guardados solo en el navegador de quien mira, por personaje. El HP actual puede bajar de 0 hasta −máximo (1.2); el MP se detiene en 0.
- **[PENDIENTE]** Qué dado usa cada clase para HP y para MP (el visor ofrece d4 a d20; el ejemplo usa d10 para HP y d6 para MP), y si MND tiene algún efecto.
- **[PENDIENTE]** Si el MP máximo es lo mismo que el «mana ganado» del subsistema de mana (4.1) o son cosas separadas. Hoy el motor las trata por separado: `recursos.mp` (tiradas) y `mana.total` (XP de mana).

### 1.2 HP actual: fatiga, estados y recuperación (v0.8.2) [DECIDIDO salvo lo marcado]

Todo esto vive en la vista **Jugar**. El HP actual sigue siendo un valor del navegador (1.1), no del registro; las cifras salen de `data/vitalidad.json` y las calculan `Core.umbralesVitales`, `Core.estadoVital` y `Core.curacionDescanso`, así que se cambian sin tocar el código.

**Fatiga [DECIDIDO].** Es un **penalizador acumulativo** que depende del HP actual como porcentaje del máximo:

| HP actual | Penalizador de ese tramo | Total |
|---|---|---|
| ≤ 50 % | −2 | −2 |
| ≤ 25 % | −4 más | −6 |
| ≤ 10 % | −4 más | −10 |

**Estados [DECIDIDO].** Con HP ≤ 0 el personaje está **DOWN**; con HP ≤ −25 % del máximo está **K.O.**; con HP ≤ −50 % está **Deadly**. Por eso el HP actual puede bajar hasta −máximo.

- **[SUPUESTO]** Los umbrales son inclusivos (≤). Cada porcentaje se convierte a HP con `floor(máximo × porcentaje / 100)`, también bajo cero: con un máximo de 56 la fatiga empieza en 28, 14 y 5 HP, y DOWN, K.O. y Deadly empiezan en 0, −14 y −28; con un máximo de 10, −25 % son −2,5 y K.O. empieza en −3.
- **[SUPUESTO]** En DOWN, K.O. y Deadly la fatiga sigue contando (−10).
- **[PENDIENTE]** A qué se aplica el penalizador de fatiga (¿todas las tiradas, solo ataque y habilidades?). El visor solo lo muestra, en un chip junto al estado; el tooltip del chip lista los umbrales convertidos a HP, y la barra marca el 50 %, el 25 % y el 10 %.
- **[PENDIENTE]** Qué significa cada estado en la mesa (si DOWN impide actuar, si K.O. y Deadly piden tiradas de estabilización o muerte). Hoy solo se marcan.

**Recuperación [DECIDIDO que hay un descanso corto de 2 h y uno largo de 8 h, con el valor de Pathfinder y un bono por cuerpo].**

- Pathfinder 1e cura **1 HP por nivel de personaje tras 8 h de descanso** (el doble con un día completo de reposo absoluto) y **no tiene un descanso corto ni usa CON**. Se verificó en Archives of Nethys («Natural Healing»).
- **[SUPUESTO]** Descanso **largo** (8 h) = `nivel × (1 + bono de cuerpo)`. El **bono de cuerpo** es el modificador de **CON** (el atributo «cuerpo», derivado de STR y DEX) con mínimo 0, y se suma **por nivel**, igual que CON se suma a cada tirada de HP. Con nivel 7 y CON 13 (+1): `7 × (1 + 1) = 14` HP. Si el bono debiera ser fijo, basta con `bonoCuerpo.porNivel: false` (8 HP en el mismo caso).
- **[SUPUESTO]** Descanso **corto** (2 h) = `floor(largo × 2 / 8)`, con mínimo 1: el valor de Pathfinder repartido por horas. Con el mismo personaje: `floor(14 × 2 / 8) = 3` HP.
- **[SUPUESTO]** Cada botón suma al HP actual (también desde valores negativos) sin pasar del máximo, y el visor avisa cuánto subió de verdad. Los botones se desactivan con el HP al máximo.
- **[PENDIENTE]** Si el descanso recupera MP (hoy **no**: el MP se relaciona con el mana de 4.1.2, que sigue abierto), si hay un tope de descansos cortos por día y si el largo recarga también las cargas diarias del equipo (7). Hoy esas cargas se derivan del registro, no del navegador.

---

## 2. Base de código

**[DECIDIDO] Base: `pixelkeep/pathfinder1e-sheet`** (licencia MIT, último commit 2026-05-27, JavaScript sin build, datos en `data/*.js`). Se importa conservando su licencia y atribución.

Cambios necesarios sobre esa base:

1. Reemplazar la selección de raza de Pathfinder (modificadores, tamaño, velocidad) por una raza que solo da perfil racial y racials exclusivos (sección 5.2).
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
- **[PENDIENTE]** Cuánto vale un dungeon o una misión completos: la misma tabla que una criatura de su nivel, o una escala por tamaño (ver 3.5).
- **[PENDIENTE]** Redondeo (por defecto: al entero más cercano).
- **[PENDIENTE]** Si el nivel usado para Δ se evalúa por entrada, en orden (por defecto), o al inicio de la sesión.
- **[PENDIENTE]** Si la XP se divide entre los personajes del grupo o cada uno recibe el valor completo.

### 3.3 Tags de actividad y grados [DECIDIDO]

Una **actividad** se describe con **tags**, no con un tipo único. La lista de tags está inspirada en la lista de habilidades de Pathfinder 1e: los 35 nombres de habilidades, 3 tags propios generales (`exploration`, `quest`, `rest`) y los **tags de combate**. El combate **no es un tag global**: cada estilo o rol de combate es su propio tag (por ejemplo `combat-healer` es distinto de `close-quarter-combat`). Se guarda en `data/xp-config.json`; añadir, quitar o cambiar un tag no toca el código.

| Grupo | Tags |
|---|---|
| cuerpo | `acrobatics`, `climb`, `escape-artist`, `fly`, `ride`, `swim`, `stealth` |
| sentidos | `perception`, `sense-motive`, `appraise` |
| social | `bluff`, `diplomacy`, `disguise`, `intimidate`, `perform` |
| oficio | `craft`, `profession`, `disable-device`, `sleight-of-hand` |
| supervivencia | `handle-animal`, `heal`, `survival` |
| conocimiento | `knowledge-arcana`, `knowledge-dungeoneering`, `knowledge-engineering`, `knowledge-geography`, `knowledge-history`, `knowledge-local`, `knowledge-nature`, `knowledge-nobility`, `knowledge-planes`, `knowledge-religion`, `linguistics` |
| magia | `spellcraft`, `use-magic-device` |
| combate (propios) | `close-quarter-combat`, `combat-healer`; la lista completa está pendiente |
| general (propios) | `exploration`, `quest`, `rest` |

**Grados de cumplimiento.** Cada tag de una entrada se cumple en un grado:

| Grado | Porcentaje de la XP |
|---|---|
| `cumple` | 25–30% |
| `heroico` | 100% |

- Una actividad que cumple un tag recibe el 25–30% de la XP; si lo cumple de manera heroica, recibe el 100%.
- **[SUPUESTO]** El porcentaje se aplica sobre la XP completa de la entrada (`base × mult_dif`). En `cumple` la configuración usa 0.25 y cada entrada puede subirlo hasta 0.30 con `pct`. Ejemplo con una criatura de nivel igual (40 XP): `cumple` da 10 XP (hasta 12) y `heroico` da 40 XP.
- **[SUPUESTO]** Con varios tags se aplica el **mayor** de (multiplicador del tag × porcentaje del grado) (`combinarTags: "max"`), para que no se sumen ni se multipliquen entre sí. Se puede cambiar a `producto` o `promedio` en la configuración.
- **[DECIDIDO]** El 25–30% / 100% también aplica al combate, pero **por tag de combate, no de manera global**: una pelea que cumple `close-quarter-combat` no cumple por eso `combat-healer`. Una entrada de combate lleva el tag específico (o varios) que realmente se cumplió.
- **[DIFERIDO]** Lista completa de tags de combate (hoy solo `close-quarter-combat` y `combat-healer`): se deja para el pulido.
- **[PENDIENTE]** Multiplicador propio de cada tag (`mult`): todos están en 1.0 hasta que el diseñador los defina.

### 3.4 Tabla base de XP [DECIDIDO como valor inicial]

La tabla base viene de **Pathfinder 2e**, que usa la misma regla de 1000 XP por nivel: la XP de una criatura depende solo de la diferencia entre su nivel y el del grupo. A nivel igual da 40 XP. **[DECIDIDO]** Se parte con **40** como valor de `base` (editable en `data/xp-config.json`); calibrarlo con las sesiones por nivel que se quieran no es importante por ahora **[DIFERIDO]**.

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
  "gradosTag": {
    "cumple": { "nombre": "Cumple el tag", "mult": 0.25, "max": 0.30 },
    "heroico": { "nombre": "Cumple el tag de manera heroica", "mult": 1.0 }
  },
  "tags": [ { "id": "close-quarter-combat", "nombre": "Close quarter combat", "grupo": "combate", "mult": 1.0, "origen": "propio" } ]
}
```

(El archivo real incluye los 40 tags de 3.3.)

### 3.5 Alternativas a la tabla base

No hay otro sistema conocido que tenga a la vez 1000 XP fijos por nivel y una tabla relativa al nivel; Pathfinder 2e es el más cercano. Lo que sí se puede cambiar es la **base** (cuánto da una criatura de nivel igual) y la **unidad** que se evalúa.

**Cambiar la base.** La forma de la tabla no cambia (la dan tus multiplicadores); solo el ritmo:

| Base | Criaturas de nivel igual por nivel | Δ +2 | Δ +1 | Δ 0 | Δ −1 | Δ −2 | Δ −3 | Δ ≤ −4 |
|---|---|---|---|---|---|---|---|---|
| 40 (Pathfinder 2e) | 25 | 60 | 50 | 40 | 20 | 10 | 1 | 0 |
| 100 | 10 | 150 | 125 | 100 | 50 | 25 | 1 | 0 |
| 200 | 5 | 300 | 250 | 200 | 100 | 50 | 1 | 0 |

**Cambiar la unidad** (útil para dungeons y misiones, que no son una criatura):

- **Por amenaza de encuentro** (Pathfinder 2e, grupo de 4): Trivial 40, Low 60, Moderate 80, Severe 120, Extreme 160. La fuente indica que el presupuesto cambia con el tamaño del grupo ([pf2calc](https://pf2calc.pages.dev/gm-guide)).
- **Por logro de historia** (Pathfinder 2e): menor 10, moderado 30, mayor 80 ([West Games](https://west-games.com/pathfinder-2e-experience-calculator/)).
- **Por CR absoluto** (Pathfinder 1e): la XP se toma de la tabla 12–2 del Core Rulebook, se reparte entre los personajes y no se da XP por retos 10 o más CR bajo el nivel medio del grupo ([Archives of Nethys](https://aonprd.com/Rules.aspx?ID=253)). Se descarta: la XP absoluta crece con el CR y exigiría una curva distinta de 1000 por nivel. No se obtuvieron las cifras de la tabla 12–2.

---

## 4. Subsistemas y ganancias adicionales

**[DECIDIDO]** Solo **zeo** y **mana** tienen una tabla de XP independiente. El resto de los sistemas no usan XP propia:

| id | Qué es | XP propia |
|---|---|---|
| `zeo` | Técnicas en tres ramas: heaven, void y earth (sección 4.1.1) | Sí, tabla independiente (en sx) |
| `mana` | Subsistema de crecimiento; atributo gastable | Sí, tabla independiente |
| `magic` | Reemplaza el sistema de casteo por mana | No |
| `racial` | Se integra en méritos y defectos (sección 5) | No |
| `achievement` y `fate` | Ganancia adicional que no es XP | No |

### 4.1 Zeo y mana

- Cada uno tiene su propia tabla de XP y su propio nivel, independientes de la XP principal.
- **[DECIDIDO]** `zeo` no es el sistema Xeno de los documentos del proyecto. Su estructura está en 4.1.1.
- ~~**[SUPUESTO]** "Atributo expensive" de mana significa un atributo que se gasta al usarlo.~~ **Reemplazado en la v0.8.1** por el diseño de Gates (4.1.2): el mana no es un fondo que se gasta ni un «mana ganado», sino una serie de poderes que crece con SX.
- **[PENDIENTE]** La tabla de XP de mana, qué desbloquea cada nivel de mana y de zeo, y si reciben XP de las mismas actividades que la principal.
- **[PENDIENTE]** Relación entre el mana del subsistema y el MP que se tira (1.1).

```json
{
  "id": "mana",
  "nombre": "Mana",
  "xp": { "tabla": [ { "nivel": 1, "desde": 0 } ] },
  "recompensas": [ { "nivel": 1, "otorga": ["id-de-feat-o-merito"] } ]
}
```

### 4.1.1 Zeo [DECIDIDO salvo lo marcado]

- **Unidad:** sx (la XP de zeo).
- **Tres ramas:** las técnicas se dividen en `heaven`, `void` y `earth`. Cada rama acumula sus propios sx y tiene su propio nivel.
- **El nivel zeo es el menor de los niveles de las tres ramas.**
- **Tabla de sx por nivel** (niveles 1 a 5):

| Nivel | sx |
|---|---|
| 1 (base) | 10 |
| 2 | 20 |
| 3 | 30 |
| 4 | 50 |
| 5 | 80 |

- **[SUPUESTO]** La tabla se lee igual que la XP principal: cada número es el sx acumulado donde *termina* el nivel (nivel 1: 0 a 10; nivel 2: 10 a 20; nivel 3: 20 a 30; nivel 4: 30 a 50; nivel 5: 50 en adelante, con 80 como cierre). La alternativa es leerla como el costo de cada nivel (acumulado 10, 30, 60, 110, 190). El archivo `data/zeo.json` tiene el campo `lectura` para cambiar de una a otra. **[PENDIENTE confirmar]**
- **[SUPUESTO]** El nivel máximo de cada rama es 5.

**Líneas de técnica:**

- Un personaje parte con **10 líneas de técnica base**.
- Cada línea es una **cadena de técnicas** con requisitos enlazados. Cada **piso** de la cadena tiene varias técnicas.
- Los pisos 1 a 3 suelen estar disponibles desde el inicio (los requisitos suelen estar restringidos hasta el nivel 3).
- Al acumular **10 niveles** en una misma línea se desbloquea el piso 4; con **20 niveles**, el piso 5.
- **[SUPUESTO]** El texto original quedó cortado ("lv 5 a"); se interpreta como que el piso 5 también se desbloquea con 20 niveles acumulados.
- **[SUPUESTO]** Los "niveles acumulados" de una línea son los niveles ganados en las técnicas de esa línea. En el registro se anotan con la entrada `zeo-linea` (sección 8).
- **[PENDIENTE]** A qué rama pertenece cada línea o técnica, cómo se ganan los niveles de técnica, qué actividades dan sx, y la lista de las 10 líneas base.

Valores de `data/zeo.json`:

```json
{
  "unidad": "sx",
  "ramas": ["heaven", "void", "earth"],
  "nivelZeo": "min",
  "nivelMax": 5,
  "lectura": "umbral-acumulado",
  "niveles": [
    { "nivel": 1, "sx": 10 }, { "nivel": 2, "sx": 20 }, { "nivel": 3, "sx": 30 },
    { "nivel": 4, "sx": 50 }, { "nivel": 5, "sx": 80 }
  ],
  "lineasBase": 10,
  "pisos": {
    "iniciales": 3,
    "max": 5,
    "desbloqueo": [
      { "piso": 4, "nivelesAcumulados": 10 },
      { "piso": 5, "nivelesAcumulados": 20 }
    ]
  }
}
```

### 4.1.2 Mana por Gates (v0.8.1) [DECIDIDO el diseño; el detalle está PENDIENTE; sin implementar]

Mana es **una serie de poderes, como Zeo**, no un «mana ganado». Crece con SX y se construye con **Gates**.

- **Mana force (MF):** la capacidad de mana medida del usuario. Un ser humano parte con **1** y gana más con criaturas contratadas, contratos mágicos y otras fuentes. Debe haber una **contabilidad de la MF**, desplegable en el visor: cada aporte con su fuente.
- **Gates:** cada **potencia de 2** de MF compra un Gate (1, 2, 4, 8…). Construir un Gate necesita tres cosas: **SX**, **Mana force** y **una oportunidad para construir**. **[SUPUESTO]** el Gate número *k* exige MF ≥ 2^(k−1) (MF 1 permite 1 Gate, MF 2 permite 2, MF 4 permite 3, MF 8 permite 4).
- Cada Gate tiene un **tag** elemental o de algún concepto (fuego, agua, silencio, sombra…), y una **función**: **capacidad**, **intensidad**, **potencia** o **sentidos**.
- Cada Gate genera **un slot para una habilidad mágica**, que el usuario **inscribe**. Un Gate equivale a un conjuro de mago de nivel 1.
- **2 Gates crean una línea llamada nodo**, equivalente a un conjuro de nivel 2.
- **3 Gates crean un circuito cerrado llamado círculo**, equivalente a un conjuro de nivel 3.

**Modelo de grafo [DECIDIDO el 2026-11-08].** El sistema de mana tiene una visión circular: los Gates son **nodos de un grafo, equidistantes** (dispuestos en un círculo). Los nodos y los círculos son **aditivos**: no consumen los Gates, se suman a ellos.

- Slots de nivel 1 = Gates. Slots de nivel 2 = **nodos**, es decir, pares de Gates que **conectan**. Slots de nivel 3 = **círculos**, es decir, tríos de Gates en que **conectan los tres pares**.
- Con todos los pares conectados, *n* Gates dan `n + C(n,2) + C(n,3)` slots: 1 Gate = 1, 2 = 3, **3 = 3 + 3 + 1 = 7**, 4 = 14, 5 = 25.
- **No todos los Gates conectan entre sí**, y eso **resta slots**. Un círculo solo existe si los tres pares del trío conectan. Con 3 Gates y un solo par sin conexión: 3 Gates + 2 nodos + 0 círculos = **5** slots.
- **Los Gates conectan por defecto [DECIDIDO el 2026-11-08].** Dos Gates **siempre conectan**, salvo que haya un **problema de compatibilidad** entre sus tags. La excepción la define una **tabla de compatibilidad**: son unos **200 tags**, así que la tabla es grande, pero **el jugador maneja solo un puñado** (los tags de sus propios Gates). La tabla lista los pares **incompatibles**; todo par que no figura conecta.
  - **[SUPUESTO]** Formato: `data/mana-tags.json` con los tags y, por tag, sus tags incompatibles. La relación es simétrica y el validador comprueba que lo sea. El motor solo consulta los tags que el personaje tiene en sus Gates, y el visor muestra únicamente esos.
- Cada Gate tiene un **tag** y una **función** (capacidad, intensidad, potencia o sentidos). La función es **solo del Gate**. Los **tags se heredan**: el tag es el concepto del Gate y pasa a los nodos y círculos que lo incluyen. Un Gate de fuego y uno de oscuridad pueden no conectar.

Propuesta de entradas del registro (**[SUPUESTO]**, no implementadas). Los nodos y los círculos **no** son entradas: el motor los **deriva** del grafo de Gates y de la compatibilidad entre sus tags.

```json
[
  { "tipo": "mana-fuerza", "cantidad": 1, "fuente": "criatura-contratada", "nota": "Contrato con el lobo blanco" },
  { "tipo": "gate", "id": "g1", "funcion": "capacidad", "tag": "hielo", "oportunidad": "El altar del glaciar", "sx": 10 },
  { "tipo": "gate", "id": "g2", "funcion": "potencia", "tag": "oscuridad", "oportunidad": "La grieta bajo la torre", "sx": 10 },
  { "tipo": "inscribir", "slot": "g1", "habilidad": "power-attack" }
]
```

- **[PENDIENTE]** El **contenido de la tabla de compatibilidad** (los ~200 tags y sus pares incompatibles), si el GM puede forzar o romper una conexión concreta y dejarlo en el registro, y qué tag lleva un nodo o un círculo (la unión de los tags de sus Gates).
- **[PENDIENTE]** Cuánto SX cuesta cada Gate y si el SX se **gasta** o es solo un umbral; cuánto da cada fuente de MF; qué hace cada función (capacidad, intensidad, potencia, sentidos).
- **[PENDIENTE]** Cómo se nombra y se inscribe un slot de nodo o de círculo (su identificador, p. ej. `g1-g2`), y si lo que se inscribe debe coincidir con el tag del slot.
- **[PENDIENTE]** Si hay niveles de mana con tabla de SX como en Zeo, y la relación con el MP que se tira (1.1: ¿el MP es el combustible de las habilidades inscritas, o lo reemplazan los slots?).

### 4.2 Magia (conjuros) (v0.8.1) [DECIDIDO la dirección; sin implementar]

- La Magia usa el sistema de Pathfinder o D&D, **con memorización de conjuros**. Los conjuros son más o menos estáticos, así que el proyecto necesita un **catálogo de conjuros** (`data/conjuros.json`): id, nombre, escuela, nivel por lista de clase y fuente.
- Los conjuros están **limitados por el tipo de lanzador** (mago, hechicero…). Cada clase lanzadora anota su **lista de conjuros** y sus **escuelas permitidas y prohibidas**; esa anotación vive en el archivo de la clase (6.5).
- **[SUPUESTO]** Los slots donde se memorizan los conjuros salen de los Gates, nodos y círculos (4.1.2), con niveles 1 a 3.
- Las habilidades tipo conjuro de los feats activos (6.2) conviven con los conjuros del catálogo.
- **[PENDIENTE]** Qué sistema y qué edición (Pathfinder 1e, D&D 3.5 o D&D 5e) y de dónde se importa el catálogo; qué se copia (nombre, escuela y nivel, o también el texto: la OGL y los avisos de copyright siguen pendientes, `docs/FUENTES.md`); qué pasa con los niveles 4 a 9; cómo se resuelven las escuelas de especialista y las líneas de sangre.

### 4.3 Racial

No es un subsistema: los rasgos raciales se expresan como **méritos y defectos** (sección 5).

### 4.4 Achievement y fate

- **[DECIDIDO]** Trabajan juntos como una **ganancia adicional que no es XP**.
- **[SUPUESTO]** Un achievement puede otorgar fate. Fate es un contador (no tiene nivel ni XP) que se gana con achievements y se gasta.
- **[PENDIENTE]** Cuánto fate da cada achievement, si tiene tope y para qué se gasta.

---

## 5. Méritos y defectos (sistema extendido)

### 5.1 Reglas generales

Reglas **[DECIDIDO]**:

- **Los méritos solo se pagan con defectos.** Un defecto da puntos; un mérito cuesta puntos.
- **Los personajes parten con `floor(nivel / 2) + 1` puntos** (nivel 1 → 1; nivel 7 → 4; nivel 20 → 11).
- **10 puntos de mérito compran un mérito heroico.** Los méritos heroicos tienen seis rarezas: `normal`, `raro`, `extraordinario`, `epico`, `heroico`, `legendario`.
- **Los rasgos raciales son méritos y defectos.** Cada raza marca con exclusividad los suyos (sección 5.2).

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
  "raza": "id-de-raza",
  "rareza": "normal | raro | extraordinario | epico | heroico | legendario",
  "costo": 0,
  "valor": 0,
  "requisitos": { },
  "efectos": [ ],
  "fuente": "homebrew"
}
```

- `costo` se usa en méritos; `valor` en defectos. `rareza` aplica a los méritos heroicos y a los racials. `raza` solo aplica a los racials.
- El registro por sesión anota cuándo se gana o se pierde cada mérito o defecto. El tracker calcula el saldo de puntos y rechaza un saldo negativo.
- **[PENDIENTE]** Costo de los méritos comunes (no heroicos), valor de cada defecto, si hay tope de defectos por personaje, y si los puntos iniciales se pueden gastar sin tomar defectos.

### 5.2 Razas y racials [DECIDIDO]

La raza se conserva como un **perfil racial**, no como los rasgos de raza de Pathfinder:

- Cada raza tiene una lista de **atributos preferidos** y una lista de **racials** (méritos y defectos de categoría `racial`).
- **Exclusividad:** cada raza marca con exclusividad sus racials. Solo un personaje de esa raza puede tomarlos.
- **Descuento por perfil:** muchas veces los racials reducen su costo, según su rareza, para los personajes que tienen el perfil racial (es decir, que tienen los atributos preferidos de su raza).

```json
{
  "id": "slug-de-raza",
  "nombre": "Nombre",
  "atributosPreferidos": ["STR", "DEX"],
  "racials": ["id-de-merito-racial", "id-de-defecto-racial"],
  "descuentoPorRareza": { "normal": 0, "raro": 0, "extraordinario": 0, "epico": 0, "heroico": 0, "legendario": 0 }
}
```

- Los valores de `descuentoPorRareza` son de ejemplo hasta que el diseñador los defina (`data/razas.json` usa 1 punto de descuento para la rareza `raro` y 0 para el resto).
- **[SUPUESTO]** El motor considera que un personaje "tiene el perfil" cuando el más bajo de sus atributos preferidos no es menor que el más alto de los demás (con STR 17 y DEX 13 contra 12, 10, 12 y 8, el perfil se cumple). Solo cuentan los seis atributos base: los derivados no.
- **[SUPUESTO]** El descuento solo se aplica a los racials que *reducen* su costo; hay racials que no lo tienen.
- **[PENDIENTE]** Cuánto descuenta cada rareza, qué cuenta como "tener el perfil" (todos los atributos preferidos, un mínimo de cada uno, los más altos del personaje…), qué razas existen y cuáles son sus racials.

---

## 6. Feats y achievement feats

### 6.1 Catálogo de feats

**[DECIDIDO]** El catálogo son los feats de Pathfinder 1e (`fuente: "pf1"`) más los homebrew (`fuente: "homebrew"`). Los requisitos tienen un formato estructurado y validable:

```json
{
  "id": "great-cleave",
  "nombre": "Great Cleave",
  "fuente": "pf1",
  "libro": "CRB",
  "tipo": "combate",
  "ejecucion": "pasivo",
  "requisitos": {
    "atributos": { "STR": 13 },
    "bab": 4,
    "feats": ["cleave", "power-attack"]
  }
}
```

Campos de `requisitos` (todos opcionales): `atributos`, `bab` (ataque base), `babAlt` (`{clase, nivel}`: "ataque base +6 **o** monje nivel 5"), `nivelPj` (nivel de personaje), `nivelClase` (`{clase, nivel}`), `feats` (ids de feats previos) y `otros` (lista de textos que el motor no evalúa: rangos de habilidad, nivel de lanzador, rasgos de clase…).

- **[DECIDIDO]** Slots de feats: **uno en el nivel 1 y uno más cada 2 niveles** (nivel 1 → 1, nivel 3 → 2, nivel 7 → 4, nivel 19 → 10). Un personaje de nivel 7 tiene 4. **No hay feats extra por clase.** El motor usa `floor((nivel + 1) / 2)`.
- El motor comprueba, al ganar un feat: que exista, que no esté repetido, que haya un slot libre y los requisitos estructurados. El ataque base sale de la progresión de la clase (`data/classes.json`: `completa` = nivel, `media` = 3/4, `baja` = 1/2, redondeo hacia abajo). Los requisitos de `otros` no bloquean: el feat ganado los lleva en `sinVerificar` y el visor los muestra con «?» para que el diseñador los revise a mano.
- **Feats repetibles:** un feat con `multiple: true` se puede ganar varias veces; la entrada del registro lleva `eleccion` (arma, escuela, etc.): `{ "tipo": "feat", "id": "weapon-focus", "eleccion": "espada larga" }`. No se puede repetir la misma elección. Un feat sin `multiple` no se repite. **[SUPUESTO]** Un requisito de feat previo se cumple con cualquier elección de ese feat; "con el arma elegida" queda en `otros`.
- Los feats con efecto numérico (ataque, daño, salvaciones, CA, iniciativa) aportarían a las estadísticas derivadas, y el tracker calcularía los efectos acumulados. **[DIFERIDO]** Hoy el catálogo no lleva efectos ni texto de beneficios (ver 9 y `docs/FUENTES.md`); el visor enlaza al texto en Archives of Nethys, o muestra el `resumen` propio que el diseñador escriba en `data/feats.conversiones.json`.
- **Alcance de la importación (v0.7):** 665 feats de Core Rulebook, Advanced Player's Guide, Ultimate Magic y Ultimate Combat, de los tipos general, combate, metamagia y creación de objetos. Quedan fuera los feats raciales (la raza se sustituye por méritos raciales), los míticos, los de historia, los de monstruo y los achievement de Pathfinder (el proyecto tiene los suyos). **[PENDIENTE]** Si se quiere incluir otros libros.

### 6.2 Feats activos → habilidades tipo conjuro [DECIDIDO]

La mayoría de los feats de Pathfinder que representan una **ejecución activa** (maniobras y acciones que el personaje decide realizar) se reducen a **habilidades tipo conjuro**. Los feats pasivos (bonificaciones, condiciones, requisitos) siguen como feats.

- Cada feat lleva `ejecucion: "pasivo"` o `"activo"`.
- Un feat activo reclasificado se guarda como `tipo: "habilidad-tipo-conjuro"` con `convertidoDe: "<id del feat>"`.
- Hay excepciones: un feat activo puede quedar como feat con `excepcion: true` y un motivo.
- Procedimiento: el importador marca como `candidatoActivo` los feats cuyo texto menciona una acción (estándar, de movimiento, rápida, inmediata, gratuita o de asalto completo) o usos por día; hoy son 173 de 665. El texto no se guarda: solo la marca. El diseñador revisa la lista y confirma las conversiones en `data/feats.conversiones.json`, que se aplica encima del catálogo al cargarlo y no se pierde al volver a importar. Cada entrada admite `ejecucion`, `excepcion`, `resumen` (texto propio) y `nota`. Hoy solo `power-attack` está convertido, como ejemplo.
- **[SUPUESTO]** Las habilidades tipo conjuro gastan mana (sección 4.2). **[PENDIENTE]** Costo de cada una y cómo se aprenden.

### 6.3 Traits (feats mayores) [DECIDIDO; el detalle está DIFERIDO]

- Un **feat mayor** se llama **trait**. Un trait **no es un feat suelto: es una colección de ventajas o feats** agrupados bajo un nombre, dictada por el diseñador. Se pensaron como habilidades raciales.
- **[DECIDIDO]** Un trait es como un feat, pero de mayor calibre, y **un personaje puede tener un número ilimitado** de traits (no hay tope ni slots propios).
- **[DIFERIDO]** El resto del diseño de los traits se resuelve más adelante. El motor y el visor ya los admiten como lista, sin reglas de costo.
- Los feats normales son los del catálogo de Pathfinder (6.1); el término "menor" no se usa en este documento.
- Formato en `data/traits.json`:

```json
{
  "id": "slug-del-trait",
  "nombre": "Nombre",
  "fuente": "homebrew",
  "incluye": [
    { "tipo": "feat", "id": "id-de-feat" },
    { "tipo": "merito", "id": "id-de-merito" }
  ]
}
```

- En el registro se anota con `{ "tipo": "trait", "id": "...", "accion": "ganar | perder" }`; el visor lista el trait y, debajo, sus componentes.
- **[SUPUESTO]** Ganar un trait da todos sus componentes a la vez y el motor no les cobra puntos ni slots por separado.
- **[DIFERIDO]** Si los componentes de un trait ocupan slots de feats o puntos de méritos, quién otorga los traits (¿la raza?), cuándo se ganan y cuáles existen.

### 6.4 Achievement feats

- Se ganan por logros de la historia.
- **Regla: máximo 1 achievement feat por nivel de personaje.** Se registra el nivel en que se ganó; una segunda ganancia en el mismo nivel es un error de validación.
- **[SUPUESTO]** "Por nivel" significa por cada nivel del personaje: si ganó uno siendo nivel 7, el siguiente solo puede ganarse a partir del nivel 8.
- Un achievement puede otorgar fate (sección 4.4). `data/achievements.json` puede traer un `fate` por defecto en cada achievement; la entrada del registro lo toma de ahí o fija otro valor con su propio `fate`.
- Desde la v0.8 el visor lista el catálogo en un recuadro con scroll y buscador, y «Asignar» suma el achievement al borrador (10.5). Se deshabilita si el nivel ya tiene su achievement o si ya se ganó.
- **[PENDIENTE]** Lista de achievement feats, condiciones de cada uno y sus efectos. El catálogo trae 12 entradas de ejemplo (`fuente: "ejemplo"`) para probar la lista.

### 6.5 Habilidades de clase por nivel (v0.8.1) [DECIDIDO la dirección; sin implementar]

Como el sistema es Pathfinder, cada clase da **habilidades por nivel**. El visor las muestra con un **tooltip** que trae el detalle de cada una.

- **Se carga solo la clase en uso.** Cada clase vive en su propio archivo, `data/clases/<id>.json`; el visor pide solo el de la clase del personaje (y el archivo único incluye solo las clases de los personajes que empaqueta). `data/classes.json` sigue siendo el índice de las 37 clases con su ataque base.
- Una habilidad tiene `nivel`, `nombre`, `ejecucion` (`pasivo` o `activo`) y `detalle` (el texto del tooltip). La lista del personaje es la de los niveles que ya alcanzó, y se ve igual que los feats: los pasivos en una lista corta y los activos en tarjetas.
- La clase también anota, si lanza conjuros, su lista y sus escuelas permitidas y prohibidas (4.2).
- **[SUPUESTO]** Las habilidades de clase de Pathfinder que dan feats extra (Bonus Feat del luchador) **no suman slots**: los slots de feats están decididos sin extras por clase (6.1).
- **[PENDIENTE]** De dónde salen las habilidades de las 37 clases y su texto. El nombre y el nivel son datos de reglas; el texto del detalle es contenido de Paizo y sigue la regla de 15 (OGL y avisos pendientes). Alternativa: resúmenes propios, o solo enlace a Archives of Nethys, y escribir con texto completo únicamente las clases que se usen.

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
  "cargas": { "max": 3, "recarga": "diaria" },
  "habilidades": [ ]
}
```

- Los objetos mágicos pueden tener cargas y habilidades; el registro por sesión anota usos, recargas y cambios. Las cargas actuales no se guardan en el catálogo: se derivan del registro (parten en `max`, `usar-carga` resta 1 y `recargar` vuelve a `max`).
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
  "raza": "slug-de-raza",
  "imagen": "retratos/slug.png",
  "atributos": { "STR": 17, "DEX": 13, "PER": 12, "INT": 10, "WIS": 12, "CHA": 8 },
  "sesiones": [
    {
      "id": "2026-11-06-01",
      "fecha": "2026-11-06",
      "titulo": "Título de la sesión",
      "notas": "",
      "entradas": [
        { "tipo": "xp", "tags": [ { "id": "close-quarter-combat", "grado": "heroico" }, { "id": "stealth", "grado": "cumple", "pct": 0.30 } ], "nivelContenido": 9, "cantidad": 1, "nota": "" },
        { "tipo": "xp-subsistema", "subsistema": "zeo", "rama": "heaven", "cantidad": 10 },
        { "tipo": "xp-subsistema", "subsistema": "mana", "cantidad": 250 },
        { "tipo": "zeo-linea", "linea": "L01", "niveles": 2 },
        { "tipo": "feat", "id": "power-attack" },
        { "tipo": "feat", "id": "weapon-focus", "eleccion": "espada larga" },
        { "tipo": "achievement", "id": "slug", "fate": 1 },
        { "tipo": "tirada", "recurso": "hp", "dado": "d10", "resultado": 7 },
        { "tipo": "fate", "cantidad": -1, "motivo": "gasto" },
        { "tipo": "rasgo", "id": "slug", "accion": "ganar | perder" },
        { "tipo": "trait", "id": "slug", "accion": "ganar | perder" },
        { "tipo": "objeto", "id": "slug", "accion": "equipar | desequipar | usar-carga | recargar", "extremidad": "mano-izquierda" },
        { "tipo": "ajuste", "campo": "xp", "cantidad": -100, "motivo": "..." }
      ]
    }
  ]
}
```

Reglas:

1. Las entradas de XP guardan sus **datos de entrada** (tags con su grado, nivel de contenido, cantidad de criaturas o de eventos), no solo el resultado. Al cambiar una tabla o un multiplicador, el historial se recalcula.
2. El nivel nunca se registra: siempre se deriva de la XP.
3. Cada sesión muestra un resumen: XP ganada, nivel antes y después, y feats, achievements, fate y rasgos ganados.
4. Validaciones al reproducir el registro:
   - achievement feats: máximo 1 por nivel;
   - `xp-subsistema` solo para zeo y mana; para zeo exige `rama` (`heaven`, `void` o `earth`);
   - los seis atributos base existen y no se escriben CON, SPR ni MND (1.1);
   - `tirada`: `recurso` hp o mp, `dado` con la forma `dN`, `resultado` entre 1 y N, un nivel ya alcanzado y sin tirada previa del mismo recurso;
   - `zeo-linea` solo con líneas existentes; los pisos 4 y 5 de una línea solo se usan con 10 y 20 niveles acumulados en ella;
   - `pct` de un grado `cumple` entre 0.25 y 0.30;
   - un racial solo lo puede tener un personaje de la raza a la que pertenece;
   - los feats cumplen sus requisitos estructurados en el momento de ganarlos (atributos, ataque base, nivel y feats previos) y no superan los slots del nivel (1 en el nivel 1, uno más cada 2 niveles);
   - un `trait` solo se gana si existe en `data/traits.json` y todos sus componentes (feats o méritos) existen en el catálogo;
   - todo tag de una entrada `xp` existe en `data/xp-config.json`;
   - límites de equipo (1 armadura, 1 arma, 3 objetos) y un solo objeto por extremidad;
   - saldo de puntos de méritos y defectos no negativo;
   - saldo de fate no negativo;
   - nivel máximo 20.
5. Los ajustes manuales exigen un motivo.

`imagen` (opcional) es el retrato: una ruta relativa a `characters/` (el visor la lee de ahí y `scripts/build-standalone.js` la convierte en un `data:` URI), un `data:` URI o una URL. En el visor también se puede elegir un retrato local con «Cambiar retrato» (se recorta a 4:5 y se guarda solo en ese navegador, y gana al del archivo).

Persistencia v0: un archivo JSON por personaje (`characters/<id>.json`) que se exporta e importa desde el navegador; el historial de Git sirve de auditoría. Se usa `localStorage` solo como borrador. El visor (sección 10) lee esos mismos archivos.

---

## 9. Datos y homebrew

Estructura propuesta:

```
data/
  xp-config.json            # fórmula, base, multiplicadores, grados y tags de actividad (ya creado)
  classes.json              # clases de Pathfinder 1e con su progresión de ataque base (importado)
  razas.json                # perfiles raciales: atributos preferidos, racials, descuentos
  feats.pf1.json            # importado: 665 feats, sin texto de beneficios
  feats.homebrew.json
  feats.conversiones.json   # decisiones del diseñador sobre feats: activos → habilidades tipo conjuro, resúmenes propios
  meritos.json              # méritos y defectos (incluye los raciales)
  traits.json               # traits (feats mayores): colecciones de ventajas o feats
  items.json
  achievements.json
  zeo.json                  # tabla de sx, ramas, pisos y desbloqueos (ya creado)
  vitalidad.json            # fatiga, estados DOWN/K.O./Deadly y descansos (v0.8.2, ya creado)
  mana-tags.json            # a futuro: ~200 tags de Gates y sus pares incompatibles (4.1.2)
  subsystems.json           # mana (tabla de XP propia, pendiente)
characters/
  <id>.json
  ejemplo.json              # personaje de ejemplo (ya creado)
  retratos/                 # imágenes de los personajes (ruta en el campo `imagen`)
```

- Cada registro tiene `id` estable (slug) y `fuente` (`pf1` | `homebrew`).
- Un **validador** (script de Node) comprueba referencias entre archivos, requisitos de feats y la consistencia de cada personaje. Se ejecuta en GitHub Actions en cada push.
- Importadores (v0.7): `scripts/import-classes.js` lee `data/classes.js` de pixelkeep/pathfinder1e-sheet (37 clases) y `scripts/import-feats.js` lee `src/db/feats.csv` de awesomeSheet (1,478 filas). Ninguno de los dos orígenes vive en este repo: se pasan como argumento. Detalles, alcance y estado de licencias en `docs/FUENTES.md`.
- **[PENDIENTE]** Texto de los feats: no se copia hasta incluir el texto completo de la OGL 1.0a y los avisos de copyright (sección 15) de cada libro. Mientras tanto el visor enlaza a Archives of Nethys.
- Opcional: autoría de homebrew en CSV con conversor y validador, igual que el flujo que ya existe en el feat builder de Spiral.

---

## 10. Visor de personajes

**[DECIDIDO]** Se necesita un visor. **Objetivo:** una página de solo lectura, simple y visualmente atractiva, que muestre un personaje a partir de `characters/<id>.json`. Se publica con GitHub Pages.

Contenido mínimo:

- Nombre, raza, clase, nivel y barra de progreso al siguiente nivel.
- Atributos y estadísticas derivadas.
- XP y nivel de zeo y de mana; fate disponible.
- Feats (activos y disponibles), habilidades tipo conjuro, achievement feats.
- Méritos y defectos (con los racials) y el saldo de puntos.
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

**[SUPUESTO]** Construir el visor dentro de este repo, como página estática que lee los JSON del propio tracker. Así el diseño se adapta a los datos del sistema (zeo, mana, fate, méritos, extremidades) en lugar de adaptar los datos a una hoja de D&D. La maqueta de 10.3 ocupa el lugar de una referencia visual hasta que el diseñador la revise.

### 10.3 Maqueta

Hay una maqueta visual con datos de ejemplo, construida sobre `characters/ejemplo.json` (un personaje de nivel 7 con 6 sesiones). Todos los números de la maqueta salen de la fórmula de la sección 3 y de `data/zeo.json`; los nombres de razas, méritos, objetos y logros son inventados. Muestra:

- nivel, progreso al siguiente nivel y XP;
- zeo con sus tres ramas, el nivel zeo como el menor de las tres y las 10 líneas de técnica con sus pisos;
- mana (su tabla está pendiente) y fate;
- méritos y defectos con el saldo de puntos, y el racial con el descuento de perfil de ejemplo;
- equipo por extremidad, con cargas, y la armadura aparte;
- feats con los slots usados y las habilidades tipo conjuro;
- la línea de tiempo de sesiones.

---

### 10.4 Visor funcionando (v0.6)

El visor de solo lectura ya existe en `viewer/` y se construye dentro del repo (decisión de 10.2 aplicada):

- `src/core.js` reproduce el registro y devuelve el estado derivado; `viewer/app.js` lo dibuja con el diseño de la maqueta, en tema claro y oscuro, y se lee bien en el celular.
- Lee `data/*.json` y `characters/index.json` con `fetch`, así que se sirve desde la raíz del repo (o desde GitHub Pages); `scripts/build-standalone.js` lo empaqueta en un solo HTML.
- Permite abrir otro personaje desde un archivo `.json`. Las entradas del registro que rompen una regla (tag inexistente, achievement repetido en un nivel, equipo fuera de los límites, saldo negativo, etc.) se listan como avisos y no se aplican.
- De los requisitos de un feat, el motor evalúa atributos, ataque base (según la clase), nivel de personaje, nivel de clase y feats previos; lo demás queda como «sin verificar» (ver 6.1).
- **[SUPUESTO]** El nivel para Δ se evalúa por entrada, en el orden del registro; el saldo de puntos y de fate se comprueba al cierre de cada sesión; los puntos iniciales se calculan con el nivel al cierre de la primera sesión.
- No importa pixelkeep: el visor no edita. La importación de pixelkeep (M0) queda para el editor.

### 10.5 Ficha, secciones plegadas y selectores (v0.7, ajustada en v0.8) [DECIDIDO]

**Distribución de la página** (v0.8). Solo tres cosas están siempre a la vista; todo lo demás está plegado al abrir:

1. **La base** (tarjeta de ficha): retrato, nombre, clase y raza, nivel y barra de XP, y HP y MP con sus barras y botones de ajuste. En pantalla ancha va en tres columnas (retrato · nombre y nivel · HP y MP); en pantalla media el retrato y el nombre arriba y HP y MP debajo; en el celular se apila.
2. **Los atributos**: los seis base en una fila (tres por fila en pantallas angostas) y, debajo, los tres derivados como **mini tarjetas en una sola línea** (valor, modificador y «→ HP» o «→ MP»; la fórmula, en el tooltip). HP y MP citan su atributo: «dado + CON 13 (+1)».
3. **El registro de sesiones** (los «logs»), al final.

Entre la ficha y el registro hay secciones plegables, todas cerradas la primera vez (el estado se recuerda en el navegador). **En Construir**: Borrador, **Feats**, **Achievements y fate**, **Equipo**, **Méritos y defectos** (un solo desplegable desde la v0.8.2), **Tiradas de HP y MP**, **Zeo**, **Mana** y **Magia**. **En Jugar**: Feats, Equipo y Méritos y defectos son tarjetas siempre visibles (abajo), y quedan plegadas solo **Achievements y fate**, **Zeo**, **Mana** y **Magia**. Cada cabecera muestra la cifra que importa (slots, fate, saldo de puntos, HP y MP máximos, nivel zeo, mana…).

**Listas de una línea con tooltip (v0.8.2) [DECIDIDO].** Los feats pasivos, el equipo y los méritos y defectos comparten el mismo formato en Jugar: una fila de aproximadamente una línea por elemento, con el nombre subrayado con puntos y **el detalle en un tooltip**. El tooltip sale con el cursor, con el foco del teclado (Tab) y con un toque, se cierra con Esc o al tocar fuera, y se recoloca para no salirse de la pantalla. Equipo muestra la armadura y cada extremidad con el tipo de objeto y las cargas (`9/10`); Méritos y defectos muestra primero los méritos y después los defectos en una misma lista, con su valor a la derecha (`−3` un mérito que cuesta, `+2` un defecto que aporta), y debajo los traits. El saldo (`Iniciales 4 + defectos 3 − méritos 5 = 2`) es un chip con el desglose en el tooltip. Las dos tarjetas van una junto a la otra en pantalla ancha.

**Retrato.** Si el personaje trae `imagen` se muestra en el marco 4:5; si no, aparece un marco con las iniciales. En Construir, «Cambiar retrato» elige una imagen local (solo en ese navegador) y «Quitar» la descarta.

**Vistas.** Un botón en la cabecera (la última elegida se recuerda):

- **Jugar**: la versión reducida para la mesa. Misma ficha, y HP suma **fatiga, estados y marcas de umbral**, y la ficha suma **Recuperación** con los botones de descanso corto y largo (1.2). **Feats no es un desplegable**: es una tarjeta siempre visible con los feats **pasivos como una lista de una línea con tooltip** (nombre y enlace) y **una tarjeta solo para cada habilidad activa** (los feats activos reclasificados, 6.2); debajo van Equipo y Méritos y defectos con el mismo formato. Sin selectores, sin borrador y **sin las tiradas de HP y MP**.
- **Construir**: agrega los selectores, el borrador, las explicaciones de las reglas y la construcción de HP y MP (**Tiradas de HP y MP**, que ya no aparece en Jugar). No muestra fatiga ni recuperación: son de la mesa.

**Selector de feats** (dentro de Feats, vista Construir):

1. Búsqueda por nombre, filtro por tipo y «solo los que puedo tomar». La lista está en un recuadro con scroll propio (alto máximo de unos 440 px).
2. Cada feat muestra sus requisitos como chips: «✓» se cumple, «✗» no se cumple y «?» el visor no lo puede comprobar. «Elegir» se habilita solo si se cumplen los requisitos comprobables y hay un slot libre; los feats repetibles piden una elección.

**Achievements** (dentro de Achievements y fate, vista Construir): el catálogo completo con buscador y recuadro con scroll; cada fila muestra su fate y un botón «Asignar», que se deshabilita si el nivel ya tiene achievement (con un aviso que explica por qué) o si ya está ganado.

**Tiradas de HP y MP** (solo vista Construir): lista las tiradas por nivel (dado, resultado, modificador y total) y, si faltan niveles, ofrece elegir el dado y **Tirar** (el visor tira por ti) o escribir el resultado de tus dados y **Registrar**.

**Borrador.** Todo lo que se elige, asigna o tira va a un borrador: una sesión provisional que el motor calcula como si ya estuviera en el personaje (slots, requisitos, máximo por nivel, fate). Cada acción muestra un aviso flotante con un acceso directo a «Ver borrador». Se puede quitar cualquier entrada; si una entrada deja de ser válida se marca con su error. El borrador se copia como JSON y se pega en la lista `entradas` de una sesión de `characters/<id>.json`. **El visor no escribe en los personajes**: el borrador solo vive en el navegador (`localStorage`), por personaje.

**Añadir y quitar en Construir [PROPUESTA].** El registro es de solo añadir, así que *añadir* es crear una entrada en el borrador (hoy: feats, achievements y tiradas; a futuro: objetos, méritos, Gates y MF con el mismo patrón de tarjeta) y *quitar* es sacarla del borrador, o añadir la entrada compensatoria (`perder`, `desequipar`). **El JSON sigue siendo la fuente de verdad** y es el camino para corregir el historial; las tarjetas son una comodidad para armar entradas válidas sin escribir JSON a mano. Mientras no se elija cómo guardar (10.6), el paso del borrador al archivo sigue siendo copiar y pegar.

**Zeo, Mana y Magia** se pliegan igual que el resto. **Magia** lista las habilidades tipo conjuro (los feats activos convertidos, 6.2) con el costo en mana marcado como pendiente.

### 10.6 Notas de jugadores y del GM, y guardado simultáneo [PENDIENTE decidir el almacenamiento]

**Necesidad (dicha por el diseñador):** cada jugador toma notas, el GM también, y después el GM arma un resumen de la sesión a partir de las notas.

**Diseño propuesto:**

- Cada autor (jugador o GM) escribe **solo en sus propias notas**. Hay un archivo de notas por autor y personaje o campaña:

```json
{
  "autor": "ana",
  "rol": "jugador | gm",
  "notas": [
    { "sesion": "2026-11-06-01", "fecha": "2026-11-06", "texto": "..." }
  ]
}
```

- Las notas son **material de trabajo, no fuente de verdad**. La contabilidad (XP, feats, objetos) sigue en el registro de la sesión (sección 8), y la escribe una sola persona: el GM.
- El **resumen** lo arma el GM leyendo las notas de todos y se guarda dentro de la sesión, en su campo `notas` (el motor y el visor ya lo conservan). Así el resumen queda versionado con el resto del registro.
- Una sesión puede referirse a las notas por su `id`, de modo que cada nota sabe a qué sesión pertenece aunque se escriba antes de cerrarla.

**¿Pueden guardar cambios simultáneamente si cada jugador tiene el visor abierto?** Con la arquitectura actual, **no hay un almacenamiento compartido**: el visor es una página estática y cada navegador solo ve lo suyo. Cada uno puede guardar a la vez sin pisar a nadie, porque cada autor toca únicamente su archivo y el registro lo toca solo el GM; pero nadie ve en vivo lo que escribe otro, y las notas llegan al GM por un paso explícito. Para ver y editar en vivo en común hace falta un almacenamiento compartido. Opciones:

| Opción | Cómo llegan las notas al GM | Costo | En vivo |
|---|---|---|---|
| A. Exportar e importar archivos | Cada jugador exporta su archivo de notas y se lo pasa al GM, que lo abre en el visor | Ninguno; el visor ya abre archivos `.json` | No |
| B. Git | Cada jugador sube su archivo al repo (commit directo o PR); el GM junta y resume | Cuenta de GitHub por jugador y un poco de práctica con Git | No (cada subida es un paso) |
| C. Base de datos compartida | Todos escriben en la misma base; el GM ve todo y arma el resumen | Un backend (por ejemplo Firebase o Supabase), o la base compartida que pueden tener los Artifacts de claude.ai; esta última exige que cada jugador abra el visor con acceso a claude.ai y **no se ha comprobado** para esta cuenta | Sí |

**[PENDIENTE]** Elegir A, B o C. Recomendación para empezar: A (no cuesta nada y el modelo por autor ya evita los conflictos); pasar a C solo si hace falta ver las notas en vivo.

## 11. Hitos

Estado en v0.8.2: el motor (M1) y el visor (M2) están implementados y probados localmente (48 pruebas); M3 está avanzado (catálogo de 665 feats con requisitos estructurados, achievement feats y conversión de activos; faltan revisar los candidatos a activo y los efectos). Falta activar GitHub Pages. M0 (importar pixelkeep) sigue pendiente.

| Hito | Contenido | Criterio de aceptación |
|---|---|---|
| M0 | Importar la base, reemplazar la raza de Pathfinder, leer `xp-config.json` con la curva de 1000 por nivel | XP 0 → nivel 1; 14,000 → nivel 15; 15,000 → nivel 16 |
| M1 | Registro por sesión, fórmula de XP con Δ, tags y grados, resumen por sesión | Cambiar un multiplicador recalcula todo el historial; Δ = −3 da 1 XP y Δ = −4 da 0 |
| M2 | Visor de solo lectura en GitHub Pages | Abrir `characters/<id>.json` muestra nivel, progreso y línea de tiempo de sesiones |
| M3 | Feats estructurados, activos → habilidades tipo conjuro, achievement feats | Un segundo achievement en el mismo nivel es rechazado |
| M4 | Equipo con límites, extremidades y cargas | No se puede equipar un segundo arma, un cuarto objeto ni dos objetos en la misma extremidad |
| M5 | Méritos y defectos, razas con racials exclusivos, zeo y mana, achievement y fate | Un mérito heroico exige 10 puntos; un racial de otra raza es rechazado; zeo y mana llevan XP y nivel independientes; un achievement puede dar fate |
| M6 | Pipeline de homebrew, validador y CI | Un push con una referencia rota falla el CI |

---

## 12. Casos de prueba

### XP

Personaje de nivel 7, `base = 40`, todos los tags en 1.0, grado `heroico` (100%):

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

Grados de tag (nivel 7 contra contenido de nivel 7, base 40):

| Entrada | XP |
|---|---|
| `stealth` en `cumple` (0.25) | 10 |
| `stealth` en `cumple` con `pct` 0.30 | 12 |
| `stealth` en `cumple` con `pct` 0.35 | rechazado |
| `stealth` en `heroico` | 40 |
| `close-quarter-combat` en `cumple` y `stealth` en `heroico` (regla `max`) | 40 |

### Zeo (lectura `umbral-acumulado`)

| sx de la rama | Nivel de la rama |
|---|---|
| 0 | 1 |
| 9 | 1 |
| 10 | 2 |
| 20 | 3 |
| 30 | 4 |
| 49 | 4 |
| 50 | 5 |
| 80 o más | 5 |

- Nivel zeo: heaven 34 sx (nivel 4), void 22 sx (nivel 3), earth 15 sx (nivel 2) → nivel zeo 2, el menor de los tres.
- Pisos de una línea: con 9 niveles acumulados el piso 4 sigue cerrado; con 10 se abre; con 19 el piso 5 sigue cerrado; con 20 se abre.

### Atributos derivados, HP y MP

- STR 17, DEX 13, PER 12, INT 10, WIS 12, CHA 8: CON 13, SPR 8, MND 10 (modificadores +1, −1 y 0).
- Un JSON que escribe CON, o que no trae PER: error de atributos.
- Un feat que exige CON 14 con STR 17 y DEX 13: rechazado; con CON 13: aceptado.
- Nivel 3, CON 13 (+1) y SPR 8 (−1): HP con d10 = 7, 1 y 10 da 8 + 2 + 11 = 21; MP con d6 = 4, 1 y 6 da 3 + 1 (mínimo) + 5 = 9.
- Una tirada de 9 con d8, un dado `8`, un dado `d1`, un nivel aún no alcanzado o un nivel repetido: rechazada.
- Niveles sin tirada: aviso, no error.

### HP actual: fatiga, estados y descansos (v0.8.2)

- Máximo 56: HP 29 → sin fatiga; 28 → −2; 15 → −2; 14 → −6; 6 → −6; 5 → −10.
- Máximo 56: HP 1 → sin estado; 0 y −13 → DOWN; −14 y −27 → K.O.; −28 y −56 → Deadly. En DOWN la fatiga sigue en −10.
- Máximo 10: K.O. empieza en −3 (−25 % son −2,5) y Deadly en −5.
- Sin máximo de HP (aún sin tiradas): ni fatiga ni estado.
- Nivel 7 y CON 13 (+1): descanso largo = 14 HP, corto = 3 HP. Con CON 6 (modificador −3, el bono no baja de 0): largo = 7 HP. Nivel 1 con CON 10: el corto sale 0 y se sube al mínimo de 1.
- Con `bonoCuerpo.porNivel: false`: nivel 7 y CON 13 dan 8 HP en el largo.
- Un descanso que no existe en `data/vitalidad.json`: error.

### Mana: Gates y slots (casos esperados, sin implementar)

- Dos Gates cuyos tags no figuran como incompatibles en la tabla conectan siempre (3 Gates sin incompatibilidades: 7 slots).

| Gates | Pares sin conexión | Nodos | Círculos | Slots |
|---|---|---|---|---|
| 1 | — | 0 | 0 | 1 |
| 2 | 0 | 1 | 0 | 3 |
| 2 | 1 | 0 | 0 | 2 |
| 3 | 0 | 3 | 1 | 7 |
| 3 | 1 | 2 | 0 | 5 |
| 4 | 0 | 6 | 4 | 14 |
| Mana force | 1 | 2 | 4 | 8 |
| Gates que permite (**[SUPUESTO]**) | 1 | 2 | 3 | 4 |

### Puntos de méritos y slots de feats

| Nivel | Puntos iniciales `floor(n/2)+1` | Slots de feats (1 en el nivel 1, +1 cada 2 niveles) |
|---|---|---|
| 1 | 1 | 1 |
| 2 | 2 | 1 |
| 3 | 2 | 2 |
| 5 | 3 | 3 |
| 7 | 4 | 4 |
| 9 | 5 | 5 |
| 15 | 8 | 8 |
| 20 | 11 | 10 |

### Equipo

- Equipar un arma y 3 objetos en 4 extremidades distintas: válido.
- Equipar un segundo objeto en una extremidad ocupada: rechazado.
- Equipar una armadura con todas las extremidades ocupadas: válido (la armadura no usa extremidad).

### Racials

- Un personaje de la raza A toma un racial de la raza B: rechazado.
- Un personaje de la raza A toma un racial de la raza A: válido; el costo baja según la rareza si tiene el perfil racial.

---

## 13. Lista de pendientes

1. Valor de un dungeon o una misión completos (tabla de criatura según su nivel, o escala por tamaño). La base 40 está decidida como valor inicial; calibrarla con las sesiones por nivel es **[DIFERIDO]**.
2. **[DIFERIDO]** Tags de combate: la lista completa (hoy `close-quarter-combat` y `combat-healer`), qué valor entre 25% y 30% usar por defecto en `cumple`, y el multiplicador propio de cada tag.
3. Zeo: confirmar la lectura de la tabla de sx, a qué rama pertenece cada línea o técnica, cómo se ganan los niveles de técnica y los sx, y la lista de las 10 líneas base. Mana: su tabla de XP.
4. Mana: ya no es un atributo que se gasta sino la serie de Gates (4.1.2). Queda el costo en SX, la contabilidad de MF y las reglas de nodos y círculos.
5. Fate y achievement: cuánto fate da cada achievement, tope y en qué se gasta.
6. Méritos y defectos: significado exacto de los puntos iniciales, costo de los méritos comunes, valor de cada defecto, tope de defectos y si la rareza cambia el costo.
7. Razas: lista de razas, sus atributos preferidos, sus racials, cuánto descuenta cada rareza y qué cuenta como tener el perfil racial.
8. **[DIFERIDO]** Traits (feats mayores): si sus componentes ocupan slots y puntos, quién los otorga y cuáles existen. Ya se sabe que son ilimitados por personaje.
9. Habilidades tipo conjuro: criterio y lista de feats convertidos y cómo se aprenden.
10. Lista y condiciones de los achievement feats. Los slots de feats están **[DECIDIDO]**: 1 en el nivel 1 y uno más cada 2 niveles, sin extras por clase.
11. Extremidades de un personaje por defecto, armas a dos manos y escudos.
12. Revisar la maqueta del visor (sección 10.3) y confirmar que se construye dentro del repo.
13. XP sobre 20,000, redondeo, evaluación del nivel por entrada o por sesión, y reparto de XP en grupo.
14. Alcance de estadísticas derivadas: HP y MP ya están (1.1); faltan skills y hechizos.
15. **[PENDIENTE]** Texto de los feats: incluir la OGL 1.0a completa y los avisos de la sección 15 de cada libro antes de copiar los beneficios, o escribir resúmenes propios en `data/feats.conversiones.json`.
16. Revisar los 173 feats marcados `candidatoActivo` y decidir cuáles pasan a habilidad tipo conjuro (6.2).
17. Feats repetibles: decidir si la elección (arma, escuela) debe exigirse siempre y si un requisito "con el arma elegida" debe comprobarse.
18. Otros libros de feats (fuera de Core, APG, Ultimate Magic y Ultimate Combat), y qué hacer con los feats raciales de Pathfinder.
19. Notas de jugadores y del GM: elegir cómo se guardan y comparten (10.6, opciones A, B o C).
20. Clases: el catálogo trae las 37 clases de Pathfinder 1e con su progresión de ataque base; decidir cuáles se permiten en el sistema y si hay clases propias.
21. HP y MP: dado de cada clase para HP y para MP, relación del MP con el mana ganado, si MND tiene efecto y si el HP y el MP actuales deben entrar al registro (1.1).
22. Achievements: sustituir las 12 entradas de ejemplo por la lista real, con su fate y sus condiciones.
23. Mana por Gates: contenido de la tabla de compatibilidad (~200 tags y sus pares incompatibles), SX por Gate, fuentes de MF y su valor, y qué hace cada función (4.1.2). Ya está decidido que nodos y círculos son aditivos y que los Gates conectan por defecto salvo incompatibilidad.
24. Magia: sistema y edición del catálogo de conjuros, origen de los datos y escuelas por clase (4.2).
25. Habilidades de clase: origen del dato y del texto de cada habilidad de las 37 clases; qué clases se permiten (6.5).
26. Fatiga y recuperación (1.2): a qué se aplica el penalizador de fatiga, qué significan DOWN, K.O. y Deadly en la mesa, el valor del descanso corto (Pathfinder 1e no lo tiene) y del bono de cuerpo (hoy: modificador de CON por nivel), si el descanso recupera MP, y si hay un tope de descansos cortos.

---

## Cambios respecto a versiones anteriores

### v0.8.2

- **Fatiga y estados [DECIDIDO]:** penalizador acumulativo según el HP actual (≤ 50 %: −2; ≤ 25 %: −6 en total; ≤ 10 %: −10 en total) y estados DOWN (HP ≤ 0), K.O. (≤ −25 % del máximo) y Deadly (≤ −50 %). El HP actual puede bajar hasta −máximo. Nueva sección 1.2.
- **Recuperación [DECIDIDO que existe; las cifras son SUPUESTO]:** descanso corto (2 h) y largo (8 h) con el valor de Pathfinder 1e (1 HP por nivel en 8 h) más un bono de cuerpo. Pathfinder 1e no tiene descanso corto ni usa CON, así que el corto es proporcional (2/8) y el bono es el modificador de CON por nivel. No recupera MP. Todo está en `data/vitalidad.json`, y el motor expone `umbralesVitales`, `estadoVital` y `curacionDescanso`.
- **Gates [DECIDIDO]:** dos Gates **siempre conectan** salvo incompatibilidad; la tabla de compatibilidad entre tags (~200 tags) lista solo los pares incompatibles, y el jugador maneja un puñado. Archivo propuesto `data/mana-tags.json`. Sin implementar.
- **Visor, vista Jugar:** Equipo y **Méritos y defectos** pasan a tarjetas con listas de una línea y tooltip, igual que los feats pasivos; Méritos y Defectos son un solo bloque (también un solo desplegable en Construir); **las tiradas de HP y MP quedan solo en Construir**; HP muestra fatiga, estado y marcas de umbral, y la ficha suma Recuperación. Nuevo componente de tooltip con cursor, teclado y toque.
- 48 pruebas del motor (antes 41): umbrales, fatiga, estados, descansos y consistencia de `data/vitalidad.json`.

### v0.8.1

- **Mana por Gates, modelo de grafo [DECIDIDO]:** los Gates son nodos equidistantes de un grafo; los nodos (pares que conectan) y los círculos (tríos con sus tres pares conectados) **suman** slots y no consumen Gates; 3 Gates conectados dan 7 slots; los pares que no conectan restan slots; la función es solo del Gate y los tags se heredan. Nodos y círculos se derivan, no son entradas del registro.

- **Vista Jugar:** Feats deja de ser un desplegable: lista corta de pasivos y una tarjeta solo por cada habilidad activa. Los atributos derivados pasan a una línea de mini tarjetas con su referencia a HP y MP, y HP y MP citan su atributo con el valor (`recursos.*.valor`).
- **Diseño nuevo, sin implementar:** Mana como serie de poderes por Gates con Mana force (4.1.2, reemplaza el «mana ganado» y el supuesto del atributo que se gasta), Magia con catálogo de conjuros y escuelas por clase (4.2), habilidades de clase por nivel con tooltip y carga de una sola clase (6.5), y la respuesta sobre añadir y quitar en Construir (10.5).

### v0.8

- **Atributos [DECIDIDO]:** los base son STR, DEX, PER, INT, WIS y CHA. CON se deriva como el menor de STR y DEX, SPR (bonifica el mana) como el menor de WIS y CHA, y MND como el menor de PER e INT. El JSON del personaje solo trae los seis base; el motor avisa si trae un derivado o si falta uno. `data/razas.json` y el personaje de ejemplo migrados (preferidos STR y DEX; el ejemplo suma PER 12). Nueva sección 1.1.
- **HP y MP [DECIDIDO que se tiran con dados]:** nueva entrada `tirada` del registro (`recurso`, `dado`, `resultado`, `nivel` opcional); cada nivel suma `max(1, resultado + modificador)` (CON para HP, SPR para MP); el motor devuelve `recursos.hp` y `recursos.mp` con el detalle por nivel y los niveles pendientes. El ejemplo trae sus 14 tiradas (HP 56, MP 20). Los supuestos y lo pendiente (dado por clase, relación con el mana ganado) están en 1.1.
- **Visor:** ficha nueva con retrato (campo `imagen` o retrato local), nivel y XP, HP y MP con barras y ajuste manual, y los nueve atributos; **Feats, Achievements y fate, Equipo, Méritos, Defectos, Tiradas, Zeo, Mana y Magia plegados al abrir**, con el registro de sesiones siempre visible (10.5). Méritos y defectos son ahora dos secciones.
- **Achievements asignables:** el catálogo se lista en un recuadro con scroll y buscador, con «Asignar» que suma al borrador; el catálogo admite `fate` por defecto y trae 12 entradas de ejemplo. El selector de feats pasa a vivir dentro de Feats, también con scroll propio.
- **Borrador generalizado:** admite feats, achievements y tiradas; avisos flotantes con acceso a «Ver borrador»; la posición de la página y de las listas se conserva al agregar.
- `scripts/build-standalone.js` convierte la ruta de `imagen` en un `data:` URI. Nuevo `characters/retratos/ejemplo.svg`.
- 41 pruebas del motor (antes 32): atributos derivados, requisitos con CON derivado, tiradas de HP y MP, achievements y retrato.

### v0.7

- **Slots de feats [DECIDIDO]:** 1 en el nivel 1 y uno más cada 2 niveles (4 en el nivel 7), sin feats extra por clase. Ya no es un supuesto.
- Catálogo de Pathfinder 1e cargado: `data/feats.pf1.json` (665 feats de Core, APG, Ultimate Magic y Ultimate Combat, sin texto de beneficios) y `data/classes.json` (37 clases con progresión de ataque base), generados por `scripts/import-feats.js` y `scripts/import-classes.js`. Nuevo `docs/FUENTES.md` con orígenes, alcance y estado de licencias.
- Requisitos de feats evaluados por el motor: atributos, ataque base según la clase, `babAlt`, nivel de personaje, nivel de clase y feats previos; el resto queda como «sin verificar». Feats repetibles con `eleccion`. Nuevo `data/feats.conversiones.json` (decisiones del diseñador sobre feats, aplicadas al cargar). El personaje de ejemplo usa ahora `weapon-focus` con `eleccion: "espada larga"`.
- Visor: Zeo, Mana y Magia plegables; vistas Jugar y Construir; selector de feats con borrador copiable (10.5).
- Notas de jugadores y del GM, y respuesta sobre el guardado simultáneo (10.6); el almacenamiento queda **[PENDIENTE]**.
- 32 pruebas del motor (antes 24).

### v0.6

- Un feat mayor se llama **trait** y es una colección de ventajas o feats. Nueva sección 6.3, archivo `data/traits.json` y entrada `trait` en el registro. El catálogo de méritos y defectos pasa a `data/meritos.json`.
- Los tags de combate son específicos y no globales: se elimina el tag `combat` y se añaden `close-quarter-combat` y `combat-healer`. Los grados (25–30% / 100%) aplican también al combate, por tag. `data/xp-config.json` pasa a 40 tags.
- El personaje de ejemplo usa `close-quarter-combat` (la XP no cambia).
- Motor de cálculo (`src/core.js`), pruebas y visor funcionando (`viewer/`), con el catálogo de ejemplo en `data/`.
- Decisiones de la tarde del 2026-11-07: la base de XP parte en 40 (calibrarla es secundario); los tags de combate y el diseño detallado de los traits quedan como pulido **[DIFERIDO]**; los traits son como feats de mayor calibre y un personaje puede tener un número ilimitado. Nueva marca **[DIFERIDO]** en la convención del documento.

### v0.5

- Zeo definido: unidad sx, tres ramas (heaven, void, earth), nivel zeo = el menor de las tres, tabla de sx de 5 niveles, 10 líneas de técnica base con pisos y desbloqueos a 10 y 20 niveles acumulados. Nuevo archivo `data/zeo.json` y sección 4.1.1.
- Registro por sesión: `xp-subsistema` de zeo exige `rama`; nueva entrada `zeo-linea`.
- Personaje de ejemplo `characters/ejemplo.json` y maqueta visual del visor (sección 10.3).
- Casos de prueba de zeo.

### v0.4

- Razas: se conservan como perfil racial. Cada raza marca con exclusividad sus racials, y los racials suelen costar menos, según su rareza, a quien tiene el perfil racial (atributos preferidos). Nueva sección 5.2 y archivo `data/razas.json`.
- Tags con grados: cumplir un tag da 25–30% de la XP y cumplirlo de manera heroica da 100%. `data/xp-config.json` incluye `gradosTag`.
- `zeo` no es el sistema Xeno.
- El visor es necesario (decidido).
- Nueva sección 3.5 con alternativas de tabla base (cambiar la base o la unidad) y 6.3 aclara qué es un feat mayor.

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
