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

  function detalleLinea(id, niveles, zeo) {
    const p = zeo.pisos;
    let abiertos = p.iniciales;
    let siguiente = null;
    p.desbloqueo.forEach(function (d) {
      if (niveles >= d.nivelesAcumulados) abiertos = Math.max(abiertos, d.piso);
      else if (!siguiente) siguiente = { piso: d.piso, nivelesAcumulados: d.nivelesAcumulados, falta: d.nivelesAcumulados - niveles };
    });
    const tope = p.desbloqueo.length ? p.desbloqueo[p.desbloqueo.length - 1].nivelesAcumulados : 1;
    return {
      id: id,
      niveles: niveles,
      pisosAbiertos: Math.min(abiertos, p.max),
      pisosMax: p.max,
      siguiente: siguiente,
      llenado: Math.min(1, niveles / tope),
      tope: tope,
      marcas: p.desbloqueo.map(function (d) { return d.nivelesAcumulados / tope; }),
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

  function proximoSlot(nivel, nivelMax) {
    const sig = nivel % 2 === 1 ? nivel + 2 : nivel + 1;
    return sig <= nivelMax - 1 ? sig : null;
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
    const estado = {
      xp: 0,
      sx: {},
      lineas: {},
      mana: 0,
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
    };
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
        lineas: {},
        mana: 0,
        fate: 0,
        feats: [],
        logros: [],
        rasgos: [],
        traits: [],
        objetos: [],
        tiradas: [],
        ajustes: [],
      };

      function error(i, msg) {
        avisos.push({ nivel: 'error', sesion: ses.id, indice: i, mensaje: msg });
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
            if (e.subsistema !== 'zeo' && e.subsistema !== 'mana') throw new Error('xp-subsistema solo admite zeo y mana');
            if (!esEntero(e.cantidad) || e.cantidad < 1) throw new Error('cantidad debe ser un entero positivo');
            if (e.subsistema === 'zeo') {
              if (zeo.ramas.indexOf(e.rama) < 0) throw new Error('zeo exige rama: ' + zeo.ramas.join(', '));
              estado.sx[e.rama] += e.cantidad;
              s.zeo[e.rama] = (s.zeo[e.rama] || 0) + e.cantidad;
            } else {
              estado.mana += e.cantidad;
              s.mana += e.cantidad;
            }
            return;
          }
          case 'zeo-linea': {
            const m = /^L(\d{2})$/.exec(e.linea || '');
            if (!m || Number(m[1]) < 1 || Number(m[1]) > zeo.lineasBase) throw new Error('la línea "' + e.linea + '" no existe (L01 a L' + String(zeo.lineasBase).padStart(2, '0') + ')');
            if (!esEntero(e.niveles) || e.niveles < 1) throw new Error('niveles debe ser un entero positivo');
            estado.lineas[e.linea] = (estado.lineas[e.linea] || 0) + e.niveles;
            s.lineas[e.linea] = (s.lineas[e.linea] || 0) + e.niveles;
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
            if (estado.feats.length + 1 > slotsDeFeats(nivel)) {
              throw new Error('no hay slot de feat libre en el nivel ' + nivel + ' (' + slotsDeFeats(nivel) + ' slots)');
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

    const ramas = zeo.ramas.map(function (r) { return detalleRama(r, estado.sx[r], zeo); });
    const minimo = Math.min.apply(null, ramas.map(function (r) { return r.nivel; }));
    ramas.forEach(function (r) { r.limita = r.nivel === minimo; });
    const lineas = [];
    for (let n = 1; n <= zeo.lineasBase; n++) {
      const id = 'L' + String(n).padStart(2, '0');
      lineas.push(detalleLinea(id, estado.lineas[id] || 0, zeo));
    }

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

    const sl = slotsDeFeats(nivelInfo.nivel);

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
      },
      xp: estado.xp,
      nivel: nivelInfo,
      sesiones: sesionesOut,
      zeo: { unidad: zeo.unidad, lectura: zeo.lectura, nivel: minimo, ramas: ramas, lineas: lineas, niveles: umbralesZeo(zeo) },
      mana: { total: estado.mana, tabla: null },
      recursos: recursos,
      fate: estado.fate,
      feats: {
        lista: estado.feats,
        slotsTotales: sl,
        slotsUsados: estado.feats.length,
        slotsLibres: Math.max(0, sl - estado.feats.length),
        niveles: Array.from({ length: Math.ceil(cfg.nivelMax / 2) }, function (_, i) { return i * 2 + 1; }).filter(function (n) { return n <= Math.max(nivelInfo.nivel + 2, 9); }),
        proximoSlot: proximoSlot(nivelInfo.nivel, cfg.nivelMax),
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
   * HP que cura un descanso: nivel × curación por nivel, más el bono de cuerpo (el modificador del
   * atributo, nunca negativo, por nivel si la regla lo dice), proporcional a las horas del descanso
   * respecto del largo y con un mínimo de 1.
   */
  function curacionDescanso(cfg, tipoId, nivel, valorAtributo) {
    const d = cfg.descanso;
    const tipo = d.tipos.find(function (t) { return t.id === tipoId; });
    if (!tipo) throw new Error('descanso desconocido: ' + tipoId);
    const mod = Math.max(0, modAtributo(valorAtributo));
    const base = nivel * d.curacionPorNivel;
    const bono = d.bonoCuerpo.porNivel ? mod * nivel : mod;
    const largo = base + bono;
    const hp = Math.max(1, Math.floor(largo * tipo.horas / d.horasLargo));
    return { tipo: tipo.id, nombre: tipo.nombre, horas: tipo.horas, nivel: nivel, base: base, bono: bono, mod: mod,
      atributo: d.bonoCuerpo.atributo, porNivel: !!d.bonoCuerpo.porNivel, largo: largo, hp: hp };
  }

  /** Archivos de data/ que lee el motor, por clave de contexto. */
  const ARCHIVOS = {
    config: 'xp-config.json',
    zeo: 'zeo.json',
    razas: 'razas.json',
    meritos: 'meritos.json',
    feats: 'feats.pf1.json',
    conversiones: 'feats.conversiones.json',
    items: 'items.json',
    achievements: 'achievements.json',
    traits: 'traits.json',
    classes: 'classes.json',
    vitalidad: 'vitalidad.json',
  };

  /** Convierte los JSON de data/ (ya parseados, por clave de ARCHIVOS) en el contexto del motor. */
  function armarContexto(raw) {
    const conv = (raw.conversiones && raw.conversiones.conversiones) || {};
    return {
      config: raw.config,
      zeo: raw.zeo,
      razas: raw.razas.razas,
      meritos: raw.meritos.meritos,
      // Las decisiones de diseño (conversiones) se aplican encima del catálogo importado.
      feats: raw.feats.feats.map(function (f) { return conv[f.id] ? Object.assign({}, f, conv[f.id]) : f; }),
      items: raw.items.items,
      achievements: raw.achievements.achievements,
      traits: raw.traits.traits,
      classes: raw.classes.clases,
      vitalidad: raw.vitalidad,
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
    slotsDeFeats: slotsDeFeats,
    ATRIBUTOS_BASE: ATRIBUTOS_BASE,
    DERIVADOS: DERIVADOS,
    modAtributo: modAtributo,
    derivarAtributos: derivarAtributos,
    atributosCompletos: atributosCompletos,
    validarAtributos: validarAtributos,
    umbralesVitales: umbralesVitales,
    estadoVital: estadoVital,
    curacionDescanso: curacionDescanso,
    babDeClase: babDeClase,
    evaluarRequisitos: evaluarRequisitos,
    contextoJugador: contextoJugador,
    tienePerfilRacial: tienePerfilRacial,
    calcularPersonaje: calcularPersonaje,
  };
});
