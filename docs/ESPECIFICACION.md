# EverwhiteEmperor — Especificación del tracker de personajes (v0.9.12)

Estado: borrador del 2026-11-11. La v0.9.12 muestra las técnicas de Zeo como **chips de una línea con la descripción en un tooltip**. La v0.9.11 suma las descripciones de **Tracción de Ki, Meditación, Ocultar el Ki y Blank Mind** y reemplaza la de **Sense Burst**. La v0.9.10 carga las **descripciones de la línea Sentir el Ki** de Zeo (9 de 10 técnicas; falta Long Range Sense). La v0.9.9 trae las **notas, el resumen y las opciones por sesión** (10.6). La v0.9.8 cambia la **progresión de conjuros del mago a un nivel de conjuro nuevo cada 3 niveles** con las cantidades de la fila del nivel (4.2). La v0.9.6 **separa Magia de Estrella Mana**: Magia queda solo con conjuros (del manual o propios) y los **trucos por día se reducen a la mitad** (4 → 2); las técnicas pasan a **Estrella Mana**, un subsistema independiente de la progresión normal, igual que **Estrella Zeo**, con técnicas inscritas, activas y un **contenedor de SX** (Parallel World Casting); los Gates de Herb'Azzio quedan con función (Oro = Sentidos, Fuego = Capacidad) y *Heat Pulse* inscrito en el de Fuego; las tarjetas de conjuros por día se compactan y muestran los dos próximos niveles. La v0.9.5 añade los **conjuros** (del manual de Pathfinder 1e o propios, más técnicas activas y conjuros en aprendizaje; 4.2), que se inscriben en los slots de Mana, la **Mana force por nivel** (un contrato que crece con el nivel; 4.1.2), el **nivel de Mana** y Gates con función u oportunidad sin definir, y carga las tiradas reales de Musashi y el Mana de Herb'Azzio. La v0.9.4 **corrige el modelo de Zeo**: el nivel de una rama es la técnica de rango más alto de sus líneas activas, el nivel zeo es `(heaven + earth + void) / 3`, los sx 10/20/30/50/80 son el costo de una técnica de rango 1 a 5, hay **líneas por activar** (adquiridas y no pagadas; activarlas cuesta 10 + líneas activas + nivel zeo), el origen pasa a ser solo una nota del log y la cabecera de Zeo queda compacta. Además el personaje trae `habilidades` y un `tagXp` propio (1.3), y Musashi Nanaya queda cargado con su hoja. La v0.9.3 añade el **catálogo de técnicas de Zeo** (raíz, rama, mejoras por nivel y descripción; 4.1.1), las **líneas extra** (L11 en adelante, con origen) y líneas **desplegables** que muestran la técnica raíz. La v0.9.2 **revierte el desplazamiento C + 2 de la recuperación** (C vuelve a ser el bono) y deja el MP en **×5** (1.2), reduce la técnica inicial de cada línea de Zeo a **una sola** (4.1.1) y rehace la **progresión de conjuros del mago**: normal hasta el nivel 3 de conjuro y retrasada desde el 4 (4.2). La v0.9.1 pasó las líneas de Zeo a slots de 5 niveles con varias técnicas por nivel y puso las habilidades activas de clase en Magia. La v0.9.0 implementa las **habilidades de clase por nivel y los arquetipos** (6.5) solo para **Monk y Wizard**, añade el **alineamiento** (1.3) y dos personajes de muestra: **Musashi Nanaya** (monje asesino ninja, L.N) y **Herb'Azzio** (mago sin escuela, N.B), con feats extra a cambio de la escuela (6.1). La v0.8.6 **definió la recuperación de MP** con la misma fórmula (bono de SPR; ×10 entonces, ×5 desde la v0.9.2) y dejó solo **dos descansos**: corto de 2 h y largo de 8 h con **+50 %** (1.2). La v0.8.5 reemplaza la recuperación de 5e por **la fórmula del diseñador en HP por hora** (1.2): C es el bono de CON, el descanso cura R × horas y desaparecen los Dados de Golpe. La v0.8.4 hace que **el SX sea una reserva común de Zeo y Mana** (4.1.3), agrega al visor los **formularios para Gates y Mana force**, y registra como propuesta la **fórmula de recuperación por hora** del diseñador (1.2, pendiente de aclarar qué es C). La v0.8.3 cambia la recuperación a la regla de D&D 5e (la más generosa: descanso largo con todo el HP y Dados de Golpe en el corto, 1.2), difiere la recuperación de MP, e **implementa Mana por Gates** (4.1.2): Mana force, Gates con tag y función, grafo de slots (Gates, nodos y círculos), tabla de compatibilidad entre tags e inscripción de habilidades; todas las cifras de Mana son **[SUPUESTO]** de ejemplo. La v0.8.2 añade la fatiga, los estados DOWN, K.O. y Deadly y los descansos a la vista Jugar (1.2), convierte Equipo y Méritos y defectos en listas de una línea con tooltip, deja las tiradas de HP y MP solo en Construir, y fija que los Gates conectan por defecto salvo incompatibilidad (4.1.2). La v0.8.1 ajusta la vista Jugar (feats como lista, derivados en mini tarjetas) y documenta el diseño nuevo de Mana por Gates, Magia con conjuros y habilidades de clase por nivel, que todavía **no está implementado**. La v0.8 cambió los atributos (STR, DEX, PER, INT, WIS y CHA; CON, SPR y MND se derivan), añade HP y MP con tiradas de dados, y rehace la ficha del visor: retrato, base y atributos arriba, todo lo demás plegado y el registro de sesiones abajo, con achievements asignables desde una lista con scroll (ver "Cambios respecto a versiones anteriores" al final).

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
- **[PENDIENTE]** Qué dado usa cada clase para HP y para MP (el visor ofrece d4 a d20; el ejemplo usa d10 para HP y d6 para MP), y si MND tiene algún efecto. **v0.9.5 (dicho por el diseñador, solo como dato de los personajes de muestra):** el monje usa **d8 para HP y d6 para MP** y el mago **d4 para HP y d10 para MP**; la tabla por clase sigue pendiente.
- **[PENDIENTE]** Si el MP máximo es lo mismo que el «mana ganado» del subsistema de mana (4.1) o son cosas separadas. Hoy el motor las trata por separado: `recursos.mp` (tiradas) y `mana.total` (XP de mana).

### 1.2 HP actual: fatiga, estados y recuperación (v0.8.2) [DECIDIDO salvo lo marcado]

Todo esto vive en la vista **Jugar**. El HP actual sigue siendo un valor del navegador (1.1), no del registro; las cifras salen de `data/vitalidad.json` y las calculan `Core.umbralesVitales`, `Core.estadoVital`, `Core.recuperacionPorHora`, `Core.descansar` y `Core.horasParaMaximo`, así que se cambian sin tocar el código.

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

**Recuperación por hora (v0.9.2) [DECIDIDO la fórmula, el ×5 y los dos descansos; el redondeo y los recortes son SUPUESTO].** Una sola fórmula del diseñador da una **tasa en puntos por hora** para el HP y para el MP:

```
H = (5 + C) · V + 5 + 5 · C            H = máximo del recurso (HP o MP)
R = C + V / 10                          R = recuperación, en puntos por hora
C = bono                                bono = bono de CON (HP) o de SPR (MP)
```

V no tiene nombre: es la incógnita que se **despeja** de la primera ecuación, `V = (H − 5 − 5·C) / (5 + C)`, y se mete en la segunda. **La prueba de C + 2 de la v0.8.6 se revirtió (v0.9.2):** «salió mal», así que C vuelve a ser el bono tal cual. El campo `desplazamiento` de `data/vitalidad.json` queda en **0** (el motor lo sigue leyendo, por si el diseñador quiere probar otro). Con C = bono, vuelve el **punto cero**: con bono 0, un máximo de 5 o menos no recupera nada y de ahí sube (H 6 da 0,02 por hora).

- **MP: la misma fórmula, con SPR y ×5 [DECIDIDO].** H es el MP máximo, el bono es el de **SPR** y la R resultante se **multiplica por 5** (`recursos.mp.multiplicador`; en la v0.8.6 era ×10). **[SUPUESTO]** El ×5 se aplica a la tasa final, no a H ni a C. Con MP 20 y bono 0 sale 1,5 MP por hora; con MP 500 y bono 0, 49,5 por hora.
- **Solo dos descansos [DECIDIDO].** El **corto** dura 2 h y el **largo** 8 h con **+50 % de recuperación** (`extra` 0,5): cura `R × horas × 1,5`. Desaparecen las horas libres y el cálculo de horas hasta el máximo (`horasParaMaximo` ya no existe). **[SUPUESTO]** El +50 % aplica al HP y al MP, y cada descanso recupera **HP y MP a la vez**.
- **[SUPUESTO] El resultado se redondea hacia abajo** y no pasa del máximo. Un valor sobre el máximo no se baja, y desde un HP negativo se cura igual.
- **[SUPUESTO] El bono no baja de 0** (`minimoBono`), igual que el «bono de cuerpo» de la v0.8.2: un bono negativo cuenta como 0.
- **[SUPUESTO] R no baja de 0** (`minimoPorHora`): con un máximo menor a 5 y bono 0, V sale negativa y la tasa se recorta a 0.
- **Casos de HP** (bono de CON): H 5 y bono 0 → 0; H 500 y bono 0 → 9,90; H 500 y bono +10 → 12,97. El personaje de ejemplo (H 56, bono +1) recupera 1,77 HP por hora: 3 HP en un descanso corto y 21 en uno largo (1,77 × 8 × 1,5).
- **Rareza conocida de la fórmula:** con HP altos, subir el bono puede **enlentecer** la recuperación (H 500: bono 0 da 9,90 y bono +2 da 8,93). Sin el desplazamiento aparece desde H ≈ 280 (con H 280 el bono 0 y el +1 empatan en 5,5); antes de ese punto subir el bono siempre acelera. Queda como está hasta que el diseñador diga otra cosa.
- **[PENDIENTE]** Si el largo recarga también las cargas diarias del equipo (7); hoy esas cargas se derivan del registro, no del navegador.

**Visor.** En Jugar, **Recuperación** muestra **dos chips** con la tasa (**HP por hora** y **MP por hora**, con la fórmula resuelta en el tooltip, incluido el recorte del bono negativo) y los botones **Descanso corto · 2 h** y **Descanso largo · 8 h · +50 %**, cada uno con lo que recuperaría («+3 HP · +3 MP»). Los botones se desactivan con HP y MP al máximo, sin tiradas de HP o si ambas tasas son 0.

Las cifras viven en `data/vitalidad.json` (`descanso.formula`: `atributo`, `minimoBono`, `sumaFija`, `constante`, `porBono`, `divisorV`, `minimoPorHora`; `descanso.corto` y `descanso.largo` con sus horas), así que se cambian sin tocar el código.

### 1.3 Alineamiento y arquetipo del personaje (v0.9) [DECIDIDO la notación; el resto es SUPUESTO]

El JSON del personaje trae campos opcionales y fijos (no cambian con las sesiones):

- **`alineamiento`**: se escribe `ley.moral`, con **L, N o C** (legal, neutral, caótico) y **B, N o M** (bueno, neutral, malo): `L.N` es *Legal neutral* y `N.B` *Neutral bueno*; `N.N` se rotula *Neutral puro*. Un valor que no cumple el formato es un error del personaje.
- **`arquetipo`**: el `id` de un arquetipo de su clase (6.5), por ejemplo `sombra-asesina`. Un arquetipo que no existe en la clase, o cuya clase no tiene archivo en `data/clases/`, es un error.
- **`habilidades`** (v0.9.4): lista de ids de tags de `data/xp-config.json` (por ejemplo `stealth`, `sense-motive`, `climb`, `intimidate`, `perception`). **[SUPUESTO]** son solo las habilidades que el personaje tiene; el visor las muestra como chips, sin rangos ni bonos. Un id que no existe es un error.
- **`tagXp`** (v0.9.4): el id de **un** tag de `xp-config` que es el «tag para recibir experiencia adicional» del personaje (Musashi: `tracker`, «Rastreo»; se agregó a `xp-config` como tag propio). **[PENDIENTE]** la regla del bono: hoy solo se guarda y se muestra, no cambia la XP.

El visor los muestra bajo el nombre: `Monk (Sombra asesina) · Humano · Legal neutral (L.N)`.

- **[SUPUESTO]** Es solo una etiqueta: no cambia reglas ni cifras. El proyecto tiene un sistema de alineamiento propio (Alignment Spiral: Score y Rank continuos por eje, personas); cómo se registra eso en el ledger queda **[PENDIENTE]** y, cuando exista, esta etiqueta sería su lectura.

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

### 4.1.1 Zeo (v0.9.4) [DECIDIDO el modelo; las descripciones y los efectos son PENDIENTES]

**Niveles (corregido en la v0.9.4):**

- **Tres ramas:** `heaven`, `void` y `earth`. Cada técnica raíz pertenece a una rama y sus mejoras heredan la de su línea.
- **El nivel de una rama es el rango más alto entre las técnicas de las líneas activas de esa rama.** Heaven nivel 3 = la técnica más alta de una línea heaven activa es de rango 3. Los sx **no** suben las ramas.
- **El nivel zeo total es `(Heaven + Earth + Void) / 3`.** El motor guarda el valor exacto en `zeo.nivel` y el entero hacia abajo en `zeo.nivelEntero` (el que entra en los costos).
- **Los sx 10, 20, 30, 50 y 80 son el costo de una técnica de rango 1 a 5** (`costoPorRango`). Es el costo de las «sub ramas»; no tiene nada que ver con el nivel de heaven, earth o void. Los sx se siguen acumulando por rama en la sección de SX, pero no deciden ningún nivel.
- **Nivel de una línea («Tech Zlv»):** el rango más alto que tiene esa línea.

**Líneas adquiridas y líneas activas (v0.9.4) [DECIDIDO; el redondeo del costo es SUPUESTO]:**

- Una línea **adquirida pero no pagada** es una **línea por activar**: la técnica raíz está anotada (`zeo-tecnica` con `activa: false` en el nivel 1) pero **no cuenta para los niveles de las ramas** ni para el nivel zeo.
- **Activar una línea cuesta `10 + líneas activas + nivel zeo`** (`activarLinea: base 10, porLineaActiva 1, porNivelZeo 1`). El evento es `zeo-activar { linea }`. **[SUPUESTO]** el nivel zeo se toma redondeado hacia abajo (`nivelEntero`).
- **[PENDIENTE]** El costo de activar se **muestra** (y queda en `zeo.costoActivar` y en la sesión) pero **no se descuenta** de ninguna reserva de sx ni se exige.

**Líneas de técnica (v0.9.1) [DECIDIDO la estructura]:**

- Un personaje tiene **10 líneas de técnica, y cada línea es un slot**. Cada línea tiene **5 niveles**. **La técnica inicial de una línea es una sola** (nivel 1, `1` opción); los demás niveles muestran **varias técnicas**: 3 en el nivel 2, **hasta 5 en los niveles 3 y 4** y 3 de nuevo en el 5 (`opcionesPorNivel: [1, 3, 5, 5, 3]`).
- **Las opciones del nivel siguiente se abren al tomar técnicas.** La **primera** técnica tomada en un nivel abre **3 opciones** en el siguiente; cada técnica **extra del mismo nivel** suma **1 opción más** (la segunda abre 4, la tercera 5), con el tope de ese nivel.
- Una técnica de nivel N solo se puede tomar si la línea ya tiene una de nivel N−1, y no más de las opciones visibles de ese nivel. Una línea está **ocupada** cuando tiene una técnica raíz (activa o por activar); las libres se ocupan con la técnica inicial.

**Catálogo de técnicas, origen y líneas más allá de L10 (v0.9.4) [DECIDIDO]:**

- **Anotar solo el nombre no dice qué hace la técnica**, así que existe un catálogo, `data/zeo-tecnicas.json` (versión 0.4.0). Cada **línea del catálogo** tiene una **técnica raíz** (nivel 1) con su `rama`, un `origen` y las **mejoras de cada nivel** (2 a 5), cada una con su `descripcion`. Trae las 10 líneas iniciales de la hoja de Musashi y 4 líneas con origen (Jutsu de Sombras / Werewolf, Buki no Sendo / Ninja, Sento no Kao / Knight, Giman gijutsu / Knight). **Las `descripcion` están en `null`** hasta que el diseñador las entregue; desde la v0.9.10 está cargada la línea **Sentir el Ki** (raíz, Ki Mark, Ki Vision, Sensitive Ki, Sense Burst, Blind Ki, Shadow Mark, Ki Snooping y Chi of the Land), con el texto del diseñador, ordenado y sin erratas. **Falta Long Range Sense** (nivel 4). Desde la v0.9.11 también traen descripción la **raíz** de Tracción de Ki, Meditación, Ocultar el Ki y Blank Mind (sin sus mejoras), y **Sense Burst** es la versión nueva del diseñador (ver el changelog). Las demás líneas siguen en `null`.
- **El `origen` (Werewolf, Ninja, Knight…) es solo una nota del log**: cuenta **cómo adquirió el personaje la técnica** (una oferta de varias opciones en una sesión o ronda: el personaje eligió una y lo descartado queda anotado). **No es un requisito**: ya no se exige para las líneas más allá de L10 ni impide poner una raíz en un slot inicial.
- **`log` del catálogo:** las filas «+N» (Tecnica del Escape +2, Tecnica de Muerte +3), las rondas y lo descartado quedan como **texto del log** (`log[{origen, texto}]`), sin efecto de reglas.
- **`zeo-tecnica` resuelve la técnica por id o por nombre** (sin distinguir tildes ni mayúsculas) y guarda el nombre del catálogo. Con una raíz del catálogo, una mejora tiene que ser de esa línea y del nivel en que se toma; una raíz no puede estar en dos líneas. Un nombre fuera del catálogo **sigue valiendo** (técnica propia, `catalogo: false`, con su propia `descripcion` y `rama` si es raíz).
- **Líneas más allá de L10:** `L11`, `L12`… se aceptan **en orden contiguo** y **sin origen obligatorio**. Los 10 slots iniciales son la base de `zeo.slots`; las demás se cuentan en `zeo.extras`.

**Visor:**

- **Cabecera compacta (v0.9.4):** una sola cabecera con el **nivel zeo** y las tres ramas con su nivel (sin tarjetas de sx por rama y **sin texto explicativo**).
- Cada línea es un **desplegable** (se recuerda cuáles están abiertas) con la técnica raíz, la rama y su nivel en el resumen. **Dentro de cada nivel, las técnicas van como chips de una línea** (v0.9.12): las tomadas con relleno y las opciones del catálogo que faltan con borde punteado. **La descripción no se dibuja: sale en un tooltip** al pasar el cursor, enfocar con el teclado o tocar el chip (nombre, origen o «Sin catálogo» y el texto; «Sin descripción todavía» si no hay). Las líneas **por activar** salen aparte, con el costo de activación y el botón de activar en Construir.
- Se dibujan las líneas ocupadas y **una sola** libre (con aviso de cuántas libres quedan).
- En Construir: **línea nueva** (raíz del catálogo o propia, con la casilla «por activar»), **mejora del catálogo**, **otra técnica** de nombre libre y **activar línea**.

- **[PENDIENTE]** Si una técnica de rango N exige un nivel zeo o de rama (la hoja rotula «2nd Rank - 20sx», «3rd Rank - 30sx»…) y si se descuentan los sx de su costo. Hoy el costo se muestra y no se exige. Qué es «Tech Zlv» exactamente se resolvió como el rango más alto de la línea.
- **[PENDIENTE]** Las descripciones y los efectos de las técnicas, cómo se ganan los sx y qué actividades los dan.

Valores de `data/zeo.json` (versión 0.7.0):

```json
{
  "unidad": "sx",
  "ramas": ["heaven", "void", "earth"],
  "nivelMax": 5,
  "nivelZeo": "promedio-ramas",
  "costoPorRango": [10, 20, 30, 50, 80],
  "activarLinea": { "base": 10, "porLineaActiva": 1, "porNivelZeo": 1 },
  "lineas": {
    "total": 10,
    "niveles": 5,
    "opcionesPorNivel": [1, 3, 5, 5, 3],
    "opcionesBase": 3,
    "extraPorTecnica": 1
  }
}
```

### 4.1.2 Mana por Gates (v0.8.1, implementado en v0.8.3) [DECIDIDO el diseño; las cifras son SUPUESTO; parte del detalle sigue PENDIENTE]

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

**Implementación (v0.8.3).** Todo lo siguiente se calcula en `src/core.js` y las cifras viven en `data/mana.json` y `data/mana-tags.json`, así que se cambian sin tocar el código. **Todas las cifras de esos archivos son [SUPUESTO] de ejemplo** hasta que el diseñador las fije.

Entradas del registro (los nodos y los círculos **no** son entradas: el motor los **deriva** del grafo de Gates y de la compatibilidad entre sus tags):

```json
[
  { "tipo": "xp-subsistema", "subsistema": "mana", "cantidad": 10 },
  { "tipo": "mana-fuerza", "cantidad": 1, "fuente": "criatura-contratada", "nota": "Contrato con el lobo blanco" },
  { "tipo": "gate", "id": "g1", "funcion": "capacidad", "tag": "hielo", "oportunidad": "El altar del glaciar" },
  { "tipo": "inscribir", "slot": "g1", "habilidad": "power-attack" },
  { "tipo": "desinscribir", "slot": "g1" }
]
```

- **El SX de mana** (lo asignado a Mana, 4.1.3) es un **umbral acumulado**: lo que se asigna a Mana no se vuelve a gastar al construir un Gate **[SUPUESTO]** (`sxGasta: false`).
- **`mana-fuerza`:** `cantidad` entera distinta de 0, `fuente` (`criatura-contratada`, `contrato-magico` u `otra`) y `nota`. Perder MF (cantidad negativa) exige nota, y la MF no puede quedar bajo 0. La MF **inicial** es 1 (humano, `mfInicial`), y una raza puede cambiarla con `raza.manaFuerza` **[SUPUESTO]**. La **contabilidad de MF** (base y cada aporte con su fuente y nota) sale en un desplegable del visor. **Desde la v0.9.5** un aporte puede ser **por nivel** (`porNivel`, un entero positivo, en lugar de `cantidad`): suma `porNivel` × el nivel del personaje y crece solo con los niveles (el contrato durmiente de Herb'Azzio con Ashura: «su mismo nivel en Mana force por 2» = `porNivel: 2`, **[SUPUESTO]** esa lectura). No se puede poner `cantidad` y `porNivel` a la vez ni un `porNivel` negativo.
- **`gate`:** `id` (letras y números, sin guiones: `g1`), `funcion` (`capacidad`, `intensidad`, `potencia` o `sentidos`), `tag` (debe existir en `data/mana-tags.json`) y `oportunidad` (texto: la oportunidad para construirlo). El Gate número *k* exige **MF ≥ `mfBase`^(k−1)** (`mfBase` = 2: MF 1 permite 1 Gate, 2 permite 2, 4 permite 3, 8 permite 4) y **SX de mana ≥ `sxPorGate[k−1]`** (`[10, 20, 40, 80, 160, 320, 640]`, **[SUPUESTO]**); si falta algo, la entrada se rechaza con el motivo. **Desde la v0.9.5 la `funcion` y la `oportunidad` son opcionales** (la ficha no siempre las trae): un Gate sin función se muestra como «Sin función» y sin oportunidad como «sin registrar».
- **`inscribir` / `desinscribir`:** un slot admite **una** habilidad tipo conjuro (6.2) del personaje. Para cambiarla hay que desinscribir antes. **[SUPUESTO]** La misma habilidad puede ocupar varios slots, y no se exige que coincida con el tag del slot. **Desde la v0.9.6 `inscribir` también admite `tecnica: <id>`** (en lugar de `habilidad`): una técnica de Estrella Mana (más abajo) de categoría `inscrita`, ya aprendida, de nivel de Mana **menor o igual** al del slot (un Gate es nivel 1, un nodo 2 y un círculo 3) **[SUPUESTO]** y que no esté inscrita en otro slot; una técnica activa o una que todavía se aprende no se inscriben. *(La v0.9.5 inscribía conjuros de Magia; ya no: los conjuros no van en los slots.)*
- **Nivel de Mana (`mana.nivel`, v0.9.5) [SUPUESTO]:** el de la estructura más grande que existe: 0 sin Gates, 1 con un Gate, 2 con un nodo (dos Gates que conectan) y 3 con un círculo. Corresponde al «mlv» de las fichas: Herb'Azzio, con dos Gates y un nodo, es Mana nivel 2, y el círculo que aprende (Parallel World Casting) es de nivel 3. Sale en el resumen y en las cajas de Mana.
- **Estrella Mana (v0.9.6) [DECIDIDO que es independiente; el costo de usar cada técnica es PENDIENTE].** Mana es un **subsistema independiente de técnicas especiales**, llamado **Estrella Mana**, igual que Zeo es **Estrella Zeo**: ambos son independientes de la progresión normal del personaje (clase, feats y conjuros). Las técnicas de Mana **no son conjuros** y no viven en Magia: viven aquí.
  - **Entrada `mana-tecnica`:** `{ "tipo": "mana-tecnica", "nombre": "Heat Pulse", "nivel": 1 }`. `nivel` es el nivel de Mana que pide (1 Gate, 2 nodo, 3 círculo); `categoria` es `inscrita` (por defecto: va en un slot) o `activa` (se usa sin inscribir; por ejemplo *Circle Activation*, costo «Mana 1»); `costo` y `descripcion` son opcionales; `id` sale del nombre salvo que se fije. Con `costoSx` la técnica es un **contenedor**: acumula experiencia hasta aprenderla.
  - **Entrada `mana-tecnica-sx`:** `{ "tipo": "mana-tecnica-sx", "id": "parallel-world-casting", "cantidad": 50 }` suma (o resta, con negativo) SX al contenedor. **[SUPUESTO]** No mira los Gates ni toca los SX de mana ni la reserva: es solo un contenedor (el diseñador pidió «solo un contenedor para ir acumulando la experiencia»). No admite pasarse de `costoSx` ni bajar de 0. Al llegar a `costoSx` la técnica deja de estar `aprendiendo`.
  - **Resultado `mana.tecnicas`:** por técnica, `categoria`, `nivel`, `costo`, `descripcion`, `costoSx`, `acumulado`, `falta`, `aprendiendo` y los `slots` donde está inscrita; `mana.totales.tecnicas` las cuenta.
  - **Gates de Herb'Azzio (v0.9.6):** el de **Oro** es de función **Sentidos** y el de **Fuego**, **Capacidad**. Para inscribir una técnica **el jugador la inscribe** en su slot: en el de Fuego va *Heat Pulse* (de momento sin más datos).
  - **Herb'Azzio:** *Sagita Lux Magica* (Gate de Oro, nivel 1), *Senderos de la Magia* (nodo, nivel 2), *Heat Pulse* (Gate de Fuego, nivel 1), *Circle Activation* (activa, «Mana 1») y *Parallel World Casting* (nivel 3, contenedor de 200 SX en 0).
- **Identificadores de slot:** un Gate es `g1`, un nodo es `g1-g2` y un círculo es `g1-g2-g3`.

**Tabla de compatibilidad.** `data/mana-tags.json` lista los tags y, por tag, sus `incompatibles`. La relación es **simétrica** y la prueba de consistencia comprueba que lo sea. Hoy hay **13 tags de ejemplo** (fuego, agua, hielo, viento, tierra, rayo, luz, oscuridad, sombra, vida, muerte, sonido, silencio), marcados `fuente: "ejemplo"`, y **`oro`** (v0.9.5, el Gate de Gold de Herb'Azzio, sin incompatibilidades, `fuente: "diseñador"`). El motor solo consulta los tags de los Gates del personaje; los pares que no figuran como incompatibles conectan.

**Resultado del motor** (`resultado.mana`): SX, MF y su contabilidad, Gates (con su orden, MF y SX exigidos, función y tag), conexiones entre pares, nodos, círculos, slots con su habilidad inscrita (o libre), totales (incluye pares sin conexión) y el requisito del siguiente Gate (MF, SX y oportunidad).

**Visor.** La sección **Mana** (plegada) muestra SX, MF, Gates y slots; el requisito del siguiente Gate; un **grafo circular** (Gates equidistantes, línea continua si conectan, línea roja discontinua si sus tags son incompatibles, triángulo sombreado si forman un círculo y círculo con relleno si el Gate tiene una habilidad inscrita); la lista de slots con tooltip; y la contabilidad de MF. En **Construir** cada slot ofrece elegir una habilidad e **Inscribir**, o **Quitar**, y eso va al borrador (10.5). Desde la v0.8.4 **los Gates y la Mana force también se agregan desde el visor** (ver abajo).

**Formularios de Construir (v0.8.4).** Dentro de Mana hay dos formularios que crean entradas del borrador (10.5), y el motor las valida igual que si estuvieran en el JSON:

- **Mana force:** cambio (entero, positivo o negativo), fuente y nota. Perder exige nota.
- **Construir un Gate:** el tag (la lista avisa con qué Gates actuales **no conectaría**), la función y la oportunidad. El `id` se asigna solo (`g1`, `g2`…). Sobre el formulario el visor dice qué le falta al próximo Gate (Mana force y SX) y, si hay SX en la reserva, avisa que se asigne a Mana.

- **[PENDIENTE]** El **contenido real de la tabla de compatibilidad** (los ~200 tags y sus pares incompatibles), si el GM puede forzar o romper una conexión concreta y dejarlo en el registro, y qué tag lleva un nodo o un círculo (hoy: la unión de los tags de sus Gates).
- **[PENDIENTE]** Cuánto SX cuesta de verdad cada Gate, si el SX se **gasta** o es solo un umbral (hoy umbral), cuánto da cada fuente de MF, y qué hace cada función (capacidad, intensidad, potencia, sentidos; hoy dicen «Efecto por definir»).
- **[PENDIENTE]** Si lo que se inscribe debe coincidir con el tag del slot, y si la misma habilidad puede repetirse en varios slots.
- **[PENDIENTE]** Si hay niveles de mana con tabla de SX como en Zeo.
- **[DIFERIDO]** La relación con el MP que se tira (1.1: ¿el MP es el combustible de las habilidades inscritas, o lo reemplazan los slots?) y la **recuperación de MP** (1.2).

### 4.1.3 SX compartido por Zeo y Mana (v0.8.4) [DECIDIDO el problema; la solución es SUPUESTO]

**El problema.** Zeo y Mana gastan el mismo recurso, el SX, y cada uno lo trae en su propio esquema («sx de rama», «SX de mana»). Al repartir SX en una sesión, el GM no sabe a cuál ponerlo.

**La solución propuesta: una reserva común.** El SX se gana en **un solo lugar** y se reparte después:

- **`sx`**: SX ganado **sin destino**. Va a la **reserva común**. Campos: `cantidad` (entero positivo) y `nota` opcional.
- **`sx-asignar`**: pasa SX de la reserva a un subsistema. Campos: `subsistema` (`zeo` o `mana`), `rama` (solo Zeo: `heaven`, `void` o `earth`) y `cantidad`. Se rechaza si pide más de lo que hay en la reserva, si el destino no existe o si Zeo no trae rama; un rechazo no cambia la reserva.
- **`xp-subsistema`** sigue existiendo como **atajo**: el SX nace ya con destino y no pasa por la reserva. Los registros anteriores siguen valiendo sin cambios.

```json
[
  { "tipo": "sx", "cantidad": 12, "nota": "Botín de la cumbre" },
  { "tipo": "sx-asignar", "subsistema": "mana", "cantidad": 10 },
  { "tipo": "sx-asignar", "subsistema": "zeo", "rama": "void", "cantidad": 2 }
]
```

- **[SUPUESTO]** Lo asignado **se queda** en el subsistema: no vuelve a la reserva ni se reasigna. La reserva solo baja al asignar, así que el SX asignado cuenta como acumulado de ese subsistema (la lectura como umbral de Zeo y de Mana no cambia).
- **[SUPUESTO]** Quién asigna: el jugador o el GM, como cualquier entrada del registro. El motor no distingue.
- **[PENDIENTE]** Si el SX **ganado se gasta** de verdad al construir un Gate o subir una rama (el SX como moneda que baja), en vez de ser solo un umbral acumulado. Con la reserva actual, «gastar» solo ocurre al asignar.
- **[PENDIENTE]** Si hay un tope de SX en la reserva o un plazo para asignarla.

**Resultado del motor** (`resultado.sx`): `reserva` (sin asignar), `ganadoEnReserva`, `asignado`, `directo`, `total` (ganado = reserva + directo), `zeo` (total y por rama) y `mana`. Cada sesión anota `sxGanado` y `sxAsignado`, y lo asignado se suma además a los chips de Zeo y Mana de esa sesión. El error de un Gate sin SX suficiente avisa si hay SX en la reserva.

**Visor.** Una sección **SX** (plegada, antes de Zeo) muestra la reserva sin asignar, lo que hay en Zeo y en Mana, el SX ganado y el desglose. En **Construir** tiene dos formularios: **Registrar SX ganado** (cantidad y destino; el destino inicial es la reserva) y **Asignar de la reserva** (cantidad y destino). Zeo y Mana avisan cuando hay SX sin asignar.

### 4.2 Magia (conjuros) (v0.8.1) [DECIDIDO la dirección; los slots están implementados desde v0.8.3 y los conjuros desde v0.9.5]

- La Magia usa el sistema de Pathfinder o D&D, **con memorización de conjuros**. Los conjuros son más o menos estáticos, así que el proyecto necesita un **catálogo de conjuros** (`data/conjuros.json`): id, nombre, escuela, nivel por lista de clase y fuente.
- Los conjuros están **limitados por el tipo de lanzador** (mago, hechicero…). Cada clase lanzadora anota su **lista de conjuros** y sus **escuelas permitidas y prohibidas**; esa anotación vive en el archivo de la clase (6.5).
- **[SUPUESTO]** Los slots donde se memorizan los conjuros salen de los Gates, nodos y círculos (4.1.2), con niveles 1 a 3. Desde la v0.8.3 el motor ya los calcula y permite inscribir en ellos las habilidades tipo conjuro; **Magia** muestra en qué slots está inscrita cada una.
- Las habilidades tipo conjuro de los feats activos (6.2) conviven con los conjuros del catálogo.
- **Conjuros del manual y propios (v0.9.5; desde la v0.9.6 son solo conjuros) [DECIDIDO la estructura; el texto de los conjuros es PENDIENTE].** Hay **dos orígenes**, en un solo repertorio por personaje:
  - **Del manual:** `data/conjuros.json` (versión 0.1.0, 1.491 conjuros de Core, APG, Ultimate Magic, Ultimate Combat, Advanced Race Guide y Advanced Class Guide, importados de awesomeSheet con `scripts/import-conjuros.js`). Cada uno trae el **nivel por lista de clase** (`nivel: { wizard: 3, sorcerer: 3 }`), escuela, descriptor, tiempo, componentes, alcance, objetivo, duración, salvación, RC y libro; **no trae el texto de la descripción** (mismo criterio que los feats; el tooltip dice «Texto: Archives of Nethys» y Construir enlaza a Archives of Nethys).
  - **Propio:** se crea en el registro con nombre y nivel (0 a 9) y los textos opcionales `escuela`, `tiempo`, `componentes`, `alcance`, `objetivo`, `duracion`, `salvacion`, `rc`, `costo` y `descripcion`. El `id` sale del nombre (minúsculas con guiones) o se fija con `id`.
  - **Las técnicas ya no son Magia (v0.9.6).** *Circle Activation*, *Parallel World Casting*, *Sagita Lux Magica*, *Senderos de la Magia* y *Heat Pulse* son técnicas de **Mana** (4.1.2, Estrella Mana). `conjuro` rechaza `categoria`, `aprendiendo` y `requisitos` con un mensaje que manda a `mana-tecnica`. Los conjuros **no se inscriben** en los slots de Mana.
- **Entrada `conjuro`:** `{ "tipo": "conjuro", "id": "magic-missile" }` (del manual; el nivel sale de la lista de la clase del personaje y, si la clase no lo tiene en su lista, hay que dar `nivel`) o `{ "tipo": "conjuro", "nombre": "Sagita Lux Magica", "nivel": 1, "costo": "…", "descripcion": "…" }`. Un conjuro no se repite en el repertorio. Los conjuros de nivel mayor al que la clase alcanza hoy **se aceptan** y salen marcados (`sobreNivel`).
- **Resultado `repertorio` (v0.9.6):** `conjuros` (cada uno con `sobreNivel`), `porNivel` y `total`. Herb'Azzio no tiene conjuros en su Magia todavía (el diseñador no ha dado ninguno del manual).
- **Visor (v0.9.6):** la sección **Magia** ya no trae textos explicativos (ni al principio ni después de «Conjuros por día»). Las **tarjetas de conjuros por día son compactas** (una fila de tarjetas pequeñas) y, tras las del nivel actual, van **dos tarjetas punteadas con los próximos niveles de conjuro** («Nivel 4 — llega lv 9», «Nivel 5 — llega lv 11»). Los conjuros salen por nivel como chips de tamaño normal (también los trucos) con sus datos en el tooltip (nivel, escuela, tiempo, alcance, objetivo, duración, salvación, costo y descripción). En **Construir**, Magia trae dos formularios: **agregar del manual** y **crear** un conjuro propio. Las secciones de los subsistemas se llaman **Estrella Zeo** y **Estrella Mana**; esta última trae el bloque **Técnicas** (inscritas, activas y las que se aprenden, con una barra y el contador `acumulado / costo SX` para el contenedor), sus formularios («Agregar una técnica de Mana» y «Sumar» SX a un contenedor) y, en cada slot, un selector con las técnicas que caben.
- **[PENDIENTE]** El texto de los conjuros del manual (OGL, `docs/FUENTES.md`), el costo de lanzarlos con Mana, si hay un tope de conjuros conocidos por clase, y cuánto cuesta usar cada técnica de Mana. **Resuelto en la v0.9.6:** «reduce los trucos a la mitad» era la **cantidad por día** (4 → 2), no el tamaño en pantalla.
- **Progresión de conjuros por clase (v0.9.8) [DECIDIDO el ritmo; la tabla es de Pathfinder 1e].** La tabla de conjuros por día vive en el archivo de la clase (`conjuros.porDia`: una fila por nivel de clase y un número por nivel de conjuro desde el 0). **Un nivel de conjuro nuevo llega cada 3 niveles de personaje** en vez de cada 2 (`conjuros.ritmo: 3`; dicho por el diseñador): el nivel 1 da los trucos (nivel 0) y el nivel de conjuro 1; el nivel de conjuro 2 llega en el nivel 3, el 3.º en el 6, el 4.º en el 9, el 5.º en el 12, el 6.º en el 15, el 7.º en el 18, el 8.º en el 21 y el 9.º en el 24 (el nivel máximo hoy es el 20, así que un mago llega al 7.º). **Lo único que cambia es cuándo llega cada nivel de conjuro**: las cantidades por día salen de la fila de la tabla del nivel del personaje, y las de un nivel de conjuro que todavía no llega no se cuentan. Así un mago de nivel N tiene **siempre al menos N conjuros por día** (sin contar los trucos): Herb'Azzio (nivel 7) tiene 4, 3 y 2 de los niveles 1, 2 y 3 (9 conjuros). Los trucos por día van a la mitad (`trucos`). La tabla no incluye conjuros extra por INT ni por escuela. El motor devuelve `conjuros` (`ritmo`, `nivelMax`, `porDia` con `cantidad` y `cantidadBase`, `llegadas`, `proximo`, `proximos` —los dos próximos niveles de conjuro—, `total`) y es `null` para una clase sin tabla. *(La v0.9.2 a la v0.9.6 retrasaban 2 niveles los conjuros de nivel 4 en adelante; la v0.9.7 repartía las cantidades a 2 filas por cada 3 niveles y dejaba a un mago de nivel 7 con 6 conjuros, menos que su nivel; ninguna valía.)*
- **Las habilidades activas ocupan el lugar de los conjuros (v0.9.1) [DECIDIDO].** La sección **Magia** muestra la progresión de conjuros (si la clase lanza) y, debajo, las **habilidades activas**: las de la clase (`ejecucion: activo`) y las que salen de un feat de ejecución activa (6.2). El monje no lanza conjuros, así que su espacio de Magia lo ocupan solo sus habilidades activas (Flurry of Blows, Ki Pool, High Jump, Vanish…). Las habilidades pasivas de la clase van con los feats (6.5, 10.5).
- **[PENDIENTE]** Si las habilidades activas de clase también se inscriben en los slots de Mana (hoy solo se inscriben las que salen de feats). Qué sistema y qué edición (Pathfinder 1e, D&D 3.5 o D&D 5e) y de dónde se importa el catálogo; qué se copia (nombre, escuela y nivel, o también el texto: la OGL y los avisos de copyright siguen pendientes, `docs/FUENTES.md`); qué pasa con los niveles 4 a 9; cómo se resuelven las escuelas de especialista y las líneas de sangre.

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

- **[DECIDIDO]** Slots de feats: **uno en el nivel 1 y uno más cada 2 niveles** (nivel 1 → 1, nivel 3 → 2, nivel 7 → 4, nivel 19 → 10). Un personaje de nivel 7 tiene 4. **No hay feats extra por clase.** El motor usa `floor((nivel + 1) / 2)`. **Excepción (v0.9) [SUPUESTO]:** un **arquetipo** puede dar slots de feat extra a cambio de las habilidades que sustituye (`featsExtra`, la lista de niveles en que llega cada uno; ejemplo: el mago «Polímata sin escuela», 6.5). Los feats que da la clase base (Bonus Feat) siguen sin sumar slots.
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

### 6.5 Habilidades de clase y arquetipos (diseño v0.8.1, implementado en v0.9.0 para Monk y Wizard) [DECIDIDO]

Como el sistema es Pathfinder, cada clase da **habilidades por nivel**. El visor las muestra con un **tooltip** que trae el detalle de cada una. **[DECIDIDO]** No hacen falta las 37 clases: **solo Monk y Wizard** tienen archivo; las demás (el Fighter del ejemplo, por ejemplo) funcionan igual, sin sección de habilidades.

- **Un archivo por clase, cargado solo si se usa.** Cada clase vive en `data/clases/<id>.json`. El visor pide únicamente el de las clases de los personajes cargados (y el de un personaje abierto desde un archivo); el archivo único incluye solo las de los personajes que empaqueta. `data/classes.json` sigue siendo el índice de las 37 clases con su ataque base. El motor recibe los archivos en `ctx.clasesDetalle` (`{ id: archivo }`).
- **Formato.** `{ id, nombre, fuente, libro, dadoDeGolpe, nota, conjuros?, habilidades: [...], arquetipos: [...] }`. `conjuros` es opcional y solo lo tienen las clases que lanzan (`{ atributo, ritmo, trucos, nota, porDia }`, 4.2). Una habilidad: `id`, `nombre`, `nivel`, `ejecucion` (`pasivo` o `activo`), `detalle` (el texto del tooltip) y `mejoras` opcional (`[{ nivel, detalle }]`: lo que cambia en niveles posteriores; Flurry of Blows, Fast Movement, etc.). El motor devuelve en `resultado.clase` las habilidades alcanzadas, las próximas y, de cada una, qué mejoras ya llegaron y cuál es la siguiente.
- **Arquetipos.** `{ id, nombre, fuente, resumen, reemplaza: [ids de la clase], habilidades: [...], featsExtra: [niveles] }`. El arquetipo **quita** las habilidades de `reemplaza` y **suma** las suyas; cada habilidad propia puede decir a cuál `sustituye`. Se elige en el personaje (`arquetipo`, 1.3). Los de Monk y Wizard son **homebrew**: Pathfinder 1e no trae un arquetipo de monje asesino ni un mago que cambie su escuela por feats, así que se armaron con las piezas de la clase.
- **Lista y tooltip (v0.9.1, rehecha en v0.9.8).** Las habilidades **pasivas** van **junto con los feats pasivos** en la tarjeta **Pasivas** (Jugar) o en el plegable de feats (Construir); la tarjeta se describe en 6.6. Cada título lleva un tooltip con el detalle, lo que sustituye, las mejoras logradas y la próxima. Las **activas van en «Magia y habilidades»** (el nombre de la tarjeta de Magia desde la v0.9.8), donde irían los conjuros (4.2), como tarjetas. Los slots de feat extra del arquetipo se marcan con ★ en Construir. Ya no existe la tarjeta aparte «Habilidades de <clase>».
- **[DECIDIDO] Texto propio.** El nombre y el nivel de cada habilidad son datos de reglas (SRD, OGL 1.0a, verificados en Archives of Nethys); el `detalle` son **resúmenes propios en español**, no el texto de Paizo. Quien quiera el texto completo lo lee en Archives of Nethys.
- **[SUPUESTO]** Las habilidades de clase que dan feats (Bonus Feat del monje y del mago) **no suman slots**: se eligen en los slots normales. Las que son un feat concreto (Stunning Fist, Scribe Scroll) son **habilidades de clase y no ocupan slot**. En este sistema el casteo del Wizard (Spells, Spellbook, Cantrips) se documenta, pero la magia pasa por Gates y Mana (4.2); el Wizard tiene además su progresión de conjuros de un nivel nuevo cada 3 niveles (4.2). Cantrips y Arcane Bond son activas y van en Magia y habilidades.
- **Sombra asesina (Monk) [homebrew, cifras SUPUESTO].** Monje asesino al estilo ninja, **sin engaño ni disfraz**: toda su ventaja sale del sigilo, el flanqueo y los venenos. Sustituye cinco habilidades: Stunning Fist → **Sneak Attack** (+1d6 de precisión, +1d6 más en los niveles 5, 9, 13 y 17), Maneuver Training → **Silent Step** (3), Purity of Body → **Poison Mastery** (5), Wholeness of Body → **Vanish** (7, 2 ki: invisibilidad corta) y Quivering Palm → **Death Attack** (15). Su lista de bonus feats no incluye Improved Feint (usa Engañar).
- **Polímata sin escuela (Wizard) [homebrew, cifras SUPUESTO].** Sustituye **Arcane School** (poderes de escuela, espacio extra por nivel de conjuro y escuelas de oposición) por **Polymath Training**: sin restricciones de escuela y **un slot de feat extra en los niveles 1, 4, 8, 12, 16 y 20** (6.1). Un mago de nivel 7 tiene 6 slots en vez de 4.
- **[PENDIENTE]** Ajustar las cifras de los dos arquetipos (cuántos feats vale una escuela, el daño de Sneak Attack, el costo de Vanish) y si un arquetipo puede sustituirse al subir de nivel o es fijo.

### 6.6 Pasivas y habilidades: dos propósitos distintos (v0.9.8) [DECIDIDO]

**Dos tarjetas con dos usos.** Lo que se juega con la ficha en la mano se divide así, dicho por el diseñador:

- **Pasivas = la lista de ventajas aplicables.** Mientras se juega no importa cómo se llama una habilidad, sino **qué suma**: +4 a la CA, +2 a las salvaciones contra encantamiento, +20 pies de velocidad… La tarjeta **Pasivas** es una tarjeta alargada: **arriba** los títulos de las pasivas (los feats pasivos y las habilidades pasivas de la clase y del arquetipo, cada uno un chip con tooltip) y **debajo, «Lo que suman»**, el desglose **línea por línea**, agrupado en Defensa, Salvaciones, Ataque e iniciativa, Movimiento, Habilidades, Lanzamiento, Vitalidad, Inmunidades y resistencias y Capacidades. Cada línea es el valor ya **sumado** (+4 a la CA = el bono de WIS +3 y +1 del nivel 4), a quién modifica, su condición («sin armadura», «contra veneno») y de qué habilidades sale. Una condición distinta es otra línea: +1 a la CA y +4 a la CA contra ataques de oportunidad no se mezclan.
- **Magia y habilidades = las opciones tácticas.** **Todo lo que necesita activación va aquí**: los conjuros, las habilidades activas de la clase y de los arquetipos (Sneak Attack, Flurry of Blows, Ki Pool, Vanish…) y los feats que se declaran o se aplican al usarlos. Una habilidad condicional como un berserker es activa por la misma razón. La tarjeta pasó a llamarse **«Magia y habilidades»** y su bloque de habilidades se llama «Habilidades · opciones tácticas».

**Qué se reclasificó.** Sneak Attack (Sombra asesina) pasó de pasiva a **activa**; Spring Attack y Empower Spell pasaron a ser feats de ejecución activa (`data/feats.conversiones.json`, 6.2), así que Musashi y Herb'Azzio los tienen como habilidades tipo conjuro.

**Datos.** Tres archivos nuevos o ampliados, todos de texto propio (resúmenes de la regla, no del libro):

- `data/efectos.json`: el **catálogo** de lo que puede sumar una pasiva. `grupos` (el orden de las columnas) y `objetivos` (ca, dmc, rc, salv-fort, salv-ref, salv-vol, salv-todas, ataque, dano, iniciativa, velocidad, caida, habilidad, concentracion, penetracion, pg), cada uno con su `grupo`, su `unidad` y su `formato` ({v} con signo, {n} sin signo).
- `efectos` en cada habilidad **pasiva** de `data/clases/<id>.json` y `data/feats.efectos.json` (`{ efectos: { <id de feat>: [...] } }`). Un efecto es **numérico** (`objetivo` + `valor`, `atributo` —suma el modificador solo si es positivo—, `porNivel`, `cadaNiveles` —se repite cada N niveles desde `nivel`—, `minimo`) o una **línea de texto** (`grupo` + `texto`). Lleva `nivel` (desde cuándo cuenta; por defecto el de la habilidad), `condicion`, `reemplaza` (de los efectos de una habilidad con la misma clave solo vale el de mayor nivel alcanzado: el daño sin armas pasa de 1d6 a 1d8 en vez de sumarse), `etiqueta` (la habilidad concreta), `tipo` y `nota`. `{eleccion}` en `condicion` o `texto` se sustituye por la elección del feat.
- `efectos: []` significa «esta pasiva no suma nada que listar» (Bonus Feat, Spells…); **sin `efectos`**, la pasiva aparece al pie como **«sin desglose todavía»**, y así se ve qué falta describir.

**Motor.** `resultado.ventajas` = `{ grupos: [{ id, nombre, lineas: [{ tipo: numero|texto, texto, antes, valorTexto, despues, valor, condicion, partes: [{ nombre, valor, bonificador }], notas }] }], titulos: { feats, clase }, sinDesglose, total }`; `Core.calcularVentajas` es la función pura. Los números van antes que los textos y, dentro de un objetivo, la línea sin condición va antes que las condicionales.

- **[SUPUESTO]** Los efectos de los feats son **mis resúmenes** de las reglas de Pathfinder 1e; hay que revisarlos. Hoy solo están descritos los feats de los personajes de muestra (Dodge, Mobility, Stealthy, Improved Initiative, Toughness, Combat Casting, Spell Penetration, Craft Wand); el resto del catálogo saldría «sin desglose».
- **[SUPUESTO]** Las sumas son **informativas**: no se distingue el tipo de bonificador (esquiva, mejora, circunstancia…) ni se aplican las reglas de apilado, y los pg de Toughness **no** se suman a la vitalidad calculada (3.x). Los efectos de méritos, traits y objetos todavía no entran.
- **[PENDIENTE]** Describir los efectos del resto del catálogo de feats a medida que el diseñador los use; decidir si los bonos de objetos y méritos entran en la misma tarjeta.

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
  "clase": "monk",
  "arquetipo": "sombra-asesina",
  "alineamiento": "L.N",
  "habilidades": ["stealth", "climb"],
  "tagXp": "tracker",
  "imagen": "retratos/slug.png",
  "atributos": { "STR": 17, "DEX": 13, "PER": 12, "INT": 10, "WIS": 12, "CHA": 8 },
  "sesiones": [
    {
      "id": "2026-11-06-01",
      "fecha": "2026-11-06",
      "titulo": "Título de la sesión",
      "notas": "",
      "imagen": "sesiones/s1.jpg",
      "entradas": [
        { "tipo": "xp", "tags": [ { "id": "close-quarter-combat", "grado": "heroico" }, { "id": "stealth", "grado": "cumple", "pct": 0.30 } ], "nivelContenido": 9, "cantidad": 1, "nota": "" },
        { "tipo": "xp-subsistema", "subsistema": "zeo", "rama": "heaven", "cantidad": 10 },
        { "tipo": "xp-subsistema", "subsistema": "mana", "cantidad": 250 },
        { "tipo": "zeo-tecnica", "linea": "L01", "nivel": 2, "tecnica": "Nombre opcional" },
        { "tipo": "feat", "id": "power-attack" },
        { "tipo": "feat", "id": "weapon-focus", "eleccion": "espada larga" },
        { "tipo": "achievement", "id": "slug", "fate": 1 },
        { "tipo": "tirada", "recurso": "hp", "dado": "d10", "resultado": 7 },
        { "tipo": "fate", "cantidad": -1, "motivo": "gasto" },
        { "tipo": "rasgo", "id": "slug", "accion": "ganar | perder" },
        { "tipo": "trait", "id": "slug", "accion": "ganar | perder" },
        { "tipo": "objeto", "id": "slug", "accion": "equipar | desequipar | usar-carga | recargar", "extremidad": "mano-izquierda" },
        { "tipo": "ajuste", "campo": "xp", "cantidad": -100, "motivo": "..." },
        { "tipo": "resumen", "texto": "Lo que pasó", "imagen": "sesiones/s1.jpg" },
        { "tipo": "apunte", "autor": "Ana", "rol": "jugador | gm", "texto": "Una nota", "sesion": "id-opcional" },
        { "tipo": "opciones", "id": "botin-jefe", "titulo": "Botín del jefe", "alcance": "grupo | individual", "elige": 1, "opciones": [ { "id": "a", "texto": "Espada +1" }, { "id": "b", "texto": "500 po" } ] },
        { "tipo": "decision", "opciones": "botin-jefe", "elegidas": ["a"] }
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
   - `zeo-tecnica` solo con una línea existente (L01 a L10, o la próxima línea contigua desde L11) y un nivel de 1 a 5; un nivel de más de 1 exige una técnica del nivel anterior en esa línea, no se pueden tomar más técnicas que las opciones visibles de ese nivel (4.1.1) y un nombre no se repite dentro de la línea. Una raíz o mejora del catálogo debe ser de la línea y del nivel que se dice; `origen` y `descripcion`, si se ponen, son textos no vacíos; `rama` debe ser una de las ramas; `activa` solo puede ser `false` y solo en el nivel 1 (línea adquirida por activar). `zeo-activar { linea }` exige una línea con raíz por activar y la pasa a activa (costo `10 + líneas activas + nivel zeo`, informativo). `habilidades` y `tagXp` del personaje deben ser ids de `data/xp-config.json`. `zeo-linea` (v0.5) ya no existe y da un error que remite a `zeo-tecnica`;
   - `conjuro` (v0.9.5, simplificado en la v0.9.6): `id` del catálogo (`data/conjuros.json`) **o** `nombre`; un conjuro propio exige `nivel` de 0 a 9; `categoria`, `aprendiendo` y `requisitos` se rechazan (las técnicas van en `mana-tecnica`); los textos opcionales no pueden venir vacíos; un conjuro no se repite; uno del manual necesita estar en la lista de la clase o llevar `nivel`. `mana-tecnica` (v0.9.6): `nombre` no vacío, `nivel` 1 a 3, `categoria` `inscrita` o `activa`, `costo` y `descripcion` no vacíos si vienen, `costoSx` entero positivo, id único. `mana-tecnica-sx`: la técnica existe y tiene `costoSx`, `cantidad` entera distinta de 0 que no pase de `costoSx` ni baje de 0. `inscribir` con `tecnica`: debe ser una técnica `inscrita` y aprendida, de nivel menor o igual al del slot y no inscrita ya en otro slot. `mana-fuerza` con `porNivel` y `gate` sin `funcion` ni `oportunidad` valen (4.1.2).
   - notas, resumen y opciones (v0.9.9, 10.6): `resumen` lleva `texto` o `imagen` (o los dos); `apunte` exige `autor` y `texto` no vacíos y `rol` `jugador` (por defecto) o `gm`; `opciones` exige `id` único (minúsculas, números y guiones), `titulo`, `alcance` `grupo` o `individual` (por defecto `individual`), al menos 2 opciones con `id` y `texto` sin repetir y `elige` entero de 1 a n−1 (por defecto 1); `decision` exige una oferta anterior en el registro y exactamente `elige` opciones válidas y distintas, y la última decisión de una oferta es la que vale (las anteriores quedan en el historial). Una entrada con `sesion` va a esa sesión si ya existe en el registro; si no, a la sesión donde está escrita;
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
  zeo.json                  # tabla de sx, ramas y reglas de las líneas de técnicas (ya creado)
  vitalidad.json            # fatiga, estados DOWN/K.O./Deadly y descansos (v0.8.2, ya creado)
  mana.json                 # Mana force inicial, SX por Gate, fuentes de MF y funciones (v0.8.3, cifras de ejemplo)
  mana-tags.json            # tags de Gates y sus pares incompatibles (v0.8.3, 13 tags de ejemplo; a futuro ~200)
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
- zeo con una cabecera compacta (nivel zeo = promedio de las tres ramas), las líneas activas, las líneas por activar y las 10 líneas de técnica, cada una con 5 niveles de varias técnicas;
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

Entre la ficha y el registro hay secciones plegables, todas cerradas la primera vez (el estado se recuerda en el navegador). **En Construir**: Borrador, **Feats y habilidades pasivas**, **Achievements y fate**, **Equipo**, **Méritos y defectos** (un solo desplegable desde la v0.8.2), **Tiradas de HP y MP**, **SX**, **Zeo**, **Mana** y **Magia**. **En Jugar**: **Feats y habilidades pasivas**, **Magia**, Equipo y Méritos y defectos son tarjetas siempre visibles (abajo), y quedan plegadas solo **Achievements y fate**, **SX**, **Zeo** y **Mana**. Cada cabecera muestra la cifra que importa (slots, fate, saldo de puntos, HP y MP máximos, nivel zeo, mana…).

**Listas de una línea con tooltip (v0.8.2) [DECIDIDO].** Los feats pasivos, el equipo y los méritos y defectos comparten el mismo formato en Jugar: una fila de aproximadamente una línea por elemento, con el nombre subrayado con puntos y **el detalle en un tooltip**. El tooltip sale con el cursor, con el foco del teclado (Tab) y con un toque, se cierra con Esc o al tocar fuera, y se recoloca para no salirse de la pantalla. Equipo muestra la armadura y cada extremidad con el tipo de objeto y las cargas (`9/10`); Méritos y defectos muestra primero los méritos y después los defectos en una misma lista, con su valor a la derecha (`−3` un mérito que cuesta, `+2` un defecto que aporta), y debajo los traits. El saldo (`Iniciales 4 + defectos 3 − méritos 5 = 2`) es un chip con el desglose en el tooltip. Las dos tarjetas van una junto a la otra en pantalla ancha.

**Retrato.** Si el personaje trae `imagen` se muestra en el marco 4:5; si no, aparece un marco con las iniciales. En Construir, «Cambiar retrato» elige una imagen local (solo en ese navegador) y «Quitar» la descarta.

**Vistas.** Un botón en la cabecera (la última elegida se recuerda):

- **Jugar**: la versión reducida para la mesa. Misma ficha, y HP suma **fatiga, estados y marcas de umbral**, y la ficha suma **Recuperación** (v0.8.6): las tasas de HP y de MP por hora y los descansos corto (2 h) y largo (8 h, +50 %), que recuperan HP y MP a la vez (1.2). **Feats y habilidades pasivas (v0.9.1)** no es un desplegable: es una tarjeta siempre visible con los feats **pasivos como una lista de una línea con tooltip** (nombre y enlace) y, en la misma tarjeta, las **habilidades pasivas de la clase** con su nivel y su arquetipo (6.5). **Magia** es la tarjeta siguiente, siempre visible: la progresión de conjuros de la clase (si lanza) y **una tarjeta por cada habilidad activa**, de la clase o de un feat activo reclasificado (4.2, 6.2); debajo van Equipo y Méritos y defectos con el mismo formato. Sin selectores, sin borrador y **sin las tiradas de HP y MP**.
- **Construir**: agrega los selectores, el borrador, las explicaciones de las reglas y la construcción de HP y MP (**Tiradas de HP y MP**, que ya no aparece en Jugar). No muestra fatiga ni recuperación: son de la mesa.

**Selector de feats** (dentro de Feats, vista Construir):

1. Búsqueda por nombre, filtro por tipo y «solo los que puedo tomar». La lista está en un recuadro con scroll propio (alto máximo de unos 440 px).
2. Cada feat muestra sus requisitos como chips: «✓» se cumple, «✗» no se cumple y «?» el visor no lo puede comprobar. «Elegir» se habilita solo si se cumplen los requisitos comprobables y hay un slot libre; los feats repetibles piden una elección.

**Achievements** (dentro de Achievements y fate, vista Construir): el catálogo completo con buscador y recuadro con scroll; cada fila muestra su fate y un botón «Asignar», que se deshabilita si el nivel ya tiene achievement (con un aviso que explica por qué) o si ya está ganado.

**Tiradas de HP y MP** (solo vista Construir): lista las tiradas por nivel (dado, resultado, modificador y total) y, si faltan niveles, ofrece elegir el dado y **Tirar** (el visor tira por ti) o escribir el resultado de tus dados y **Registrar**.

**Borrador.** Todo lo que se elige, asigna o tira va a un borrador: una sesión provisional que el motor calcula como si ya estuviera en el personaje (slots, requisitos, máximo por nivel, fate). Cada acción muestra un aviso flotante con un acceso directo a «Ver borrador». Se puede quitar cualquier entrada; si una entrada deja de ser válida se marca con su error. El borrador se copia como JSON y se pega en la lista `entradas` de una sesión de `characters/<id>.json`. **El visor no escribe en los personajes**: el borrador solo vive en el navegador (`localStorage`), por personaje.

**Añadir y quitar en Construir [PROPUESTA].** El registro es de solo añadir, así que *añadir* es crear una entrada en el borrador (hoy: feats, achievements y tiradas; a futuro: objetos, méritos, Gates y MF con el mismo patrón de tarjeta) y *quitar* es sacarla del borrador, o añadir la entrada compensatoria (`perder`, `desequipar`). **El JSON sigue siendo la fuente de verdad** y es el camino para corregir el historial; las tarjetas son una comodidad para armar entradas válidas sin escribir JSON a mano. Mientras no se elija cómo guardar (10.6), el paso del borrador al archivo sigue siendo copiar y pegar.

**Zeo (v0.9.1).** Las líneas de técnicas se dibujan como slots: cada línea muestra sus 5 niveles con casillas llenas (técnicas tomadas), huecas (opciones visibles sin tomar) y punteadas (todavía ocultas), y el nombre de las técnicas que lo tienen. Se dibujan las ocupadas y **una sola libre**. En Construir hay un formulario para registrar una técnica (línea, nivel y nombre opcional).

**SX, Zeo, Mana y Magia** se pliegan igual que el resto. **SX** (v0.8.4) es la reserva común de Zeo y Mana, con sus formularios para registrar y asignar SX en Construir (4.1.3). **Estrella Mana** (v0.8.3; renombrada en la v0.9.6) tiene el grafo circular de Gates, la lista de slots, el requisito del siguiente Gate y la contabilidad de MF (4.1.2); en Construir, cada slot permite elegir una habilidad e **Inscribir** o **Quitar**, y además los formularios de **Mana force** y de **Construir un Gate** (v0.8.4). Todo esto va al borrador como entradas `sx`, `sx-asignar`, `xp-subsistema`, `mana-fuerza`, `gate`, `mana-tecnica`, `mana-tecnica-sx`, `inscribir` y `desinscribir`; las sesiones del registro muestran como chips los Gates, la Mana force, el SX de la reserva y las inscripciones. **Magia** lista las habilidades tipo conjuro (los feats activos convertidos, 6.2) con los slots donde están inscritas y con el costo en mana marcado como pendiente.

### 10.6 Notas, resumen y opciones por sesión (v0.9.9) [DECIDIDO: opción A]

**Necesidad (dicha por el diseñador):** cada jugador toma notas y el GM también; **cada sesión tiene una imagen general puesta por el GM**; y cuando el GM da **recompensas opcionales a elegir**, el jugador marca su decisión y queda anotada como parte de la sesión, con **dos métodos: decisiones de grupo y decisiones individuales**. Para juntar lo que escribe cada uno se parte de la **opción A: exportar e importar archivos** (el visor ya trabaja así con el borrador).

**Modelo.** Todo son entradas del registro (sección 8), así que se versionan con el resto y el motor las valida:

- **Imagen y resumen del GM.** Cada sesión puede llevar `imagen` (una ruta relativa a `characters/`, un `data:` URI o una URL) y `resumen` (texto); el campo `notas` de siempre vale como resumen si no hay `resumen`. La entrada `resumen` los fija desde el visor (y, con `sesion`, en una sesión ya cerrada). `scripts/build-standalone.js` convierte las rutas relativas en `data:` URI, igual que el retrato. En el visor, el formulario del GM también acepta un archivo, que se reduce a 720 px de ancho (JPEG) y se guarda dentro de la entrada.
- **Notas por autor.** Una entrada `apunte` lleva `autor`, `rol` (`jugador` o `gm`) y `texto`; cada autor escribe solo las suyas. El visor las agrupa por autor, con el GM primero, en una pestaña plegable «Notas» de cada sesión. Una nota con `sesion` va a esa sesión aunque esté escrita en otra (sirve para completar una sesión ya cerrada); sin `sesion`, va a la sesión donde está.
- **Opciones.** El GM ofrece con `opciones` (`titulo`, `texto` opcional, `alcance`, `elige` cuántas se escogen y la lista de `opciones` con `id` y `texto`). El jugador marca con `decision` (`opciones`: id de la oferta, `elegidas`: ids, `nota` opcional). La oferta y su decisión se ven en una **pestaña plegable «Opciones»** de la sesión donde se ofreció, aunque la decisión se anote después: ahí se ve lo elegido, si está en borrador y cuántas veces se cambió. Las pestañas con opciones sin decidir se abren solas la primera vez, y arriba de la ficha aparece el aviso «Hay N opciones por decidir» con un botón que lleva a ellas.
- **Grupo o individual.** `alcance: "grupo"`: **una sola decisión para todo el grupo**; quien la anota la copia al archivo de cada personaje (la importación de abajo sirve para eso). `alcance: "individual"`: **cada jugador decide por su personaje** y se la pasa al GM. El motor trata las dos igual; la diferencia es el rótulo («Decisión del grupo» o «Decisión de <personaje>») y cómo se reparte.
- **[SUPUESTO] Las decisiones son informativas.** Elegir una recompensa **no aplica nada**: si el premio es XP, un feat o un objeto, el GM escribe la entrada correspondiente en el registro. Así el visor no inventa reglas de recompensas.
- **Sesión en curso.** Las notas se escriben en el borrador, que es la sesión que viene: el bloque «Sesión en curso» (arriba de Sesiones, en Jugar y en Construir) tiene el formulario de notas (autor y rol se recuerdan en este navegador) y lista lo que el borrador lleva. Cuando el GM cierra la sesión, pega el JSON del borrador en sus `entradas`.

**Flujo de la opción A.** El jugador escribe sus notas y marca sus decisiones en su visor → **Copiar JSON** del borrador (pegado en un mensaje o en un archivo `.json`) → se lo pasa al GM → el GM lo pega en **Notas y opciones → Importar** (o abre el archivo) → revisa el borrador → lo copia a las `entradas` de la sesión. La importación **solo admite notas, resúmenes, ofertas y decisiones** (un feat o un objeto del otro jugador se ignora), omite lo repetido (ya en el borrador o ya en el registro) y deja a la vista, con «Con error», lo que el motor no acepta (por ejemplo, una decisión de una oferta que ese personaje no tiene). No hay edición en vivo: cada autor ve lo suyo y el GM junta.

**Almacenamiento: las alternativas que no se eligieron.** Con la arquitectura actual no hay un almacenamiento compartido; el visor es una página estática. Cada autor toca solo lo suyo, así que nadie se pisa, pero nadie ve en vivo lo del otro.

| Opción | Cómo llegan las notas al GM | Costo | En vivo |
|---|---|---|---|
| **A. Exportar e importar archivos [ELEGIDA]** | Cada jugador copia o descarga el JSON de su borrador y se lo pasa al GM, que lo importa | Ninguno | No |
| B. Git | Cada jugador sube su archivo al repo; el GM junta y resume | Cuenta de GitHub por jugador | No |
| C. Base de datos compartida | Todos escriben en la misma base | Un backend, o la base compartida de los Artifacts de claude.ai (no se ha comprobado para esta cuenta) | Sí |

- **[PENDIENTE]** Pasar a C solo si hace falta ver las notas en vivo. Falta decidir si una decisión de grupo debe poder anotarse de una vez en los archivos de todos los personajes (hoy se copia a mano con la importación) y si una recompensa elegida debería poder traer la entrada del registro que la aplica.

## 11. Hitos

Estado en v0.9.0: el motor (M1) y el visor (M2) están implementados y probados localmente (76 pruebas), incluido el mana por Gates; M3 está avanzado (catálogo de 665 feats con requisitos estructurados, achievement feats y conversión de activos; faltan revisar los candidatos a activo y los efectos). Falta activar GitHub Pages. M0 (importar pixelkeep) sigue pendiente.

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

### Zeo (nivel por técnica más alta, v0.9.4)

- Rama = rango más alto entre las técnicas de sus líneas **activas**; nivel zeo = `(heaven + earth + void) / 3`. Ejemplo: heaven 3, void 2, earth 1 → nivel zeo 2 (exacto 2; `nivelEntero` 2). Con heaven 4, void 3, earth 2 → 3.
- Las líneas por activar (`activa: false`) no suben ninguna rama. `zeo-activar` las pasa a activas; el costo es `10 + líneas activas + nivel zeo (entero)`. Con 7 activas y nivel zeo 2 cuesta 19.
- El costo de un rango sale de `costoPorRango`: 10, 20, 30, 50 y 80 para los rangos 1 a 5; no influye en el nivel de las ramas.
- Opciones visibles de una línea (v0.9.2): el nivel 1 muestra **1** (la técnica inicial); sin técnica en el nivel anterior, 0; con 1, 2 y 3 técnicas de nivel 2 el nivel 3 muestra 3, 4 y 5; el nivel 4 sube igual hasta 5; los niveles 2 y 5 se quedan en 3.
- Una línea con técnicas 1×1, 2×3 y 3×1: opciones visibles por nivel `[1, 3, 5, 3, 0]`, libres `[0, 0, 4, 3, 0]`. Una línea vacía: `[1, 0, 0, 0, 0]`.
- Catálogo de técnicas (v0.9.3): ids únicos en todo el catálogo, ramas válidas y 10 líneas sin origen. Una raíz se resuelve por nombre o id (sin tildes ni mayúsculas) y la línea la muestra con su rama y las mejoras del nivel; una mejora de otra línea, de otro nivel, una raíz usada como mejora, una mejora usada como raíz, una raíz en dos líneas, un nombre repetido y una raíz «de fuera» en un slot inicial dan error. Una raíz propia acepta nombres propios con descripción, pero no mejoras del catálogo. Las líneas extra piden origen, salen en orden (L11, L12…) y no cuentan en `slots`; la descripción propia gana a la del catálogo. Las 10 raíces de Musashi se resuelven en el catálogo.
- `zeo-tecnica`: línea L11 sin origen, nivel 6, nivel sin abrir, nombre vacío y el uso de `zeo-linea` dan error; una cuarta técnica de nivel 2 con solo 3 opciones da error, y una segunda técnica de nivel 1 también (solo hay una); un nombre repetido en la línea da error.
- Slots de línea: sin técnicas, 0 de 10 ocupados y primera libre L01; con L01 y L03, 2 ocupados y primera libre L02.

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
- Un descanso que no existe en `data/vitalidad.json`: error.

### Habilidades de clase, arquetipos y alineamiento (v0.9)

- Monk nivel 1: Bonus Feat, Improved Unarmed Strike, Flurry of Blows, Stunning Fist y AC Bonus; la siguiente es Evasion (2). Nivel 7: suma Wholeness of Body y no tiene Improved Evasion (9). Fast Movement en el nivel 7 ya tiene la mejora del 6 y la próxima es la del 9.
- Sombra asesina en el nivel 20: no tiene Stunning Fist, Maneuver Training, Purity of Body, Wholeness of Body ni Quivering Palm, y sí sus cinco sustitutas; el número de habilidades no cambia. En el nivel 7 todavía no tiene Death Attack (llega al 15).
- Polímata sin escuela, nivel 7: 6 slots de feat (4 + extras de los niveles 1 y 4), próximo slot en el nivel 8, sin Arcane School y con Polymath Training. Sin arquetipo: 4 slots y con Arcane School. Seis feats caben; el séptimo da «no hay slot de feat libre en el nivel 7 (6 slots)». Slots totales: nivel 1 → 2, 3 → 3, 4 → 4, 8 → 7, 20 → 16.
- Arquetipo que no existe: error con los que hay (`sombra-asesina`). Arquetipo de una clase sin archivo: error. Clase sin archivo (Fighter): sin `clase` y sin errores.
- Alineamiento `L.N` → Legal neutral, `n.b` → Neutral bueno, `N.N` → Neutral puro, `C.M` → Caótico malo; `LN`, `L.G`, `X.N`, vacío y `null` no valen. Un valor mal escrito en el personaje es un error.
- `data/clases/*.json`: ids únicos, niveles de 1 a 20, ejecución `pasivo` o `activo`, mejoras ordenadas y posteriores a la habilidad, `reemplaza` y `sustituye` apuntan a habilidades que existen, `featsExtra` ordenados. Niveles del Monk: Evasion 2, Ki Pool 4, Wholeness of Body 7, Abundant Step 12, Quivering Palm 15, Perfect Self 20.
- Personajes de muestra (v0.9.5): Musashi Nanaya (nivel 7, **HP 57 con tiradas d8 8+2+6+8+4+7+8 y CON +2 por nivel, MP 28 con tiradas d6 6+4+4+4+4+3+3**, 4 de 4 slots, Zeo 2) y Herb'Azzio (nivel 7, dados d4 y d10, **Mana nivel 2, MF 15, dos Gates (Oro = Sentidos y Fuego = Capacidad) con *Sagita Lux Magica*, *Heat Pulse* y *Senderos de la Magia* inscritos, la técnica activa *Circle Activation* y el contenedor de *Parallel World Casting* en 0 de 200 SX**); ninguno tiene errores ni avisos.
- Progresión de conjuros del mago (v0.9.8): un nivel de conjuro nuevo cada 3 niveles y las cantidades de la fila del nivel. Nivel 1 → 2 trucos (3 en la tabla, a la mitad) y 1 de nivel 1; nivel máximo de conjuro 1 en los niveles 1 y 2, 2 en el 3, 3 en el 6, 4 en el 9, 5 en el 12, 6 en el 15 y 7 en el 18 (y el 20); cantidades (de nivel 1 en adelante): nivel 3 → 2, 1; nivel 5 → 3, 2; nivel 6 → 3, 3, 2; nivel 7 → 4, 3, 2; nivel 9 → 4, 4, 3, 2; nivel 20 → 4 en cada uno de los 7 niveles; las llegadas son los niveles 1, 1, 3, 6, 9, 12, 15, 18, 21 y 24. Siempre hay al menos N conjuros por día a nivel N. Herb'Azzio (nivel 7): trucos 2, nivel 1 ×4, nivel 2 ×3, nivel 3 ×2, y el nivel 4 llega en el 9 y el 5 en el 12. El monje y una clase sin archivo no tienen progresión (`null`).

### Recuperación por hora (v0.9.2)

- Con C = bono: `V = (H − 5 − 5·C) / (5 + C)` y `R = C + V/10`; meter V en `H = (5 + C)·V + 5 + 5·C` devuelve H.
- HP (bono de CON): H 5 y bono 0 → 0; H 500 y bono 0 → 9,90; H 500 y bono +10 → 12,9667; H 56 y bono +1 → 1,7667 por hora.
- Punto cero: con bono 0, H de 1 a 5 da 0 (la R bruta es negativa y se recorta) y H 6 da 0,02. Con H hasta 270, subir el bono nunca enlentece la recuperación; con H 500, el bono +2 da 8,93, menos que el bono 0 (9,90).
- Un bono negativo cuenta como 0 (H 56 con bono −4 da lo mismo que con 0). Sin máximo (H 0), R = 0.
- MP (bono de SPR, ×5): H 20 y bono 0 → 1,5 por hora; H 500 y bono 0 → 49,5.
- Descansar con H 56 y bono +1 desde 10 HP: corto (2 h) → +3; largo (8 h, +50 %) → +21; desde 40 el largo llega al máximo de 56 (+16). Un HP de 60 (sobre el máximo) no se baja; desde −10, el corto da +3 (queda −7).
- Descansar con MP 20 y bono 0: el corto da +3 y el largo +18; con MP 500 y bono 0, el corto da 99 y el largo llena los 500.
- `data/vitalidad.json` trae la fórmula (`desplazamiento` 0 y los demás números), los recursos (`hp` con CON ×1 y `mp` con SPR ×5) y solo dos descansos (2 h y 8 h con extra 0,5).

### SX compartido: reserva y asignación (v0.8.4)

- 30 SX en la reserva y nada asignado: reserva 30, Zeo 0 y Mana 0.
- Con 30 en la reserva, asignar 12 a Mana y 10 a Zeo (void): reserva 8, Mana 12 y void 10; la sesión anota `sxGanado` 30 y dos asignaciones.
- `xp-subsistema` de 40 a Mana más 5 a la reserva: reserva 5, directo 40, total 45.
- Rechazados: asignar más de lo que hay (11 de 10), asignar con la reserva vacía, destino que no sea zeo ni mana, Zeo sin rama, cantidad 0 o negativa. Un rechazo no toca la reserva.
- Un Gate sin SX suficiente pero con SX en la reserva: el error avisa «hay 30 SX sin asignar»; asignando antes a Mana, el Gate se construye.

### Mana: Gates y slots (v0.8.3, implementado)

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

Otros casos de Mana (con los datos de ejemplo):

- SX por Gate: el Gate 1 exige 10 SX, el 2 exige 20, el 3 exige 40 y el 4 exige 80. Un Gate sin SX suficiente, sin MF suficiente, con un tag que no existe, con un `id` repetido o sin `oportunidad` es rechazado.
- La tabla de compatibilidad es simétrica: si fuego es incompatible con agua, agua lo es con fuego. Con g1 hielo, g2 oscuridad y g3 fuego (hielo y fuego incompatibles) hay 3 Gates, 2 nodos, 0 círculos y 5 slots.
- Un nodo o un círculo hereda los tags de sus Gates; la función es solo del Gate.
- Inscribir en un slot que no existe, en uno ya ocupado (hay que desinscribir antes) o una habilidad que el personaje no tiene: rechazado. La misma habilidad puede ir en varios slots **[SUPUESTO]**. Desinscribir un slot vacío: rechazado.
- Perder MF sin nota, o dejar la MF bajo 0: rechazado. Una raza con `manaFuerza` cambia la MF inicial.
- El personaje de ejemplo (MF 4: base 1, lobo +1 y faro +2; 120 SX) tiene 3 Gates y 5 slots, con Power Attack inscrito en g1; el siguiente Gate exige MF 8 y 80 SX.

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
3. Zeo: las descripciones y los efectos de las técnicas, cómo se ganan los sx, si el rango de una técnica exige nivel zeo o de rama, si el costo de rango (10/20/30/50/80) y el de activar una línea se **descuentan** de una reserva (hoy se muestran, no se cobran) y el redondeo del nivel zeo en el costo de activar (hoy hacia abajo). Mana: su tabla de XP.
4. Mana: ya no es un atributo que se gasta sino la serie de Gates (4.1.2), implementada en v0.8.3 con cifras de ejemplo. Quedan los valores reales (ver 23).
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
19. Notas de jugadores y del GM: la opción A (exportar e importar archivos) está elegida (10.6); falta decidir si hace falta ver las notas en vivo (opción C) y si una decisión de grupo se anota en los archivos de todos los personajes de una vez.
20. Clases: el catálogo trae las 37 clases de Pathfinder 1e con su progresión de ataque base; decidir cuáles se permiten en el sistema y si hay clases propias.
21. HP y MP: dado de cada clase para HP y para MP, relación del MP con el mana ganado, si MND tiene efecto y si el HP y el MP actuales deben entrar al registro (1.1). La recuperación de MP ya está definida (1.2).
22. Achievements: sustituir las 12 entradas de ejemplo por la lista real, con su fate y sus condiciones.
23. Mana por Gates (4.1.2): sustituir los 13 tags de ejemplo por la tabla real (~200 tags y sus pares incompatibles), fijar el SX por Gate y si se gasta, el valor de cada fuente de MF, qué hace cada función, si el GM puede forzar o romper una conexión, si lo inscrito debe coincidir con el tag del slot, y qué hace falta para borrar o corregir un Gate ya construido. Ya está decidido que nodos y círculos son aditivos y que los Gates conectan por defecto salvo incompatibilidad.
24. Magia: sistema y edición del catálogo de conjuros, origen de los datos y escuelas por clase (4.2). **Progresión del mago (v0.9.8):** el ritmo de 3 niveles está decidido; confirmar los conjuros extra por INT y por escuela, y cómo se relacionan los conjuros por día con los slots de Mana.
25. Habilidades de clase (6.5): **ya están Monk y Wizard**; faltan las demás clases si se llegan a usar, y ajustar las cifras de los dos arquetipos homebrew. El detalle son resúmenes propios (el texto completo de Paizo sigue pendiente de la regla de la sección 15 de la OGL).
26. Fatiga y recuperación (1.2): a qué se aplica el penalizador de fatiga, qué significan DOWN, K.O. y Deadly en la mesa, y si el largo recarga las cargas del equipo.
27. Recuperación de MP (1.2): confirmar que «×5» se aplica a la tasa final y no a otro término, y la relación del MP con el mana de 4.1.2.
28. Recuperación por hora (1.2): el redondeo hacia abajo, el recorte del bono y de R a 0, que el +50 % del largo aplique también al MP, y qué hacer con el punto cero (H ≤ 5 no recupera con bono 0) y con la rareza de que desde H ≈ 280 subir el bono enlentece la recuperación.
29. SX compartido (4.1.3): si el SX se gasta de verdad al construir Gates o subir ramas, si se puede reasignar, y si la reserva tiene tope.
30. Alineamiento (1.3): hoy es solo una etiqueta; falta decidir cómo entra el Alignment Spiral (Score, Rank, personas) al ledger.
31. Personajes de muestra (Musashi Nanaya y Herb'Azzio): los atributos, tiradas de HP y MP, feats y equipo son un **borrador** a revisar; la raza «Humano» y los objetos nuevos son marcadores de ejemplo. Musashi (v0.9.4): sus atributos salen de la hoja (Hoja2, K2:L12); Zeo con 7 líneas activas (Ki Mark, Ki Vision, Sensitive Ki, Sense Burst, Wall Runner, Battle Mind, Deep Meditation, Hearthwarm; heaven 3, void 2, earth 1 → nivel zeo 2, como el «ZEO LEVEL 2» de la hoja) y 3 líneas por activar (Salto Flotante, Técnica de Muerte, Tetsu no hada); habilidades Stealth, Sentir motivo, Climb, Intimidación y Perception; `tagXp` «tracker». HP 57 sale de tiradas ajustadas; **el dado de MP (d10) y sus tiradas son inventados** para llegar a MP 49 (con d6 no se alcanza): falta el dado real. La hoja dice «Bono HP 1» y el motor deriva CON = menor de STR y DEX = 14 → +2. Las filas «OUT» y «+N» son solo log. **v0.9.5:** las tiradas de HP y MP de Musashi son las de su hoja (HP 57 coincide; **su MP da 28 y no 49 porque la hoja sumaba +3 por nivel y el motor deriva SPR = menor de WIS y CHA = 11 → +0**). Las tiradas de HP (d4) y MP (d10) de Herb'Azzio son **provisionales** (nivel 1 al máximo y el resto al promedio redondeado hacia arriba) hasta tener las reales; el MP de Herb'Azzio sale 53 con SPR 12 (+1 por nivel). Sus 20 SX de mana, que justifican los dos Gates, son un **supuesto**; «usa estrella Mana lv2» se leyó como Mana nivel 2; **v0.9.6: «Estrella» es el nombre del subsistema** (Estrella Mana, igual que Estrella Zeo), independiente de la progresión normal.
32. **El diseñador entregará las descripciones de las técnicas de Zeo y el equipo** (entregadas: la línea Sentir el Ki salvo Long Range Sense, v0.9.10, y las raíces de Tracción de Ki, Meditación, Ocultar el Ki y Blank Mind, v0.9.11); con eso se corrigen conjuros, clases y Zeo (v0.9.3 deja el catálogo con los nombres de la hoja y las descripciones vacías).
33. Zeo (4.1.1): qué significan las filas «+N» y las de las rondas de la hoja, si el rango de una técnica exige el nivel zeo o el de su rama, el nivel 5 (sin opciones en la hoja) y qué es «Tech Zlv».

---

## Cambios respecto a versiones anteriores

### v0.9.12

- **Visor [DECIDIDO a pedido del diseñador]:** las descripciones de las técnicas de Zeo ya no se muestran desplegadas. Cada técnica es un **chip de una línea** (tomada con relleno, pendiente con borde punteado) y su descripción sale en el **tooltip**, como en las listas de Equipo y Méritos. Cada línea abierta lleva una frase de ayuda («Pasa el cursor o toca una técnica…»). Una línea de Sentir el Ki pasó de unos 1400 px a unos 450 px de alto en una ventana de 1000 px.
- **Tooltips con el dedo:** tras un toque, un `mouseout` sintético del navegador ya no cierra el cuadro; se cierra con el siguiente toque fuera o al desplazar la página. Vale para todos los tooltips.
- Sin cambios en los datos, el motor ni las pruebas (108).

### v0.9.11

- **Descripciones de cuatro raíces de Zeo [DECIDIDO, texto del diseñador]:** `data/zeo-tecnicas.json` (0.4.0) lleva el texto de la raíz de **Tracción de Ki** (camina por superficies verticales; carga máxima 2,5 kg + 0,2 kg por nivel Zeo; 5 s tocando la superficie para activarla), **Meditación** (semitrance: MP +25 % + 5 % por nivel Zeo, HP +10 % + 2 % por nivel Zeo; 1 pt de fatiga a INT por hora continua, hasta la mitad de INT), **Ocultar el Ki** (nivel percibido baja el nivel Zeo con mínimo de la mitad; +5 a esconderse y Stealth; no se puede correr ni combatir) y **Blank Mind** (vaciar los pensamientos para proteger la mente).
- **Sense Burst [DECIDIDO, reemplaza la versión de la v0.9.10]:** ahora es una onda circular invisible e insonora que solo produce una brisa, de activación rápida, débil contra criaturas diminutas y humanos a ras de piso, siempre horizontal, con su radio máximo a la altura de la cintura; sinergia con Ki Mark y **no compatible con Sensitive Ki**. Desaparecen el radio de 20 m y las 2 o 5 preguntas del texto anterior. Musashi tiene ambas técnicas: la incompatibilidad es de uso simultáneo, no impide tomarlas.
- **[PENDIENTE] cifras que el diseñador debe confirmar:** (1) el radio de Sense Burst se escribió «6mt2 + zlv mt2» y el texto lo conserva tal cual; (2) Meditación no dice **cada cuánto** recupera su 25 % de MP y su 10 % de HP (por meditación, por hora u otra unidad); (3) «reaccionar más rápido que una persona durmiendo (como un 50 %)» no dice qué mide ese 50 %; (4) la descripción de Blank Mind termina en «puede ser usada para ignorar cosas», que quizá esté incompleta. Todas son informativas; ninguna regla las usa.
- 108 pruebas.

### v0.9.10

- **Descripciones de Sentir el Ki [DECIDIDO, texto del diseñador]:** `data/zeo-tecnicas.json` (0.3.0) lleva el texto de la raíz y de 8 mejoras: Ki Mark, Ki Vision, Sensitive Ki (nivel 2), Sense Burst, Blind Ki, Shadow Mark (nivel 3), Ki Snooping y Chi of the Land (nivel 4). Falta Long Range Sense. El visor ya mostraba la `descripcion` del catálogo, así que aparecen solas en la línea de Zeo de Musashi.
- **[DECIDIDO] lectura de dos frases:** Shadow Mark dice «hasta 2 blancos + nivel Zeo» (2 más el nivel zeo del personaje) y «inmunes a Sentir el Ki o derivados menores a nivel 3» (derivados de nivel menor a 3). El diseñador confirmó la lectura en la v0.9.11. Son informativas; ninguna regla las usa.
- 107 pruebas.

### v0.9.9

- **Notas, resumen y opciones por sesión [DECIDIDO la opción A]:** cada sesión puede llevar la imagen y el resumen del GM, las notas de cada autor (jugador o GM) y una pestaña plegable «Opciones» con ofertas del GM que el jugador decide, de **grupo** o **individuales** (10.6). Entradas nuevas `resumen`, `apunte`, `opciones` y `decision`; `resultado.opciones` (`lista`, `pendientes`) y, en cada sesión, `resumen`, `imagen`, `apuntes` y `opciones`. El visor suma el bloque «Sesión en curso», el plegable «Notas y opciones» (formularios del GM e importación de JSON de otros jugadores en Construir), el aviso de opciones por decidir y la importación también desde un archivo `.json`. `characters/ejemplo.json` trae un ejemplo (con la imagen `characters/sesiones/mercado-de-sombras.svg`).

### v0.9.8

- **Tarjeta Pasivas y «Magia y habilidades» [DECIDIDO]:** la tarjeta de feats y habilidades pasivas pasa a ser una tarjeta alargada con los títulos arriba y, debajo, el desglose línea por línea de lo que suman (+4 a la CA, +2 a las salvaciones contra encantamiento…), agrupado por Defensa, Salvaciones, etc. (6.6). Todo lo que necesita activación va a Magia, que ahora se llama «Magia y habilidades»: Sneak Attack pasa a activa y Spring Attack y Empower Spell se convierten en habilidades tipo conjuro. Archivos nuevos `data/efectos.json` y `data/feats.efectos.json`; `efectos` en las pasivas de `data/clases/*.json`; `resultado.ventajas` en el motor.
- **Progresión de conjuros del mago corregida [DECIDIDO el ritmo]:** un nivel de conjuro nuevo **cada 3 niveles** de personaje (nivel 3 → nivel de conjuro 2, 6 → 3, 9 → 4, 12 → 5, 15 → 6, 18 → 7…) y el nivel 1 da trucos y nivel de conjuro 1; las cantidades por día salen de la fila del nivel del personaje, sin contar los niveles de conjuro que aún no llegan, así que un mago de nivel N nunca tiene menos de N conjuros por día (4.2). `data/clases/wizard.json` cambia `retraso` y `retrasaDesde` por `ritmo: 3`. Herb'Azzio (nivel 7): trucos 2, nivel 1 ×4, nivel 2 ×3, nivel 3 ×2; el nivel 4 llega en el 9 y el 5 en el 12. *(La v0.9.7 repartía las cantidades a 2 filas por cada 3 niveles y dejaba a Herb'Azzio con 6 conjuros; era un error.)*

### v0.9.6

- **Magia = conjuros [DECIDIDO]:** `conjuro` solo admite conjuros del manual o propios; `categoria`, `aprendiendo` y `requisitos` se rechazan. `repertorio` trae solo `conjuros`, `porNivel` y `total`. Los conjuros ya no se inscriben en slots de Mana.
- **Trucos a la mitad [DECIDIDO la cantidad; SUPUESTO el redondeo]:** `data/clases/wizard.json` gana `conjuros.trucos { factor: 0.5, redondeo: "arriba" }`: 4 → 2 (los 3 del nivel 1 → 2). `porDia` suma `cantidadBase` y `conjuros` suma `proximos` (los dos próximos niveles de conjuro).
- **Estrella Mana [DECIDIDO]:** subsistema independiente de técnicas especiales, igual que Estrella Zeo. Nuevas entradas `mana-tecnica` (inscrita o activa, con `costoSx` opcional que la vuelve un contenedor) y `mana-tecnica-sx` (acumula SX en el contenedor, sin tocar Gates ni reserva); `inscribir` admite `tecnica`; el resultado trae `mana.tecnicas`. Parallel World Casting es un contenedor de 200 SX.
- **Herb'Azzio:** Gate de Oro = Sentidos y de Fuego = Capacidad; *Heat Pulse* inscrito en el de Fuego; sus técnicas pasan de Magia a Mana; sin conjuros en Magia por ahora.
- **Visor:** Magia sin textos explicativos y con tarjetas por día compactas más los dos próximos niveles; chips de trucos de tamaño normal; secciones **Estrella Zeo** y **Estrella Mana**; técnicas, contenedor y formularios en Estrella Mana; los slots ofrecen técnicas.
- **[PENDIENTE]** (Resuelto en la v0.9.7: el ritmo es de 3 niveles y el nivel 5 llega en el 12.) El redondeo de trucos al nivel 1 (3 → 2); si el contenedor de SX debe salir de la reserva de SX; el costo de usar cada técnica; las tiradas reales de Herb'Azzio; el texto de los conjuros.
- 96 pruebas.

### v0.9.5

- **Conjuros [DECIDIDA la estructura]:** nueva entrada `conjuro` (del manual por `id` o propio con nombre y nivel; técnicas activas; conjuros en aprendizaje con requisitos) y nuevo resultado `repertorio` (4.2). `data/conjuros.json` trae 1.491 conjuros de PF1e con sus datos de reglas y **sin** el texto (`scripts/import-conjuros.js`; `docs/FUENTES.md`). `inscribir` admite `conjuro` y exige nivel de conjuro ≤ nivel del slot.
- **Mana force por nivel [SUPUESTO la lectura]:** `mana-fuerza` admite `porNivel` (aporte que crece con el nivel): el contrato durmiente de Herb'Azzio con Ashura es `porNivel: 2` (14 de MF a nivel 7, MF total 15).
- **Nivel de Mana:** `mana.nivel` (0 a 3: Gate, nodo, círculo). **Gates con `funcion` y `oportunidad` opcionales.** Tag nuevo `oro`.
- **Visor:** Magia trae los conjuros por nivel como chips con tooltip de datos (los trucos, a la mitad de tamaño), técnicas y conjuros en aprendizaje; Construir trae «agregar del manual» y «crear»; los slots de Mana inscriben conjuros; el formulario de Mana force tiene «crece con el nivel» y el de Gate acepta función y oportunidad vacías. **Arreglo:** los borradores de Zeo (`zeo-tecnica`, `zeo-activar`) se perdían al recargar la página porque el visor no los reconocía al leer el navegador.
- **Personajes:** tiradas de Musashi de la hoja (HP d8 57; MP d6 28) y Mana, conjuros y contrato de Herb'Azzio (dados d4 y d10; tiradas provisionales).
- **[PENDIENTE]** Si «reduce los trucos a la mitad» era el tamaño en pantalla (así quedó) o la cantidad por día; «estrella Mana lv2»; las tiradas reales de Herb'Azzio; cobrar SX al aprender un conjuro y promoverlo; el texto de los conjuros.
- 95 pruebas.

### v0.9.4

- **Zeo: nivel por la técnica más alta [DECIDIDO]:** el nivel de una rama es el rango más alto entre las técnicas de sus líneas **activas**; el nivel zeo es `(heaven + earth + void) / 3` (`zeo.nivel` exacto, `zeo.nivelEntero` hacia abajo). Los sx 10/20/30/50/80 son el **costo de rango** de una técnica, no los niveles de las ramas. `data/zeo.json` pasa a la versión 0.7.0 (sin `niveles` ni `lectura`).
- **Líneas por activar [DECIDIDO; redondeo SUPUESTO]:** `zeo-tecnica` acepta `activa: false` en el nivel 1; la línea no cuenta para los niveles. Nuevo evento `zeo-activar { linea }`; el costo es `10 + líneas activas + nivel zeo` y solo se muestra (no se descuenta de los sx).
- **Origen = nota del log [DECIDIDO]:** Werewolf, Ninja y Knight cuentan cómo se adquirió la técnica (opciones ofrecidas; lo descartado queda anotado). Ya no se exige `origen` en las líneas L11 en adelante. `data/zeo-tecnicas.json` pasa a 0.2.0 con un `log` de filas «OUT», «+N» y rondas sin efecto de reglas.
- **Visor:** cabecera de Zeo compacta (nivel zeo y ramas, sin texto explicativo ni tarjetas de sx), líneas por activar aparte con el botón de activar, formulario de línea nueva con la casilla «por activar» y sin origen obligatorio, y chips de habilidades y de tag de XP.
- **Personaje:** campos nuevos `habilidades` y `tagXp` (1.3), validados contra `xp-config`; nuevo tag `tracker`. Musashi Nanaya cargado con su hoja (atributos de Hoja2, Zeo, habilidades, tag, HP y MP).
- **[PENDIENTE]** Dado y tiradas reales de MP de Musashi (d10 inventado), «Bono HP 1» contra CON +2, regla del bono del tag de XP, descuento de sx al activar o tomar rangos, descripciones de técnicas.
- 89 pruebas.

### v0.9.3

- **Catálogo de técnicas de Zeo [DECIDIDA la estructura]:** nuevo `data/zeo-tecnicas.json` (14 líneas, 57 técnicas con sus mejoras, tomadas de la hoja de Musashi: bloque de técnicas y filas «OUT»). Cada técnica tiene `descripcion` (hoy `null`). `zeo-tecnica` resuelve por id o nombre, valida línea y nivel contra el catálogo y acepta técnicas propias con su descripción.
- **Líneas extra:** de la L11 en adelante, en orden. *(En la v0.9.3 exigían `origen`; la v0.9.4 lo quitó: el origen es solo una nota del log.)* No cuentan en los slots iniciales; `zeo.extras` y `zeo.catalogo` son nuevos en el resultado.
- **Visor:** las líneas de Zeo son **desplegables** y el resumen muestra la técnica raíz, la rama y el origen; el cuerpo trae cada nivel con lo tomado, su descripción y las mejoras que faltan. Tres formularios en Construir (línea nueva, mejora del catálogo y otra técnica). Las 10 raíces de Musashi llevan ahora su nombre.
- **[PENDIENTE]** Filas «+N», rondas, rango contra nivel zeo y «Tech Zlv» (4.1.1, pendiente 33).
- 87 pruebas.

### v0.9.2

- **Recuperación: se revierte el C + 2 [DECIDIDO]:** C vuelve a ser el bono de CON (HP) o de SPR (MP), sin desplazamiento (`desplazamiento` 0). El MP usa la misma fórmula con **×5** en vez de ×10. Siguen los dos descansos (2 h y 8 h con +50 %). Vuelve el punto cero: con bono 0 y H ≤ 5 no se recupera. El ejemplo (H 56, bono +1) recupera 1,77 HP por hora (3 en el corto y 21 en el largo).
- **Zeo: la técnica inicial es una sola:** `opcionesPorNivel` pasa de `[3, 3, 5, 5, 3]` a `[1, 3, 5, 5, 3]`. El ejemplo se ajustó (la línea L01 ya no tiene dos técnicas de nivel 1). `data/zeo.json` v0.6.1.
- **Progresión del mago rehecha [SUPUESTO el retraso]:** igual a la de Pathfinder en el nivel 1 y hasta el conjuro de nivel 3, y ganando conjuros en cada nivel; **solo se retrasan 2 niveles los conjuros de nivel 4 en adelante** (el 4.º llega en el nivel 9). Nuevo campo `retrasaDesde` en `conjuros`. Herb'Azzio (nivel 7): trucos 4, nivel 1 ×4, nivel 2 ×3, nivel 3 ×2.
- 80 pruebas.

### v0.9.1

- **Zeo: 10 líneas de técnicas como slots [DECIDIDO la estructura]:** cada línea tiene 5 niveles y varias técnicas por nivel (3, 3, 5, 5 y 3 opciones como máximo). La primera técnica de un nivel abre 3 opciones en el siguiente y cada técnica extra del mismo nivel suma 1, hasta el tope. Reemplaza a los pisos por niveles acumulados. `data/zeo.json` pasa a la versión 0.6 (`lineas`); la entrada `zeo-linea` se sustituye por `zeo-tecnica` (línea, nivel y nombre opcional). El resultado trae `zeo.slots` y `zeo.reglas`.
- **Zeo en el visor:** las líneas ocupadas y una sola libre; formulario para registrar una técnica en Construir. Musashi tiene las 10 líneas ocupadas y Herb'Azzio ninguna (se ve un solo slot vacío). El personaje de ejemplo se migró a técnicas.
- **Progresión de conjuros [SUPUESTO el retraso]:** `data/clases/wizard.json` trae la tabla de conjuros por día del Wizard de Pathfinder 1e y un retraso de 2 niveles, así que el conjuro de nivel 4 llega en el nivel 9. El resultado trae `conjuros`; el monje no tiene.
- **Magia y habilidades de clase:** las **habilidades activas** de la clase pasan a la sección Magia, donde irían los conjuros, junto con la progresión de conjuros y los feats activos reclasificados. Las **pasivas** de la clase van **junto con los feats** en una sola tarjeta. En Jugar, Magia es ahora una tarjeta siempre visible. Desaparece la tarjeta aparte «Habilidades de <clase>».
- 80 pruebas del motor (antes 76).

### v0.9.0

- **Habilidades de clase por nivel [DECIDIDO; implementado para Monk y Wizard]:** un archivo por clase en `data/clases/` (`monk.json`, `wizard.json`) con las habilidades, sus mejoras por nivel y los arquetipos; el motor las resuelve (`habilidadesDeClase`, `resultado.clase`) y el visor las muestra como lista de pasivas y tarjetas de activas, con tooltip. Solo se cargan las clases en uso; las demás clases siguen sin detalle. Textos propios en español, niveles verificados en la SRD.
- **Arquetipos [homebrew]:** **Sombra asesina** (Monk: asesino ninja, sin engaño) y **Polímata sin escuela** (Wizard: cambia Arcane School por feats extra en los niveles 1, 4, 8, 12, 16 y 20). Un arquetipo sustituye habilidades y puede dar `featsExtra`, que **suman slots de feat** (6.1): `slotsTotalesEn` y `proximoSlot` lo tienen en cuenta.
- **Alineamiento (1.3):** campo `alineamiento` con la notación `ley.moral` (`L.N`, `N.B`) y campo `arquetipo` en el personaje, validados y mostrados bajo el nombre.
- **Personajes de muestra:** Musashi Nanaya (Monk, Sombra asesina, L.N) y Herb'Azzio (Wizard, Polímata sin escuela, N.B), nivel 7, con retrato propio. Atributos, tiradas, feats y equipo son un borrador. Nuevos datos de ejemplo: raza «Humano» y cinco objetos.
- 76 pruebas del motor (antes 69).

### v0.8.6

- **Recuperación por hora, ajustada [DECIDIDO]:** `C' = bono + 2` reemplaza a C en **las dos ecuaciones** (`H = (5 + C')·V + 5 + 5·C'`, `R = C' + V/10`), para bajar el punto de recuperación cero; ahora no hay punto cero (con bono 0, H ≥ 1 recupera). HP 56 con bono +1 pasa de 1,77 a **3,45 HP por hora**.
- **Recuperación de MP [DECIDIDO; antes DIFERIDO]:** la misma fórmula con H = MP máximo, **bono de SPR** y R **×10**. MP 20 con bono 0 da 20,71 por hora.
- **Dos descansos [DECIDIDO]:** corto de 2 h y largo de 8 h con **+50 %**; desaparecen los descansos intermedios, las horas libres y `horasParaMaximo`. Cada descanso recupera HP y MP a la vez. El motor expone `recuperacionPorHora(max, bono, cfg, recurso)` y `descansar(actual, max, descanso, bono, cfg, recurso)`.
- **Supuestos:** el ×10 va sobre la tasa final, el +50 % aplica al HP y al MP, el bono no baja de 0, el redondeo es hacia abajo. La rareza «subir el bono enlentece» ahora solo aparece desde H ≈ 540.
- **Visor:** dos chips (HP y MP por hora, con la fórmula en el tooltip) y dos botones de descanso que muestran lo que recuperan.
- 69 pruebas del motor (antes 66).

### v0.8.5

- **Recuperación por hora [DECIDIDO la fórmula]:** `H = (2 + C + 3)·V + 5 + 5·C` y `R = C + V/10`, con **C = bono de CON**; V se despeja y R sale en **HP por hora**. El descanso cura R × horas (corto 2 h, largo 8 h y horas libres). **Reemplaza** a la regla de 5e de la v0.8.3 y **elimina los Dados de Golpe** (`dadosDeGolpe`, `curaDadoDeGolpe` y `descansoLargo` desaparecen del motor; el motor expone `recuperacionPorHora`, `descansar` y `horasParaMaximo`).
- **Supuestos:** C y R no bajan de 0, el redondeo es hacia abajo y la curación no pasa del máximo. Sin el recorte de C la fórmula divide por cero con C = −5 y da recuperaciones enormes con bonos negativos. La recuperación de MP sigue **[DIFERIDO]**.
- **Visor:** el bloque Recuperación de Jugar muestra la tasa (con la fórmula en el tooltip), los dos descansos con lo que curan, un campo de horas libres y el tiempo hasta el máximo.
- 66 pruebas del motor: la fórmula, los recortes, el descanso, las horas hasta el máximo y la consistencia de `data/vitalidad.json`.

### v0.8.4

- **SX compartido [DECIDIDO el problema, SUPUESTO la solución]:** Zeo y Mana usan el mismo recurso y cada uno lo traía en su esquema. Ahora el SX se gana **sin destino** en una **reserva común** (`sx`) y se **asigna** después a Zeo (por rama) o a Mana (`sx-asignar`); `xp-subsistema` queda como atajo con destino. Resultado `resultado.sx`, sesiones con `sxGanado` y `sxAsignado`. Nueva sección 4.1.3.
- **Visor:** sección **SX** con la reserva y los formularios para registrar y asignar; formularios de **Mana force** y de **Construir un Gate** dentro de Mana (el tag avisa con qué Gates no conectaría); los chips de cada sesión muestran Gates, Mana force, SX de la reserva e inscripciones; Zeo y Mana avisan si hay SX sin asignar.
- **Recuperación por hora [PROPUESTA, sin implementar]:** el diseñador aportó `H = (C + 5)·V + 5 + 5·C` y `R = C + V/10`; se despeja V y R sale en HP por hora. Se probó con cuatro casos extremos y queda pendiente aclarar si C es el valor o el modificador de CON (1.2).
- 65 pruebas del motor (antes 59): reserva, asignación, atajo directo, rechazos y el aviso del Gate. El personaje de ejemplo suma 12 SX en la reserva sin asignar.

### v0.8.3

- **Recuperación de HP a la regla de D&D 5e [DECIDIDO; reemplazada en la v0.8.5 por la fórmula por hora]:** el diseñador pidió la regla más generosa entre Pathfinder 1e y 5e. El descanso largo (8 h) devuelve todo el HP y recupera la mitad de los Dados de Golpe (mínimo 1); el corto (2 h) permite gastar Dados de Golpe, cada uno cura la tirada más el modificador de CON (mínimo 1). Hay tantos dados como niveles. Reemplaza la fórmula `nivel × (1 + bono de cuerpo)` de la v0.8.2 y la función `curacionDescanso`; el motor expone `dadosDeGolpe`, `curaDadoDeGolpe` y `descansoLargo`.
- **Recuperación de MP [DIFERIDO]:** el MP también se recuperaría con el bono de CON pero con otra fórmula; se define después.
- **Mana por Gates implementado [las cifras son SUPUESTO]:** nuevas entradas `mana-fuerza`, `gate`, `inscribir` y `desinscribir`; MF con contabilidad por fuente; grafo de slots (Gates, nodos y círculos aditivos, los pares incompatibles no conectan); tabla de compatibilidad simétrica (`data/mana-tags.json`, 13 tags de ejemplo); reglas y cifras en `data/mana.json` (el Gate *k* exige MF ≥ 2^(k−1) y SX ≥ 10, 20, 40, 80…, sin gastarse). Antes de esto Mana solo estaba diseñado en la especificación.
- **Visor:** sección Mana con grafo circular, lista de slots con tooltip, requisito del siguiente Gate y contabilidad de MF; inscripción de habilidades en Construir vía borrador; Magia muestra en qué slots está inscrita cada habilidad; Recuperación con Dados de Golpe (cuenta por navegador).
- 59 pruebas del motor (antes 48): Dados de Golpe, descansos, grafo, tabla de compatibilidad, MF, SX por Gate, inscripción y consistencia de `data/mana.json` y `data/mana-tags.json`. El personaje de ejemplo suma 3 Gates, MF 4 y una habilidad inscrita.

### v0.8.2

- **Fatiga y estados [DECIDIDO]:** penalizador acumulativo según el HP actual (≤ 50 %: −2; ≤ 25 %: −6 en total; ≤ 10 %: −10 en total) y estados DOWN (HP ≤ 0), K.O. (≤ −25 % del máximo) y Deadly (≤ −50 %). El HP actual puede bajar hasta −máximo. Nueva sección 1.2.
- **Recuperación [reemplazada en v0.8.3 por la regla de 5e; se conserva como historia]:** descanso corto (2 h) y largo (8 h) con el valor de Pathfinder 1e (1 HP por nivel en 8 h) más un bono de cuerpo. Pathfinder 1e no tiene descanso corto ni usa CON, así que el corto es proporcional (2/8) y el bono es el modificador de CON por nivel. No recupera MP. Todo está en `data/vitalidad.json`, y el motor expone `umbralesVitales`, `estadoVital` y `curacionDescanso`.
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
- Notas de jugadores y del GM, y respuesta sobre el guardado simultáneo (10.6); desde la v0.9.9 el almacenamiento es la opción A (archivos que se exportan e importan), **[DECIDIDO]**.
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
