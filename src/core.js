/*
 * EverwhiteEmperor: motor de cálculo.
 *
 * Funciones puras. Reproducen el registro por sesión (ledger) de un personaje y
 * devuelven el estado derivado: XP, nivel, zeo, mana, fate, achievements,
 * feats, méritos y defectos, traits y equipo, más la lista de avisos.
 * Funciona en el navegador (window.Core) y en Node (require).
 *
 * Especificación: docs/ESPECIFICACION.md (secciones 3 a 8).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- utilidades

  function rotulo(id) {
    const t = String(id).replace(/-/g, ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function esEntero(n) {
    return typeof n === 'number' && Number.isInteger(n);
  }

  function redondear(valor, modo) {
    if (modo === 'floor') return Math.floor(valor);
    if (modo === 'ceil') return Math.ceil(valor);
    return Math.round(valor);
  }

  // ------------------------------------------------------------ XP y niveles

  /** Nivel, rango del nivel y progreso a partir de la XP total (sección 3.1). */
  function nivelDeXp(xp, cfg) {
    const por = cfg.xpPorNivel;
    const max = cfg.nivelMax;
    const nivel = Math.max(1, Math.min(max, Math.floor(xp / por) + 1));
    const inicio = (nivel - 1) * por;
    const fin = nivel * por;
    const progreso = Math.max(0, Math.min(1, (xp - inicio) / por));
    return { nivel, inicio, fin, progreso, faltan: Math.max(0, fin - xp), maximo: nivel === max };
  }

  function buscarMultDif(delta, lista) {
    for (const r of lista) {
      const d = r.delta;
      if (typeof d === 'number' && d === delta) return r;
      if (typeof d === 'string') {
        const m = /^(>=|<=)\s*(-?\d+)$/.exec(d.trim());
        if (m) {
          const n = Number(m[2]);
          if (m[1] === '>=' && delta >= n) return r;
          if (m[1] === '<=' && delta <= n) return r;
        }
      }
    }
    return null;
  }

  function combinarFactores(factores, modo) {
    if (modo === 'producto') return factores.reduce((a, b) => a * b, 1);
    if (modo === 'promedio') return factores.reduce((a, b) => a + b, 0) / factores.length;
    return Math.max.apply(null, factores);
  }

  /**
   * XP de una entrada de tipo "xp" (sección 3.2).
   * Lanza Error con un mensaje en español si la entrada no es válida.
   */
  function calcularXpEntrada(cfg, nivelPersonaje, entrada) {
    if (!esEntero(entrada.nivelContenido) || entrada.nivelContenido < 1 || entrada.nivelContenido > cfg.nivelMax) {
      throw new Error('nivelContenido debe ser un entero entre 1 y ' + cfg.nivelMax);
    }
    if (!esEntero(entrada.cantidad) || entrada.cantidad < 1) {
      throw new Error('cantidad debe ser un entero positivo');
    }
    if (!Array.isArray(entrada.tags) || entrada.tags.length === 0) {
      throw new Error('la entrada necesita al menos un tag');
    }

    const delta = entrada.nivelContenido - nivelPersonaje;
    const regla = buscarMultDif(delta, cfg.multDif);
    if (!regla) throw new Error('no hay regla de multiplicador para Δ ' + delta);

    const tags = entrada.tags.map(function (t) {
      const def = cfg.tags.find(function (x) { return x.id === t.id; });
      if (!def) throw new Error('el tag "' + t.id + '" no existe en xp-config.json');
      const grado = cfg.gradosTag[t.grado];
      if (!grado) throw new Error('el grado "' + t.grado + '" no existe (usa cumple o heroico)');
      let pct = grado.mult;
      if (t.pct !== undefined) {
        if (t.grado !== 'cumple') throw new Error('pct solo se usa con el grado cumple');
        if (typeof t.pct !== 'number' || t.pct < grado.mult || t.pct > grado.max) {
          throw new Error('pct ' + t.pct + ' fuera del rango ' + grado.mult + '–' + grado.max);
        }
        pct = t.pct;
      }
      const factor = def.mult * pct;
      return { id: t.id, nombre: def.nombre, grupo: def.grupo, grado: t.grado, pct: pct, factor: factor };
    });

    const factor = combinarFactores(tags.map(function (t) { return t.factor; }), cfg.combinarTags || 'max');
    const decisivo = tags.reduce(function (a, b) { return b.factor > a.factor ? b : a; }, tags[0]);

    let unidad;
    if (regla.xpFija !== undefined) unidad = regla.xpFija;
    else unidad = redondear(cfg.recompensaBase * regla.mult * factor, cfg.redondeo);

    return {
      delta: delta,
      mult: regla.xpFija !== undefined ? null : regla.mult,
      xpFija: regla.xpFija !== undefined ? regla.xpFija : null,
      factor: factor,
      tags: tags,
      decisivo: decisivo.id,
      unidad: unidad,
      total: unidad * entrada.cantidad,
    };
  }

  // -------------------------------------------------------------------- zeo

  function umbralesZeo(zeo) {
    const base = zeo.niveles.map(function (n) { return n.sx; });
    if (zeo.lectura === 'costo-por-nivel') {
      let acum = 0;
      return base.map(function (v) { acum += v; return acum; });
    }
    return base;
  }

  /** Nivel de una rama según sus sx. Con umbral i el nivel i+1 termina en umbral[i]. */
  function nivelDeSx(sx, zeo) {
    const um = umbralesZeo(zeo);
    const max = zeo.nivelMax;
    let nivel = 1;
    for (let i = 0; i < max - 1; i++) {
      if (sx >= um[i]) nivel = i + 2;
    }
    return Math.min(max, nivel);
  }

  function detalleRama(nombre, sx, zeo) {
    const um = umbralesZeo(zeo);
    const nivel = nivelDeSx(sx, zeo);
    const fin = um[nivel - 1];
    const inicios = [0].concat(um.slice(0, um.length - 1));
    const segs = um.map(function (f, i) {
      const ancho = f - inicios[i];
      return {
        nivel: i + 1,
        inicio: inicios[i],
        fin: f,
        ancho: ancho,
        llenado: Math.max(0, Math.min(1, (sx - inicios[i]) / ancho)),
      };
    });
    return { rama: nombre, sx: sx, nivel: nivel, fin: fin, falta: Math.max(0, fin - sx), segs: segs, limita: false };
  }

  /**
   * Opciones que muestra un nivel de una línea de técnicas (4.1.1). El nivel 1 muestra todas desde el inicio;
   * en los demás, la primera técnica tomada en el nivel anterior abre `opcionesBase` y cada técnica extra del
   * mismo nivel anterior suma `extraPorTecnica`, sin pasar del tope del nivel (`opcionesPorNivel`).
   */
  function opcionesVisibles(zeo, nivel, tomadasAnterior) {
    const cfg = zeo.lineas;
    const tope = cfg.opcionesPorNivel[nivel - 1];
    if (nivel === 1) return tope;
    if (!tomadasAnterior) return 0;
    return Math.min(tope, cfg.opcionesBase + (tomadasAnterior - 1) * cfg.extraPorTecnica);
  }

  /** Texto comparable: sin tildes ni mayúsculas ni espacios de más. */
  function normTexto(t) {
    return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Índice del catálogo de técnicas (data/zeo-tecnicas.json). Una técnica se busca por id o por nombre y devuelve
   * `{tipo: 'raiz'|'opcion', linea, nivel, id, nombre, descripcion}`; las mejoras traen además su nivel.
   */
  function indexarTecnicas(lineas) {
    const idx = { lineas: {}, porClave: {} };
    const porNombre = {};
    (lineas || []).forEach(function (l) {
      idx.lineas[l.id] = l;
      idx.porClave[normTexto(l.id)] = { tipo: 'raiz', linea: l, nivel: 1, id: l.id, nombre: l.nombre, descripcion: l.descripcion || null };
      porNombre[normTexto(l.nombre)] = idx.porClave[normTexto(l.id)];
      Object.keys(l.niveles || {}).forEach(function (n) {
        (l.niveles[n] || []).forEach(function (o) {
          const ref = { tipo: 'opcion', linea: l, nivel: Number(n), id: o.id, nombre: o.nombre, descripcion: o.descripcion || null };
          idx.porClave[normTexto(o.id)] = ref;
          porNombre[normTexto(o.nombre)] = ref;
        });
      });
    });
    Object.keys(porNombre).forEach(function (k) { if (!idx.porClave[k]) idx.porClave[k] = porNombre[k]; });
    return idx;
  }

  function buscarTecnica(idx, texto) {
    return (idx && idx.porClave[normTexto(texto)]) || null;
  }

  /**
   * Una línea de técnicas: sus 5 niveles con lo tomado, las opciones visibles y las que aún se pueden tomar.
   * Con el índice del catálogo, la línea trae su técnica raíz, su rama y las opciones de cada nivel.
   */
  function detalleLinea(id, tecnicas, zeo, idx) {
    const cfg = zeo.lineas;
    const raizT = tecnicas.find(function (t) { return t.nivel === 1; }) || null;
    const catRaiz = raizT && raizT.id && idx ? idx.lineas[raizT.id] || null : null;
    const niveles = [];
    for (let n = 1; n <= cfg.niveles; n++) {
      const tomadas = tecnicas.filter(function (t) { return t.nivel === n; });
      const anterior = n === 1 ? 0 : niveles[n - 2].tomadas.length;
      const visibles = opcionesVisibles(zeo, n, anterior);
      const opciones = catRaiz && n > 1 ? ((catRaiz.niveles || {})[n] || []).map(function (o) {
        return { id: o.id, nombre: o.nombre, descripcion: o.descripcion || null, tomada: tomadas.some(function (t) { return t.id === o.id; }) };
      }) : [];
      niveles.push({
        nivel: n, tope: cfg.opcionesPorNivel[n - 1], visibles: visibles, tomadas: tomadas, opciones: opciones,
        libres: Math.max(0, visibles - tomadas.length), abierto: visibles > 0,
      });
    }
    const tomados = niveles.filter(function (x) { return x.tomadas.length; });
    return {
      id: id,
      ocupada: tecnicas.length > 0,
      total: tecnicas.length,
      nivelMax: tomados.length ? tomados[tomados.length - 1].nivel : 0,
      raiz: raizT ? {
        nombre: raizT.nombre, id: raizT.id || null, rama: raizT.rama || null, origen: raizT.origen || (catRaiz && catRaiz.origen) || null,
        descripcion: raizT.descripcion || null, catalogo: !!raizT.catalogo,
      } : null,
      rama: raizT ? raizT.rama || null : null,
      extra: false,
      niveles: niveles,
    };
  }

  // ------------------------------------------------------------- atributos

  /** Atributos base: los únicos que se escriben en el JSON del personaje. */
  const ATRIBUTOS_BASE = ['STR', 'DEX', 'PER', 'INT', 'WIS', 'CHA'];
  /** Atributos derivados: cada uno es el menor de sus dos atributos base. */
  const DERIVADOS = { CON: ['STR', 'DEX'], SPR: ['WIS', 'CHA'], MND: ['PER', 'INT'] };

  /** Modificador de un atributo. [SUPUESTO] floor((valor - 10) / 2), como en Pathfinder 1e. */
  function modAtributo(valor) {
    return Math.floor((valor - 10) / 2);
  }

  /** Solo los seis atributos base, como números (0 si falta alguno). */
  function atributosBase(atributos) {
    const base = {};
    ATRIBUTOS_BASE.forEach(function (k) {
      const v = (atributos || {})[k];
      base[k] = typeof v === 'number' ? v : 0;
    });
    return base;
  }

  /** CON = min(STR, DEX), SPR = min(WIS, CHA), MND = min(PER, INT). */
  function derivarAtributos(atributos) {
    const base = atributosBase(atributos);
    const out = {};
    Object.keys(DERIVADOS).forEach(function (k) {
      out[k] = Math.min.apply(null, DERIVADOS[k].map(function (a) { return base[a]; }));
    });
    return out;
  }

  /** Los nueve atributos juntos (base + derivados). */
  function atributosCompletos(atributos) {
    return Object.assign({}, atributosBase(atributos), derivarAtributos(atributos));
  }

  /** Problemas del bloque `atributos` del personaje, como lista de textos. */
  function validarAtributos(atributos) {
    const a = atributos || {};
    const problemas = [];
    ATRIBUTOS_BASE.forEach(function (k) {
      if (!esEntero(a[k]) || a[k] < 1) problemas.push('el atributo ' + k + ' falta o no es un entero positivo');
    });
    Object.keys(a).forEach(function (k) {
      if (DERIVADOS[k]) problemas.push(k + ' se deriva (' + DERIVADOS[k].join(', ') + '); no se escribe en el personaje');
      else if (ATRIBUTOS_BASE.indexOf(k) < 0) problemas.push('atributo desconocido: ' + k);
    });
    return problemas;
  }

  // ----------------------------------------------------------------- feats

  function slotsDeFeats(nivel) {
    return Math.floor((nivel + 1) / 2);
  }

  /** Slots de feats en un nivel: los de siempre más los feats extra del arquetipo (`extras` = niveles en que los da). */
  function slotsTotalesEn(nivel, extras) {
    return slotsDeFeats(nivel) + (extras || []).filter(function (n) { return n <= nivel; }).length;
  }

  /** Nivel del próximo slot de feat (el normal o un extra del arquetipo), o null si no llega otro. */
  function proximoSlot(nivel, nivelMax, extras) {
    const sig = nivel % 2 === 1 ? nivel + 2 : nivel + 1;
    const candidatos = [];
    if (sig <= nivelMax - 1) candidatos.push(sig);
    (extras || []).forEach(function (n) { if (n > nivel && n <= nivelMax) candidatos.push(n); });
    return candidatos.length ? Math.min.apply(null, candidatos) : null;
  }

  // ------------------------------------------------ habilidades de clase (6.5)

  /**
   * Habilidades de una clase a un nivel. `detalle` es el archivo data/clases/<id>.json; `arquetipoId` es opcional.
   * El arquetipo quita las habilidades de `reemplaza` y suma las suyas. Devuelve null si no hay detalle de la clase.
   * Cada habilidad lleva `mejoras` con `alcanzada` (nivel <= el del personaje) y `proximaMejora`.
   */
  function habilidadesDeClase(detalle, arquetipoId, nivel) {
    if (!detalle) return null;
    const arquetipos = detalle.arquetipos || [];
    const arq = arquetipoId ? arquetipos.find(function (a) { return a.id === arquetipoId; }) || null : null;
    const porId = indexar(detalle.habilidades || []);
    const quitadas = arq ? (arq.reemplaza || []) : [];
    const preparar = function (h, origen) {
      const mejoras = (h.mejoras || []).map(function (m) { return { nivel: m.nivel, detalle: m.detalle, alcanzada: m.nivel <= nivel }; });
      const sig = mejoras.find(function (m) { return !m.alcanzada; });
      return {
        id: h.id, nombre: h.nombre, nivel: h.nivel, ejecucion: h.ejecucion || 'pasivo', detalle: h.detalle || '', origen: origen,
        sustituye: h.sustituye && porId[h.sustituye] ? { id: h.sustituye, nombre: porId[h.sustituye].nombre } : null,
        mejoras: mejoras, proximaMejora: sig ? sig.nivel : null,
      };
    };
    const todas = (detalle.habilidades || []).filter(function (h) { return quitadas.indexOf(h.id) < 0; }).map(function (h) { return preparar(h, 'clase'); })
      .concat(arq ? (arq.habilidades || []).map(function (h) { return preparar(h, 'arquetipo'); }) : [])
      .sort(function (a, b) { return a.nivel - b.nivel; });
    return {
      id: detalle.id, nombre: detalle.nombre, dadoDeGolpe: detalle.dadoDeGolpe || null,
      arquetipo: arq ? {
        id: arq.id, nombre: arq.nombre, resumen: arq.resumen || '', fuente: arq.fuente || null,
        reemplaza: quitadas.map(function (id) { return { id: id, nombre: porId[id] ? porId[id].nombre : id }; }),
        featsExtra: (arq.featsExtra || []).slice().sort(function (a, b) { return a - b; }),
      } : null,
      habilidades: todas.filter(function (h) { return h.nivel <= nivel; }),
      proximas: todas.filter(function (h) { return h.nivel > nivel; }),
    };
  }

  /**
   * Progresión de conjuros de una clase a un nivel (4.2). `detalle.conjuros.porDia` es la tabla de la clase (una fila por nivel
   * de clase, un número por nivel de conjuro desde el 0). Los conjuros de nivel menor a `retrasaDesde` siguen la tabla tal cual;
   * del nivel `retrasaDesde` en adelante se retrasan `retraso` niveles: el personaje de nivel N usa la fila N - retraso para ellos.
   * Los trucos (nivel 0) están desde el nivel 1. Devuelve null si la clase no lanza conjuros (su espacio en Magia lo ocupan
   * las habilidades activas).
   */
  function progresionConjuros(detalle, nivel) {
    const c = detalle && detalle.conjuros;
    if (!c || !Array.isArray(c.porDia) || !c.porDia.length) return null;
    const retraso = c.retraso || 0;
    const desde = c.retrasaDesde === undefined ? 0 : c.retrasaDesde;
    const tabla = c.porDia;
    const fila = function (n) { return tabla[Math.min(tabla.length, Math.max(1, n)) - 1]; };
    const retrasado = function (l) { return l > 0 && l >= desde; };
    const maxNivelConjuro = Math.max.apply(null, tabla.map(function (f) { return f.length; })) - 1;
    // Nivel de personaje en el que llega cada nivel de conjuro: la primera fila que lo trae, más el retraso si se retrasa.
    const llegadas = [];
    for (let l = 0; l <= maxNivelConjuro; l++) {
      const primera = tabla.findIndex(function (f) { return f.length > l; });
      if (primera >= 0) llegadas.push({ nivelConjuro: l, enNivel: l === 0 ? 1 : primera + 1 + (retrasado(l) ? retraso : 0) });
    }
    const porDia = llegadas.filter(function (ll) { return ll.enNivel <= nivel; }).map(function (ll) {
      const f = fila(retrasado(ll.nivelConjuro) ? nivel - retraso : nivel);
      return { nivelConjuro: ll.nivelConjuro, cantidad: f[ll.nivelConjuro] === undefined ? 0 : f[ll.nivelConjuro], enNivel: ll.enNivel };
    });
    const sig = llegadas.find(function (ll) { return ll.enNivel > nivel; }) || null;
    return {
      atributo: c.atributo || null, retraso: retraso, retrasaDesde: desde === 0 ? null : desde, nota: c.nota || '',
      nivelMax: porDia.length ? porDia[porDia.length - 1].nivelConjuro : -1, porDia: porDia, llegadas: llegadas,
      total: porDia.reduce(function (a, x) { return a + x.cantidad; }, 0),
      proximo: sig ? { nivelConjuro: sig.nivelConjuro, enNivel: sig.enNivel } : null,
    };
  }

  /** Ruta, dentro de data/, del archivo de habilidades de una clase. */
  function rutaClase(id) {
    return 'clases/' + id + '.json';
  }

  // ------------------------------------------------------------ alineamiento

  const ALINEAMIENTO_LEY = { L: 'Legal', N: 'Neutral', C: 'Caótico' };
  const ALINEAMIENTO_MORAL = { B: 'bueno', N: 'neutral', M: 'malo' };

  /**
   * Alineamiento del personaje, escrito «ley.moral»: L, N o C y B (bueno), N o M (malo), por ejemplo «L.N» o «N.B».
   * Devuelve { codigo, texto } o null si no es válido.
   */
  function etiquetaAlineamiento(codigo) {
    const m = /^([LNC])\.([BNM])$/.exec(String(codigo || '').trim().toUpperCase());
    if (!m) return null;
    const texto = m[1] === 'N' && m[2] === 'N' ? 'Neutral puro' : ALINEAMIENTO_LEY[m[1]] + ' ' + ALINEAMIENTO_MORAL[m[2]];
    return { codigo: m[1] + '.' + m[2], texto: texto };
  }

  /** Ataque base de una clase a un nivel (completa = nivel, media = 3/4, baja = 1/2; redondeo hacia abajo). null si no se sabe. */
  function babDeClase(clase, nivel) {
    if (!clase) return null;
    if (clase.bab === 'completa') return nivel;
    if (clase.bab === 'media') return Math.floor(nivel * 3 / 4);
    if (clase.bab === 'baja') return Math.floor(nivel / 2);
    return null;
  }

  /**
   * Evalúa los requisitos de un feat contra un jugador.
   * jug = { atributos, nivel, claseId, clase (objeto del catálogo o null), feats: [ids] }
   * indice = catálogo de feats por id (para poner nombres).
   * Devuelve { cumple, detalle: [{ clave, texto, estado }] } con estado "cumple", "falta" o "sin-verificar".
   * Se evalúan atributos, ataque base, nivel de personaje, nivel de clase y feats previos.
   * Lo demás (rangos de habilidad, nivel de lanzador, rasgos de clase…) queda "sin-verificar".
   */
  function evaluarRequisitos(f, jug, indice) {
    const req = f.requisitos || {};
    const detalle = [];
    const poner = function (clave, texto, estado) { detalle.push({ clave: clave, texto: texto, estado: estado }); };

    Object.keys(req.atributos || {}).forEach(function (k) {
      poner('atributo', k + ' ' + req.atributos[k], (jug.atributos[k] || 0) >= req.atributos[k] ? 'cumple' : 'falta');
    });
    if (req.bab !== undefined) {
      const texto = 'Ataque base +' + req.bab + (req.babAlt ? ' o ' + rotulo(req.babAlt.clase) + ' nivel ' + req.babAlt.nivel : '');
      const bab = babDeClase(jug.clase, jug.nivel);
      const porClase = req.babAlt && jug.claseId === req.babAlt.clase && jug.nivel >= req.babAlt.nivel;
      if (porClase || (bab !== null && bab >= req.bab)) poner('bab', texto, 'cumple');
      else if (bab === null) poner('bab', texto, 'sin-verificar');
      else poner('bab', texto, 'falta');
    }
    if (req.nivelPj !== undefined) {
      poner('nivel', 'Nivel de personaje ' + req.nivelPj, jug.nivel >= req.nivelPj ? 'cumple' : 'falta');
    }
    if (req.nivelClase) {
      const texto = (jug.claseId === req.nivelClase.clase && jug.clase ? jug.clase.nombre : rotulo(req.nivelClase.clase)) + ' nivel ' + req.nivelClase.nivel;
      poner('clase', texto, jug.claseId === req.nivelClase.clase && jug.nivel >= req.nivelClase.nivel ? 'cumple' : 'falta');
    }
    (req.feats || []).forEach(function (pre) {
      poner('feat', indice && indice[pre] ? indice[pre].nombre : pre, jug.feats.indexOf(pre) >= 0 ? 'cumple' : 'falta');
    });
    (req.otros || []).forEach(function (t) { poner('otro', t, 'sin-verificar'); });

    return { cumple: !detalle.some(function (d) { return d.estado === 'falta'; }), detalle: detalle };
  }

  /** Datos del jugador que necesita evaluarRequisitos, a partir del resultado de calcularPersonaje. */
  function contextoJugador(ctx, pj, resultado) {
    const clase = (ctx.classes || []).find(function (c) { return c.id === pj.clase; }) || null;
    return {
      atributos: atributosCompletos(pj.atributos), nivel: resultado.nivel.nivel, claseId: pj.clase, clase: clase,
      feats: resultado.feats.lista.map(function (x) { return x.id; }),
    };
  }

  // ----------------------------------------------------- perfil racial (5.2)

  /**
   * [SUPUESTO] El personaje "tiene el perfil" si el más bajo de sus atributos
   * preferidos no es menor que el más alto de los demás atributos base (los
   * derivados no cuentan). La definición exacta está pendiente (sección 5.2).
   */
  function tienePerfilRacial(raza, atributos) {
    if (!raza || !raza.atributosPreferidos || raza.atributosPreferidos.length === 0) return false;
    const pref = raza.atributosPreferidos;
    const valoresPref = pref.map(function (k) { return atributos[k] || 0; });
    const otros = ATRIBUTOS_BASE.filter(function (k) { return pref.indexOf(k) < 0; }).map(function (k) { return atributos[k]; });
    const minPref = Math.min.apply(null, valoresPref);
    const maxOtros = otros.length ? Math.max.apply(null, otros) : -Infinity;
    return minPref >= maxOtros;
  }

  function costoMerito(merito, raza, perfil) {
    const base = merito.costo;
    let descuento = 0;
    if (merito.categoria === 'racial' && perfil && raza && raza.descuentoPorRareza) {
      descuento = raza.descuentoPorRareza[merito.rareza] || 0;
    }
    return { base: base, descuento: descuento, costo: Math.max(0, base - descuento) };
  }

  // ------------------------------------------------------------- el registro

  function indexar(lista) {
    const m = {};
    (lista || []).forEach(function (x) { m[x.id] = x; });
    return m;
  }

  /**
   * Reproduce el registro del personaje en orden y devuelve el estado derivado.
   * ctx = { config, zeo, razas, meritos, feats, items, traits, achievements, classes }
   */
  function calcularPersonaje(ctx, pj) {
    const cfg = ctx.config;
    const zeo = ctx.zeo;
    const idxTecnicas = indexarTecnicas(ctx.zeoTecnicas);
    const razas = indexar(ctx.razas);
    const meritos = indexar(ctx.meritos);
    const feats = indexar(ctx.feats);
    const items = indexar(ctx.items);
    const traitsCat = indexar(ctx.traits);
    const logros = indexar(ctx.achievements);
    const clases = indexar(ctx.classes);

    const raza = razas[pj.raza] || null;
    const atributos = atributosBase(pj.atributos);
    const derivados = derivarAtributos(pj.atributos);
    const todos = Object.assign({}, atributos, derivados);
    const extremidades = pj.extremidades || [];
    const perfil = tienePerfilRacial(raza, atributos);

    const avisos = [];
    validarAtributos(pj.atributos).forEach(function (m) {
      avisos.push({ nivel: 'error', sesion: null, indice: null, mensaje: m });
    });
    const alineamiento = pj.alineamiento === undefined ? null : etiquetaAlineamiento(pj.alineamiento);
    if (pj.alineamiento !== undefined && !alineamiento) {
      avisos.push({ nivel: 'error', sesion: null, indice: null, mensaje: 'el alineamiento "' + pj.alineamiento + '" no es válido: se escribe ley.moral con L, N o C y B, N o M (por ejemplo L.N o N.B)' });
    }
    const detalleClase = (ctx.clasesDetalle || {})[pj.clase] || null;
    const arquetipoElegido = pj.arquetipo === undefined ? null : pj.arquetipo;
    const arquetipoDef = detalleClase && arquetipoElegido ? (detalleClase.arquetipos || []).find(function (a) { return a.id === arquetipoElegido; }) || null : null;
    if (arquetipoElegido && !arquetipoDef) {
      avisos.push({ nivel: 'error', sesion: null, indice: null, mensaje: detalleClase
        ? 'el arquetipo "' + arquetipoElegido + '" no existe para la clase ' + detalleClase.nombre + ' (hay: ' + (detalleClase.arquetipos || []).map(function (a) { return a.id; }).join(', ') + ')'
        : 'el arquetipo "' + arquetipoElegido + '" no se puede comprobar: falta data/clases/' + pj.clase + '.json' });
    }
    const featsExtra = arquetipoDef && Array.isArray(arquetipoDef.featsExtra) ? arquetipoDef.featsExtra.slice().sort(function (a, b) { return a - b; }) : [];
    const estado = {
      xp: 0,
      sx: {},
      lineas: {},
      mana: 0,
      sxGanado: 0, // SX ganado sin destino (la reserva común de Zeo y Mana)
      sxAsignado: 0, // lo que ya salió de la reserva hacia un subsistema
      sxDirecto: 0, // SX que nació ya con destino (`xp-subsistema`)
      fate: 0,
      feats: [],
      logros: [],
      logrosPorNivel: {},
      rasgos: [],
      traits: [],
      equipado: {},
      cargas: {},
      puntosIniciales: null,
      tiradas: { hp: [], mp: [] },
      mf: [],
      gates: [],
      inscritas: {},
    };
    const manaCfg = ctx.mana || null;
    const manaTags = indexar(ctx.manaTags || []);
    const mfBase = raza && raza.manaFuerza !== undefined ? raza.manaFuerza : (manaCfg ? manaCfg.mfInicial.valor : 0);
    const mfFuente = raza && raza.manaFuerza !== undefined ? 'raza' : (manaCfg ? manaCfg.mfInicial.fuente : '');
    const mfActual = function () { return estado.mf.reduce(function (a, x) { return a + x.cantidad; }, mfBase); };
    zeo.ramas.forEach(function (r) { estado.sx[r] = 0; });

    const sesionesOut = [];

    pj.sesiones.forEach(function (ses, si) {
      const nivelAntes = nivelDeXp(estado.xp, cfg).nivel;
      const xpAntes = estado.xp;
      const s = {
        id: ses.id,
        fecha: ses.fecha,
        titulo: ses.titulo,
        notas: ses.notas || '',
        nivelAntes: nivelAntes,
        filasXp: [],
        zeo: {},
        tecnicas: [],
        mana: 0,
        sxGanado: 0,
        sxAsignado: [],
        fate: 0,
        feats: [],
        logros: [],
        rasgos: [],
        traits: [],
        objetos: [],
        tiradas: [],
        ajustes: [],
        mf: [],
        gates: [],
        inscripciones: [],
      };

      function error(i, msg) {
        avisos.push({ nivel: 'error', sesion: ses.id, indice: i, mensaje: msg });
      }

      /** Suma SX a un subsistema (zeo exige rama) y lo anota en la sesión; lo usan `xp-subsistema` y `sx-asignar`. */
      function sumarSx(subsistema, rama, cantidad, sesion) {
        if (subsistema === 'zeo') {
          if (zeo.ramas.indexOf(rama) < 0) throw new Error('zeo exige rama: ' + zeo.ramas.join(', '));
          estado.sx[rama] += cantidad;
          sesion.zeo[rama] = (sesion.zeo[rama] || 0) + cantidad;
        } else {
          estado.mana += cantidad;
          sesion.mana += cantidad;
        }
      }

      (ses.entradas || []).forEach(function (e, i) {
        try {
          aplicarEntrada(e);
        } catch (err) {
          error(i, err.message);
        }
      });

      function nivelActual() { return nivelDeXp(estado.xp, cfg).nivel; }

      function aplicarEntrada(e) {
        switch (e.tipo) {
          case 'xp': {
            const r = calcularXpEntrada(cfg, nivelActual(), e);
            estado.xp += r.total;
            s.filasXp.push({
              tipo: 'xp', nota: e.nota || '', nivelPersonaje: nivelActual(), nivelContenido: e.nivelContenido,
              cantidad: e.cantidad, delta: r.delta, mult: r.mult, xpFija: r.xpFija, factor: r.factor,
              tags: r.tags, decisivo: r.decisivo, unidad: r.unidad, total: r.total,
            });
            return;
          }
          case 'ajuste': {
            if (e.campo !== 'xp') throw new Error('ajuste: solo se admite el campo xp');
            if (!e.motivo) throw new Error('un ajuste manual exige un motivo');
            if (!esEntero(e.cantidad)) throw new Error('ajuste: cantidad debe ser un entero');
            estado.xp += e.cantidad;
            if (estado.xp < 0) { estado.xp -= e.cantidad; throw new Error('el ajuste dejaría la XP en negativo'); }
            s.filasXp.push({ tipo: 'ajuste', nota: e.motivo, total: e.cantidad });
            s.ajustes.push({ campo: 'xp', cantidad: e.cantidad, motivo: e.motivo });
            return;
          }
          case 'xp-subsistema': {
            // Atajo: el SX nace ya con destino. Para ganar SX sin decidir dónde va existe la reserva (`sx` y `sx-asignar`).
            if (e.subsistema !== 'zeo' && e.subsistema !== 'mana') throw new Error('xp-subsistema solo admite zeo y mana');
            if (!esEntero(e.cantidad) || e.cantidad < 1) throw new Error('cantidad debe ser un entero positivo');
            sumarSx(e.subsistema, e.rama, e.cantidad, s);
            estado.sxDirecto += e.cantidad;
            return;
          }
          case 'sx': {
            if (!esEntero(e.cantidad) || e.cantidad < 1) throw new Error('sx: cantidad debe ser un entero positivo');
            estado.sxGanado += e.cantidad;
            s.sxGanado += e.cantidad;
            return;
          }
          case 'sx-asignar': {
            if (e.subsistema !== 'zeo' && e.subsistema !== 'mana') throw new Error('sx-asignar: el destino debe ser zeo o mana');
            if (!esEntero(e.cantidad) || e.cantidad < 1) throw new Error('sx-asignar: cantidad debe ser un entero positivo');
            const reserva = estado.sxGanado - estado.sxAsignado;
            if (e.cantidad > reserva) throw new Error('la reserva de SX tiene ' + reserva + ' y se quieren asignar ' + e.cantidad);
            sumarSx(e.subsistema, e.rama, e.cantidad, s);
            estado.sxAsignado += e.cantidad;
            s.sxAsignado.push({ subsistema: e.subsistema, rama: e.subsistema === 'zeo' ? e.rama : null, cantidad: e.cantidad });
            return;
          }
          case 'zeo-linea':
            throw new Error('zeo-linea ya no existe: ahora se registra cada técnica con zeo-tecnica (línea, nivel y nombre opcional)');
          case 'zeo-tecnica': {
            const total = zeo.lineas.total;
            const pad = function (n) { return String(n).padStart(2, '0'); };
            const m = /^L(\d{2})$/.exec(e.linea || '');
            const num = m ? Number(m[1]) : 0;
            const extras = Object.keys(estado.lineas).filter(function (k) { return Number(k.slice(1)) > total; }).length;
            if (!m || num < 1 || num > total + extras + 1) {
              throw new Error('la línea "' + e.linea + '" no existe (L01 a L' + pad(total + extras) + '; la próxima línea extra es L' + pad(total + extras + 1) + ')');
            }
            if (!esEntero(e.nivel) || e.nivel < 1 || e.nivel > zeo.lineas.niveles) throw new Error('nivel de técnica: un entero de 1 a ' + zeo.lineas.niveles);
            if (e.tecnica !== undefined && (typeof e.tecnica !== 'string' || !e.tecnica.trim())) throw new Error('tecnica debe ser un texto no vacío (o no ponerse)');
            ['origen', 'descripcion'].forEach(function (k) {
              if (e[k] !== undefined && (typeof e[k] !== 'string' || !e[k].trim())) throw new Error(k + ' debe ser un texto no vacío (o no ponerse)');
            });
            if (e.rama !== undefined && zeo.ramas.indexOf(e.rama) < 0) throw new Error('rama de la técnica: ' + zeo.ramas.join(', '));
            const texto = e.tecnica ? e.tecnica.trim() : null;
            const ref = texto ? buscarTecnica(idxTecnicas, texto) : null;
            const nombre = ref ? ref.nombre : texto;
            const previas = estado.lineas[e.linea] || [];
            const raiz = previas.find(function (t) { return t.nivel === 1; }) || null;
            const esExtra = num > total;
            if (nombre && previas.some(function (t) { return t.nombre && normTexto(t.nombre) === normTexto(nombre); })) {
              throw new Error('la técnica "' + nombre + '" ya está tomada en ' + e.linea);
            }
            const delNivel = previas.filter(function (t) { return t.nivel === e.nivel; }).length;
            const delAnterior = previas.filter(function (t) { return t.nivel === e.nivel - 1; }).length;
            const visibles = opcionesVisibles(zeo, e.nivel, delAnterior);
            if (!visibles) throw new Error(e.linea + ': el nivel ' + e.nivel + ' aún no está abierto (falta una técnica de nivel ' + (e.nivel - 1) + ')');
            if (delNivel + 1 > visibles) throw new Error(e.linea + ': el nivel ' + e.nivel + ' solo muestra ' + visibles + ' opciones y ya están tomadas');
            if (ref && e.nivel === 1) {
              if (ref.tipo !== 'raiz') throw new Error('«' + ref.nombre + '» es una mejora de nivel ' + ref.nivel + ' de ' + ref.linea.nombre + ', no una técnica raíz');
              const otra = Object.keys(estado.lineas).find(function (k) {
                return k !== e.linea && estado.lineas[k].some(function (t) { return t.nivel === 1 && t.id === ref.id; });
              });
              if (otra) throw new Error('«' + ref.nombre + '» ya es la raíz de ' + otra);
              if (ref.linea.origen && !esExtra) {
                throw new Error('«' + ref.nombre + '» viene de ' + ref.linea.origen + ': va en una línea extra (L' + pad(total + extras + 1) + ') con ese origen');
              }
            } else if (ref) {
              if (ref.tipo === 'raiz') throw new Error('«' + ref.nombre + '» es una técnica raíz (nivel 1), no una mejora de nivel ' + e.nivel);
              if (!raiz || raiz.id !== ref.linea.id) {
                throw new Error('«' + ref.nombre + '» es una mejora de ' + ref.linea.nombre + ', no de la línea ' + e.linea + (raiz ? ' (' + raiz.nombre + ')' : ''));
              }
              if (ref.nivel !== e.nivel) throw new Error('«' + ref.nombre + '» es de nivel ' + ref.nivel + ', no del ' + e.nivel);
            }
            const origen = e.origen ? e.origen.trim() : (e.nivel === 1 && ref && ref.linea.origen) || null;
            if (esExtra && e.nivel === 1 && !origen) {
              throw new Error(e.linea + ' es una línea extra: indica el origen (clase, raza, logro…) que la otorga');
            }
            const rama = e.nivel === 1 ? (ref ? ref.linea.rama : e.rama || null) : (raiz ? raiz.rama : null);
            const descripcion = e.descripcion ? e.descripcion.trim() : (ref ? ref.descripcion : null);
            estado.lineas[e.linea] = previas.concat([{
              linea: e.linea, nivel: e.nivel, nombre: nombre, id: ref ? ref.id : null, rama: rama, origen: origen,
              descripcion: descripcion, catalogo: !!ref, sesion: s.id,
            }]);
            s.tecnicas.push({ linea: e.linea, nivel: e.nivel, nombre: nombre, origen: origen });
            return;
          }
          case 'feat': {
            const f = feats[e.id];
            if (!f) throw new Error('el feat "' + e.id + '" no existe en el catálogo');
            if (e.eleccion !== undefined && typeof e.eleccion !== 'string') throw new Error('eleccion debe ser un texto');
            const eleccion = (e.eleccion || '').trim();
            const previos = estado.feats.filter(function (x) { return x.id === e.id; });
            if (previos.length && !f.multiple) throw new Error('el feat "' + f.nombre + '" ya está ganado');
            if (previos.length && eleccion && previos.some(function (x) { return x.eleccion === eleccion; })) {
              throw new Error('el feat "' + f.nombre + '" ya está ganado con la elección "' + eleccion + '"');
            }
            const nivel = nivelActual();
            if (estado.feats.length + 1 > slotsTotalesEn(nivel, featsExtra)) {
              throw new Error('no hay slot de feat libre en el nivel ' + nivel + ' (' + slotsTotalesEn(nivel, featsExtra) + ' slots)');
            }
            const evaluacion = evaluarRequisitos(f, {
              atributos: todos, nivel: nivel, claseId: pj.clase, clase: clases[pj.clase] || null,
              feats: estado.feats.map(function (x) { return x.id; }),
            }, feats);
            const faltan = evaluacion.detalle.filter(function (d) { return d.estado === 'falta'; });
            if (faltan.length) throw new Error(f.nombre + ' exige ' + faltan.map(function (d) { return d.texto; }).join(', '));
            const activo = f.ejecucion === 'activo' && !f.excepcion;
            const reg = {
              id: f.id, nombre: eleccion ? f.nombre + ' (' + eleccion + ')' : f.nombre, eleccion: eleccion || null,
              categoria: f.tipo || null, libro: f.libro || null, ejecucion: f.ejecucion || 'pasivo',
              tipo: activo ? 'habilidad-tipo-conjuro' : 'feat', convertidoDe: activo ? f.id : null, nivel: nivel,
              sinVerificar: evaluacion.detalle.filter(function (d) { return d.estado === 'sin-verificar'; }).map(function (d) { return d.texto; }),
            };
            estado.feats.push(reg);
            s.feats.push(reg);
            return;
          }
          case 'achievement': {
            const a = logros[e.id];
            if (!a) throw new Error('el achievement "' + e.id + '" no existe en el catálogo');
            const nivel = nivelActual();
            if (estado.logrosPorNivel[nivel]) throw new Error('ya hay un achievement feat en el nivel ' + nivel + ' (máximo 1 por nivel)');
            if (estado.logros.some(function (x) { return x.id === e.id; })) throw new Error('el achievement "' + a.nombre + '" ya está ganado');
            const fate = e.fate === undefined ? (a.fate || 0) : e.fate;
            if (!esEntero(fate) || fate < 0) throw new Error('fate debe ser un entero mayor o igual a 0');
            estado.logrosPorNivel[nivel] = true;
            estado.fate += fate;
            s.fate += fate;
            const reg = { id: a.id, nombre: a.nombre, nivel: nivel, fate: fate, sesion: ses.id };
            estado.logros.push(reg);
            s.logros.push(reg);
            return;
          }
          case 'fate': {
            if (!esEntero(e.cantidad) || e.cantidad === 0) throw new Error('fate: cantidad debe ser un entero distinto de 0');
            if (e.cantidad < 0 && !e.motivo) throw new Error('gastar fate exige un motivo');
            estado.fate += e.cantidad;
            s.fate += e.cantidad;
            return;
          }
          case 'rasgo': {
            const m = meritos[e.id];
            if (!m) throw new Error('el mérito o defecto "' + e.id + '" no existe en el catálogo');
            if (e.accion !== 'ganar' && e.accion !== 'perder') throw new Error('rasgo: accion debe ser ganar o perder');
            const tiene = estado.rasgos.indexOf(e.id) >= 0;
            if (e.accion === 'ganar') {
              if (tiene) throw new Error('"' + m.nombre + '" ya está ganado');
              if (m.categoria === 'racial' && m.raza !== pj.raza) throw new Error('"' + m.nombre + '" es un racial de otra raza');
              estado.rasgos.push(e.id);
              s.rasgos.push({ id: e.id, nombre: m.nombre, accion: 'ganar' });
            } else {
              if (!tiene) throw new Error('"' + m.nombre + '" no está ganado');
              estado.rasgos.splice(estado.rasgos.indexOf(e.id), 1);
              s.rasgos.push({ id: e.id, nombre: m.nombre, accion: 'perder' });
            }
            return;
          }
          case 'trait': {
            const t = traitsCat[e.id];
            if (!t) throw new Error('el trait "' + e.id + '" no existe en data/traits.json');
            if (e.accion !== 'ganar' && e.accion !== 'perder') throw new Error('trait: accion debe ser ganar o perder');
            (t.incluye || []).forEach(function (c) {
              const cat = c.tipo === 'feat' ? feats : c.tipo === 'merito' ? meritos : null;
              if (!cat || !cat[c.id]) throw new Error('el trait "' + t.nombre + '" incluye "' + c.id + '", que no existe');
            });
            const tiene = estado.traits.indexOf(e.id) >= 0;
            if (e.accion === 'ganar') {
              if (tiene) throw new Error('"' + t.nombre + '" ya está ganado');
              estado.traits.push(e.id);
            } else {
              if (!tiene) throw new Error('"' + t.nombre + '" no está ganado');
              estado.traits.splice(estado.traits.indexOf(e.id), 1);
            }
            s.traits.push({ id: e.id, nombre: t.nombre, accion: e.accion });
            return;
          }
          case 'tirada': {
            if (e.recurso !== 'hp' && e.recurso !== 'mp') throw new Error('tirada: recurso debe ser hp o mp');
            const m = /^d(\d{1,3})$/.exec(e.dado || '');
            const caras = m ? Number(m[1]) : 0;
            if (caras < 2) throw new Error('tirada: dado debe tener la forma dN con N de 2 a 999 (por ejemplo d8)');
            if (!esEntero(e.resultado) || e.resultado < 1 || e.resultado > caras) {
              throw new Error('tirada: el resultado debe ser un entero entre 1 y ' + caras);
            }
            const etiqueta = e.recurso.toUpperCase();
            const actual = nivelActual();
            const hechas = estado.tiradas[e.recurso];
            const hay = function (n) { return hechas.some(function (t) { return t.nivel === n; }); };
            let nivel = e.nivel;
            if (nivel === undefined) {
              nivel = 1;
              while (nivel <= actual && hay(nivel)) nivel++;
              if (nivel > actual) throw new Error('no hay nivel sin tirada de ' + etiqueta + ' (nivel ' + actual + ')');
            } else {
              if (!esEntero(nivel) || nivel < 1 || nivel > actual) throw new Error('tirada: el nivel debe estar entre 1 y ' + actual);
              if (hay(nivel)) throw new Error('el nivel ' + nivel + ' ya tiene tirada de ' + etiqueta);
            }
            const reg = { recurso: e.recurso, nivel: nivel, dado: e.dado, caras: caras, resultado: e.resultado, sesion: ses.id };
            hechas.push(reg);
            s.tiradas.push(reg);
            return;
          }
          case 'mana-fuerza': {
            if (!manaCfg) throw new Error('mana-fuerza: falta data/mana.json');
            if (!esEntero(e.cantidad) || e.cantidad === 0) throw new Error('mana-fuerza: cantidad debe ser un entero distinto de 0');
            if (!manaCfg.fuentesMF.some(function (f) { return f.id === e.fuente; })) {
              throw new Error('mana-fuerza: fuente debe ser ' + manaCfg.fuentesMF.map(function (f) { return f.id; }).join(', '));
            }
            if (e.cantidad < 0 && !e.nota) throw new Error('perder Mana force exige una nota');
            if (mfActual() + e.cantidad < 0) throw new Error('la Mana force quedaría en ' + (mfActual() + e.cantidad));
            const reg = { cantidad: e.cantidad, fuente: e.fuente, nota: e.nota || '', sesion: ses.id };
            estado.mf.push(reg);
            s.mf.push(reg);
            return;
          }
          case 'gate': {
            if (!manaCfg) throw new Error('gate: falta data/mana.json');
            if (typeof e.id !== 'string' || !/^[a-z0-9]+$/i.test(e.id)) throw new Error('gate: id debe ser un texto de letras y números, sin guiones (por ejemplo g1)');
            if (estado.gates.some(function (g) { return g.id === e.id; })) throw new Error('el Gate "' + e.id + '" ya existe');
            if (!manaCfg.funciones.some(function (f) { return f.id === e.funcion; })) throw new Error('gate: funcion debe ser ' + manaCfg.funciones.map(function (f) { return f.id; }).join(', '));
            if (!manaTags[e.tag]) throw new Error('gate: el tag "' + e.tag + '" no existe en data/mana-tags.json');
            if (typeof e.oportunidad !== 'string' || !e.oportunidad.trim()) throw new Error('gate: falta la oportunidad que permitió construirlo');
            const k = estado.gates.length + 1;
            const mfNecesaria = mfDeGate(k, manaCfg);
            if (mfActual() < mfNecesaria) throw new Error('el Gate ' + k + ' exige Mana force ' + mfNecesaria + ' y el personaje tiene ' + mfActual());
            const sxNecesario = sxDeGate(k, manaCfg);
            if (estado.mana < sxNecesario) {
              const reservaSx = estado.sxGanado - estado.sxAsignado;
              throw new Error('el Gate ' + k + ' exige ' + sxNecesario + ' SX de mana y el personaje tiene ' + estado.mana +
                (reservaSx > 0 ? ' (hay ' + reservaSx + ' SX sin asignar en la reserva: asígnalos a Mana)' : ''));
            }
            const reg = { id: e.id, orden: k, funcion: e.funcion, tag: e.tag, tagNombre: manaTags[e.tag].nombre, oportunidad: e.oportunidad.trim(), sesion: ses.id, mfRequerida: mfNecesaria, sxRequerido: sxNecesario };
            estado.gates.push(reg);
            s.gates.push(reg);
            return;
          }
          case 'inscribir': {
            const slot = grafoMana(estado.gates, manaTags).slots.find(function (x) { return x.id === e.slot; });
            if (!slot) throw new Error('inscribir: el slot "' + e.slot + '" no existe (hay ' + grafoMana(estado.gates, manaTags).slots.map(function (x) { return x.id; }).join(', ') + ')');
            if (estado.inscritas[e.slot]) throw new Error('el slot "' + e.slot + '" ya tiene "' + estado.inscritas[e.slot].nombre + '"; usa desinscribir antes');
            const hab = estado.feats.find(function (x) { return x.tipo === 'habilidad-tipo-conjuro' && x.id === e.habilidad; });
            if (!hab) throw new Error('inscribir: "' + e.habilidad + '" no es una habilidad tipo conjuro del personaje');
            estado.inscritas[e.slot] = { id: hab.id, nombre: hab.nombre, sesion: ses.id };
            s.inscripciones.push({ slot: e.slot, accion: 'inscribir', habilidad: hab.id, nombre: hab.nombre });
            return;
          }
          case 'desinscribir': {
            const previa = estado.inscritas[e.slot];
            if (!previa) throw new Error('desinscribir: el slot "' + e.slot + '" no tiene ninguna habilidad');
            delete estado.inscritas[e.slot];
            s.inscripciones.push({ slot: e.slot, accion: 'desinscribir', habilidad: previa.id, nombre: previa.nombre });
            return;
          }
          case 'objeto': {
            aplicarObjeto(e);
            return;
          }
          default:
            throw new Error('tipo de entrada desconocido: "' + e.tipo + '"');
        }
      }

      function aplicarObjeto(e) {
        const it = items[e.id];
        if (!it) throw new Error('el objeto "' + e.id + '" no existe en el catálogo');
        const nombre = it.nombre;
        const puesto = estado.equipado[e.id];
        if (e.accion === 'equipar') {
          if (puesto) throw new Error('"' + nombre + '" ya está equipado');
          const equipados = Object.keys(estado.equipado).map(function (k) { return estado.equipado[k]; });
          const delTipo = equipados.filter(function (x) { return items[x.id].tipo === it.tipo; });
          const limite = it.tipo === 'objeto' ? 3 : 1;
          if (delTipo.length >= limite) {
            throw new Error('límite de ' + (it.tipo === 'armadura' ? 'armadura (1)' : it.tipo === 'arma' ? 'arma (1)' : 'objetos mágicos (3)') + ' superado al equipar "' + nombre + '"');
          }
          let extremidad = null;
          if (it.tipo !== 'armadura') {
            if (!e.extremidad) throw new Error('equipar "' + nombre + '" exige una extremidad');
            if (extremidades.indexOf(e.extremidad) < 0) throw new Error('el personaje no tiene la extremidad "' + e.extremidad + '"');
            const ocupante = equipados.find(function (x) { return x.extremidad === e.extremidad; });
            if (ocupante) throw new Error('la extremidad "' + e.extremidad + '" ya sostiene "' + items[ocupante.id].nombre + '"');
            extremidad = e.extremidad;
          }
          estado.equipado[e.id] = { id: e.id, extremidad: extremidad };
          if (it.cargas && estado.cargas[e.id] === undefined) estado.cargas[e.id] = it.cargas.max;
          s.objetos.push({ id: e.id, nombre: nombre, accion: 'equipar' });
        } else if (e.accion === 'desequipar') {
          if (!puesto) throw new Error('"' + nombre + '" no está equipado');
          delete estado.equipado[e.id];
          s.objetos.push({ id: e.id, nombre: nombre, accion: 'desequipar' });
        } else if (e.accion === 'usar-carga') {
          if (!it.cargas) throw new Error('"' + nombre + '" no tiene cargas');
          if (!puesto) throw new Error('"' + nombre + '" no está equipado');
          if (estado.cargas[e.id] < 1) throw new Error('"' + nombre + '" no tiene cargas disponibles');
          estado.cargas[e.id] -= 1;
          s.objetos.push({ id: e.id, nombre: nombre, accion: 'usar-carga' });
        } else if (e.accion === 'recargar') {
          if (!it.cargas) throw new Error('"' + nombre + '" no tiene cargas');
          estado.cargas[e.id] = it.cargas.max;
          s.objetos.push({ id: e.id, nombre: nombre, accion: 'recargar' });
        } else {
          throw new Error('objeto: accion desconocida "' + e.accion + '"');
        }
      }

      // Saldos al cierre de la sesión (la sesión es atómica).
      if (si === 0) estado.puntosIniciales = Math.floor(nivelDeXp(estado.xp, cfg).nivel / 2) + 1;
      const saldo = saldoMeritos();
      if (saldo.total < 0) avisos.push({ nivel: 'error', sesion: ses.id, indice: null, mensaje: 'el saldo de puntos de méritos y defectos quedó en ' + saldo.total });
      if (estado.fate < 0) avisos.push({ nivel: 'error', sesion: ses.id, indice: null, mensaje: 'el saldo de fate quedó en ' + estado.fate });

      s.nivelDespues = nivelDeXp(estado.xp, cfg).nivel;
      s.xpGanada = estado.xp - xpAntes;
      s.xpAcumulada = estado.xp;
      sesionesOut.push(s);
    });

    function saldoMeritos() {
      const iniciales = estado.puntosIniciales === null ? 0 : estado.puntosIniciales;
      let defectos = 0;
      let gastado = 0;
      const lista = [];
      estado.rasgos.forEach(function (id) {
        const m = meritos[id];
        const c = costoMerito(m, raza, perfil);
        if (m.tipo === 'defecto') defectos += m.valor;
        else gastado += c.costo;
        lista.push({
          id: m.id, nombre: m.nombre, tipo: m.tipo, categoria: m.categoria || 'normal', rareza: m.rareza || null,
          costoBase: m.tipo === 'defecto' ? m.valor : c.base, descuento: m.tipo === 'defecto' ? 0 : c.descuento,
          puntos: m.tipo === 'defecto' ? m.valor : c.costo,
        });
      });
      return { iniciales: iniciales, defectos: defectos, meritos: gastado, total: iniciales + defectos - gastado, lista: lista };
    }

    // ---- resultado final

    const nivelInfo = nivelDeXp(estado.xp, cfg);

    /** Mana: los SX ganados (`total`), la Mana force con su contabilidad, los Gates y todo lo que se deriva del grafo. */
    function resultadoMana() {
      const mf = mfActual();
      const grafo = grafoMana(estado.gates, manaTags);
      const slots = grafo.slots.map(function (x) { return Object.assign({}, x, { habilidad: estado.inscritas[x.id] || null }); });
      const sig = estado.gates.length + 1;
      const mfSig = manaCfg ? mfDeGate(sig, manaCfg) : null;
      const sxSig = manaCfg ? sxDeGate(sig, manaCfg) : null;
      return {
        total: estado.mana,
        configurado: !!manaCfg,
        fuerza: {
          total: mf, base: mfBase, fuenteBase: mfFuente, aportes: estado.mf.slice(),
          permitidos: manaCfg ? gatesPermitidos(mf, manaCfg) : 0,
        },
        gates: estado.gates.slice(),
        conexiones: grafo.conexiones,
        nodos: grafo.nodos,
        circulos: grafo.circulos,
        slots: slots,
        totales: {
          gates: estado.gates.length, nodos: grafo.nodos.length, circulos: grafo.circulos.length, slots: slots.length,
          ocupados: slots.filter(function (x) { return x.habilidad; }).length,
          libres: slots.filter(function (x) { return !x.habilidad; }).length,
          paresSinConexion: grafo.conexiones.filter(function (c) { return !c.conecta; }).length,
        },
        siguiente: manaCfg ? {
          numero: sig, mfRequerida: mfSig, sxRequerido: sxSig,
          mfFalta: Math.max(0, mfSig - mf), sxFalta: Math.max(0, sxSig - estado.mana),
          disponible: mf >= mfSig && estado.mana >= sxSig,
        } : null,
        funciones: manaCfg ? manaCfg.funciones : [],
      };
    }

    /**
     * SX compartido por Zeo y Mana: lo que se gana sin destino va a una reserva común y se asigna después
     * (`sx-asignar`); lo que nace con destino (`xp-subsistema`) cuenta como ganado y asignado a la vez.
     */
    function resultadoSx() {
      const zeoTotal = zeo.ramas.reduce(function (a, r) { return a + estado.sx[r]; }, 0);
      const porRama = {};
      zeo.ramas.forEach(function (r) { porRama[r] = estado.sx[r]; });
      return {
        reserva: estado.sxGanado - estado.sxAsignado,
        ganadoEnReserva: estado.sxGanado,
        asignado: estado.sxAsignado,
        directo: estado.sxDirecto,
        total: estado.sxGanado + estado.sxDirecto,
        zeo: { total: zeoTotal, ramas: porRama },
        mana: estado.mana,
      };
    }

    const ramas = zeo.ramas.map(function (r) { return detalleRama(r, estado.sx[r], zeo); });
    const minimo = Math.min.apply(null, ramas.map(function (r) { return r.nivel; }));
    ramas.forEach(function (r) { r.limita = r.nivel === minimo; });
    const lineas = [];
    const lineasExtra = Object.keys(estado.lineas).filter(function (k) { return Number(k.slice(1)) > zeo.lineas.total; }).length;
    for (let n = 1; n <= zeo.lineas.total + lineasExtra; n++) {
      const id = 'L' + String(n).padStart(2, '0');
      const d = detalleLinea(id, estado.lineas[id] || [], zeo, idxTecnicas);
      d.extra = n > zeo.lineas.total;
      lineas.push(d);
    }
    // Los slots cuentan solo las líneas iniciales; las extra (L11 en adelante) llegan de fuera y se cuentan aparte.
    const lineasBase = lineas.slice(0, zeo.lineas.total);
    const lineasOcupadas = lineasBase.filter(function (l) { return l.ocupada; }).length;
    const primeraLibre = lineasBase.find(function (l) { return !l.ocupada; });
    const catalogoTecnicas = (ctx.zeoTecnicas || []).map(function (c) {
      const usada = lineas.find(function (l) { return l.raiz && l.raiz.id === c.id; });
      return { id: c.id, nombre: c.nombre, rama: c.rama, origen: c.origen || null, nota: c.nota || null, descripcion: c.descripcion || null, usada: usada ? usada.id : null };
    });

    const equipados = Object.keys(estado.equipado).map(function (k) { return estado.equipado[k]; });
    function vista(eq) {
      const it = items[eq.id];
      return {
        id: it.id, nombre: it.nombre, tipo: it.tipo, extremidad: eq.extremidad,
        cargas: it.cargas ? { max: it.cargas.max, actuales: estado.cargas[it.id], recarga: it.cargas.recarga || 'ninguna' } : null,
      };
    }
    const vistas = equipados.map(vista);
    const armadura = vistas.find(function (v) { return v.tipo === 'armadura'; }) || null;
    const arma = vistas.find(function (v) { return v.tipo === 'arma'; }) || null;
    const objetos = vistas.filter(function (v) { return v.tipo === 'objeto'; });
    const porExtremidad = extremidades.map(function (x) {
      return { id: x, etiqueta: rotulo(x), item: vistas.find(function (v) { return v.extremidad === x; }) || null };
    });

    const sl = slotsTotalesEn(nivelInfo.nivel, featsExtra);

    /** Puntos de un recurso: cada nivel suma max(1, tirada + modificador del atributo). */
    function recurso(rec, atributo) {
      const mod = modAtributo(todos[atributo]);
      const tiradas = estado.tiradas[rec].slice().sort(function (a, b) { return a.nivel - b.nivel; }).map(function (t) {
        return Object.assign({}, t, { mod: mod, ganado: Math.max(1, t.resultado + mod) });
      });
      const pendientes = [];
      for (let n = 1; n <= nivelInfo.nivel; n++) {
        if (!tiradas.some(function (t) { return t.nivel === n; })) pendientes.push(n);
      }
      if (pendientes.length) {
        avisos.push({ nivel: 'aviso', sesion: null, indice: null, mensaje: 'faltan tiradas de ' + rec.toUpperCase() + ' en los niveles ' + pendientes.join(', ') });
      }
      return {
        atributo: atributo, valor: todos[atributo], mod: mod, tiradas: tiradas, pendientes: pendientes,
        maximo: tiradas.reduce(function (a, t) { return a + t.ganado; }, 0),
      };
    }
    const recursos = { hp: recurso('hp', 'CON'), mp: recurso('mp', 'SPR') };

    return {
      personaje: {
        id: pj.personaje, nombre: pj.nombre, raza: pj.raza, razaNombre: raza ? raza.nombre : rotulo(pj.raza || '—'),
        clase: pj.clase, claseNombre: clases[pj.clase] ? clases[pj.clase].nombre : rotulo(pj.clase || '—'),
        atributos: atributos, derivados: derivados, extremidades: extremidades,
        imagen: typeof pj.imagen === 'string' ? pj.imagen : null,
        preferidos: raza ? raza.atributosPreferidos || [] : [], perfilRacial: perfil,
        alineamiento: alineamiento, arquetipo: arquetipoDef ? { id: arquetipoDef.id, nombre: arquetipoDef.nombre } : null,
      },
      clase: habilidadesDeClase(detalleClase, arquetipoDef ? arquetipoDef.id : null, nivelInfo.nivel),
      conjuros: progresionConjuros(detalleClase, nivelInfo.nivel),
      xp: estado.xp,
      nivel: nivelInfo,
      sesiones: sesionesOut,
      zeo: {
        unidad: zeo.unidad, lectura: zeo.lectura, nivel: minimo, ramas: ramas, lineas: lineas, niveles: umbralesZeo(zeo),
        slots: { total: lineasBase.length, ocupados: lineasOcupadas, libres: lineasBase.length - lineasOcupadas, primeraLibre: primeraLibre ? primeraLibre.id : null },
        extras: { total: lineasExtra, proxima: 'L' + String(zeo.lineas.total + lineasExtra + 1).padStart(2, '0') },
        catalogo: catalogoTecnicas,
        reglas: { opcionesPorNivel: zeo.lineas.opcionesPorNivel.slice(), opcionesBase: zeo.lineas.opcionesBase, extraPorTecnica: zeo.lineas.extraPorTecnica },
      },
      mana: resultadoMana(),
      sx: resultadoSx(),
      recursos: recursos,
      fate: estado.fate,
      feats: {
        lista: estado.feats,
        slotsTotales: sl,
        slotsUsados: estado.feats.length,
        slotsLibres: Math.max(0, sl - estado.feats.length),
        // Nivel de cada slot, en orden; los feats extra del arquetipo van mezclados y se listan aparte en `nivelesExtra`.
        niveles: Array.from({ length: Math.ceil(cfg.nivelMax / 2) }, function (_, i) { return i * 2 + 1; })
          .concat(featsExtra).filter(function (n) { return n <= Math.max(nivelInfo.nivel + 2, 9); })
          .sort(function (a, b) { return a - b; }),
        nivelesExtra: featsExtra.filter(function (n) { return n <= Math.max(nivelInfo.nivel + 2, 9); }),
        proximoSlot: proximoSlot(nivelInfo.nivel, cfg.nivelMax, featsExtra),
      },
      logros: estado.logros,
      meritos: saldoMeritos(),
      traits: estado.traits.map(function (id) {
        const t = traitsCat[id];
        return {
          id: t.id, nombre: t.nombre,
          incluye: (t.incluye || []).map(function (c) {
            const cat = c.tipo === 'feat' ? feats : meritos;
            return { tipo: c.tipo, id: c.id, nombre: cat[c.id] ? cat[c.id].nombre : c.id };
          }),
        };
      }),
      equipo: {
        armadura: armadura, arma: arma, objetos: objetos, porExtremidad: porExtremidad,
        conteo: { armadura: armadura ? 1 : 0, arma: arma ? 1 : 0, objetos: objetos.length },
        limites: { armadura: 1, arma: 1, objetos: 3 },
      },
      avisos: avisos,
    };
  }

  // ---- Mana por Gates (4.1.2): Mana force, Gates, conexiones, nodos, círculos y slots

  /** Mana force necesaria para construir el Gate número `k` (1, 2, 4, 8… con mfBase 2). */
  function mfDeGate(k, cfg) { return Math.pow(cfg.mfBase, k - 1); }

  /** SX de mana que exige el Gate número `k`; pasada la tabla, sigue duplicando el último valor. */
  function sxDeGate(k, cfg) {
    const t = cfg.sxPorGate;
    return k <= t.length ? t[k - 1] : t[t.length - 1] * Math.pow(2, k - t.length);
  }

  /** Cuántos Gates permite una Mana force dada: el mayor k con mfBase^(k−1) ≤ MF. */
  function gatesPermitidos(mf, cfg) {
    let k = 0;
    while (mf >= mfDeGate(k + 1, cfg)) k++;
    return k;
  }

  /** Dos tags chocan si alguno de los dos tiene al otro como incompatible; un tag nunca choca consigo mismo. */
  function tagsIncompatibles(x, y, tagsPorId) {
    if (x === y) return false;
    const a = tagsPorId[x] || {};
    const b = tagsPorId[y] || {};
    return (a.incompatibles || []).indexOf(y) >= 0 || (b.incompatibles || []).indexOf(x) >= 0;
  }

  /**
   * El grafo de Gates: equidistantes y conectados por defecto. Cada par que conecta es un nodo (slot de nivel 2)
   * y cada trío con sus tres pares conectados es un círculo (slot de nivel 3); se suman a los Gates (nivel 1).
   * `gates` va en orden de construcción y cada uno trae `id` y `tag`.
   */
  function grafoMana(gates, tagsPorId) {
    const unicos = function (xs) { return xs.filter(function (x, i) { return xs.indexOf(x) === i; }); };
    const n = gates.length;
    const conecta = [];
    const conexiones = [];
    const nodos = [];
    const circulos = [];
    for (let i = 0; i < n; i++) {
      conecta.push([]);
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ok = !tagsIncompatibles(gates[i].tag, gates[j].tag, tagsPorId);
        conecta[i][j] = ok;
        conexiones.push({ a: gates[i].id, b: gates[j].id, conecta: ok });
        if (ok) nodos.push({ id: gates[i].id + '-' + gates[j].id, gates: [gates[i].id, gates[j].id], tags: unicos([gates[i].tag, gates[j].tag]) });
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          if (conecta[i][j] && conecta[i][k] && conecta[j][k]) {
            circulos.push({ id: gates[i].id + '-' + gates[j].id + '-' + gates[k].id, gates: [gates[i].id, gates[j].id, gates[k].id], tags: unicos([gates[i].tag, gates[j].tag, gates[k].tag]) });
          }
        }
      }
    }
    const slots = gates.map(function (g) { return { id: g.id, nivel: 1, tipo: 'gate', gates: [g.id], tags: [g.tag] }; })
      .concat(nodos.map(function (x) { return { id: x.id, nivel: 2, tipo: 'nodo', gates: x.gates, tags: x.tags }; }))
      .concat(circulos.map(function (x) { return { id: x.id, nivel: 3, tipo: 'circulo', gates: x.gates, tags: x.tags }; }));
    return { conexiones: conexiones, nodos: nodos, circulos: circulos, slots: slots };
  }

  // ---- HP actual: fatiga, estados y descansos (el valor actual no se guarda en el registro)

  /** HP enteros que cumplen "hp ≤ max × pct / 100": el tope es el entero hacia abajo, también bajo cero. */
  function hpDeUmbral(max, pct) { return Math.floor(max * pct / 100); }

  /** Umbrales de un máximo de HP dado, ya convertidos a HP, para dibujarlos y explicarlos. */
  function umbralesVitales(max, cfg) {
    let acumulado = 0;
    const fatiga = cfg.fatiga.umbrales.map(function (u) {
      acumulado += u.penalizador;
      return { pct: u.pct, hp: hpDeUmbral(max, u.pct), penalizador: u.penalizador, acumulado: acumulado };
    });
    const estados = cfg.estados.map(function (e) {
      return { id: e.id, nombre: e.nombre, pct: e.pct, hp: hpDeUmbral(max, e.pct), detalle: e.detalle || '' };
    });
    return { fatiga: fatiga, estados: estados };
  }

  /**
   * Fatiga y estado de un HP actual. La fatiga es el penalizador acumulado de los umbrales alcanzados
   * y el estado es el más grave alcanzado; sin máximo de HP (aún sin tiradas) no hay ninguno de los dos.
   */
  function estadoVital(hp, max, cfg) {
    if (!(max > 0)) return { hp: hp, max: max, fatiga: 0, estado: null, nivelFatiga: 0 };
    const u = umbralesVitales(max, cfg);
    let fatiga = 0, nivelFatiga = 0;
    u.fatiga.forEach(function (t, i) { if (hp <= t.hp) { fatiga = t.acumulado; nivelFatiga = i + 1; } });
    let estado = null;
    u.estados.forEach(function (e) { if (hp <= e.hp) estado = { id: e.id, nombre: e.nombre, detalle: e.detalle }; });
    return { hp: hp, max: max, fatiga: fatiga, estado: estado, nivelFatiga: nivelFatiga };
  }

  /**
   * Recuperación por hora (fórmula del diseñador), igual para HP y para MP. Con C = bono del atributo
   * (nunca menor a `minimoBono`) más `desplazamiento` (hoy 0):
   * H = (sumaFija + C)·V + constante + porBono·C  →  V = (H − constante − porBono·C) / (sumaFija + C)
   * y R = C + V / divisorV, multiplicada por el `multiplicador` del recurso (MP ×5). R no baja de `minimoPorHora`.
   * `recurso` es 'hp' o 'mp'. Devuelve `bono` (ya recortado), `c` (con el desplazamiento), `v`, `bruta` y `porHora`.
   */
  function recuperacionPorHora(max, bono, cfg, recurso) {
    const f = cfg.descanso.formula;
    const rec = cfg.descanso.recursos[recurso || 'hp'];
    const b = Math.max(f.minimoBono, bono);
    const c = b + f.desplazamiento;
    const divisor = f.sumaFija + c;
    if (!(max > 0) || !(divisor > 0)) return { bono: b, c: c, v: 0, bruta: 0, porHora: 0, multiplicador: rec.multiplicador };
    const v = (max - f.constante - f.porBono * c) / divisor;
    const bruta = (c + v / f.divisorV) * rec.multiplicador;
    return { bono: b, c: c, v: v, bruta: bruta, porHora: Math.max(f.minimoPorHora, bruta), multiplicador: rec.multiplicador };
  }

  /**
   * Un descanso (`cfg.descanso.corto` o `.largo`): recupera R × horas × (1 + extra), redondeado hacia abajo, sin pasar
   * del máximo. Un valor sobre el máximo no se baja, y desde un valor negativo se recupera igual.
   */
  function descansar(actual, max, descanso, bono, cfg, recurso) {
    const r = recuperacionPorHora(max, bono, cfg, recurso);
    const bruto = Math.max(0, Math.floor(r.porHora * descanso.horas * (1 + (descanso.extra || 0)) + 1e-9));
    const nuevo = Math.max(actual, Math.min(max, actual + bruto));
    return { valor: nuevo, recuperado: nuevo - actual, horas: descanso.horas, extra: descanso.extra || 0, porHora: r.porHora, bono: r.bono };
  }

  /** Archivos de data/ que lee el motor, por clave de contexto. */
  const ARCHIVOS = {
    config: 'xp-config.json',
    zeo: 'zeo.json',
    tecnicas: 'zeo-tecnicas.json',
    razas: 'razas.json',
    meritos: 'meritos.json',
    feats: 'feats.pf1.json',
    conversiones: 'feats.conversiones.json',
    items: 'items.json',
    achievements: 'achievements.json',
    traits: 'traits.json',
    classes: 'classes.json',
    vitalidad: 'vitalidad.json',
    mana: 'mana.json',
    manaTags: 'mana-tags.json',
  };

  /** Convierte los JSON de data/ (ya parseados, por clave de ARCHIVOS) en el contexto del motor. */
  function armarContexto(raw) {
    const conv = (raw.conversiones && raw.conversiones.conversiones) || {};
    return {
      config: raw.config,
      zeo: raw.zeo,
      // Catálogo de técnicas Zeo: líneas con raíz, rama, mejoras por nivel y origen.
      zeoTecnicas: (raw.tecnicas && raw.tecnicas.lineas) || [],
      razas: raw.razas.razas,
      meritos: raw.meritos.meritos,
      // Las decisiones de diseño (conversiones) se aplican encima del catálogo importado.
      feats: raw.feats.feats.map(function (f) { return conv[f.id] ? Object.assign({}, f, conv[f.id]) : f; }),
      items: raw.items.items,
      achievements: raw.achievements.achievements,
      traits: raw.traits.traits,
      classes: raw.classes.clases,
      vitalidad: raw.vitalidad,
      mana: raw.mana,
      manaTags: raw.manaTags.tags,
      // Habilidades por clase (data/clases/<id>.json), solo de las clases que se cargaron: { id: archivo }.
      clasesDetalle: raw.clasesDetalle || {},
    };
  }

  return {
    ARCHIVOS: ARCHIVOS,
    armarContexto: armarContexto,
    rotulo: rotulo,
    nivelDeXp: nivelDeXp,
    calcularXpEntrada: calcularXpEntrada,
    nivelDeSx: nivelDeSx,
    umbralesZeo: umbralesZeo,
    detalleLinea: detalleLinea,
    opcionesVisibles: opcionesVisibles,
    indexarTecnicas: indexarTecnicas,
    buscarTecnica: buscarTecnica,
    slotsDeFeats: slotsDeFeats,
    slotsTotalesEn: slotsTotalesEn,
    proximoSlot: proximoSlot,
    habilidadesDeClase: habilidadesDeClase,
    progresionConjuros: progresionConjuros,
    rutaClase: rutaClase,
    etiquetaAlineamiento: etiquetaAlineamiento,
    ATRIBUTOS_BASE: ATRIBUTOS_BASE,
    DERIVADOS: DERIVADOS,
    modAtributo: modAtributo,
    derivarAtributos: derivarAtributos,
    atributosCompletos: atributosCompletos,
    validarAtributos: validarAtributos,
    umbralesVitales: umbralesVitales,
    estadoVital: estadoVital,
    recuperacionPorHora: recuperacionPorHora,
    descansar: descansar,
    babDeClase: babDeClase,
    evaluarRequisitos: evaluarRequisitos,
    contextoJugador: contextoJugador,
    tienePerfilRacial: tienePerfilRacial,
    calcularPersonaje: calcularPersonaje,
    mfDeGate: mfDeGate,
    sxDeGate: sxDeGate,
    gatesPermitidos: gatesPermitidos,
    tagsIncompatibles: tagsIncompatibles,
    grafoMana: grafoMana,
  };
});
