/* EverwhiteEmperor: visor de personajes.
 * Lee data/*.json y characters/<id>.json, calcula con src/core.js y dibuja la página.
 * En el archivo único de dist/ los datos vienen embebidos en window.EWE_DATA.
 * Dos vistas: «Jugar» (reducida) y «Construir» (amplia, con el selector de feats).
 * El visor no escribe en los personajes: lo que se elige queda en un borrador que se copia como JSON. */
(function () {
  'use strict';

  var Core = window.Core;
  var app = document.getElementById('app');

  // ------------------------------------------------------------------ utilidades

  function f(n) { return Number(n).toLocaleString('en-US'); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function signo(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function pct(x) { return String(Math.round(x * 100)); }

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fecha(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? Number(m[3]) + ' ' + MESES[Number(m[2]) - 1] + ' ' + m[1] : s || '';
  }
  var ATRIBUTOS = {
    STR: 'Fuerza', DEX: 'Destreza', PER: 'Percepción', INT: 'Inteligencia', WIS: 'Sabiduría', CHA: 'Carisma',
    CON: 'Constitución', SPR: 'Espíritu', MND: 'Mente',
  };
  var DADOS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  var DADO_INICIAL = { hp: 'd8', mp: 'd6' };
  var CLAVE_ABIERTOS = 'ewe-abiertos-v2';
  var TIPOS_FEAT = { combate: 'Combate', general: 'General', metamagia: 'Metamagia', 'creacion-de-objetos': 'Creación de objetos' };

  function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ } }
  function leerGuardado(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }
  function leerJsonGuardado(clave, porDefecto) {
    var t = leerGuardado(clave);
    if (!t) return porDefecto;
    try { return JSON.parse(t); } catch (e) { return porDefecto; }
  }

  // ------------------------------------------------------------------------ carga

  function pedirJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' respondió ' + r.status);
      return r.json();
    });
  }

  function cargarDatos() {
    if (window.EWE_DATA) {
      return Promise.resolve({ ctx: Core.armarContexto(window.EWE_DATA.data), personajes: window.EWE_DATA.personajes });
    }
    var raw = {};
    var claves = Object.keys(Core.ARCHIVOS);
    return Promise.all(claves.map(function (k) {
      return pedirJson('../data/' + Core.ARCHIVOS[k]).then(function (j) { raw[k] = j; });
    })).then(function () {
      return pedirJson('../characters/index.json');
    }).then(function (indice) {
      var ids = indice.personajes;
      return Promise.all(ids.map(function (id) {
        return pedirJson('../characters/' + id + '.json').then(function (j) { return [id, j]; });
      })).then(function (pares) {
        var personajes = {};
        pares.forEach(function (p) { personajes[p[0]] = p[1]; });
        // Habilidades de clase (6.5): solo se piden los archivos de las clases que usan los personajes.
        raw.clasesDetalle = {};
        var clases = [];
        Object.keys(personajes).forEach(function (id) { var c = personajes[id].clase; if (c && clases.indexOf(c) < 0) clases.push(c); });
        return Promise.all(clases.map(function (c) { return pedirClase(c, raw.clasesDetalle); })).then(function () {
          return { ctx: Core.armarContexto(raw), personajes: personajes };
        });
      });
    });
  }

  /** Pide data/clases/<id>.json y lo deja en `destino`. Sin archivo (404) no es un error: la clase queda sin detalle. */
  function pedirClase(id, destino) {
    if (!id || destino[id] || window.EWE_DATA) return Promise.resolve();
    return fetch('../data/' + Core.rutaClase(id)).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (j) { if (j && j.id === id) destino[id] = j; }).catch(function () { /* sin detalle de la clase */ });
  }

  // ----------------------------------------------------------------------- estado

  var estado = {
    ctx: null, indiceFeats: {}, personajes: {}, ids: [], actual: null,
    modo: leerGuardado('ewe-modo') === 'jugar' ? 'jugar' : 'construir',
    abiertos: leerJsonGuardado(CLAVE_ABIERTOS, {}),
    picker: { q: '', tipo: 'todos', soloDisp: true, max: 40 },
    logrosQ: '', indiceLogros: {}, dados: {},
    actuales: {}, retratos: {}, imagenSesion: '',
    borradores: {},
    vista: null,
  };

  function pjActual() { return estado.personajes[estado.actual]; }
  function claveBorrador(pj) { return 'ewe-borrador-' + (pj.personaje || estado.actual); }

  function entradaValida(e) {
    if (!e || typeof e !== 'object') return false;
    if (e.tipo === 'feat' || e.tipo === 'achievement') return typeof e.id === 'string';
    if (e.tipo === 'tirada') return (e.recurso === 'hp' || e.recurso === 'mp') && typeof e.dado === 'string' && typeof e.resultado === 'number';
    if (e.tipo === 'inscribir') return typeof e.slot === 'string' && (typeof e.habilidad === 'string' || typeof e.tecnica === 'string');
    if (e.tipo === 'desinscribir') return typeof e.slot === 'string';
    if (e.tipo === 'mana-fuerza') return typeof e.fuente === 'string' && (typeof e.cantidad === 'number' || typeof e.porNivel === 'number');
    if (e.tipo === 'gate') return typeof e.id === 'string' && typeof e.tag === 'string';
    if (e.tipo === 'zeo-tecnica') return typeof e.linea === 'string' && typeof e.nivel === 'number';
    if (e.tipo === 'zeo-activar') return typeof e.linea === 'string';
    if (e.tipo === 'conjuro') return typeof e.id === 'string' || typeof e.nombre === 'string';
    if (e.tipo === 'mana-tecnica') return typeof e.nombre === 'string' && typeof e.nivel === 'number';
    if (e.tipo === 'mana-tecnica-sx') return typeof e.id === 'string' && typeof e.cantidad === 'number';
    if (e.tipo === 'apunte') return typeof e.autor === 'string' && typeof e.texto === 'string';
    if (e.tipo === 'resumen') return typeof e.texto === 'string' || typeof e.imagen === 'string';
    if (e.tipo === 'opciones') return typeof e.id === 'string' && typeof e.titulo === 'string' && Array.isArray(e.opciones);
    if (e.tipo === 'decision') return typeof e.opciones === 'string' && Array.isArray(e.elegidas);
    if (e.tipo === 'sx') return typeof e.cantidad === 'number';
    if (e.tipo === 'sx-asignar' || e.tipo === 'xp-subsistema') return typeof e.subsistema === 'string' && typeof e.cantidad === 'number';
    return false;
  }

  /** Entradas (feats, achievements y tiradas) pendientes de guardar, del personaje mostrado. */
  function borradorDe(pj) {
    var k = claveBorrador(pj);
    if (!estado.borradores[k]) {
      var g = leerJsonGuardado(k, []);
      estado.borradores[k] = Array.isArray(g) ? g.filter(entradaValida) : [];
    }
    return estado.borradores[k];
  }
  function fijarBorrador(pj, entradas) {
    estado.borradores[claveBorrador(pj)] = entradas;
    guardar(claveBorrador(pj), JSON.stringify(entradas));
  }

  /** Calcula el personaje; con borrador, añade una sesión final «borrador» que solo existe aquí. */
  function calcular(pj, borr) {
    var base = pj;
    if (borr && borr.length) {
      base = Object.assign({}, pj, { sesiones: pj.sesiones.concat([{ id: 'borrador', fecha: '', titulo: 'Borrador', entradas: borr }]) });
    }
    return Core.calcularPersonaje(estado.ctx, base);
  }

  // ---------------------------------------------------------------------- dibujo

  function chip(texto, tono) { return '<span class="chip ' + (tono || '') + '">' + esc(texto) + '</span>'; }

  /** Atributos de un elemento con tooltip: se enfoca con el teclado y con el toque, y el texto sale en #tooltip. */
  function tip(texto) { return texto ? ' tabindex="0" data-tip="' + esc(texto) + '"' : ''; }
  function chipTip(texto, tono, ayuda) {
    return '<span class="chip ' + (tono || '') + '"' + tip(ayuda) + '>' + esc(texto) + '</span>';
  }
  /** Fila de una línea de una lista: etiqueta opcional, nombre, relleno (chips) y valor o enlace a la derecha. */
  function fila(o) {
    return '<li class="ren' + (o.clase ? ' ' + o.clase : '') + '"' + (o.tipEnNombre ? '' : tip(o.tip)) + '>' +
      (o.etiqueta ? '<span class="et">' + esc(o.etiqueta) + '</span>' : '') +
      '<span class="nm"' + (o.tipEnNombre ? tip(o.tip) : '') + '>' + esc(o.nombre) + '</span>' + (o.medio || '') +
      (o.der ? '<span class="der">' + o.der + '</span>' : '') + '</li>';
  }

  /** Sección plegable. El estado abierto o cerrado se recuerda entre dibujos y entre visitas. */
  function desplegable(id, titulo, resumen, cuerpo) {
    return '<details class="desp" data-id="' + id + '"' + (estado.abiertos[id] ? ' open' : '') + '><summary><h2>' + esc(titulo) + '</h2>' +
      '<span class="desp-res">' + resumen + '</span><span class="desp-flecha" aria-hidden="true"></span></summary>' +
      '<div class="desp-cuerpo">' + cuerpo + '</div></details>';
  }

  function enlaceFeat(cat) {
    if (!cat || cat.fuente !== 'pf1') return '';
    return '<a class="link" href="https://aonprd.com/FeatDisplay.aspx?ItemName=' + encodeURIComponent(cat.nombre).replace(/%20/g, '+') +
      '" target="_blank" rel="noopener noreferrer">Ver texto ↗</a>';
  }

  function seccionAvisos(calc) {
    var errores = calc.avisos.filter(function (a) { return a.nivel === 'error' && a.sesion !== 'borrador'; });
    var pendientes = calc.avisos.filter(function (a) { return a.nivel === 'aviso'; });
    var html = '';
    if (errores.length) {
      var li = errores.map(function (a) {
        var donde = a.sesion ? '<b>Sesión ' + esc(a.sesion) + (a.indice === null ? '' : ', entrada ' + (a.indice + 1)) + ':</b> ' : '';
        return '<li>' + donde + esc(a.mensaje) + '</li>';
      }).join('');
      html += '<section class="avisos" role="alert"><b>' + plural(errores.length, 'aviso', 'avisos') +
        ' del registro</b><ul>' + li + '</ul><span class="vacio">Las entradas con error no se aplicaron al personaje.</span></section>';
    }
    if (pendientes.length) {
      html += '<section class="avisos suave" role="status"><b>Pendiente</b><ul>' + pendientes.map(function (a) {
        return '<li>' + esc(a.mensaje) + '</li>';
      }).join('') + '</ul></section>';
    }
    return html;
  }

  function cajaAtributo(k, v, calc) {
    var pref = calc.personaje.preferidos.indexOf(k) >= 0;
    return '<div class="attr"><div class="top"><span class="ab">' + k + '</span><span class="mod num">' + signo(Core.modAtributo(v)) + '</span></div>' +
      '<span class="score">' + v + '</span><span class="mute nom">' + ATRIBUTOS[k] + '</span>' + (pref ? '<span class="chip acc">Preferido</span>' : '') + '</div>';
  }

  function miniDerivado(k, v) {
    var mod = signo(Core.modAtributo(v));
    var formula = 'mín(' + Core.DERIVADOS[k].join(', ') + ')';
    var destino = k === 'CON' ? 'HP' : k === 'SPR' ? 'MP' : '';
    return '<span class="mini-der" title="' + formula + (destino ? ' · bonifica ' + destino : '') + '" aria-label="' + ATRIBUTOS[k] + ' ' + v + ', modificador ' + mod + ', ' + formula + (destino ? ', bonifica ' + destino : '') + '">' +
      '<b>' + k + '</b><span class="num">' + v + '</span><span class="mod num">' + mod + '</span>' + (destino ? '<span class="mute">→ ' + destino + '</span>' : '') + '</span>';
  }

  /** Los seis atributos base y, en una sola línea, los tres derivados como mini tarjetas. */
  function bloqueAtributos(calc) {
    var base = Core.ATRIBUTOS_BASE.map(function (k) { return cajaAtributo(k, calc.personaje.atributos[k], calc); }).join('');
    var der = Object.keys(Core.DERIVADOS).map(function (k) { return miniDerivado(k, calc.personaje.derivados[k]); }).join('');
    return '<div class="attrs"><div class="attrs-grupo"><span class="eyebrow">Atributos</span><div class="attrs-base">' + base + '</div></div>' +
      '<div class="attrs-der" aria-label="Atributos derivados"><span class="eyebrow">Derivados</span>' + der + '</div></div>';
  }

  /** Habilidades (skills) del personaje y su tag de XP: el tag que le da experiencia adicional. */
  function bloqueHabilidades(calc) {
    var p = calc.personaje;
    if (!p.habilidades.length && !p.tagXp) return '';
    return '<div class="ficha-hab">' +
      (p.habilidades.length ? '<div class="ficha-hab-grupo"><span class="eyebrow">Habilidades</span><div class="chips">' + p.habilidades.map(function (h) { return chip(h.nombre, 'soft'); }).join('') + '</div></div>' : '') +
      (p.tagXp ? '<div class="ficha-hab-grupo"><span class="eyebrow">Tag de XP</span><div class="chips">' + chipTip(p.tagXp.nombre, 'gold', 'Tag que da experiencia adicional a este personaje') + '</div></div>' : '') + '</div>';
  }

  function textoProgreso(calc) {
    var n = calc.nivel;
    return n.maximo && calc.xp >= n.fin ? 'Nivel máximo' : 'Faltan <strong>' + f(n.faltan) + ' XP</strong> para el nivel ' + (n.nivel + 1);
  }

  function barraXp(calc) {
    var n = calc.nivel;
    return '<div class="bar" role="progressbar" aria-label="Progreso hacia el nivel ' + (n.nivel + 1) + '" aria-valuemin="' + n.inicio + '" aria-valuemax="' + n.fin +
      '" aria-valuenow="' + Math.min(calc.xp, n.fin) + '"><i style="width:' + (n.progreso * 100).toFixed(1) + '%"></i></div>';
  }

  // ---- retrato

  function idPj(pj) { return pj.personaje || estado.actual; }

  /** Una ruta relativa se lee de characters/; en el archivo único el build ya la dejó como data:. */
  function srcImagen(uri) {
    if (!uri) return '';
    if (/^(data:image\/|blob:|https?:)/i.test(uri)) return uri;
    return window.EWE_DATA ? '' : '../characters/' + uri;
  }

  /** El retrato elegido en este navegador gana al del archivo del personaje. */
  function retratoLocal(pj) {
    var id = idPj(pj);
    if (estado.retratos[id] === undefined) estado.retratos[id] = leerGuardado('ewe-retrato-' + id) || '';
    return estado.retratos[id];
  }

  function htmlRetrato(calc, pj, con) {
    var local = retratoLocal(pj);
    var src = local || srcImagen(calc.personaje.imagen);
    var iniciales = String(pj.nombre || '?').split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
    var marco = src
      ? '<img src="' + esc(src) + '" alt="Retrato de ' + esc(pj.nombre) + '" width="320" height="400">'
      : '<div class="inicial"><span class="serif" aria-hidden="true">' + esc(iniciales) + '</span><small>Sin retrato</small></div>';
    var ctl = con
      ? '<div class="retrato-ctl"><label class="btn mini file">Cambiar<span class="solo-ancho">&nbsp;retrato</span><input type="file" id="retrato-archivo" accept="image/*"></label>' +
        (local ? '<button class="btn mini" type="button" data-accion="quitar-retrato">Quitar</button>' : '') + '</div>'
      : '';
    return '<figure class="retrato"><div class="marco">' + marco + '</div>' + ctl + '</figure>';
  }

  // ---- HP y MP: máximos del registro; el valor actual es solo de este navegador

  function actualesDe(pj) {
    var id = idPj(pj);
    if (!estado.actuales[id]) {
      var g = leerJsonGuardado('ewe-actual-' + id, {});
      estado.actuales[id] = g && typeof g === 'object' ? g : {};
    }
    return estado.actuales[id];
  }
  /** El HP puede quedar bajo cero (K.O., Deadly) hasta −máximo; el MP se detiene en 0. */
  function minimoVital(rec, max) { return rec === 'hp' ? -max : 0; }
  function valorActual(pj, rec, max) {
    var v = actualesDe(pj)[rec];
    return typeof v === 'number' ? Math.max(minimoVital(rec, max), Math.min(max, Math.round(v))) : max;
  }
  function conSigno(n) { return n < 0 ? '−' + Math.abs(n) : String(n); }
  /** Un cambio con signo explícito: +2 o −1. */
  function deltaTxt(n) { return (n < 0 ? '−' : '+') + Math.abs(n); }
  function valorAtributo(calc, k) {
    return calc.personaje.derivados[k] !== undefined ? calc.personaje.derivados[k] : calc.personaje.atributos[k];
  }
  function fijarActual(pj, rec, valor, max) {
    var a = actualesDe(pj);
    if (valor >= max) delete a[rec]; else a[rec] = valor;
    guardar('ewe-actual-' + idPj(pj), JSON.stringify(a));
  }

  /** Texto del tooltip de fatiga y estados, con los umbrales ya convertidos a HP del máximo actual. */
  function textoUmbrales(max) {
    var u = Core.umbralesVitales(max, estado.ctx.vitalidad);
    var lineas = ['Fatiga: penalizador acumulado según el HP actual'];
    u.fatiga.forEach(function (t) {
      lineas.push('HP ≤ ' + t.hp + ' (' + t.pct + ' %): ' + signo(t.penalizador) + (t.acumulado !== t.penalizador ? ' más, ' + signo(t.acumulado) + ' en total' : ''));
    });
    lineas.push('', 'Estados');
    u.estados.forEach(function (e) {
      lineas.push(e.nombre + ': HP ≤ ' + conSigno(e.hp) + (e.pct !== 0 ? ' (' + conSigno(e.pct) + ' %)' : ''));
    });
    return lineas.join('\n');
  }

  /** `juego` añade a HP la fatiga, el estado y las marcas de los umbrales (vista Jugar). */
  function htmlVital(rec, etiqueta, r, pj, juego) {
    var max = r.maximo;
    var act = valorActual(pj, rec, max);
    var ancho = max > 0 ? Math.round(Math.max(0, act) / max * 100) : 0;
    var cfg = estado.ctx.vitalidad;
    var ev = rec === 'hp' && juego && max > 0 ? Core.estadoVital(act, max, cfg) : null;
    var btn = function (delta, texto, accesible) {
      return '<button class="btn mini" type="button" data-accion="rec" data-recurso="' + rec + '" data-delta="' + delta + '" aria-label="' + accesible + '">' + texto + '</button>';
    };
    var marcas = ev ? '<span class="marcas" aria-hidden="true">' + cfg.fatiga.umbrales.map(function (u) { return '<i style="left:' + u.pct + '%"></i>'; }).join('') + '</span>' : '';
    var ayuda = ev ? textoUmbrales(max) : '';
    var chips = ev
      ? '<div class="vital-estado" aria-live="polite">' + (ev.fatiga ? chipTip('Fatiga ' + signo(ev.fatiga), 'warn', ayuda) : chipTip('Sin fatiga', 'soft', ayuda)) +
        (ev.estado ? chipTip(ev.estado.nombre, 'estado', ayuda) : '') + '</div>'
      : '';
    var texto = conSigno(act) + ' de ' + max + (ev && ev.estado ? ', ' + ev.estado.nombre : '');
    return '<div class="vital ' + rec + '"><div class="vital-top"><span><b>' + etiqueta + '</b> <span class="mute">dado + ' + r.atributo + ' ' + r.valor + ' (' + signo(r.mod) + ')</span></span>' +
      '<span class="vital-num num' + (act < 0 ? ' neg' : '') + '" aria-live="polite"><b>' + conSigno(act) + '</b> / ' + max + '</span></div>' +
      '<div class="barra"><div class="bar" role="progressbar" aria-label="' + etiqueta + ' actuales" aria-valuemin="0" aria-valuemax="' + max + '" aria-valuenow="' + Math.max(0, act) + '" aria-valuetext="' + esc(texto) + '"><i style="width:' + ancho + '%"></i></div>' + marcas + '</div>' +
      chips +
      '<div class="vital-ctl">' + btn(-5, '−5', 'Restar 5 de ' + etiqueta) + btn(-1, '−1', 'Restar 1 de ' + etiqueta) + btn(1, '+1', 'Sumar 1 a ' + etiqueta) + btn(5, '+5', 'Sumar 5 a ' + etiqueta) +
      btn('max', 'Máx', 'Llevar ' + etiqueta + ' al máximo') + '</div>' +
      (r.pendientes.length ? '<span class="chip warn">Faltan tiradas: ' + (r.pendientes.length === 1 ? 'nivel ' : 'niveles ') + esc(r.pendientes.join(', ')) + '</span>' : '') + '</div>';
  }

  /** Un decimal con coma y los decimales pedidos: 1,77. */
  function dec(n, d) { return Number(n).toFixed(d).replace('.', ','); }

  /** El detalle de la fórmula de un recurso, para el tooltip de su tasa. */
  function ayudaTasa(rec, nombre, max, tasa, d, bonoReal) {
    var f = d.formula;
    var atr = d.recursos[rec].atributo;
    var recortado = bonoReal < f.minimoBono;
    return 'R = C + V / ' + f.divisorV + (tasa.multiplicador !== 1 ? '  (×' + tasa.multiplicador + ' en ' + nombre + ')' : '') + '\n' +
      'V = (H − ' + f.constante + ' − ' + f.porBono + '·C) / (' + f.sumaFija + ' + C)\n' +
      'H = ' + max + ' (' + nombre + ' máximo)\n' +
      'C = bono de ' + atr + ' ' + (recortado ? signo(bonoReal) + ' (cuenta como ' + f.minimoBono + ')' : signo(tasa.bono)) + (f.desplazamiento ? ' + ' + f.desplazamiento : '') + ' = ' + tasa.c + '\n' +
      'V = ' + dec(tasa.v, 2) + '  →  R = ' + dec(tasa.porHora, 2) + ' ' + nombre + ' por hora';
  }

  /**
   * Recuperación (vista Jugar). Una sola fórmula del diseñador da puntos por hora para HP (bono de CON) y para MP (bono de
   * SPR, ×5). Hay solo dos descansos, el corto (2 h) y el largo (8 h, con 50 % extra), y cada uno recupera HP y MP a la vez.
   */
  function bloqueRecuperacion(calcB, pj) {
    var cfg = estado.ctx.vitalidad;
    var d = cfg.descanso;
    var recs = ['hp', 'mp'].map(function (rec) {
      var r = calcB.recursos[rec];
      var bono = Core.modAtributo(valorAtributo(calcB, d.recursos[rec].atributo));
      return { rec: rec, nombre: rec.toUpperCase(), max: r.maximo, act: valorActual(pj, rec, r.maximo), bono: bono, tasa: Core.recuperacionPorHora(r.maximo, bono, cfg, rec) };
    });
    var puede = recs.some(function (x) { return x.max > 0 && x.act < x.max && x.tasa.porHora > 0; });
    var chips = recs.map(function (x) {
      return chipTip(dec(x.tasa.porHora, 2) + ' ' + x.nombre + ' por hora', x.tasa.porHora > 0 ? 'acc' : 'soft', ayudaTasa(x.rec, x.nombre, x.max, x.tasa, d, x.bono));
    }).join('');
    var btn = function (x) {
      var partes = recs.map(function (y) {
        var res = Core.descansar(y.act, y.max, x, y.bono, cfg, y.rec);
        return res.recuperado > 0 ? '+' + res.recuperado + ' ' + y.nombre : '';
      }).filter(Boolean);
      var extra = x.extra ? ' · +' + Math.round(x.extra * 100) + ' % de recuperación' : '';
      return '<button class="btn" type="button" data-accion="descansar" data-id="' + esc(x.id) + '"' + (puede ? '' : ' disabled') + '><span>' + esc(x.nombre) + ' · ' + x.horas + ' h' + extra + '</span>' +
        '<b class="num">' + (partes.length ? partes.join(' · ') : 'Al máximo') + '</b></button>';
    };
    var motivo = recs[0].max <= 0 ? 'Faltan las tiradas de HP: sin HP máximo no hay recuperación.'
      : !puede ? 'HP y MP ya están al máximo.' : '';
    return '<div class="recup"><div class="row-between" style="align-items:center"><span class="eyebrow">Recuperación</span><span class="chips">' + chips + '</span></div>' +
      '<div class="recup-btns">' + btn(d.corto) + btn(d.largo) + '</div>' +
      '<span class="mute pie-vital">' + (motivo ? esc(motivo) + ' ' : '') +
      'Cada descanso recupera HP y MP a la vez: la tasa por las horas' + (d.largo.extra ? ', con ' + Math.round(d.largo.extra * 100) + ' % extra en el largo' : '') + ', redondeado hacia abajo y sin pasar del máximo.</span></div>';
  }

  function htmlVitales(calcB, pj, juego) {
    var hayBorrador = calcB.sesiones.some(function (s) { return s.id === 'borrador' && s.tiradas.length; });
    return htmlVital('hp', 'HP', calcB.recursos.hp, pj, juego) + htmlVital('mp', 'MP', calcB.recursos.mp, pj, juego) +
      (juego ? bloqueRecuperacion(calcB, pj) : '') +
      (hayBorrador ? '<span class="chip gold" style="align-self:flex-start">Los máximos incluyen tiradas del borrador</span>' : '') +
      '<span class="mute pie-vital">El valor actual se guarda solo en este navegador; el máximo sale de las tiradas del registro.</span>';
  }

  /** La base: retrato, nombre, nivel y XP, HP y MP, y los nueve atributos. */
  function seccionFicha(calc, calcB, pj, con) {
    var n = calc.nivel;
    var pref = calc.personaje.preferidos;
    var perfilTexto = con && pref.length
      ? '<p class="mute" style="font-size:13px">Preferido: atributo del perfil racial de ' + esc(calc.personaje.razaNombre) + ' (' + esc(pref.join(' y ')) + '). Perfil racial: ' +
        (calc.personaje.perfilRacial ? 'se cumple, hay descuento en los racials.' : 'no se cumple, sin descuento.') + ' CON, SPR y MND se derivan de los atributos base.</p>'
      : '';
    return '<section class="card ficha"><div class="ficha-top">' + htmlRetrato(calc, pj, con) +
      '<div class="ficha-nombre"><h1>' + esc(pj.nombre) + '</h1><p class="mute">' + esc(calc.personaje.claseNombre) +
      (calc.personaje.arquetipo ? ' (' + esc(calc.personaje.arquetipo.nombre) + ')' : '') + ' · ' + esc(calc.personaje.razaNombre) +
      (calc.personaje.alineamiento ? ' · ' + esc(calc.personaje.alineamiento.texto) + ' (' + esc(calc.personaje.alineamiento.codigo) + ')' : '') + ' · ' +
      plural(Math.max(0, calc.sesiones.length - 1), 'sesión registrada', 'sesiones registradas') + '</p></div>' +
      '<div class="ficha-nivel"><div class="nivel-num chico"><span class="eyebrow">Nivel</span><b>' + n.nivel + '</b></div>' +
      '<div class="xp-block"><div class="row-between"><span class="xp-big num">' + f(calc.xp) + ' <small>XP</small></span>' +
      '<span class="mute num" style="font-size:13px">Nivel ' + n.nivel + ': ' + f(n.inicio) + ' – ' + f(n.fin) + '</span></div>' +
      barraXp(calc) + '<span style="font-size:14px">' + textoProgreso(calc) + '</span></div></div>' +
      '<div class="vitales" id="vitales">' + htmlVitales(calcB, pj, !con) + '</div></div>' +
      bloqueAtributos(calc) + bloqueHabilidades(calc) + perfilTexto + '</section>';
  }

  // ---- SX compartido por Zeo y Mana: una reserva común y su reparto

  function notaReserva(x) {
    return x.reserva > 0
      ? '<p class="mute" style="font-size:14px"><b>' + f(x.reserva) + ' SX sin asignar</b> en la reserva común: se reparten en la sección SX.</p>'
      : '';
  }

  /** Opciones de destino: Zeo por rama y Mana; con `conReserva` se suma «Reserva» como primera. */
  function opcionesDestinoSx(calcB, conReserva) {
    var o = conReserva ? '<option value="reserva">Reserva común (decidir después)</option>' : '';
    calcB.zeo.ramas.forEach(function (r) { o += '<option value="zeo:' + esc(r.rama) + '">Zeo · ' + esc(Core.rotulo(r.rama)) + '</option>'; });
    return o + '<option value="mana">Mana</option>';
  }

  function seccionSx(calcB, con) {
    var x = calcB.sx;
    var caja = function (rotuloTxt, valor, cls) { return '<div class="caja ' + (cls || '') + '"><small>' + rotuloTxt + '</small><b>' + valor + '</b></div>'; };
    var cajas = '<div class="cajas">' + caja('Reserva sin asignar', f(x.reserva), x.reserva > 0 ? 'saldo' : '') + caja('En Zeo', f(x.zeo.total)) + caja('En Mana', f(x.mana)) + caja('SX ganado', f(x.total)) + '</div>';
    var ramas = calcB.zeo.ramas.map(function (r) { return Core.rotulo(r.rama) + ' ' + f(x.zeo.ramas[r.rama]); }).join(' · ');
    var cuerpo = '<p class="sub">El SX es un solo recurso que gastan Zeo y Mana. Lo que se gana sin decidir su destino queda en la <b>reserva común</b>; después se <b>asigna</b> a Zeo (a una de sus tres ramas) o a Mana. ' +
      'Una vez asignado se queda en ese subsistema y no vuelve a la reserva. Si la sesión ya sabe el destino, el SX puede entrar directo. Es un supuesto de diseño: la especificación 4.1.3 lo explica.</p>' + cajas +
      '<p class="mute" style="font-size:14px">Zeo por rama: ' + esc(ramas) + '. De lo ganado, ' + f(x.ganadoEnReserva) + ' pasó por la reserva (' + f(x.asignado) + ' ya asignado) y ' + f(x.directo) + ' entró directo.</p>';
    if (con) {
      cuerpo += '<div class="picker-bloque"><h3 style="font-size:20px">Registrar SX ganado</h3>' +
        '<p class="sub">Si no sabes todavía a qué va, déjalo en la reserva.</p>' +
        '<div class="acc-fila"><label class="campo-et">Cantidad<input class="campo" type="number" inputmode="numeric" min="1" step="1" id="sx-gan-n" value="1" style="width:110px;min-width:0"></label>' +
        '<label class="campo-et">Destino<select class="btn" id="sx-gan-d">' + opcionesDestinoSx(calcB, true) + '</select></label>' +
        '<button class="btn prim" type="button" data-accion="sx-ganar">Agregar</button></div></div>' +
        '<div class="picker-bloque"><h3 style="font-size:20px">Asignar de la reserva</h3>' +
        '<p class="sub">' + (x.reserva > 0 ? 'Hay ' + f(x.reserva) + ' SX en la reserva.' : 'La reserva está vacía: primero registra SX ganado.') + '</p>' +
        '<div class="acc-fila"><label class="campo-et">Cantidad<input class="campo" type="number" inputmode="numeric" min="1" step="1" max="' + x.reserva + '" id="sx-asi-n" value="' + (x.reserva > 0 ? x.reserva : 1) + '" style="width:110px;min-width:0"' + (x.reserva > 0 ? '' : ' disabled') + '></label>' +
        '<label class="campo-et">Destino<select class="btn" id="sx-asi-d"' + (x.reserva > 0 ? '' : ' disabled') + '>' + opcionesDestinoSx(calcB, false) + '</select></label>' +
        '<button class="btn prim" type="button" data-accion="sx-asignar"' + (x.reserva > 0 ? '' : ' disabled') + '>Asignar</button></div></div>';
    }
    var resumen = chip('Reserva ' + f(x.reserva), x.reserva > 0 ? 'acc' : 'soft') + chip('Zeo ' + f(x.zeo.total), 'soft') + chip('Mana ' + f(x.mana), 'soft');
    return desplegable('sx', 'SX', resumen, cuerpo);
  }

  // ---- subsistemas plegables: zeo, mana y magia

  function textoDescripcion(d) {
    return d ? '<p class="zdesc">' + esc(d) + '</p>' : '<p class="zdesc sin">Sin descripción todavía.</p>';
  }

  function chipRama(rama) {
    if (!rama) return '';
    return '<span class="chip zrama" style="--rc:var(--' + esc(rama) + ', var(--acc))"><i aria-hidden="true"></i>' + esc(Core.rotulo(rama)) + '</span>';
  }

  /**
   * Un nivel de una línea de técnicas: casillas (tomadas llenas, visibles huecas, ocultas punteadas), lo tomado con su
   * descripción y, si la raíz es del catálogo, las mejoras de ese nivel que aún no se tomaron.
   */
  function filaNivelZeo(n) {
    var pips = '';
    for (var i = 0; i < n.tope; i++) pips += '<i class="' + (i < n.tomadas.length ? '' : i < n.visibles ? 'visible' : 'oculto') + '"></i>';
    var txt = (!n.abierto ? 'Cerrado' : n.tomadas.length + ' de ' + n.visibles + (n.visibles < n.tope ? ' (hasta ' + n.tope + ')' : '')) +
      (n.costo ? ' · ' + n.costo + ' sx' : '');
    var tomadas = n.tomadas.map(function (t) {
      return '<li class="ztec tomada"><span class="ztec-nom">' + esc(t.nombre || 'Técnica sin nombre') + '</span>' +
        (t.catalogo ? '' : '<span class="chip soft">Sin catálogo</span>') + (t.origen ? '<span class="chip soft">' + esc(t.origen) + '</span>' : '') +
        textoDescripcion(t.descripcion) + '</li>';
    }).join('');
    var faltan = n.opciones.filter(function (o) { return !o.tomada; }).map(function (o) {
      return '<li class="ztec"><span class="ztec-nom">' + esc(o.nombre) + '</span>' + (o.descripcion ? '<p class="zdesc">' + esc(o.descripcion) + '</p>' : '') + '</li>';
    }).join('');
    return '<div class="znivel' + (n.abierto ? '' : ' cerrado') + '"><span class="znv">Nv. ' + n.nivel + '</span><span class="zpips" aria-hidden="true">' + pips + '</span>' +
      '<span class="zt num">' + txt + '</span>' + (tomadas || faltan ? '<ul class="ztecs">' + tomadas + faltan + '</ul>' : '') + '</div>';
  }

  /**
   * Una línea de técnicas como slot. La ocupada es desplegable y su resumen trae el nombre de la técnica raíz; si está
   * por activar, solo muestra su nivel 1 y lo que cuesta activarla. La libre se dibuja con borde punteado.
   */
  function tarjetaLineaZeo(l, con) {
    if (!l.ocupada) {
      return '<div class="zlinea libre"><div class="row-between" style="align-items:baseline;gap:8px"><span class="id">' + esc(l.id) + '</span>' +
        '<span class="mute" style="font-size:13px">Slot libre</span></div></div>';
    }
    var raiz = l.raiz;
    var origen = raiz && raiz.origen ? raiz.origen : null;
    var resumen = '<span class="id">' + esc(l.id) + '</span><span class="zraiz">' + esc(raiz && raiz.nombre ? raiz.nombre : 'Técnica sin nombre') + '</span>' +
      chipRama(l.rama) + (l.activa ? '' : '<span class="chip warn">Por activar · ' + l.costoActivar + ' sx</span>') +
      (origen ? chipTip(origen, 'soft', 'Origen anotado en el registro') : '') +
      '<span class="zcuenta mute">' + (l.activa ? plural(l.total, 'técnica', 'técnicas') + ' · nv. ' + l.nivelMax : 'Adquirida, sin pagar') + '</span><span class="desp-flecha" aria-hidden="true"></span>';
    var idDesp = 'zl-' + l.id;
    var niveles = (l.activa ? l.niveles : l.niveles.slice(0, 1)).map(filaNivelZeo).join('');
    var activar = !l.activa && con
      ? '<div class="acc-fila"><button class="btn prim" type="button" data-accion="zeo-activar" data-linea="' + esc(l.id) + '">Activar · ' + l.costoActivar + ' sx</button></div>'
      : '';
    return '<details class="zlinea' + (l.activa ? '' : ' por-activar') + '" data-id="' + esc(idDesp) + '"' + (estado.abiertos[idDesp] ? ' open' : '') + '><summary>' + resumen + '</summary>' +
      '<div class="zlinea-cuerpo">' + niveles + activar + '</div></details>';
  }

  /** Orígenes ya conocidos (catálogo y líneas existentes), para sugerirlos al escribir uno. */
  function origenesZeo(z) {
    var vistos = {}, lista = [];
    function sumar(o) { if (o && !vistos[o]) { vistos[o] = true; lista.push(o); } }
    z.catalogo.forEach(function (c) { sumar(c.origen); });
    z.lineas.forEach(function (l) { if (l.raiz) sumar(l.raiz.origen); });
    return lista;
  }

  /** Cada formulario de Zeo arma una entrada zeo-tecnica; el motor rechaza un nivel cerrado, sin opciones libres o ajeno a la línea. */
  function formulariosZeo(z) {
    var libres = z.catalogo.filter(function (c) { return !c.usada; });
    var optRaiz = function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.nombre) + ' · ' + esc(Core.rotulo(c.rama)) + (c.origen ? ' · ' + esc(c.origen) : '') + '</option>';
    };
    var base = libres.filter(function (c) { return !c.origen; });
    var fuera = libres.filter(function (c) { return c.origen; });
    var optT = (base.length ? '<optgroup label="Líneas iniciales">' + base.map(optRaiz).join('') + '</optgroup>' : '') +
      (fuera.length ? '<optgroup label="Ofrecidas por eventos (con origen)">' + fuera.map(optRaiz).join('') + '</optgroup>' : '') +
      '<option value="">Otra (nombre libre)</option>';
    var optRama = '<option value="">Sin rama</option>' + z.ramas.map(function (r) { return '<option value="' + esc(r.rama) + '">' + esc(Core.rotulo(r.rama)) + '</option>'; }).join('');
    var datalist = '<datalist id="zeo-origenes">' + origenesZeo(z).map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>';
    var nueva = '<div class="picker-bloque"><h3 style="font-size:20px">Línea nueva (técnica raíz) · va a ' + esc(z.slots.primeraLibre || z.extras.proxima) + '</h3>' +
            '<div class="acc-fila"><label class="campo-et">Técnica<select class="btn" id="zl-t">' + optT + '</select></label>' +
      '<label class="campo-et">Nombre (si es otra)<input class="campo" type="text" id="zl-nombre" autocomplete="off" placeholder="Ej.: Garra de escarcha"></label>' +
      '<label class="campo-et">Rama (si es otra)<select class="btn" id="zl-rama">' + optRama + '</select></label></div>' +
      '<div class="acc-fila"><label class="campo-et">Origen (log)<input class="campo" type="text" id="zl-origen" list="zeo-origenes" autocomplete="off" placeholder="Knight, Ninja, Round 1…"></label>' +
      '<label class="campo-et" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="zl-pa"> Por activar (sin pagar)</label>' +
      '<label class="campo-et">Qué hace (si no está en el catálogo)<input class="campo" type="text" id="zl-desc" autocomplete="off" style="width:340px"></label>' +
      '<button class="btn prim" type="button" data-accion="zeo-linea-nueva">Agregar línea</button></div>' + datalist + '</div>';

    var grupos = '';
    z.lineas.forEach(function (l) {
      if (!l.ocupada || !l.activa || !l.raiz || !l.raiz.catalogo) return;
      l.niveles.forEach(function (n) {
        if (n.nivel < 2 || !n.abierto || n.libres < 1) return;
        var faltan = n.opciones.filter(function (o) { return !o.tomada; });
        if (!faltan.length) return;
        grupos += '<optgroup label="' + esc(l.id + ' · ' + l.raiz.nombre + ' · Nivel ' + n.nivel) + '">' +
          faltan.map(function (o) { return '<option value="' + esc(l.id + '|' + n.nivel + '|' + o.id) + '">' + esc(o.nombre) + '</option>'; }).join('') + '</optgroup>';
      });
    });
    var mejora = '<div class="picker-bloque"><h3 style="font-size:20px">Mejora del catálogo</h3>' +
      '<div class="acc-fila"><label class="campo-et">Mejora<select class="btn" id="zm-t"' + (grupos ? '' : ' disabled') + '>' +
      (grupos || '<option value="">Sin mejoras disponibles</option>') + '</select></label>' +
      '<button class="btn prim" type="button" data-accion="zeo-mejora"' + (grupos ? '' : ' disabled') + '>Agregar mejora</button></div></div>';

    var ocupadas = z.lineas.filter(function (l) { return l.ocupada && l.activa; });
    var optL = ocupadas.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.id + (l.raiz && l.raiz.nombre ? ' · ' + l.raiz.nombre : '')) + '</option>'; }).join('');
    var optN = '';
    for (var i = 2; i <= z.lineas[0].niveles.length; i++) optN += '<option value="' + i + '">Nivel ' + i + '</option>';
    var libre = '<div class="picker-bloque"><h3 style="font-size:20px">Otra técnica (nombre libre)</h3>' +
      '<div class="acc-fila"><label class="campo-et">Línea<select class="btn" id="zt-l"' + (optL ? '' : ' disabled') + '>' + (optL || '<option value="">Sin líneas</option>') + '</select></label>' +
      '<label class="campo-et">Nivel<select class="btn" id="zt-n">' + optN + '</select></label>' +
      '<label class="campo-et">Nombre<input class="campo" type="text" id="zt-nombre" placeholder="Ej.: Aliento helado" autocomplete="off"></label></div>' +
      '<div class="acc-fila"><label class="campo-et">Qué hace<input class="campo" type="text" id="zt-desc" autocomplete="off" style="width:340px"></label>' +
      '<label class="campo-et">Origen (log)<input class="campo" type="text" id="zt-origen" list="zeo-origenes" autocomplete="off"></label>' +
      '<button class="btn prim" type="button" data-accion="zeo-tecnica"' + (optL ? '' : ' disabled') + '>Agregar técnica</button></div></div>';
    return nueva + mejora + libre;
  }

  /** Nivel de Zeo: entero tal cual, con decimales si el promedio de las ramas no es exacto. */
  function nivelZeoTxt(n) { return Number.isInteger(n) ? String(n) : dec(n, 2); }

  function seccionZeo(calc, con) {
    var z = calc.zeo;
    // Cabecera: el nivel de cada rama (su técnica más alta) y el nivel zeo, que es el promedio de las tres.
    var ramas = z.ramas.map(function (r) {
      return '<div class="zrama-caja" style="--rc:var(--' + esc(r.rama) + ', var(--acc))"><i aria-hidden="true"></i><span>' + esc(Core.rotulo(r.rama)) + '</span><b class="num">' + r.nivel + '</b></div>';
    }).join('');
    var cabecera = '<div class="zeo-cab"><div class="zeo-ramas">' + ramas + '</div>' +
      '<div class="zeo-nivel"><div style="display:flex;flex-direction:column"><span class="eyebrow">Nivel Zeo</span><span class="mute num" style="font-size:13px">(' + z.ramas.map(function (r) { return r.nivel; }).join(' + ') + ') / ' + z.ramas.length + '</span></div><b>' + nivelZeoTxt(z.nivel) + '</b></div></div>';
    // Solo se dibujan las líneas ocupadas y UNA libre: las demás libres se cuentan, no se repiten.
    var mostradas = z.lineas.filter(function (l) { return l.ocupada || l.id === z.slots.primeraLibre; });
    var lineas = mostradas.map(function (l) { return tarjetaLineaZeo(l, con); }).join('');
    var cuerpo = notaReserva(calc.sx) + cabecera + '<div class="grid g300 zlineas">' + lineas + '</div>' +
      (z.slots.libres > 1 ? '<p class="mute" style="font-size:13px">Quedan ' + z.slots.libres + ' slots libres: se muestra uno.</p>' : '') +
      (con ? formulariosZeo(z) : '');
    var resumen = chip('Nivel Zeo ' + nivelZeoTxt(z.nivel), 'acc') +
      z.ramas.map(function (r) { return chip(Core.rotulo(r.rama) + ' ' + r.nivel, 'soft'); }).join('') +
      chip(plural(z.activas, 'línea activa', 'líneas activas') + (z.porActivar ? ' · ' + z.porActivar + ' por activar' : ''), 'soft');
    return desplegable('zeo', 'Estrella Zeo', resumen, cuerpo);
  }

  /** Grafo circular de los Gates: equidistantes; la línea continua conecta, la roja discontinua no, y el triángulo sombreado es un círculo. */
  function svgGrafoMana(m) {
    var n = m.gates.length;
    var cx = 200, cy = 170, R = n === 1 ? 0 : 95;
    var pos = {};
    m.gates.forEach(function (g, i) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      pos[g.id] = { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang), c: Math.cos(ang), s: Math.sin(ang) };
    });
    var punto = function (id) { return pos[id].x.toFixed(1) + ',' + pos[id].y.toFixed(1); };
    var capas = m.circulos.map(function (c) { return '<polygon class="g-circulo" points="' + c.gates.map(punto).join(' ') + '"/>'; }).join('') +
      m.conexiones.map(function (c) {
        return '<line class="g-arista' + (c.conecta ? '' : ' rota') + '" x1="' + pos[c.a].x.toFixed(1) + '" y1="' + pos[c.a].y.toFixed(1) + '" x2="' + pos[c.b].x.toFixed(1) + '" y2="' + pos[c.b].y.toFixed(1) + '"/>';
      }).join('');
    var nodos = m.gates.map(function (g) {
      var p = pos[g.id];
      var lleno = m.slots.some(function (x) { return x.id === g.id && x.habilidad; });
      var lx = n === 1 ? cx : cx + (R + 40) * p.c;
      var ly = n === 1 ? cy + 44 : cy + (R + 40) * p.s;
      var ancla = n === 1 || Math.abs(p.c) < 0.3 ? 'middle' : p.c > 0 ? 'start' : 'end';
      var fn = g.funcion ? (m.funciones.find(function (x) { return x.id === g.funcion; }) || {}).nombre || g.funcion : 'Sin función';
      return '<circle class="g-nodo' + (lleno ? ' lleno' : '') + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="22"/>' +
        '<text class="g-id" x="' + p.x.toFixed(1) + '" y="' + (p.y + 5).toFixed(1) + '" text-anchor="middle">' + esc(g.id) + '</text>' +
        '<text class="g-tag" x="' + lx.toFixed(1) + '" y="' + (ly - 2).toFixed(1) + '" text-anchor="' + ancla + '">' + esc(g.tagNombre) + '</text>' +
        '<text class="g-fn" x="' + lx.toFixed(1) + '" y="' + (ly + 12).toFixed(1) + '" text-anchor="' + ancla + '">' + esc(fn) + '</text>';
    }).join('');
    var resumen = plural(n, 'Gate', 'Gates') + ', ' + plural(m.nodos.length, 'nodo', 'nodos') + ' y ' + plural(m.circulos.length, 'círculo', 'círculos') +
      (m.totales.paresSinConexion ? '; ' + plural(m.totales.paresSinConexion, 'par sin conexión', 'pares sin conexión') : '');
    // Recorta el alto al contenido: con pocos Gates el círculo queda ancho y bajo, y un alto fijo dejaba aire vacío.
    var ys = m.gates.map(function (g) { return pos[g.id].y; });
    var arriba = Math.min.apply(null, ys) - (n === 1 ? 34 : 56);
    var abajo = Math.max.apply(null, ys.map(function (y, i) { return y + (n === 1 ? 70 : Math.max(36, 40 * Math.abs(pos[m.gates[i].id].s) + 36)); }));
    var vb = '0 ' + Math.floor(arriba) + ' 400 ' + Math.ceil(abajo - arriba);
    return '<svg class="grafo-mana" viewBox="' + vb + '" role="img" aria-label="Grafo de Gates: ' + esc(resumen) + '">' + capas + nodos + '</svg>';
  }

  function nombreSlot(x, m) {
    var nombres = x.gates.map(function (id) { return id; }).join('–');
    var tags = x.tags.map(function (t) { var g = m.gates.find(function (y) { return y.tag === t; }); return g ? g.tagNombre : t; }).join(' + ');
    return nombres + ' · ' + tags;
  }

  function ayudaSlot(x, m) {
    var nivel = x.nivel === 1 ? 'Gate: equivale a un conjuro de nivel 1.' : x.nivel === 2 ? 'Nodo: dos Gates que conectan; equivale a un conjuro de nivel 2.' : 'Círculo: tres Gates cuyos tres pares conectan; equivale a un conjuro de nivel 3.';
    if (x.nivel === 1) {
      var g = m.gates.find(function (y) { return y.id === x.id; });
      var fn = g.funcion ? (m.funciones.find(function (f) { return f.id === g.funcion; }) || {}).nombre || g.funcion : 'sin definir';
      return nivel + '\nFunción: ' + fn + '. Tag: ' + g.tagNombre + '.\nOportunidad: ' + (g.oportunidad || 'sin registrar') + '.';
    }
    return nivel + '\nHereda los tags de sus Gates.';
  }

  /** Contabilidad de la Mana force: la base y cada aporte con su fuente, su nota y la sesión. */
  function contabilidadMF(calc, m) {
    var mf = m.fuerza;
    var nombreFuente = function (id) {
      var c = estado.ctx.mana.fuentesMF.find(function (x) { return x.id === id; });
      return c ? c.nombre : id;
    };
    var filas = fila({ etiqueta: 'Base', nombre: mf.fuenteBase === 'raza' ? 'Mana force de la raza' : 'Mana force de partida (' + mf.fuenteBase + ')', der: '<span class="pts mas num">+' + mf.base + '</span>' }) +
      mf.aportes.map(function (a) {
        return fila({ etiqueta: nombreFuente(a.fuente), nombre: (a.nota || 'Sin nota') + (a.porNivel ? ' · ' + a.porNivel + ' por nivel (nivel ' + Math.round(a.cantidad / a.porNivel) + ')' : ''),
          tip: 'Aporte de ' + etiquetaSesion(calc, a.sesion) + '.' + (a.porNivel ? ' Crece con el nivel del personaje: ' + a.porNivel + ' × ' + Math.round(a.cantidad / a.porNivel) + '.' : ''),
          der: '<span class="pts ' + (a.cantidad > 0 ? 'mas' : 'menos') + ' num">' + (a.cantidad > 0 ? '+' : '−') + Math.abs(a.cantidad) + '</span>' });
      }).join('');
    var cuerpo = '<ul class="ren-lista">' + filas + '</ul><p class="mute" style="font-size:13px">Total <b>' + mf.total + '</b>. Cada potencia de 2 compra un Gate: MF ' + mf.total + ' permite ' + plural(mf.permitidos, 'Gate', 'Gates') + '.</p>';
    return desplegable('mf', 'Contabilidad de Mana force', chip('MF ' + mf.total, 'acc') + chip(plural(mf.aportes.length + 1, 'aporte', 'aportes'), 'soft'), cuerpo);
  }

  function filaSlot(x, m, habilidades, con, tecnicas) {
    var nivel = x.nivel === 1 ? 'Gate' : x.nivel === 2 ? 'Nodo' : 'Círculo';
    var der;
    var sueltas = (tecnicas || []).filter(function (t) { return t.categoria === 'inscrita' && !t.aprendiendo && t.nivel <= x.nivel && !t.slots.length; });
    if (x.habilidad) {
      var delSlot = x.habilidad.tipo === 'tecnica' ? (tecnicas || []).filter(function (t) { return t.id === x.habilidad.id; })[0] : null;
      der = (delSlot ? chipTip(x.habilidad.nombre, 'acc', tipTecnica(delSlot)) : chip(x.habilidad.nombre, 'acc')) + (con ? '<button class="btn mini" type="button" data-accion="desinscribir" data-slot="' + esc(x.id) + '">Quitar</button>' : '');
    } else if (con && (habilidades.length || sueltas.length)) {
      var opcH = habilidades.map(function (h) { return '<option value="h:' + esc(h.id) + '">' + esc(h.nombre) + '</option>'; }).join('');
      var opcT = sueltas.map(function (t) { return '<option value="t:' + esc(t.id) + '">' + esc(t.nombre) + ' · nivel ' + t.nivel + '</option>'; }).join('');
      der = '<select class="btn" id="insc-' + esc(x.id) + '" aria-label="Qué inscribir en ' + esc(x.id) + '">' +
        (opcT ? '<optgroup label="Técnicas de Mana">' + opcT + '</optgroup>' : '') + (opcH ? '<optgroup label="Habilidades">' + opcH + '</optgroup>' : '') + '</select><button class="btn mini" type="button" data-accion="inscribir" data-slot="' + esc(x.id) + '">Inscribir</button>';
    } else {
      der = '<span class="mute">Libre</span>';
    }
    return fila({ etiqueta: nivel, nombre: nombreSlot(x, m), tip: ayudaSlot(x, m), tipEnNombre: true, der: der });
  }

  var NOMBRE_NIVEL_MANA = ['', 'Gate', 'nodo', 'círculo'];

  /** Tooltip de una técnica de Mana: nivel, costo, texto propio, progreso del contenedor y dónde está inscrita. */
  function tipTecnica(t) {
    var l = [t.nombre + ' · ' + (t.categoria === 'activa' ? 'Técnica activa' : 'Técnica inscrita') + ' · Mana nivel ' + t.nivel + ' (' + NOMBRE_NIVEL_MANA[t.nivel] + ')'];
    if (t.costo) l.push('Costo: ' + t.costo);
    if (t.descripcion) l.push(t.descripcion);
    if (t.costoSx) l.push(t.aprendiendo ? 'Aprendiendo: ' + t.acumulado + ' de ' + t.costoSx + ' SX.' : 'Aprendida (' + t.costoSx + ' SX).');
    if (t.slots && t.slots.length) l.push('Inscrita en ' + t.slots.join(', ') + '.');
    if (l.length === 1) l.push('Sin datos todavía.');
    return l.join('\n');
  }

  /** Técnicas de Estrella Mana: inscritas, activas y las que se están aprendiendo (un contenedor que acumula SX). */
  function bloqueTecnicasMana(m, con) {
    var t = m.tecnicas;
    if (!t.length) return con ? '<div class="bloque-feats"><span class="eyebrow">Técnicas</span><p class="mute">Todavía no hay técnicas de Mana. Agrega una abajo.</p></div>' : '';
    var grupo = function (rotulo, cuerpo) {
      return '<div class="conj-grupo"><span class="conj-et">' + esc(rotulo) + '</span><span class="chips">' + cuerpo + '</span></div>';
    };
    var inscritas = t.filter(function (x) { return x.categoria === 'inscrita' && !x.aprendiendo; });
    var activas = t.filter(function (x) { return x.categoria === 'activa' && !x.aprendiendo; });
    var aprendiendo = t.filter(function (x) { return x.aprendiendo; });
    var filas = '';
    if (inscritas.length) {
      filas += grupo('Inscritas', inscritas.map(function (x) {
        return chipTip(x.nombre, x.slots.length ? 'acc' : '', tipTecnica(x)) + chip(x.slots.length ? x.slots.join(', ') : 'Sin inscribir', 'soft');
      }).join(''));
    }
    if (activas.length) filas += grupo('Activas', activas.map(function (x) { return chipTip(x.nombre, 'gold', tipTecnica(x)) + (x.costo ? chip(x.costo, 'soft') : ''); }).join(''));
    aprendiendo.forEach(function (x) {
      var pct = Math.min(100, Math.round(x.acumulado * 100 / x.costoSx));
      filas += grupo('Aprendiendo', chipTip(x.nombre, 'gold', tipTecnica(x)) +
        '<span class="tm-barra" role="progressbar" aria-label="SX acumulados en ' + esc(x.nombre) + '" aria-valuemin="0" aria-valuemax="' + x.costoSx + '" aria-valuenow="' + x.acumulado + '"><i style="width:' + pct + '%"></i></span>' +
        chip(x.acumulado + ' / ' + x.costoSx + ' SX', 'soft') +
        (con ? '<input class="campo" type="number" inputmode="numeric" min="1" id="tm-sx-' + esc(x.id) + '" placeholder="SX" aria-label="SX que se suman a ' + esc(x.nombre) + '" style="width:84px;min-width:0">' +
          '<button class="btn mini" type="button" data-accion="tm-sx" data-id="' + esc(x.id) + '">Sumar</button>' : ''));
    });
    return '<div class="bloque-feats"><span class="eyebrow">Técnicas · ' + t.length + '</span>' + filas + '</div>';
  }

  /** Agregar una técnica de Mana: inscrita (va en un slot), activa, o con costo en SX (contenedor que se llena de a poco). */
  function formularioTecnicasMana() {
    return '<div class="picker-bloque"><h3 style="font-size:20px">Agregar una técnica de Mana</h3>' +
      '<p class="sub">Una inscrita va en un slot de su nivel o mayor; una activa no se inscribe. Con costo en SX es un contenedor que acumula experiencia hasta aprenderla.</p>' +
      '<div class="acc-fila"><label class="campo-et">Tipo<select class="btn" id="tm-t"><option value="inscrita">Inscrita</option><option value="activa">Activa</option></select></label>' +
      '<label class="campo-et">Nivel de Mana<select class="btn" id="tm-n"><option value="1">1 · Gate</option><option value="2">2 · Nodo</option><option value="3">3 · Círculo</option></select></label>' +
      '<label class="campo-et">Nombre<input class="campo" type="text" id="tm-nombre" placeholder="Heat Pulse" autocomplete="off" style="width:240px"></label>' +
      '<label class="campo-et">Costo<input class="campo" type="text" id="tm-costo" placeholder="Mana 1" autocomplete="off" style="width:160px"></label>' +
      '<label class="campo-et">Costo en SX<input class="campo" type="number" inputmode="numeric" min="0" id="tm-csx" placeholder="Opcional" style="width:110px;min-width:0"></label></div>' +
      '<label class="campo-et">Descripción<textarea class="campo" id="tm-desc" rows="2" placeholder="Qué hace" style="width:min(560px,100%)"></textarea></label>' +
      '<div class="acc-fila"><button class="btn prim" type="button" data-accion="tm-crear">Agregar técnica</button></div></div>';
  }

  /** Mana force y Gates desde el visor: cada formulario crea una entrada del borrador, que el motor valida. */
  function formulariosMana(calcB, m) {
    var ctx = estado.ctx;
    var siguienteId = 'g' + (m.gates.length + 1);
    var n = m.gates.length + 1;
    while (m.gates.some(function (g) { return g.id === siguienteId; })) siguienteId = 'g' + (++n);
    var fuentes = ctx.mana.fuentesMF.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.nombre) + '</option>'; }).join('');
    var funciones = '<option value="">Sin definir</option>' + ctx.mana.funciones.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.nombre) + '</option>'; }).join('');
    var tags = ctx.manaTags.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }).map(function (t) {
      var choca = m.gates.filter(function (g) { return (t.incompatibles || []).indexOf(g.tag) >= 0; }).map(function (g) { return g.id; });
      return '<option value="' + esc(t.id) + '">' + esc(t.nombre) + (choca.length ? ' · sin conexión con ' + choca.join(', ') : '') + '</option>';
    }).join('');
    var sig = m.siguiente;
    var estadoGate = sig
      ? (sig.disponible ? 'Cumples los requisitos del Gate ' + sig.numero + ' (Mana force ' + sig.mfRequerida + ' y ' + f(sig.sxRequerido) + ' SX).'
        : 'Al Gate ' + sig.numero + ' le faltan ' + [sig.mfFalta ? sig.mfFalta + ' de Mana force' : '', sig.sxFalta ? f(sig.sxFalta) + ' SX' : ''].filter(Boolean).join(' y ') + '.') +
        (calcB.sx.reserva > 0 && sig.sxFalta ? ' Hay ' + f(calcB.sx.reserva) + ' SX en la reserva: asígnalos a Mana en la sección SX.' : '')
      : '';
    return '<div class="picker-bloque"><h3 style="font-size:20px">Mana force</h3>' +
      '<p class="sub">Mana force ' + m.fuerza.total + ' ahora. Registra lo que gana o pierde el personaje; perder exige una nota. Cada potencia de 2 compra un Gate.</p>' +
      '<div class="acc-fila"><label class="campo-et">Cambio<input class="campo" type="number" inputmode="numeric" step="1" id="mf-n" value="1" style="width:110px;min-width:0"></label>' +
      '<label class="campo-et">Fuente<select class="btn" id="mf-f">' + fuentes + '</select></label>' +
      '<label class="campo-et">Nota<input class="campo" type="text" id="mf-nota" placeholder="Ej.: contrato con el lobo blanco" autocomplete="off" style="width:260px"></label>' +
      '<label class="campo-et">Crece con el nivel<span class="acc-fila" style="gap:6px"><input type="checkbox" id="mf-pn"> <small class="mute">cambio × nivel</small></span></label>' +
      '<button class="btn prim" type="button" data-accion="mf-agregar">Agregar</button></div></div>' +
      '<div class="picker-bloque"><h3 style="font-size:20px">Construir un Gate</h3>' +
      '<p class="sub">Será el Gate <b>' + esc(siguienteId) + '</b>. ' + esc(estadoGate) + ' El tag decide con quién conecta: los pares incompatibles quedan sin conexión. La función es solo del Gate.</p>' +
      '<div class="acc-fila"><label class="campo-et">Tag<select class="btn" id="gt-tag">' + tags + '</select></label>' +
      '<label class="campo-et">Función<select class="btn" id="gt-fn">' + funciones + '</select></label>' +
      '<label class="campo-et">Oportunidad para construirlo<input class="campo" type="text" id="gt-op" placeholder="Opcional. Ej.: el altar del glaciar" autocomplete="off" style="width:260px"></label>' +
      '<button class="btn prim" type="button" data-accion="gate-agregar" data-id="' + esc(siguienteId) + '">Agregar Gate</button></div></div>';
  }

  function seccionMana(calc, calcB, pj, con) {
    var m = calcB.mana;
    var mf = m.fuerza;
    var sig = m.siguiente;
    var habilidades = calcB.feats.lista.filter(function (x) { return x.tipo === 'habilidad-tipo-conjuro'; });
    var caja = function (rotuloTxt, valor) { return '<div class="caja"><small>' + rotuloTxt + '</small><b>' + valor + '</b></div>'; };
    var cajas = '<div class="cajas">' + caja('SX de mana', f(m.total)) + caja('Nivel de Mana', m.nivel) + caja('Mana force', mf.total) + caja('Gates', m.totales.gates + ' de ' + mf.permitidos) + caja('Slots', m.totales.slots) + '</div>';
    var proximo = sig
      ? '<p class="mute" style="font-size:14px">Próximo Gate (' + sig.numero + '): ' +
        'Mana force ' + sig.mfRequerida + (sig.mfFalta ? ' (te faltan ' + sig.mfFalta + ')' : ' (cumples)') + ' y ' + f(sig.sxRequerido) + ' SX' + (sig.sxFalta ? ' (te faltan ' + f(sig.sxFalta) + ')' : ' (cumples)') +
        ', más una oportunidad para construirlo.' + (sig.disponible ? ' <b>Ya puedes construirlo.</b>' : '') + '</p>'
      : '';
    var cuerpo = notaReserva(calcB.sx) + cajas + proximo;
    if (m.gates.length) {
      var legend = '<p class="mute" style="font-size:13px">Línea continua: los Gates conectan. Línea roja discontinua: tags incompatibles, no conectan. Triángulo sombreado: círculo. Un Gate con relleno tiene su habilidad inscrita.</p>';
      cuerpo += '<div class="mana-grid"><div class="mana-grafo">' + svgGrafoMana(m) + legend + '</div><div class="mana-slots"><span class="eyebrow">Slots · ' + m.totales.ocupados + ' de ' + m.totales.slots + ' con habilidad</span>' +
        '<ul class="ren-lista una">' + m.slots.map(function (x) { return filaSlot(x, m, habilidades, con, m.tecnicas); }).join('') + '</ul>' +
        (con && !habilidades.length && !m.tecnicas.some(function (t) { return t.categoria === 'inscrita' && !t.aprendiendo && !t.slots.length; })
          ? '<p class="mute" style="font-size:13px">Para inscribir hace falta una técnica de Mana inscrita (agrégala abajo) o una habilidad tipo conjuro (un feat de ejecución activa).</p>' : '') + '</div></div>';
    } else {
      cuerpo += '<p class="mute">Todavía no hay Gates. Con Mana force ' + mf.total + ' se permite ' + plural(mf.permitidos, 'Gate', 'Gates') + '.</p>';
    }
    cuerpo += bloqueTecnicasMana(m, con) + contabilidadMF(calc, m) + (con ? formulariosMana(calcB, m) + formularioTecnicasMana() : '');
    var resumen = chip('Mana lv ' + m.nivel, 'acc') + chip('MF ' + mf.total, 'soft') + chip(plural(m.totales.gates, 'Gate', 'Gates'), 'soft') + chip(plural(m.totales.slots, 'slot', 'slots') + (m.totales.ocupados ? ' · ' + m.totales.ocupados + ' inscrito' + (m.totales.ocupados === 1 ? '' : 's') : ''), 'soft') +
      (m.totales.tecnicas ? chip(plural(m.totales.tecnicas, 'técnica', 'técnicas'), 'soft') : '') + chip(f(m.total) + ' SX', 'soft');
    return desplegable('mana', 'Estrella Mana', resumen, cuerpo);
  }

  /** Nombre corto de un nivel de conjuro: 0 son los trucos. */
  function nombreNivelConjuro(n) { return n === 0 ? 'Trucos' : 'Nivel ' + n; }

  /** Tooltip con los datos de un conjuro: nivel, escuela, tiempo, alcance, duración, salvación, costo y texto propio. */
  function tipConjuro(c) {
    var l = [];
    var cab = c.nivel === 0 ? 'Truco' : 'Nivel ' + c.nivel;
    l.push(c.nombre + ' · ' + cab + (c.escuela ? ' · ' + c.escuela + (c.subescuela ? ' (' + c.subescuela + ')' : '') : '') + (c.descriptor ? ' [' + c.descriptor + ']' : ''));
    [['Tiempo', c.tiempo], ['Componentes', c.componentes], ['Alcance', c.alcance], ['Objetivo', c.objetivo], ['Duración', c.duracion],
      ['Salvación', c.salvacion], ['RC', c.rc], ['Costo', c.costo]].forEach(function (d) { if (d[1]) l.push(d[0] + ': ' + d[1]); });
    if (c.descripcion) l.push(c.descripcion);
    if (c.sobreNivel) l.push('Pasa del nivel de conjuro que la clase alcanza hoy.');
    if (c.origen === 'catalogo' && !c.descripcion) l.push('Texto: Archives of Nethys.');
    if (!c.descripcion && c.origen === 'propio' && l.length === 1) l.push('Sin datos todavía.');
    return l.join('\n');
  }

  function enlaceConjuro(c) {
    if (c.origen !== 'catalogo') return '';
    return '<a class="link" href="https://aonprd.com/SpellDisplay.aspx?ItemName=' + encodeURIComponent(c.nombre).replace(/%20/g, '+') +
      '" target="_blank" rel="noopener noreferrer" aria-label="Ver el texto de ' + esc(c.nombre) + '">↗</a>';
  }

  /** Repertorio de Magia: los conjuros por nivel, cada uno un chip con tooltip de datos; en Construir los del manual traen el enlace al texto. */
  function bloqueRepertorio(calcB, con) {
    var rep = calcB.repertorio;
    if (!rep.total) {
      return con ? '<div class="bloque-feats"><span class="eyebrow">Conjuros</span><p class="mute">Todavía no hay conjuros. Agrega uno del manual o crea uno propio abajo.</p></div>' : '';
    }
    var chipC = function (c) { return chipTip(c.nombre, c.sobreNivel ? 'warn' : '', tipConjuro(c)) + (con ? enlaceConjuro(c) : ''); };
    var filas = rep.porNivel.map(function (g) {
      return '<div class="conj-grupo"><span class="conj-et">' + esc(nombreNivelConjuro(g.nivel)) + '</span><span class="chips">' + g.conjuros.map(chipC).join('') + '</span></div>';
    }).join('');
    return '<div class="bloque-feats"><span class="eyebrow">Conjuros · ' + rep.total + '</span>' + filas + '</div>';
  }

  /** Formularios de Construir: agregar un conjuro del manual (por nombre) o crear uno propio. */
  function formulariosConjuros(calcB) {
    var cl = calcB.personaje.clase;
    var cj = calcB.conjuros;
    var sabidos = {};
    calcB.repertorio.conjuros.forEach(function (c) { sabidos[c.id] = true; });
    var lista = estado.ctx.catalogoConjuros.filter(function (c) {
      if (sabidos[c.id]) return false;
      if (c.nivel[cl] === undefined) return false;
      return cj ? c.nivel[cl] <= cj.nivelMax : true;
    });
    var sinLista = !lista.length;
    if (sinLista) lista = estado.ctx.catalogoConjuros.filter(function (c) { return !sabidos[c.id]; });
    var opciones = lista.map(function (c) {
      var n = c.nivel[cl] !== undefined ? c.nivel[cl] : Math.min.apply(null, Object.keys(c.nivel).map(function (k) { return c.nivel[k]; }));
      return '<option value="' + esc(c.nombre) + '" label="' + (c.nivel[cl] !== undefined ? 'nivel ' + n : 'otra lista, nivel ' + n) + ' · ' + esc(c.escuela) + '"></option>';
    }).join('');
    var ayudaLista = sinLista
      ? 'Tu clase no tiene lista de conjuros: busca en todo el manual e indica el nivel.'
      : 'Salen de la lista de ' + calcB.personaje.claseNombre + (cj ? ' hasta el nivel de conjuro ' + cj.nivelMax : '') + '. Para otro, escribe su nombre e indica el nivel.';
    var texto = function (id, rotuloTxt, ejemplo, ancho) {
      return '<label class="campo-et">' + rotuloTxt + '<input class="campo" type="text" id="' + id + '" placeholder="' + esc(ejemplo || '') + '" autocomplete="off" style="width:' + (ancho || 200) + 'px"></label>';
    };
    return '<div class="picker-bloque"><h3 style="font-size:20px">Agregar un conjuro del manual</h3>' +
      '<p class="sub">' + esc(ayudaLista) + ' Se guardan sus datos de reglas (nivel, escuela, tiempo, alcance, duración, salvación), no el texto.</p>' +
      '<div class="acc-fila"><label class="campo-et">Conjuro<input class="campo" type="text" id="cj-q" list="dl-conjuros" placeholder="Magic Missile" autocomplete="off" style="width:240px"></label>' +
      '<datalist id="dl-conjuros">' + opciones + '</datalist>' +
      '<label class="campo-et">Nivel (opcional)<input class="campo" type="number" inputmode="numeric" min="0" max="9" id="cj-n" style="width:110px;min-width:0"></label>' +
      '<button class="btn prim" type="button" data-accion="cj-manual">Agregar</button></div></div>' +
      '<div class="picker-bloque"><h3 style="font-size:20px">Crear un conjuro propio</h3>' +
      '<p class="sub">Lleva nombre y nivel (0 a 9). Las técnicas de Mana se agregan en la sección Estrella Mana.</p>' +
      '<div class="acc-fila">' + texto('cj-nombre', 'Nombre', 'Mi conjuro', 240) +
      '<label class="campo-et">Nivel<input class="campo" type="number" inputmode="numeric" min="0" max="9" id="cj-nivel" value="1" style="width:100px;min-width:0"></label></div>' +
      '<label class="campo-et">Descripción<textarea class="campo" id="cj-desc" rows="2" placeholder="Qué hace" style="width:min(560px,100%)"></textarea></label>' +
      '<div class="acc-fila">' + texto('cj-escuela', 'Escuela', 'Evocación', 150) + texto('cj-tiempo', 'Tiempo', '1 standard action', 150) + texto('cj-alcance', 'Alcance', 'close', 130) +
      texto('cj-duracion', 'Duración', 'instantaneous', 140) + texto('cj-salv', 'Salvación', 'none', 120) +
      '<button class="btn prim" type="button" data-accion="cj-crear">Crear</button></div></div>';
  }

  /**
   * Cuerpo de Magia y habilidades (4.2): las opciones tácticas, todo lo que se activa. Los conjuros por día de la clase (con los dos próximos niveles), el repertorio y las habilidades activas,
   * que ocupan el lugar de los conjuros: las de la clase y las que salen de un feat de ejecución activa.
   */
  function cuerpoMagia(calcB, con) {
    var cl = calcB.clase, cj = calcB.conjuros;
    var delFeat = calcB.feats.lista.filter(function (x) { return x.tipo === 'habilidad-tipo-conjuro'; });
    var delaClase = cl ? cl.habilidades.filter(esActiva) : [];
    var prog = '';
    if (cj) {
      var cajas = cj.porDia.map(function (x) {
        return '<div class="caja"' + (x.nivelConjuro === 0 && x.cantidadBase !== x.cantidad ? tip('Trucos por día: la mitad de la tabla (' + x.cantidadBase + ').') : '') + '><small>' + nombreNivelConjuro(x.nivelConjuro) + '</small><b>' + x.cantidad + '</b></div>';
      }).join('') + (cj.proximos || []).map(function (x) {
        return '<div class="caja proximo"' + tip('Los conjuros de nivel ' + x.nivelConjuro + ' llegan en el nivel ' + x.enNivel + '.') + '><small>' + nombreNivelConjuro(x.nivelConjuro) + '</small><b>llega lv ' + x.enNivel + '</b></div>';
      }).join('');
      prog = '<div class="bloque-feats"><span class="eyebrow">Conjuros por día · ' + esc(cl.nombre) + (cj.atributo ? ' · ' + esc(cj.atributo) : '') + '</span><div class="cajas chicas">' + cajas + '</div></div>';
    } else if (cl) {
      prog = '<p class="mute">' + esc(cl.nombre) + ' no lanza conjuros: este espacio lo ocupan sus habilidades activas.</p>';
    }
    var tarjetas = delaClase.map(tarjetaActivaClase).join('') + delFeat.map(function (x) {
      var cat = estado.indiceFeats[x.convertidoDe];
      var slots = calcB.mana.slots.filter(function (sl) { return sl.habilidad && sl.habilidad.id === x.id; }).map(function (sl) { return sl.id; });
      return '<div class="tarjeta-activa"><div class="row-between" style="align-items:center"><b>' + esc(x.nombre) + '</b>' + chip('Activa', 'acc') + '</div>' +
        '<small class="mute">Convertida del feat ' + esc(cat ? cat.nombre : x.convertidoDe) + '</small>' + (cat && cat.resumen ? '<small class="mute">' + esc(cat.resumen) + '</small>' : '') +
        '<div class="acc-fila">' + chip('Costo en mana: pendiente', 'soft') + (slots.length ? chip('Inscrita en ' + slots.join(', '), 'acc') : chip('Sin inscribir', 'soft')) + enlaceFeat(cat) + '</div></div>';
    }).join('');
    var prox = cl ? cl.proximas.filter(esActiva) : [];
    var proximas = prox.length
      ? '<p class="mute" style="font-size:13px">Próximas: ' + esc(prox.slice(0, 4).map(function (h) { return h.nombre + ' (nivel ' + h.nivel + ')'; }).join(', ')) + (prox.length > 4 ? ' y ' + (prox.length - 4) + ' más' : '') + '.</p>'
      : '';
    return prog + bloqueRepertorio(calcB, con) +
      '<div class="bloque-feats"><span class="eyebrow">Habilidades · opciones tácticas</span>' +
      (tarjetas ? '<div class="grid g300">' + tarjetas + '</div>' : '<p class="mute">Todavía no hay habilidades que activar. Una habilidad de la clase o un feat que necesita activarse aparece aquí al ganarlo.</p>') + '</div>' + proximas +
      (con ? formulariosConjuros(calcB) : '');
  }

  function chipsMagia(calcB) {
    var cl = calcB.clase, cj = calcB.conjuros;
    var total = (cl ? cl.habilidades.filter(esActiva).length : 0) + calcB.feats.lista.filter(function (x) { return x.tipo === 'habilidad-tipo-conjuro'; }).length;
    var nCj = calcB.repertorio.conjuros.length;
    return (nCj ? chip(plural(nCj, 'conjuro', 'conjuros'), 'acc') : '') + (cj ? chip(cj.nivelMax === 0 ? 'Solo trucos' : 'Conjuros hasta el nivel ' + cj.nivelMax, nCj ? 'soft' : 'acc') : '') +
      chip(plural(total, 'habilidad activa', 'habilidades activas'), cj || nCj ? 'soft' : 'acc');
  }

  /** Vista Jugar: tarjeta siempre visible, donde irían los conjuros. */
  function seccionMagiaJuego(calcB) {
    return '<section class="card bloque-juego"><div class="row-between" style="align-items:center"><h2>Magia y habilidades</h2><span class="chips">' + chipsMagia(calcB) + '</span></div>' + cuerpoMagia(calcB, false) + '</section>';
  }

  /** Vista Construir: plegable. */
  function seccionMagia(calcB) {
    return desplegable('magia', 'Magia y habilidades', chipsMagia(calcB), cuerpoMagia(calcB, true));
  }

  function etiquetaSesion(calc, id) {
    var i = calc.sesiones.findIndex(function (s) { return s.id === id; });
    return i <= 0 ? 'la creación' : 'la sesión ' + i;
  }

  // ---- achievements y fate

  /** Catálogo con buscador y scroll, para ver todos los achievements y asignar uno. */
  function listaLogros(calcB) {
    var q = estado.logrosQ.trim().toLowerCase();
    var nivel = calcB.nivel.nivel;
    var ocupado = calcB.logros.some(function (l) { return l.nivel === nivel; });
    var tiene = {};
    calcB.logros.forEach(function (l) { tiene[l.id] = l; });
    var todos = estado.ctx.achievements;
    var vistos = todos.filter(function (a) { return !q || a.nombre.toLowerCase().indexOf(q) >= 0; });
    var filas = vistos.map(function (a) {
      var ya = tiene[a.id];
      var puede = !ya && !ocupado;
      var motivo = ya ? 'Ganado en el nivel ' + ya.nivel : '';
      return '<div class="feat-row"><div class="t"><div class="row-between" style="justify-content:flex-start;gap:6px 10px;align-items:center"><b>' + esc(a.nombre) + '</b>' +
        (a.fate ? chip('+' + a.fate + ' fate', 'gold') : '') + (ya ? chip('Ganado', 'acc') : '') + (a.fuente === 'ejemplo' ? chip('Ejemplo', 'soft') : '') + '</div></div>' +
        '<div class="acc-fila"><button class="btn prim" type="button" data-accion="asignar-logro" data-id="' + esc(a.id) + '"' + (puede ? '' : ' disabled') + '>Asignar</button>' +
        (motivo ? '<span class="mute" style="font-size:13px">' + esc(motivo) + '</span>' : '') + '</div></div>';
    }).join('');
    return (ocupado ? '<p class="avisos suave" style="padding:12px 16px;font-size:14px" role="status">El nivel ' + nivel + ' ya tiene su achievement (máximo 1 por nivel): los botones «Asignar» se activan al subir al nivel ' + (nivel + 1) + '.</p>' : '') +
      '<p class="mute" style="font-size:14px" role="status">' + plural(vistos.length, 'achievement', 'achievements') + (vistos.length !== todos.length ? ' de ' + todos.length : ' en el catálogo') +
      '. Desplázate dentro del recuadro para ver el resto.</p>' +
      '<div id="logros-lista" class="lista scroll-lista" tabindex="0" role="region" aria-label="Catálogo de achievements">' +
      (filas || '<p class="mute">Ningún achievement coincide con la búsqueda.</p>') + '</div>';
  }

  function seccionLogros(calc, calcB, con) {
    var nivel = calcB.nivel.nivel;
    var conFate = calc.logros.filter(function (l) { return l.fate > 0; });
    var fate = '<div class="big"><b class="num gold">' + calcB.fate + '</b><span class="mute">de fate disponible</span></div>' +
      '<p class="mute" style="font-size:14px">' + (conFate.length ? 'Ganado con ' + conFate.map(function (l) { return '«' + esc(l.nombre) + '» en ' + etiquetaSesion(calc, l.sesion); }).join(' y ') + '. ' : '') +
      'Fate es una ganancia adicional: no es XP y no sube de nivel.</p>';
    var filas = calcB.logros.map(function (l) {
      return '<div class="logro usado"><span class="n">Nivel ' + l.nivel + '</span><span class="t">' + esc(l.nombre) + '</span>' +
        (l.sesion === 'borrador' ? '<span style="font-size:12px;font-weight:700">Borrador</span>' : '<span style="font-size:12px;font-weight:700">Usado 1/1</span>') + '</div>';
    }).join('');
    var hayEnActual = calcB.logros.some(function (l) { return l.nivel === nivel; });
    var sig = hayEnActual
      ? (nivel < 20 ? '<div class="logro libre"><span class="n">Nivel ' + (nivel + 1) + '</span><span class="t" style="font-weight:400;font-size:14px">Disponible al subir de nivel</span></div>' : '')
      : '<div class="logro libre"><span class="n">Nivel ' + nivel + '</span><span class="t" style="font-weight:400;font-size:14px">Disponible ahora</span></div>';
    var cuerpo = fate + '<div style="display:flex;flex-direction:column;gap:10px"><h3 style="font-size:20px">Achievement feats</h3><p class="mute" style="font-size:14px">Máximo uno por nivel.</p>' +
      '<div class="lista">' + filas + sig + '</div></div>' +
      (con
        ? '<div class="picker-bloque"><h3 style="font-size:20px">Asignar un achievement</h3>' +
          '<label class="campo-et">Buscar<input class="campo" type="search" id="lg-q" value="' + esc(estado.logrosQ) + '" placeholder="Nombre del achievement" autocomplete="off"></label>' +
          '<div id="logros-wrap" style="display:flex;flex-direction:column;gap:10px">' + listaLogros(calcB) + '</div></div>'
        : '');
    var resumen = chip('Fate ' + calcB.fate, 'gold') + chip(plural(calcB.logros.length, 'achievement', 'achievements'), 'acc') +
      chip(hayEnActual ? 'Nivel ' + nivel + ' usado' : 'Nivel ' + nivel + ' libre', hayEnActual ? 'soft' : 'acc');
    return desplegable('logros', 'Achievements y fate', resumen, cuerpo);
  }

  // ---- méritos y defectos: un solo bloque de filas de una línea, con el detalle en el tooltip

  function filaMerito(g) {
    var defecto = g.tipo === 'defecto';
    var etiqueta = defecto ? 'Defecto' : (g.categoria === 'racial' ? 'Racial · ' + g.rareza : 'Mérito · ' + g.rareza);
    var nota = defecto ? 'Aporta ' + plural(g.puntos, 'punto', 'puntos') + ' al fondo'
      : (g.descuento > 0 ? 'Costo base ' + g.costoBase + ', menos ' + g.descuento + ' por perfil racial' : (g.categoria === 'racial' ? 'Racial sin descuento (costo base ' + g.costoBase + ')' : 'Mérito común'));
    return fila({ nombre: g.nombre, tip: nota, medio: chip(etiqueta, defecto ? '' : 'acc'),
      der: '<span class="pts num ' + (defecto ? 'mas' : 'menos') + '" aria-label="' + (defecto ? 'aporta ' : 'cuesta ') + g.puntos + ' puntos">' + (defecto ? '+' : '−') + g.puntos + '</span>' });
  }

  function filaTrait(t) {
    var inc = t.incluye.map(function (c) { return '· ' + c.nombre + ' (' + (c.tipo === 'feat' ? 'feat' : 'ventaja') + ')'; }).join('\n');
    return fila({ nombre: t.nombre, tip: 'Incluye:\n' + inc, medio: chip('Trait', 'gold') });
  }

  /** Méritos y luego defectos en una misma lista; los traits van debajo con el mismo formato. */
  function filasMeritos(calc) {
    var m = calc.meritos;
    var orden = m.lista.filter(function (g) { return g.tipo !== 'defecto'; }).concat(m.lista.filter(function (g) { return g.tipo === 'defecto'; }));
    var html = orden.length ? '<ul class="ren-lista">' + orden.map(filaMerito).join('') + '</ul>' : '<p class="mute">Sin méritos ni defectos registrados.</p>';
    if (calc.traits.length) {
      html += '<div class="bloque-feats"><span class="eyebrow">Traits</span><ul class="ren-lista">' + calc.traits.map(filaTrait).join('') + '</ul></div>';
    }
    return html;
  }

  function textoSaldo(m) {
    return 'Iniciales ' + m.iniciales + ' + defectos ' + m.defectos + ' − méritos ' + m.meritos + ' = ' + m.total;
  }

  function contarMeritos(m) {
    var d = m.lista.filter(function (g) { return g.tipo === 'defecto'; }).length;
    return { meritos: m.lista.length - d, defectos: d };
  }

  /** Vista Jugar: una tarjeta con la lista; el saldo es un chip con el desglose en el tooltip. */
  function seccionMeritosJuego(calc) {
    var m = calc.meritos;
    var n = contarMeritos(m);
    return '<section class="card bloque-juego"><div class="row-between" style="align-items:center"><h2>Méritos y defectos</h2><span class="chips">' +
      chipTip('Saldo ' + m.total, m.total < 0 ? 'warn' : 'acc', textoSaldo(m)) + chip(plural(n.meritos, 'mérito', 'méritos'), 'soft') + chip(plural(n.defectos, 'defecto', 'defectos'), 'soft') +
      '</span></div>' + filasMeritos(calc) + '</section>';
  }

  /** Vista Construir: un solo desplegable con las cajas de puntos y la misma lista. */
  function seccionMeritos(calc, pj, con) {
    var m = calc.meritos;
    var n = contarMeritos(m);
    var caja = function (rotuloTxt, valor, cls) { return '<div class="caja ' + (cls || '') + '"><small>' + rotuloTxt + '</small><b>' + valor + '</b></div>'; };
    var cuerpo = (con ? '<p class="sub">Los méritos solo se pagan con defectos: cada defecto aporta puntos al fondo. Puntos iniciales: floor(' + calc.nivel.nivel + ' / 2) + 1 = ' + m.iniciales + '. Un mérito heroico cuesta 10 puntos.</p>' : '') +
      '<div class="cajas">' + caja('Iniciales', m.iniciales) + caja('Defectos', '+' + m.defectos) + caja('Méritos', '−' + m.meritos) + caja('Saldo', m.total, m.total < 0 ? 'neg' : 'saldo') + '</div>' +
      filasMeritos(calc) +
      (con && pj.datosDeEjemplo ? '<p class="mute" style="font-size:13px">Los costos, el valor de los defectos y el descuento por perfil racial son valores de ejemplo: están pendientes del diseñador.</p>' : '');
    return desplegable('meritos', 'Méritos y defectos', chip('Saldo ' + m.total, m.total < 0 ? 'warn' : 'acc') + chip(plural(n.meritos, 'mérito', 'méritos'), 'soft') + chip(plural(n.defectos, 'defecto', 'defectos'), 'soft'), cuerpo);
  }


  // ---- feats

  function itemFeat(x, esBorrador, conDetalle) {
    var cat = estado.indiceFeats[x.id];
    var activo = x.tipo === 'habilidad-tipo-conjuro';
    var detalle = [];
    if (cat && cat.resumen) detalle.push(esc(cat.resumen));
    if (conDetalle && x.sinVerificar && x.sinVerificar.length) detalle.push('Requisitos sin verificar: ' + esc(x.sinVerificar.join('; ')));
    return '<div class="item"><div class="t"><b>' + esc(x.nombre) + '</b>' +
      detalle.map(function (d) { return '<small>' + d + '</small>'; }).join('') + '</div>' +
      (esBorrador ? chip('Borrador', 'gold') : '') +
      (x.categoria && conDetalle ? chip(TIPOS_FEAT[x.categoria] || x.categoria, 'soft') : '') +
      '<span class="chip ' + (activo ? 'acc' : '') + '">' + (activo ? 'Habilidad tipo conjuro' : 'Pasivo') + '</span>' + enlaceFeat(cat) + '</div>';
  }

  // ---- la tarjeta Pasivas (6.6): ventajas sumadas

  /** Una línea del desglose: el valor sumado (destacado), lo que modifica, la condición y de dónde sale. */
  function lineaVentaja(ln) {
    var partes = ln.partes.map(function (p) {
      return p.nombre + (p.valor !== null ? ' ' + (p.valor < 0 ? '−' : '+') + Math.abs(p.valor) : '') + (p.bonificador ? ' (' + p.bonificador + ')' : '');
    });
    var cuerpo = ln.tipo === 'numero'
      ? esc(ln.antes) + '<b class="ven-v">' + esc(ln.valorTexto) + '</b>' + esc(ln.despues)
      : esc(ln.texto);
    return '<li class="ven ' + ln.tipo + '"' + tip(partes.length > 1 ? partes.join('\n') : '') + '>' +
      '<span class="ven-t">' + cuerpo + (ln.condicion ? ' <span class="ven-c">' + esc(ln.condicion) + '</span>' : '') + '</span>' +
      '<span class="ven-f">' + esc(ln.partes.map(function (p) { return p.nombre; }).join(' · ')) + '</span>' +
      (ln.notas.length ? '<small class="ven-n">' + esc(ln.notas.join(' ')) + '</small>' : '') + '</li>';
  }

  /** El desglose de las ventajas pasivas por grupo (Defensa, Salvaciones, …), línea por línea. */
  function bloqueVentajas(v) {
    var grupos = v.grupos.map(function (g) {
      return '<div class="pas-grupo"><span class="eyebrow">' + esc(g.nombre) + '</span><ul class="ven-lista">' + g.lineas.map(lineaVentaja).join('') + '</ul></div>';
    }).join('');
    var sin = v.sinDesglose.length
      ? '<p class="mute" style="font-size:13px"' + tip('Sus efectos todavía no están descritos en los datos (data/feats.efectos.json o el archivo de la clase).') + '>Sin desglose todavía: ' + esc(v.sinDesglose.map(function (x) { return x.nombre; }).join(', ')) + '.</p>'
      : '';
    return (grupos ? '<div class="pas-grupos">' + grupos + '</div>' : '<p class="mute">Todavía no hay ventajas pasivas que sumar.</p>') + sin;
  }

  /** Vista Jugar: arriba los títulos de las pasivas (feats y habilidades de la clase), debajo lo que suman, línea por línea. Lo que se activa va a Magia y habilidades. */
  function seccionFeatsJuego(calc, calcB) {
    var ft = calcB.feats;
    var cl = calcB.clase;
    var v = calcB.ventajas;
    var confirmados = calc.feats.lista.length;
    var chipsFeats = v.titulos.feats.map(function (t) {
      var cat = estado.indiceFeats[t.id];
      var borrador = t.indice >= confirmados;
      return chipTip(t.nombre, borrador ? 'gold' : 'soft', (borrador ? 'Borrador. ' : '') + (cat && cat.resumen ? cat.resumen : 'Feat pasivo.'));
    }).join('');
    var chipsClase = cl ? cl.habilidades.filter(function (h) { return !esActiva(h); }).map(function (h) {
      return chipTip(h.nombre, h.origen === 'arquetipo' ? 'gold' : 'soft', tipHabilidad(h));
    }).join('') : '';
    var prox = cl ? cl.proximas.filter(function (h) { return !esActiva(h); }) : [];
    var proximas = prox.length
      ? '<p class="mute" style="font-size:13px">Próximas: ' + esc(prox.slice(0, 4).map(function (h) { return h.nombre + ' (nivel ' + h.nivel + ')'; }).join(', ')) + (prox.length > 4 ? ' y ' + (prox.length - 4) + ' más' : '') + '.</p>'
      : '';
    return '<section class="card bloque-juego pasivas"><div class="row-between" style="align-items:center"><h2>Pasivas</h2>' +
      '<span class="chips">' + chip(ft.slotsUsados + ' de ' + ft.slotsTotales + ' slots de feat', ft.slotsLibres ? 'acc' : 'soft') + (ft.slotsLibres ? chip(plural(ft.slotsLibres, 'libre', 'libres'), 'gold') : '') + chipArquetipo(cl) + '</span></div>' +
      '<div class="pas-titulos">' +
      '<div class="bloque-feats"><span class="eyebrow">Feats</span>' + (chipsFeats ? '<div class="chips">' + chipsFeats + '</div>' : '<p class="mute">Sin feats pasivos.</p>') + '</div>' +
      (cl ? '<div class="bloque-feats"><span class="eyebrow">' + esc(cl.nombre) + (cl.arquetipo ? ' · ' + esc(cl.arquetipo.nombre) : '') + '</span>' + (chipsClase ? '<div class="chips">' + chipsClase + '</div>' : '<p class="mute">Todavía sin habilidades pasivas de clase.</p>') + '</div>' : '') +
      '</div>' + proximas +
      '<div class="pas-ventajas"><span class="eyebrow">Lo que suman</span>' + bloqueVentajas(v) + '</div></section>';
  }

  function seccionFeats(calc, calcB, pj, con) {
    var ft = calcB.feats;
    var confirmados = calc.feats.lista.length;
    var vistos = {};
    var slots = ft.niveles.map(function (nv, i) {
      var cls = i < ft.slotsUsados ? 'usado' : i < ft.slotsTotales ? 'libre' : 'futuro';
      // Los slots normales llegan en niveles impares: un nivel par, o el segundo slot de un nivel, es un feat extra del arquetipo.
      var extra = ft.nivelesExtra.indexOf(nv) >= 0 && (nv % 2 === 0 || vistos[nv]);
      vistos[nv] = true;
      return '<span class="slot ' + cls + (extra ? ' extra' : '') + '"' + (extra ? tip('Feat extra del arquetipo') : '') + '>Nv. ' + nv + (extra ? ' ★' : '') + '</span>';
    }).join('');
    var lista = ft.lista.map(function (x, i) { return itemFeat(x, i >= confirmados, con); }).join('');
    var activos = ft.lista.filter(function (x) { return x.tipo === 'habilidad-tipo-conjuro'; });
    var cuerpo = (con ? '<p class="sub">' + ft.slotsUsados + ' de ' + ft.slotsTotales + ' slots usados. Un slot en el nivel 1 y uno más cada dos niveles' +
      (ft.nivelesExtra.length && calcB.personaje.arquetipo ? ', más los feats extra del arquetipo ' + esc(calcB.personaje.arquetipo.nombre) + ' (★, nivel ' + ft.nivelesExtra.join(', ') + ')' : '') +
      (ft.proximoSlot ? '; el próximo llega al nivel ' + ft.proximoSlot : '') + '.</p>' : '') +
      '<div class="slots">' + slots + '</div><div class="lista">' + (lista || '<p class="mute">Sin feats.</p>') + '</div>' +
      bloqueClasePasiva(calcB.clase, con) +
      '<div class="bloque-feats"><span class="eyebrow">Lo que suman las pasivas</span>' + bloqueVentajas(calcB.ventajas) + '</div>' +
      (activos.length ? '<p class="mute" style="font-size:13px">' + esc(activos.map(function (a) { return a.nombre; }).join(', ')) + (activos.length === 1 ? ' es un feat de ejecución activa: se reclasifica' : ' son feats de ejecución activa: se reclasifican') + ' como habilidad tipo conjuro (van a Magia y habilidades).</p>' : '') +
      (con ? bloquePicker(calcB, pj) : '');
    var hayBorr = ft.lista.length > confirmados;
    var resumen = chip(ft.slotsUsados + ' de ' + ft.slotsTotales + ' slots', ft.slotsLibres ? 'acc' : 'soft') + (ft.slotsLibres ? chip(plural(ft.slotsLibres, 'libre', 'libres'), 'gold') : '') +
      (calcB.clase ? chip(plural(calcB.clase.habilidades.filter(function (h) { return !esActiva(h); }).length, 'pasiva de clase', 'pasivas de clase'), 'soft') : '') + chipArquetipo(calcB.clase) +
      (hayBorr ? chip('Con borrador', 'gold') : '');
    return desplegable('feats', 'Feats y habilidades pasivas', resumen, cuerpo);
  }

  // ---- habilidades de clase y arquetipo (6.5)

  /** Texto del tooltip de una habilidad de clase: el detalle, lo que sustituye y las mejoras ya logradas. */
  function tipHabilidad(h) {
    var l = [h.detalle];
    if (h.sustituye) l.push('Sustituye a ' + h.sustituye.nombre + '.');
    h.mejoras.forEach(function (m) { if (m.alcanzada) l.push('Nivel ' + m.nivel + ': ' + m.detalle); });
    if (h.proximaMejora) l.push('Próxima mejora: nivel ' + h.proximaMejora + '.');
    return l.join('\n');
  }

  function tipArquetipo(a) {
    return a.resumen + (a.reemplaza.length ? '\nSustituye: ' + a.reemplaza.map(function (r) { return r.nombre; }).join(', ') + '.' : '');
  }

  /** Marcas de una habilidad de clase: el nivel en que se gana y si viene del arquetipo. */
  function marcaHabilidad(h) {
    return chip('Nv. ' + h.nivel, 'soft') + (h.origen === 'arquetipo' ? chip('Arquetipo', 'gold') : '');
  }

  function esActiva(h) { return h.ejecucion === 'activo'; }

  /** Chip del arquetipo con su resumen en el tooltip, o nada si el personaje no tiene. */
  function chipArquetipo(cl) {
    return cl && cl.arquetipo ? chipTip(cl.arquetipo.nombre, 'gold', tipArquetipo(cl.arquetipo)) : '';
  }

  /** Habilidades pasivas de la clase: van en la tarjeta de feats, en una lista corta con el nivel y el arquetipo. */
  function bloqueClasePasiva(cl, con) {
    if (!cl) return '';
    var pasivas = cl.habilidades.filter(function (h) { return !esActiva(h); });
    var filas = pasivas.map(function (h) {
      return fila({ nombre: h.nombre, tip: tipHabilidad(h), tipEnNombre: true, medio: marcaHabilidad(h), der: h.proximaMejora ? '<span class="mute">mejora en el nivel ' + h.proximaMejora + '</span>' : '' });
    }).join('');
    var arq = cl.arquetipo && con
      ? '<p class="sub"><b>Arquetipo: ' + esc(cl.arquetipo.nombre) + '</b> (' + esc(cl.arquetipo.fuente || 'homebrew') + '). ' + esc(cl.arquetipo.resumen) +
        (cl.arquetipo.reemplaza.length ? ' Sustituye: ' + esc(cl.arquetipo.reemplaza.map(function (r) { return r.nombre; }).join(', ')) + '.' : '') + '</p>'
      : '';
    var prox = cl.proximas.filter(function (h) { return !esActiva(h); });
    var proximas = prox.length
      ? '<p class="mute" style="font-size:13px">Próximas: ' + esc(prox.slice(0, 4).map(function (h) { return h.nombre + ' (nivel ' + h.nivel + ')'; }).join(', ')) + (prox.length > 4 ? ' y ' + (prox.length - 4) + ' más' : '') + '.</p>'
      : '';
    return arq + '<div class="bloque-feats"><span class="eyebrow">Habilidades pasivas de ' + esc(cl.nombre) + '</span>' +
      (filas ? '<ul class="ren-lista">' + filas + '</ul>' : '<p class="mute">Todavía sin habilidades pasivas de clase.</p>') + '</div>' + proximas;
  }

  /** Una habilidad activa de la clase, como tarjeta: es lo que ocupa el lugar de los conjuros en la tarjeta de Magia y habilidades. */
  function tarjetaActivaClase(h) {
    var logradas = h.mejoras.filter(function (m) { return m.alcanzada; }).map(function (m) { return '<small class="mute">Nivel ' + m.nivel + ': ' + esc(m.detalle) + '</small>'; }).join('');
    return '<div class="tarjeta-activa"><div class="row-between" style="align-items:center"><b>' + esc(h.nombre) + '</b>' + chip('Activa', 'acc') + '</div>' +
      '<small class="mute">' + esc(h.detalle) + '</small>' + logradas +
      '<div class="acc-fila">' + chip('Nv. ' + h.nivel, '') + (h.origen === 'arquetipo' ? chip('Arquetipo', 'gold') : '') + (h.sustituye ? chip('Sustituye a ' + h.sustituye.nombre, '') : '') + (h.proximaMejora ? chip('Mejora en el nivel ' + h.proximaMejora, '') : '') + '</div></div>';
  }

  // ---- selector de feats

  function datosPicker(calcB, pj) {
    var p = estado.picker;
    var jug = Core.contextoJugador(estado.ctx, pj, calcB);
    var q = p.q.trim().toLowerCase();
    var items = [];
    estado.ctx.feats.forEach(function (ft) {
      if (p.tipo !== 'todos' && ft.tipo !== p.tipo) return;
      if (q && ft.nombre.toLowerCase().indexOf(q) < 0) return;
      var yaLoTiene = jug.feats.indexOf(ft.id) >= 0;
      var ev = Core.evaluarRequisitos(ft, jug, estado.indiceFeats);
      var disponible = ev.cumple && !(yaLoTiene && !ft.multiple);
      if (p.soloDisp && !disponible) return;
      items.push({ f: ft, ev: ev, ya: yaLoTiene, disponible: disponible });
    });
    return items;
  }

  function chipRequisito(d) {
    var simbolo = d.estado === 'cumple' ? '✓ ' : d.estado === 'falta' ? '✗ ' : '? ';
    var tono = d.estado === 'cumple' ? 'acc' : d.estado === 'falta' ? 'warn' : 'soft';
    var titulo = d.estado === 'cumple' ? 'Se cumple' : d.estado === 'falta' ? 'No se cumple' : 'El visor no puede comprobar este requisito: revísalo a mano';
    return '<span class="chip ' + tono + '" title="' + esc(titulo) + '">' + simbolo + esc(d.texto) + '</span>';
  }

  function listaPicker(calcB, pj) {
    var p = estado.picker;
    var items = datosPicker(calcB, pj);
    var libres = calcB.feats.slotsLibres;
    var visibles = items.slice(0, p.max);
    var filas = visibles.map(function (it) {
      var ft = it.f;
      var reqs = it.ev.detalle.length ? it.ev.detalle.map(chipRequisito).join('') : '<span class="chip soft">Sin requisitos</span>';
      var puede = it.disponible && libres > 0;
      var motivo = it.ya && !ft.multiple ? 'Ya lo tienes' : !it.ev.cumple ? 'Requisitos sin cumplir' : libres <= 0 ? 'Sin slots libres' : '';
      var eleccion = ft.multiple
        ? '<input class="campo" type="text" id="el-' + esc(ft.id) + '" placeholder="Elección (arma, escuela…)" aria-label="Elección para ' + esc(ft.nombre) + '" autocomplete="off">'
        : '';
      return '<div class="feat-row"><div class="t"><div class="row-between" style="justify-content:flex-start;gap:6px 10px;align-items:center"><b>' + esc(ft.nombre) + '</b>' +
        chip(TIPOS_FEAT[ft.tipo] || ft.tipo || 'Feat', 'soft') + (ft.libro ? chip(ft.libro, 'soft') : '') +
        (ft.ejecucion === 'activo' ? chip('Habilidad tipo conjuro', 'acc') : ft.candidatoActivo ? '<span class="chip soft" title="Su texto sugiere una acción o usos por día: conviene decidir si pasa a habilidad tipo conjuro">Posible activo</span>' : '') +
        (ft.multiple ? chip('Repetible', 'soft') : '') + '</div>' +
        '<div class="reqs">' + reqs + '</div></div>' +
        '<div class="acc-fila">' + eleccion + '<button class="btn prim" type="button" data-accion="elegir" data-id="' + esc(ft.id) + '"' + (puede ? '' : ' disabled') + '>Elegir</button>' +
        (motivo ? '<span class="mute" style="font-size:13px">' + motivo + '</span>' : '') + enlaceFeat(ft) + '</div></div>';
    }).join('');
    var resto = items.length - visibles.length;
    return '<p class="mute" style="font-size:14px" role="status">' + plural(items.length, 'feat coincide', 'feats coinciden') + (resto > 0 ? ' (se muestran ' + visibles.length + ')' : '') +
      '. Desplázate dentro del recuadro para ver el resto.</p>' +
      '<div id="picker-lista" class="lista scroll-lista" tabindex="0" role="region" aria-label="Catálogo de feats">' +
      (filas || '<p class="mute">Ningún feat cumple el filtro. Quita «Solo los que puedo tomar» para ver también los que aún no puedes elegir.</p>') +
      (resto > 0 ? '<button class="btn" type="button" data-accion="mas" style="align-self:flex-start">Mostrar más (' + resto + ' restantes)</button>' : '') + '</div>';
  }

  function nombreFuenteMF(id) {
    var c = estado.ctx.mana.fuentesMF.find(function (x) { return x.id === id; });
    return c ? c.nombre : id;
  }
  function nombreTagMana(id) {
    var t = estado.ctx.manaTags.find(function (x) { return x.id === id; });
    return t ? t.nombre : id;
  }
  function nombreFuncionMana(id) {
    var fn = estado.ctx.mana.funciones.find(function (x) { return x.id === id; });
    return fn ? fn.nombre : id;
  }
  /** «Mana» o «Zeo · Heaven»: a dónde va un SX. */
  function destinoSx(subsistema, rama) {
    return subsistema === 'zeo' ? 'Zeo' + (rama ? ' · ' + Core.rotulo(rama) : '') : 'Mana';
  }

  function etiquetaEntrada(e) {
    if (e.tipo === 'feat') {
      var cat = estado.indiceFeats[e.id];
      return 'Feat · ' + (cat ? cat.nombre : e.id) + (e.eleccion ? ' (' + e.eleccion + ')' : '');
    }
    if (e.tipo === 'achievement') {
      var a = estado.indiceLogros[e.id];
      return 'Achievement · ' + (a ? a.nombre : e.id) + (typeof e.fate === 'number' ? ' (fate ' + e.fate + ')' : '');
    }
    if (e.tipo === 'inscribir') {
      var h = estado.indiceFeats[e.habilidad];
      var tmIns = null;
      if (e.tecnica && estado.vista) tmIns = estado.vista.calcB.mana.tecnicas.filter(function (t) { return t.id === e.tecnica; })[0] || null;
      return 'Inscribir · ' + (e.tecnica ? (tmIns ? tmIns.nombre : e.tecnica) : h ? h.nombre : e.habilidad) + ' en ' + e.slot;
    }
    if (e.tipo === 'conjuro') {
      var cjCat = e.nombre === undefined ? estado.ctx.catalogoConjuros.filter(function (c) { return c.id === e.id; })[0] : null;
      return 'Conjuro · ' + (cjCat ? cjCat.nombre : e.nombre || e.id) + (typeof e.nivel === 'number' ? ' · nivel ' + e.nivel : '');
    }
    if (e.tipo === 'mana-tecnica') {
      return 'Técnica de Mana · ' + e.nombre + ' · nivel ' + e.nivel + (e.categoria === 'activa' ? ' · activa' : '') + (e.costoSx ? ' · contenedor de ' + e.costoSx + ' SX' : '');
    }
    if (e.tipo === 'mana-tecnica-sx') {
      var tmSx = estado.vista ? estado.vista.calcB.mana.tecnicas.filter(function (t) { return t.id === e.id; })[0] : null;
      return 'SX ' + deltaTxt(e.cantidad) + ' → ' + (tmSx ? tmSx.nombre : e.id);
    }
    if (e.tipo === 'apunte') return 'Nota de ' + e.autor + (e.rol === 'gm' ? ' (GM)' : '') + ' · ' + (e.texto.length > 60 ? e.texto.slice(0, 60) + '…' : e.texto);
    if (e.tipo === 'resumen') return 'Resumen e imagen de la sesión' + (e.imagen ? ' · con imagen' : '');
    if (e.tipo === 'opciones') return 'Opciones · ' + e.titulo + ' (' + e.opciones.length + ', ' + (e.alcance === 'grupo' ? 'grupo' : 'individual') + ')';
    if (e.tipo === 'decision') {
      var opDec = estado.vista ? estado.vista.calcB.opciones.lista.filter(function (o) { return o.id === e.opciones; })[0] : null;
      return 'Decisión · ' + (opDec ? opDec.titulo : e.opciones) + ' → ' + e.elegidas.map(function (id) {
        var x = opDec ? opDec.opciones.filter(function (o) { return o.id === id; })[0] : null;
        return x ? x.texto : id;
      }).join(' · ');
    }
    if (e.tipo === 'desinscribir') return 'Desinscribir · ' + e.slot;
    if (e.tipo === 'mana-fuerza') return 'Mana force ' + (e.porNivel ? deltaTxt(e.porNivel) + ' por nivel' : deltaTxt(e.cantidad)) + ' · ' + nombreFuenteMF(e.fuente) + (e.nota ? ' (' + e.nota + ')' : '');
    if (e.tipo === 'gate') return 'Gate ' + e.id + ' · ' + nombreTagMana(e.tag) + ' · ' + (e.funcion ? nombreFuncionMana(e.funcion) : 'sin función');
    if (e.tipo === 'sx') return 'SX +' + e.cantidad + ' a la reserva';
    if (e.tipo === 'sx-asignar') return 'SX ' + e.cantidad + ' de la reserva → ' + destinoSx(e.subsistema, e.rama);
    if (e.tipo === 'xp-subsistema') return 'SX +' + e.cantidad + ' → ' + destinoSx(e.subsistema, e.rama);
    if (e.tipo === 'zeo-tecnica') return 'Técnica Zeo · ' + e.linea + ' nivel ' + e.nivel + (e.tecnica ? ' · ' + e.tecnica : '') + (e.origen ? ' (' + e.origen + ')' : '') + (e.activa === false ? ' · por activar' : '');
    if (e.tipo === 'zeo-activar') return 'Activar línea Zeo · ' + e.linea;
    if (e.tipo === 'tirada') return e.recurso.toUpperCase() + ' · ' + e.dado + ' → ' + e.resultado;
    return e.tipo;
  }

  /** Todo lo que se elige o se tira en esta pantalla queda aquí, sin tocar el personaje, hasta copiarlo al registro. */
  function seccionBorrador(calcB, pj, borr) {
    var avisosBorr = calcB.avisos.filter(function (a) { return a.sesion === 'borrador'; });
    var items = borr.map(function (e, i) {
      var err = avisosBorr.find(function (a) { return a.indice === i; });
      return '<div class="item"><div class="t"><b>' + esc(etiquetaEntrada(e)) + '</b>' +
        (err ? '<small style="color:var(--warn)">No se aplica: ' + esc(err.mensaje) + '</small>' : '') + '</div>' +
        (err ? chip('Con error', 'warn') : chip('Borrador', 'gold')) +
        '<button class="btn" type="button" data-accion="quitar" data-indice="' + i + '">Quitar</button></div>';
    }).join('');
    var json = JSON.stringify(borr, null, 2);
    var cuerpo = borr.length
      ? '<div class="lista">' + items + '</div>' +
        '<p class="sub">Estas entradas todavía no están en el personaje. Cópialas y pégalas en la lista <code>entradas</code> de una sesión de <code>characters/' + esc(idPj(pj)) + '.json</code>; el borrador se queda en este navegador hasta que lo vacíes.</p>' +
        '<textarea class="json" id="pk-json" readonly rows="' + Math.min(12, json.split('\n').length) + '" aria-label="Entradas del borrador en JSON">' + esc(json) + '</textarea>' +
        '<div class="acc-fila"><button class="btn prim" type="button" data-accion="copiar">Copiar JSON</button><button class="btn" type="button" data-accion="descargar">Descargar .json</button><button class="btn" type="button" data-accion="vaciar">Vaciar borrador</button><span id="pk-msg" role="status" class="mute" style="font-size:14px"></span></div>'
      : '<p class="mute">Vacío. Cada feat que elijas, achievement que asignes o dado que tires se suma aquí y se calcula como si ya estuviera en el personaje.</p>';
    var resumen = borr.length
      ? chip(plural(borr.length, 'entrada', 'entradas'), 'gold') + (avisosBorr.length ? chip(plural(avisosBorr.length, 'con error', 'con errores'), 'warn') : '')
      : chip('Vacío', 'soft');
    return desplegable('borrador', 'Borrador de la sesión', resumen, cuerpo);
  }

  /** El selector de feats vive dentro de la sección Feats. */
  function bloquePicker(calcB, pj) {
    var p = estado.picker;
    var opciones = [['todos', 'Todos los tipos']].concat(Object.keys(TIPOS_FEAT).map(function (k) { return [k, TIPOS_FEAT[k]]; }));
    return '<div class="picker-bloque"><h3 style="font-size:20px">Elegir un feat' + (calcB.feats.slotsLibres ? ' · ' + plural(calcB.feats.slotsLibres, 'slot libre', 'slots libres') : ' · sin slots libres') + '</h3>' +
      '<p class="sub">' + estado.ctx.feats.length + ' feats de Pathfinder 1e (Core, Advanced Player\'s Guide, Ultimate Magic y Ultimate Combat, sin los raciales). El visor comprueba atributos, ataque base según tu clase, nivel y feats previos; ' +
      'los demás requisitos aparecen con «?» y los revisas tú. El texto de cada feat está en Archives of Nethys.</p>' +
      '<div class="picker-controles"><label class="campo-et">Buscar<input class="campo" type="search" id="pk-q" value="' + esc(p.q) + '" placeholder="Nombre del feat" autocomplete="off"></label>' +
      '<label class="campo-et">Tipo<select class="btn" id="pk-tipo">' + opciones.map(function (o) {
        return '<option value="' + o[0] + '"' + (o[0] === p.tipo ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select></label>' +
      '<label class="check"><input type="checkbox" id="pk-disp"' + (p.soloDisp ? ' checked' : '') + '> Solo los que puedo tomar</label></div>' +
      '<div id="picker-wrap" style="display:flex;flex-direction:column;gap:10px">' + listaPicker(calcB, pj) + '</div></div>';
  }

  // ---- HP y MP: tiradas

  function dadoDe(rec, r) {
    if (estado.dados[rec]) return estado.dados[rec];
    return r.tiradas.length ? r.tiradas[r.tiradas.length - 1].dado : DADO_INICIAL[rec];
  }

  function bloqueTiradas(rec, etiqueta, r, con) {
    var filas = r.tiradas.map(function (t) {
      var suma = t.resultado + t.mod;
      return '<div class="item"><div class="t"><b>Nivel ' + t.nivel + '</b><small>' + esc(t.dado) + ' → ' + t.resultado + ' ' + (t.mod < 0 ? '−' : '+') + ' ' + Math.abs(t.mod) + ' (' + r.atributo + ')' +
        (suma < 1 ? ' = ' + suma + ', se cuenta el mínimo de 1' : '') + '</small></div>' +
        (t.sesion === 'borrador' ? chip('Borrador', 'gold') : '') + '<span class="v">+' + t.ganado + '</span></div>';
    }).join('');
    var dado = dadoDe(rec, r);
    var form = '';
    if (con) {
      form = r.pendientes.length
        ? '<div class="tirada-form"><p class="sub">Siguiente nivel sin tirada: <b>' + r.pendientes[0] + '</b>. Tira en la mesa y registra el resultado, o deja que el visor tire por ti.</p>' +
          '<div class="acc-fila"><label class="campo-et">Dado<select class="btn" id="tr-' + rec + '-dado">' + DADOS.map(function (d) {
            return '<option value="' + d + '"' + (d === dado ? ' selected' : '') + '>' + d + '</option>';
          }).join('') + '</select></label>' +
          '<button class="btn prim" type="button" data-accion="tirar" data-recurso="' + rec + '">Tirar</button>' +
          '<label class="campo-et">Resultado de tus dados<input class="campo" type="number" inputmode="numeric" min="1" id="tr-' + rec + '-res" placeholder="Ej.: 6" style="width:150px"></label>' +
          '<button class="btn" type="button" data-accion="registrar-tirada" data-recurso="' + rec + '">Registrar</button></div></div>'
        : '<p class="mute" style="font-size:14px">Todos los niveles tienen su tirada.</p>';
    }
    return '<div class="inner" style="display:flex;flex-direction:column;gap:14px"><div class="row-between" style="align-items:center"><h3 style="font-size:20px">' + etiqueta + '</h3>' +
      '<span class="mute num" style="font-size:14px">Máximo <b>' + r.maximo + '</b> · ' + r.atributo + ' ' + signo(r.mod) + ' por nivel</span></div>' +
      '<div class="lista">' + (filas || '<p class="mute">Todavía no hay tiradas registradas.</p>') + '</div>' + form + '</div>';
  }

  function seccionTiradas(calcB, con) {
    var rc = calcB.recursos;
    var pend = rc.hp.pendientes.length + rc.mp.pendientes.length;
    var cuerpo = '<p class="sub">Cada nivel suma el resultado del dado más el modificador del atributo, con un mínimo de 1 por nivel. HP usa CON y MP usa SPR; los dos atributos se derivan de los base. Cada tirada queda en el registro de la sesión en que se hizo.</p>' +
      '<div class="grid g300">' + bloqueTiradas('hp', 'HP', rc.hp, con) + bloqueTiradas('mp', 'MP', rc.mp, con) + '</div>';
    var resumen = chip('HP ' + rc.hp.maximo, 'acc') + chip('MP ' + rc.mp.maximo, 'acc') + (pend ? chip(plural(pend, 'tirada pendiente', 'tiradas pendientes'), 'warn') : '');
    return desplegable('tiradas', 'Tiradas de HP y MP', resumen, cuerpo);
  }

  // ---- equipo

  /** Vista Jugar: la armadura y cada extremidad en una línea; las cargas y el detalle van en el tooltip. */
  function seccionEquipoJuego(calc) {
    var e = calc.equipo;
    var tipoTxt = { arma: 'Arma', objeto: 'Objeto' };
    var idxObjeto = {};
    e.objetos.forEach(function (o, i) { idxObjeto[o.id] = i + 1; });
    var filaItem = function (etiqueta, it, vacio, extremidad) {
      if (!it) return fila({ clase: 'libre', etiqueta: etiqueta, nombre: vacio });
      var ayuda = it.tipo === 'armadura' ? 'Armadura: no ocupa extremidad ni cuenta entre los ' + e.limites.objetos + ' objetos mágicos.'
        : it.tipo === 'arma' ? 'Arma en ' + extremidad.toLowerCase() + ': no cuenta entre los ' + e.limites.objetos + ' objetos mágicos.'
        : 'Objeto mágico ' + idxObjeto[it.id] + ' de ' + e.limites.objetos + ', en ' + extremidad.toLowerCase() + '.';
      var carga = '';
      if (it.cargas) {
        ayuda += '\n' + it.cargas.actuales + ' de ' + it.cargas.max + ' cargas' + (it.cargas.recarga === 'diaria' ? ', recarga diaria' : ', sin recarga');
        carga = '<span class="chip soft num" aria-label="' + it.cargas.actuales + ' de ' + it.cargas.max + ' cargas">' + it.cargas.actuales + '/' + it.cargas.max + '</span>';
      }
      return fila({ etiqueta: etiqueta, nombre: it.nombre, tip: ayuda, medio: tipoTxt[it.tipo] ? chip(tipoTxt[it.tipo]) : '', der: carga });
    };
    var filas = filaItem('Armadura', e.armadura, 'Sin armadura', '');
    e.porExtremidad.forEach(function (x) { filas += filaItem(x.etiqueta, x.item, 'Libre', x.etiqueta); });
    return '<section class="card bloque-juego"><div class="row-between" style="align-items:center"><h2>Equipo</h2><span class="chips">' +
      chip('Armadura ' + e.conteo.armadura + '/' + e.limites.armadura, 'soft') + chip('Arma ' + e.conteo.arma + '/' + e.limites.arma, 'soft') +
      chip('Objetos mágicos ' + e.conteo.objetos + '/' + e.limites.objetos, 'soft') + '</span></div><ul class="ren-lista">' + filas + '</ul></section>';
  }

  function seccionEquipo(calc, con) {
    var e = calc.equipo;
    var cargas = function (c) {
      if (!c) return '';
      var cuadros = '';
      for (var i = 0; i < c.max; i++) cuadros += '<i class="' + (i < c.actuales ? '' : 'vacia') + '"></i>';
      return '<div style="display:flex;flex-direction:column;gap:6px"><div class="cargas" aria-hidden="true">' + cuadros + '</div><span class="mute" style="font-size:13px">' +
        c.actuales + ' de ' + c.max + ' cargas' + (c.recarga === 'diaria' ? ' · recarga diaria' : '') + '</span></div>';
    };
    var tarjeta = function (lbl, sub, it, vacio) {
      return '<div class="slot-eq"><div style="display:flex;flex-direction:column;gap:2px"><span class="lbl">' + esc(lbl) + '</span><span class="sub2">' + esc(sub) + '</span></div>' +
        (it ? '<span class="nom">' + esc(it.nombre) + '</span><span class="chip" style="align-self:flex-start">' + (it.tipo === 'armadura' ? 'Armadura' : it.tipo === 'arma' ? 'Arma' : 'Objeto mágico') + '</span>' + cargas(it.cargas)
          : '<span class="libre">' + esc(vacio) + '</span>') + '</div>';
    };
    var idxObjeto = {};
    e.objetos.forEach(function (o, i) { idxObjeto[o.id] = i + 1; });
    var tarjetas = tarjeta('Armadura', 'Sin extremidad · no cuenta', e.armadura, 'Sin armadura');
    e.porExtremidad.forEach(function (x) {
      var sub = !x.item ? 'Libre' : x.item.tipo === 'arma' ? 'Arma · no cuenta' : 'Objeto mágico ' + idxObjeto[x.item.id] + ' de ' + e.limites.objetos;
      tarjetas += tarjeta(x.etiqueta, sub, x.item, 'Libre');
    });
    var cuerpo = (con ? '<p class="sub">1 armadura, 1 arma y 3 objetos mágicos. La armadura y el arma no cuentan dentro de los 3 objetos, y cada extremidad sostiene un solo objeto; la armadura no ocupa extremidad.</p>' : '') +
      '<div class="grid g210">' + tarjetas + '</div>';
    var resumen = chip('Armadura ' + e.conteo.armadura + '/' + e.limites.armadura, 'soft') + chip('Arma ' + e.conteo.arma + '/' + e.limites.arma, 'soft') +
      chip('Objetos mágicos ' + e.conteo.objetos + '/' + e.limites.objetos, 'soft');
    return desplegable('equipo', 'Equipo', resumen, cuerpo);
  }

  // ---- sesiones

  function dTxt(d) { return d === 0 ? 'Δ0' : d > 0 ? 'Δ+' + d : 'Δ−' + Math.abs(d); }

  function chipsDeSesion(s) {
    var c = [];
    var zeo = Object.keys(s.zeo);
    if (zeo.length) c.push(['Zeo · ' + zeo.map(function (r) { return Core.rotulo(r) + ' +' + s.zeo[r]; }).join(' · '), '']);
    if (s.tecnicas.length) {
      var porLinea = {};
      s.tecnicas.forEach(function (t) { porLinea[t.linea] = (porLinea[t.linea] || 0) + 1; });
      var lineasT = Object.keys(porLinea);
      // Con pocas técnicas se detallan (línea, nivel y nombre); con muchas, un resumen por línea.
      c.push(['Técnicas · ' + (s.tecnicas.length <= 4
        ? s.tecnicas.map(function (t) { return t.linea + ' nv. ' + t.nivel + (t.nombre ? ' ' + t.nombre : ''); }).join(' · ')
        : plural(s.tecnicas.length, 'técnica', 'técnicas') + ' en ' + plural(lineasT.length, 'línea', 'líneas') + ' (' + lineasT[0] + (lineasT.length > 1 ? ' a ' + lineasT[lineasT.length - 1] : '') + ')'), '']);
    }
    s.activaciones.forEach(function (a) { c.push(['Activó ' + a.linea + (a.nombre ? ' · ' + a.nombre : '') + ' (' + a.costo + ' sx)', 'acc']); });
    if (s.mana) c.push(['Mana +' + s.mana, '']);
    if (s.sxGanado) c.push(['SX a la reserva +' + s.sxGanado, '']);
    if (s.sxAsignado.length) c.push(['SX asignado de la reserva · ' + s.sxAsignado.map(function (a) { return destinoSx(a.subsistema, a.rama) + ' ' + a.cantidad; }).join(' · '), '']);
    s.mf.forEach(function (m) { c.push(['Mana force ' + deltaTxt(m.cantidad) + (m.porNivel ? ' (' + m.porNivel + ' por nivel)' : '') + ' · ' + nombreFuenteMF(m.fuente), '']); });
    s.gates.forEach(function (g) { c.push(['Gate ' + g.id + ' · ' + g.tagNombre + (g.funcion ? ' (' + nombreFuncionMana(g.funcion) + ')' : ''), 'acc']); });
    s.conjuros.forEach(function (x) { c.push(['Conjuro · ' + x.nombre + ' (' + (x.nivel === 0 ? 'truco' : 'nivel ' + x.nivel) + ')', 'acc']); });
    s.tecnicasMana.forEach(function (x) { c.push(['Técnica de Mana · ' + x.nombre + ' (nivel ' + x.nivel + (x.categoria === 'activa' ? ', activa' : '') + ')', x.costoSx ? 'gold' : 'acc']); });
    s.tecnicasSx.forEach(function (x) { c.push(['SX ' + deltaTxt(x.cantidad) + ' → ' + x.nombre + ' (' + x.acumulado + '/' + x.costoSx + ')', '']); });
    s.inscripciones.forEach(function (i) { c.push([(i.accion === 'inscribir' ? 'Inscribió ' : 'Quitó ') + i.nombre + (i.accion === 'inscribir' ? ' en ' : ' de ') + i.slot, '']); });
    var tir = { hp: 0, mp: 0 };
    s.tiradas.forEach(function (t) { tir[t.recurso] += 1; });
    if (tir.hp || tir.mp) c.push(['Tiradas · ' + (tir.hp ? 'HP ×' + tir.hp : '') + (tir.hp && tir.mp ? ' · ' : '') + (tir.mp ? 'MP ×' + tir.mp : ''), '']);
    s.logros.forEach(function (l) { c.push(['Achievement · ' + l.nombre, 'gold']); });
    var fateExtra = s.fate;
    if (fateExtra) c.push(['Fate ' + (fateExtra > 0 ? '+' : '−') + Math.abs(fateExtra), 'gold']);
    if (s.feats.length) c.push([(s.feats.length === 1 ? 'Feat · ' : 'Feats · ') + s.feats.map(function (x) { return x.nombre; }).join(' · '), '']);
    if (s.rasgos.length) c.push(['Méritos y defectos · ' + s.rasgos.map(function (x) { return (x.accion === 'ganar' ? '+' : '−') + x.nombre; }).join(' · '), '']);
    if (s.traits.length) c.push(['Traits · ' + s.traits.map(function (x) { return (x.accion === 'ganar' ? '+' : '−') + x.nombre; }).join(' · '), 'gold']);
    var verbo = { equipar: 'equipó', desequipar: 'desequipó', 'usar-carga': 'usó una carga de', recargar: 'recargó' };
    s.objetos.forEach(function (o) { c.push(['Objeto · ' + verbo[o.accion] + ' ' + o.nombre, '']); });
    if (s.nivelDespues !== s.nivelAntes) c.push(['Nivel ' + s.nivelAntes + ' → ' + s.nivelDespues, 'gold']);
    return c;
  }

  function filaXp(w) {
    if (w.tipo === 'ajuste') {
      return '<div class="fila"><div class="quien"><div class="l1"><b>Ajuste manual</b>' + chip('Ajuste', 'soft') + '</div><small>' + esc(w.nota) + '</small></div>' +
        '<span class="calc num">XP fijada a mano</span><span class="xp num">' + (w.total >= 0 ? '+' : '−') + f(Math.abs(w.total)) + '</span></div>';
    }
    var dec = w.tags.find(function (t) { return t.id === w.decisivo; }) || w.tags[0];
    var nombres = w.tags.map(function (t) { return t.nombre; }).join(' + ');
    var grado = dec.grado === 'heroico' ? 'Heroico 100 %' : 'Cumple ' + pct(dec.pct) + ' %';
    var calcTxt = 'Nv. ' + w.nivelContenido + ' (' + dTxt(w.delta) + ') · ' + w.cantidad + ' × ' + w.unidad + (w.xpFija !== null ? ' (XP fija)' : '');
    return '<div class="fila"><div class="quien"><div class="l1"><b>' + esc(nombres) + '</b>' + chip(grado, dec.grado === 'heroico' ? 'gold' : 'soft') + '</div>' +
      (w.nota ? '<small>' + esc(w.nota) + '</small>' : '') + '</div><span class="calc num">' + esc(calcTxt) + '</span>' +
      '<span class="xp num">' + (w.total === 0 ? '0' : '+' + f(w.total)) + '</span></div>';
  }

  // ---- notas, resumen y opciones por sesión (10.6)

  /** Una pestaña plegable dentro de una sesión; recuerda si está abierta. `porDefecto` la abre la primera vez. */
  function detSesion(id, titulo, resumenHtml, cuerpo, porDefecto) {
    var abierta = estado.abiertos[id] === undefined ? !!porDefecto : estado.abiertos[id];
    return '<details class="ses-det" data-id="' + esc(id) + '"' + (abierta ? ' open' : '') + '><summary><b>' + esc(titulo) + '</b>' + (resumenHtml || '') + '</summary>' +
      '<div class="ses-det-c">' + cuerpo + '</div></details>';
  }

  /** Lo que el GM cuenta de la sesión: una imagen general y un resumen. */
  function bloqueGM(s) {
    if (!s.resumen && !s.imagen) return '';
    var src = s.imagen ? srcImagen(s.imagen) : '';
    return '<div class="ses-gm">' +
      (src ? '<img class="ses-img" src="' + esc(src) + '" alt="Imagen general de la sesión" loading="lazy">'
        : s.imagen ? '<small class="mute">Imagen de la sesión: ' + esc(s.imagen.length > 60 ? s.imagen.slice(0, 60) + '…' : s.imagen) + ' (aquí no se puede mostrar)</small>' : '') +
      (s.resumen ? '<p class="ses-resumen">' + esc(s.resumen) + '</p>' : '') + '</div>';
  }

  /** Las notas de la sesión, agrupadas por autor (el GM primero). */
  function bloqueApuntes(s) {
    if (!s.apuntes.length) return '';
    var autores = [], porAutor = {};
    s.apuntes.forEach(function (a) {
      var k = a.rol + '|' + a.autor;
      if (!porAutor[k]) { porAutor[k] = { autor: a.autor, rol: a.rol, notas: [] }; autores.push(porAutor[k]); }
      porAutor[k].notas.push(a);
    });
    autores.sort(function (x, y) { return (x.rol === 'gm' ? 0 : 1) - (y.rol === 'gm' ? 0 : 1); });
    var cuerpo = autores.map(function (g) {
      return '<div class="ap-autor"><div class="ap-cab"><b>' + esc(g.autor) + '</b>' + chip(g.rol === 'gm' ? 'GM' : 'Jugador', g.rol === 'gm' ? 'gold' : 'soft') + '</div>' +
        g.notas.map(function (n) {
          return '<p class="ap-nota">' + esc(n.texto) + (n.desde === 'borrador' ? ' ' + chip('Borrador', 'gold') : n.desde !== s.id ? ' ' + chip('Añadida después', 'soft') : '') + '</p>';
        }).join('') + '</div>';
    }).join('');
    var quienes = autores.map(function (g) { return g.autor; }).join(', ');
    return detSesion('ses-' + s.id + '-notas', 'Notas · ' + s.apuntes.length, '<span class="mute">' + esc(quienes) + '</span>', cuerpo, false);
  }

  /** Una oferta de opciones: el jugador marca su decisión y queda anotada en la sesión de la oferta. */
  function tarjetaOpciones(o, nombrePj) {
    var d = o.decision;
    var multi = o.elige > 1;
    var grupo = o.alcance === 'grupo';
    var cab = '<div class="op-cab"><b>' + esc(o.titulo) + '</b>' +
      chipTip(grupo ? 'Decide el grupo' : 'Decide cada jugador', grupo ? 'acc' : 'soft',
        grupo ? 'Se decide una vez para todo el grupo. Quien la anota la copia al archivo de cada personaje.' : 'Cada jugador marca la suya en su visor y se la pasa al GM.') +
      chip(multi ? 'Elige ' + o.elige : 'Elige 1', 'soft') +
      (d ? chip('Decidido', 'acc') + (d.desde === 'borrador' ? chip('Borrador', 'gold') : '') : chip('Sin decidir', 'gold')) +
      (o.sesion === 'borrador' ? chip('Borrador', 'gold') : '') + '</div>';
    var opciones = o.opciones.map(function (x) {
      if (multi) return '<label class="op-opc"><input type="checkbox" class="op-chk" data-op="' + esc(o.id) + '" value="' + esc(x.id) + '"' + (x.elegida ? ' checked' : '') + '><span>' + esc(x.texto) + '</span></label>';
      return '<button type="button" class="btn op-opc' + (x.elegida ? ' elegida' : '') + '" data-accion="decidir" data-op="' + esc(o.id) + '" data-o="' + esc(x.id) + '" aria-pressed="' + (x.elegida ? 'true' : 'false') + '">' + (x.elegida ? '✓ ' : '') + esc(x.texto) + '</button>';
    }).join('');
    var pie = multi ? '<div class="acc-fila"><button class="btn prim" type="button" data-accion="decidir-multi" data-op="' + esc(o.id) + '">' + (d ? 'Cambiar la decisión' : 'Confirmar la decisión') + '</button></div>' : '';
    var estadoTxt = d
      ? '<p class="mute" style="margin:0;font-size:14px">' + (grupo ? 'Decisión del grupo' : 'Decisión de ' + esc(nombrePj)) + ': <b>' + esc(d.textos.join(' · ')) + '</b>' +
        (d.nota ? ' (' + esc(d.nota) + ')' : '') + (o.historial.length > 1 ? ' · cambiada ' + (o.historial.length - 1) + (o.historial.length === 2 ? ' vez' : ' veces') : '') + '</p>'
      : '';
    return '<div class="op-card" id="op-' + esc(o.id) + '">' + cab + (o.texto ? '<p class="ses-resumen">' + esc(o.texto) + '</p>' : '') +
      '<div class="op-lista">' + opciones + '</div>' + pie + estadoTxt + '</div>';
  }

  /** La pestaña plegable «Opciones» de una sesión: recompensas u otras decisiones que el GM deja a elegir. */
  function bloqueOpciones(s, nombrePj) {
    if (!s.opciones.length) return '';
    var pend = s.opciones.filter(function (o) { return !o.decision; }).length;
    return detSesion('ses-' + s.id + '-opc', 'Opciones · ' + s.opciones.length,
      pend ? chip(pend + ' sin decidir', 'gold') : '<span class="mute">todas decididas</span>',
      s.opciones.map(function (o) { return tarjetaOpciones(o, nombrePj); }).join(''), pend > 0);
  }

  /** Las sesiones del registro, de la más nueva a la más vieja, para elegir a cuál va una nota, un resumen o una oferta. */
  function opcionesDeSesion(calcB) {
    var l = '<option value="">Sesión en curso</option>';
    calcB.sesiones.filter(function (x) { return x.id !== 'borrador'; }).map(function (x, i) { return { x: x, n: i }; }).reverse().forEach(function (o) {
      l += '<option value="' + esc(o.x.id) + '">' + (o.n === 0 ? 'Creación' : 'Sesión ' + o.n) + ' · ' + esc(o.x.titulo) + '</option>';
    });
    return l;
  }

  /** Escribir una nota: la puede escribir un jugador o el GM; el autor se recuerda en este navegador. */
  function formularioNota(calcB) {
    var rol = leerGuardado('ewe-rol') === 'gm' ? 'gm' : 'jugador';
    return '<div class="ses-form"><span class="eyebrow">Escribir una nota</span>' +
      '<div class="acc-fila"><label class="campo-et">Autor<input class="campo" type="text" id="ap-autor" value="' + esc(leerGuardado('ewe-autor') || '') + '" placeholder="Ana" autocomplete="off" style="width:160px"></label>' +
      '<label class="campo-et">Rol<select class="campo" id="ap-rol"><option value="jugador"' + (rol === 'jugador' ? ' selected' : '') + '>Jugador</option><option value="gm"' + (rol === 'gm' ? ' selected' : '') + '>GM</option></select></label>' +
      '<label class="campo-et">Sesión<select class="campo" id="ap-ses">' + opcionesDeSesion(calcB) + '</select></label></div>' +
      '<textarea class="campo" id="ap-texto" rows="3" aria-label="Texto de la nota" placeholder="Qué pasó, qué sospechas, qué quedó pendiente…" style="width:100%;padding:10px 14px"></textarea>' +
      '<div class="acc-fila"><button class="btn prim" type="button" data-accion="ap-agregar">Agregar nota</button>' +
      '<span class="mute" style="font-size:13px">Queda en el borrador; se la pasas al GM con «Copiar JSON».</span></div></div>';
  }

  /** La sesión que viene (el borrador): ahí se escriben las notas y se ve lo que se ofrece y decide antes de que el GM la cierre. */
  function bloqueSesionEnCurso(calcB) {
    var sb = calcB.sesiones.filter(function (x) { return x.id === 'borrador'; })[0];
    var nombrePj = calcB.personaje.nombre;
    return '<div class="sesion curso"><div class="cuando"><b>Sesión en curso</b><small>Borrador</small></div><div class="cuerpo">' +
      (sb ? bloqueGM(sb) : '') + formularioNota(calcB) + (sb ? bloqueApuntes(sb) + bloqueOpciones(sb, nombrePj) : '') + '</div></div>';
  }

  function seccionSesiones(calc, calcB) {
    var nombrePj = calcB.personaje.nombre;
    var propias = calcB.sesiones.filter(function (x) { return x.id !== 'borrador'; });
    var filas = calc.sesiones.map(function (s, i) {
      var sb = propias[i] || s; // la versión con el borrador: ahí están las notas y decisiones que aún no se guardaron
      var chips = chipsDeSesion(s).map(function (c) { return chip(c[0], c[1]); }).join('');
      return '<div class="sesion"><div class="cuando"><b>' + (i === 0 ? 'Creación' : 'Sesión ' + i) + '</b><small>' + esc(fecha(s.fecha)) + '</small></div>' +
        '<div class="cuerpo"><div class="row-between"><h3>' + esc(s.titulo) + '</h3><div class="delta num"><b>' + (s.xpGanada >= 0 ? '+' : '−') + f(Math.abs(s.xpGanada)) + ' XP</b><small>Acumulado: ' + f(s.xpAcumulada) + ' XP</small></div></div>' +
        bloqueGM(sb) +
        (chips ? '<div class="chips">' + chips + '</div>' : '') +
        (s.filasXp.length ? '<div class="filas">' + s.filasXp.map(filaXp).join('') + '</div>' : '') +
        bloqueApuntes(sb) + bloqueOpciones(sb, nombrePj) + '</div></div>';
    }).join('');
    return '<section class="card" id="sesiones" style="padding:28px;gap:24px"><div style="display:flex;flex-direction:column;gap:8px"><h2>Sesiones</h2>' +
      '<p class="sub">Cada fila guarda sus entradas (tag, grado, nivel del contenido y cantidad). La XP se calcula: 40 × multiplicador por Δ × grado del tag. Δ es el nivel del contenido menos el nivel del personaje. ' +
      'Cada sesión puede llevar la imagen y el resumen del GM, las notas de cada autor y opciones para elegir.</p></div>' +
      '<div style="display:flex;flex-direction:column;gap:22px">' + bloqueSesionEnCurso(calcB) + filas + '</div></section>';
  }

  /** Construir: lo que escribe el GM (resumen, imagen y opciones) y la importación de notas de otros jugadores (opción A, 10.6). */
  function seccionNotas(calcB) {
    var op = calcB.opciones;
    var notas = calcB.sesiones.reduce(function (a, x) { return a + x.apuntes.length; }, 0);
    var resumen = chip(plural(notas, 'nota', 'notas'), notas ? 'acc' : 'soft') + chip(plural(op.lista.length, 'oferta de opciones', 'ofertas de opciones'), 'soft') +
      (op.pendientes ? chip(op.pendientes + ' sin decidir', 'gold') : '');
    var cuerpo = '<p class="sub">Las notas, los resúmenes y las decisiones son entradas del registro: se escriben aquí, quedan en el borrador y se copian a la sesión. ' +
      'Cada autor escribe solo las suyas; para juntarlas, el jugador te pasa el JSON de su borrador y lo importas abajo.</p>' +
      '<div class="picker-bloque"><h3 style="font-size:20px">Resumen e imagen de la sesión (GM)</h3>' +
      '<p class="sub">Lo que se cuenta de la sesión: un resumen y una imagen general. La imagen es una URL, una ruta dentro de <code>characters/</code> o un archivo que se reduce y se guarda dentro de la entrada.</p>' +
      '<div class="acc-fila"><label class="campo-et">Sesión<select class="campo" id="rs-ses">' + opcionesDeSesion(calcB) + '</select></label></div>' +
      '<label class="campo-et">Resumen<textarea class="campo" id="rs-texto" rows="3" style="width:min(560px,100%);padding:10px 14px" placeholder="Cruzaron la sierra y…"></textarea></label>' +
      '<div class="acc-fila"><label class="campo-et">Imagen (URL o ruta)<input class="campo" type="text" id="rs-img" autocomplete="off" placeholder="sesiones/s3.jpg" style="width:260px"></label>' +
      '<label class="btn file">Elegir archivo<input type="file" id="rs-archivo" accept="image/*"></label><span class="mute" id="rs-img-msg" style="font-size:13px"></span>' +
      '<button class="btn prim" type="button" data-accion="rs-agregar">Agregar</button></div></div>' +
      '<div class="picker-bloque"><h3 style="font-size:20px">Ofrecer opciones para elegir (GM)</h3>' +
      '<p class="sub">Recompensas u otras decisiones. <b>Grupo</b>: una sola decisión para todos. <b>Individual</b>: cada jugador marca la suya. Cada jugador la marca en «Opciones» de la sesión y queda anotada. No aplica nada solo: lo que se elija lo anotas tú en el registro.</p>' +
      '<div class="acc-fila"><label class="campo-et">Título<input class="campo" type="text" id="op-titulo" autocomplete="off" placeholder="Botín del jefe" style="width:240px"></label>' +
      '<label class="campo-et">Quién decide<select class="campo" id="op-alcance"><option value="individual">Cada jugador</option><option value="grupo">El grupo</option></select></label>' +
      '<label class="campo-et">Cuántas se eligen<input class="campo" type="number" inputmode="numeric" min="1" id="op-elige" value="1" style="width:110px;min-width:0"></label>' +
      '<label class="campo-et">Sesión<select class="campo" id="op-ses">' + opcionesDeSesion(calcB) + '</select></label></div>' +
      '<label class="campo-et">Texto (opcional)<input class="campo" type="text" id="op-texto" autocomplete="off" placeholder="Solo una por personaje" style="width:min(560px,100%)"></label>' +
      '<label class="campo-et">Opciones, una por línea<textarea class="campo" id="op-lista" rows="4" style="width:min(560px,100%);padding:10px 14px" placeholder="Espada +1&#10;Anillo de protección&#10;500 po"></textarea></label>' +
      '<div class="acc-fila"><button class="btn prim" type="button" data-accion="op-agregar">Ofrecer</button></div></div>' +
      '<div class="picker-bloque"><h3 style="font-size:20px">Importar notas y decisiones</h3>' +
      '<p class="sub">Pega el JSON que te pasó otro jugador (lo que copió de su borrador) o abre su archivo. Solo se importan notas, resúmenes, opciones y decisiones; lo repetido y lo demás se ignora.</p>' +
      '<textarea class="json" id="imp-json" rows="4" aria-label="JSON de otro jugador" placeholder="[ { &quot;tipo&quot;: &quot;apunte&quot;, &quot;autor&quot;: &quot;Ana&quot;, &quot;texto&quot;: &quot;…&quot; } ]"></textarea>' +
      '<div class="acc-fila"><button class="btn prim" type="button" data-accion="importar">Importar</button>' +
      '<label class="btn file">Abrir archivo<input type="file" id="imp-archivo" accept=".json,.txt,application/json,text/plain"></label></div></div>';
    return desplegable('notas', 'Notas y opciones', resumen, cuerpo);
  }

  // ---- página

  function selectorModo() {
    var b = function (valor, texto) {
      return '<button class="btn" type="button" data-accion="modo" data-valor="' + valor + '" aria-pressed="' + (estado.modo === valor) + '">' + texto + '</button>';
    };
    return '<div class="modo" role="group" aria-label="Vista">' + b('jugar', 'Jugar') + b('construir', 'Construir') + '</div>';
  }

  function paginaCompleta(v) {
    var calc = v.calc, calcB = v.calcB, pj = v.pj, borr = v.borr;
    var con = estado.modo === 'construir';
    var sel = '';
    if (estado.ids.length > 1) {
      sel = '<label class="mute" style="font-size:13px">Personaje <select class="btn" id="sel-pj" aria-label="Personaje">' + estado.ids.map(function (id) {
        return '<option value="' + esc(id) + '"' + (id === estado.actual ? ' selected' : '') + '>' + esc(estado.personajes[id].nombre || id) + '</option>';
      }).join('') + '</select></label>';
    }
    var tema = esNoche();
    var avisoBorrador = !con && borr.length
      ? '<div class="avisos borrador-aviso"><b>Hay ' + plural(borr.length, 'entrada', 'entradas') + ' en el borrador sin guardar en el personaje. Cámbiate a «Construir» para verlas o copiarlas.</b></div>'
      : '';
    var porDecidir = calcB.opciones.lista.filter(function (o) { return !o.decision; });
    var avisoOpciones = porDecidir.length
      ? '<div class="avisos suave"><b>' + (porDecidir.length === 1 ? 'Hay una opción por decidir' : 'Hay ' + porDecidir.length + ' opciones por decidir') + ': ' +
        esc(porDecidir.slice(0, 3).map(function (o) { return o.titulo; }).join(', ')) + (porDecidir.length > 3 ? '…' : '') + '.</b>' +
        '<div class="acc-fila"><button class="btn" type="button" data-accion="ver-opciones" data-op="' + esc(porDecidir[0].id) + '">Ver opciones</button></div></div>'
      : '';
    // Todo lo que no es la base, los atributos o el registro de sesiones va plegado.
    // En Jugar, feats, equipo y méritos/defectos son listas a la vista; en Construir se editan dentro de plegables.
    var plegables = '<section class="desp-grupo">' +
      (con ? seccionBorrador(calcB, pj, borr) + seccionNotas(calcB) + seccionFeats(calc, calcB, pj, con) : '') +
      seccionLogros(calc, calcB, con) +
      (con ? seccionEquipo(calc, con) + seccionMeritos(calc, pj, con) + seccionTiradas(calcB, con) : '') +
      seccionSx(calcB, con) + seccionZeo(calcB, con) + seccionMana(calc, calcB, pj, con) + (con ? seccionMagia(calcB) : '') + '</section>';
    return '<div class="page">' +
      '<header class="topbar"><div class="brand"><b>EverwhiteEmperor</b><span class="eyebrow">Visor de personajes</span></div>' +
      '<div class="tools">' + selectorModo() + (pj.datosDeEjemplo ? chip('Datos de ejemplo · personaje inventado', 'gold') : '') + sel +
      '<label class="btn file">Abrir otro personaje (.json)<input type="file" id="archivo" accept="application/json,.json"></label>' +
      '<button class="btn" id="tema" type="button" aria-pressed="' + tema + '">' + (tema ? 'Tema noche' : 'Tema hielo') + '</button></div></header>' +
      '<div id="msg" role="status"></div>' + seccionAvisos(calcB) + seccionFicha(calc, calcB, pj, con) + avisoBorrador + avisoOpciones + (con ? '' : seccionFeatsJuego(calc, calcB) + seccionMagiaJuego(calcB) + '<div class="bloques-juego">' + seccionEquipoJuego(calc) + seccionMeritosJuego(calc) + '</div>') + plegables + seccionSesiones(calc, calcB) +
      '<footer><p class="pie">' + (pj.datosDeEjemplo ? 'Los nombres de raza, méritos, objetos y logros son inventados. ' : '') +
      'Las reglas de Pathfinder 1e se usan bajo la OGL 1.0a; el proyecto es gratuito y no tiene afiliación con Paizo. Los feats se importaron sin su texto: se leen en Archives of Nethys.</p></footer></div>';
  }

  // ----------------------------------------------------------------- arranque

  var LISTAS_CON_SCROLL = ['picker-lista', 'logros-lista'];

  /** Dibuja la página. Con `conservar` se mantiene la posición de la ventana y de los recuadros con scroll. */
  function mostrar(pj, conservar) {
    var y = window.pageYOffset;
    var internos = {};
    if (conservar) {
      LISTAS_CON_SCROLL.forEach(function (id) { var e = document.getElementById(id); if (e) internos[id] = e.scrollTop; });
    }
    var v;
    try {
      var borr = borradorDe(pj);
      var calc = calcular(pj, []);
      v = { pj: pj, borr: borr, calc: calc, calcB: borr.length ? calcular(pj, borr) : calc };
    } catch (err) {
      app.innerHTML = '<div class="page"><section class="aviso-carga"><h2>No se pudo calcular el personaje</h2><p>' + esc(err.message) + '</p></section></div>';
      return;
    }
    estado.vista = v;
    ocultarTip();
    app.innerHTML = paginaCompleta(v);
    document.title = pj.nombre + ' · EverwhiteEmperor';
    conectar();
    if (conservar) {
      LISTAS_CON_SCROLL.forEach(function (id) { var e = document.getElementById(id); if (e && internos[id]) e.scrollTop = internos[id]; });
      window.scrollTo(0, y);
    }
  }

  function avisoMsg(texto) {
    var m = document.getElementById('msg');
    if (m) m.innerHTML = texto ? '<div class="avisos"><b>' + esc(texto) + '</b></div>' : '';
  }

  var temporizadorToast = null;
  /** Mensaje flotante: el usuario suele estar a mitad de una lista, lejos de la cabecera. */
  function toast(texto, mala, conVer) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.setAttribute('role', 'status');
      t.addEventListener('click', function (ev) {
        if (ev.target.closest && ev.target.closest('[data-accion="ver-borrador"]')) verBorrador();
      });
      app.parentNode.appendChild(t);
    }
    t.className = 'toast' + (mala ? ' mala' : '');
    t.innerHTML = '<span>' + esc(texto) + '</span>' + (conVer ? '<button class="btn mini" type="button" data-accion="ver-borrador">Ver borrador</button>' : '');
    t.hidden = false;
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(function () { t.hidden = true; }, 5000);
  }

  function verBorrador() {
    estado.abiertos.borrador = true;
    guardar(CLAVE_ABIERTOS, JSON.stringify(estado.abiertos));
    var t = document.getElementById('toast');
    if (t) t.hidden = true;
    mostrar(pjActual());
    var det = app.querySelector('details[data-id="borrador"]');
    if (det && det.scrollIntoView) det.scrollIntoView({ block: 'start' });
  }

  function refrescarPicker() {
    var v = estado.vista;
    var cont = document.getElementById('picker-wrap');
    if (v && cont) cont.innerHTML = listaPicker(v.calcB, v.pj);
  }

  function refrescarLogros() {
    var v = estado.vista;
    var cont = document.getElementById('logros-wrap');
    if (v && cont) cont.innerHTML = listaLogros(v.calcB);
  }

  /** Redibuja solo HP y MP; `foco` es el selector del botón que debe conservar el foco. */
  function refrescarVitales(foco) {
    var v = estado.vista;
    var cont = document.getElementById('vitales');
    if (!v || !cont) return;
    ocultarTip();
    cont.innerHTML = htmlVitales(v.calcB, v.pj, estado.modo === 'jugar');
    var otra = foco ? cont.querySelector(foco) : null;
    if (otra && !otra.disabled) otra.focus();
  }

  function copiar(texto, area) {
    var respaldo = function () {
      try {
        area.focus();
        area.select();
        return document.execCommand('copy');
      } catch (e) { return false; }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return respaldo(); });
    }
    return Promise.resolve(respaldo());
  }

  /** Suma una entrada al borrador si el motor la acepta; si no, dice por qué. */
  function agregar(entrada, textoOk) {
    var pj = pjActual();
    var nuevo = borradorDe(pj).concat([entrada]);
    var propios = calcular(pj, nuevo).avisos.filter(function (a) { return a.sesion === 'borrador' && a.indice === nuevo.length - 1; });
    if (propios.length) { toast(propios[0].mensaje, true); return false; }
    fijarBorrador(pj, nuevo);
    mostrar(pj, true);
    toast(textoOk, false, true);
    return true;
  }

  function elegirFeat(id) {
    var entrada = { tipo: 'feat', id: id };
    var campo = document.getElementById('el-' + id);
    if (campo && campo.value.trim()) entrada.eleccion = campo.value.trim();
    var cat = estado.indiceFeats[id];
    agregar(entrada, '«' + (cat ? cat.nombre : id) + (entrada.eleccion ? ' (' + entrada.eleccion + ')' : '') + '» agregado al borrador.');
  }

  function asignarLogro(id) {
    var a = estado.indiceLogros[id];
    agregar({ tipo: 'achievement', id: id }, '«' + (a ? a.nombre : id) + '» asignado en el borrador.');
  }

  function tirar(rec, modo) {
    var sel = document.getElementById('tr-' + rec + '-dado');
    var dado = sel ? sel.value : DADO_INICIAL[rec];
    var caras = Number(dado.slice(1));
    var resultado;
    if (modo === 'azar') {
      resultado = 1 + Math.floor(Math.random() * caras);
    } else {
      var campo = document.getElementById('tr-' + rec + '-res');
      resultado = campo ? Number(campo.value) : NaN;
      if (!campo || campo.value === '' || !Number.isInteger(resultado) || resultado < 1 || resultado > caras) {
        toast('El resultado debe ser un entero entre 1 y ' + caras + '.', true);
        return;
      }
    }
    estado.dados[rec] = dado;
    agregar({ tipo: 'tirada', recurso: rec, dado: dado, resultado: resultado }, rec.toUpperCase() + ': ' + dado + ' → ' + resultado + ', agregado al borrador.');
  }

  // ---- notas y opciones: ids, importación e imagen de la sesión

  /** Un id para una oferta de opciones a partir de su título: minúsculas, sin tildes, y distinto de los que ya hay. */
  function idUnicoOpciones(titulo) {
    var base = String(titulo).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'opciones';
    var usados = {};
    estado.vista.calcB.opciones.lista.forEach(function (o) { usados[o.id] = true; });
    var id = base, n = 2;
    while (usados[id]) { id = base + '-' + n; n += 1; }
    return id;
  }

  var TIPOS_IMPORTABLES = ['apunte', 'resumen', 'opciones', 'decision'];

  /**
   * Opción A de 10.6: las notas de otro jugador llegan como el JSON de su borrador. Entran al borrador solo las notas, los resúmenes,
   * las ofertas de opciones y las decisiones; lo repetido (ya en el borrador o ya en el registro) y lo demás se cuenta y se ignora.
   */
  function importarEntradas(texto) {
    var pj = pjActual();
    var datos;
    try { datos = JSON.parse(texto); } catch (err) { toast('Eso no es JSON válido: ' + err.message, true); return; }
    var lista = Array.isArray(datos) ? datos : (datos && Array.isArray(datos.entradas) ? datos.entradas : null);
    if (!lista) { toast('Esperaba una lista de entradas (o un objeto con «entradas»).', true); return; }
    var conocidas = {};
    pj.sesiones.forEach(function (ses) { (ses.entradas || []).forEach(function (e) { conocidas[JSON.stringify(e)] = true; }); });
    borradorDe(pj).forEach(function (e) { conocidas[JSON.stringify(e)] = true; });
    var nuevas = [], ignoradas = 0, repetidas = 0;
    lista.forEach(function (e) {
      if (!entradaValida(e) || TIPOS_IMPORTABLES.indexOf(e.tipo) < 0) { ignoradas += 1; return; }
      var k = JSON.stringify(e);
      if (conocidas[k]) { repetidas += 1; return; }
      conocidas[k] = true;
      nuevas.push(e);
    });
    if (nuevas.length) {
      fijarBorrador(pj, borradorDe(pj).concat(nuevas));
      mostrar(pj, true);
    }
    var partes = [];
    if (repetidas) partes.push(plural(repetidas, 'repetida', 'repetidas'));
    if (ignoradas) partes.push(plural(ignoradas, 'ignorada', 'ignoradas'));
    toast((nuevas.length ? 'Importadas ' + plural(nuevas.length, 'entrada', 'entradas') : 'No se importó nada') + (partes.length ? ' (' + partes.join(', ') + ')' : '') + '.', !nuevas.length, !!nuevas.length);
  }

  /** La imagen general de una sesión elegida como archivo: se reduce para que la entrada no pese demasiado. */
  function procesarImagenSesion(file) {
    var lector = new FileReader();
    lector.onload = function () {
      var img = new Image();
      img.onload = function () {
        var W = Math.min(720, img.width), H = Math.round(img.height * (W / img.width));
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        c.getContext('2d').drawImage(img, 0, 0, W, H);
        estado.imagenSesion = c.toDataURL('image/jpeg', 0.78);
        var m = document.getElementById('rs-img-msg');
        if (m) m.textContent = 'Imagen lista (' + Math.round(estado.imagenSesion.length / 1024) + ' KB). Pulsa Agregar.';
      };
      img.onerror = function () { toast('No se pudo leer esa imagen.', true); };
      img.src = lector.result;
    };
    lector.onerror = function () { toast('No se pudo leer ' + file.name + '.', true); };
    lector.readAsDataURL(file);
  }

  // ---- retrato local

  function fijarRetrato(pj, data) {
    var id = idPj(pj);
    estado.retratos[id] = data;
    if (data) guardar('ewe-retrato-' + id, data);
    else { try { localStorage.removeItem('ewe-retrato-' + id); } catch (e) { /* sin almacenamiento */ } }
    mostrar(pj, true);
  }

  /** Recorta al formato del marco (4:5) y reduce, para que quepa en el almacenamiento del navegador. */
  function procesarRetrato(file) {
    var pj = pjActual();
    var lector = new FileReader();
    lector.onload = function () {
      var img = new Image();
      img.onload = function () {
        var W = 320, H = 400;
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var g = c.getContext('2d');
        var r = Math.max(W / img.width, H / img.height);
        var w = img.width * r, h = img.height * r;
        g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        fijarRetrato(pj, c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { toast('No se pudo leer esa imagen.', true); };
      img.src = lector.result;
    };
    lector.onerror = function () { toast('No se pudo leer ' + file.name + '.', true); };
    lector.readAsDataURL(file);
  }

  /** Un descanso (corto o largo): recupera HP y MP a la vez con la tasa de cada uno. */
  function descansar(id) {
    var v = estado.vista, pj = pjActual(), cfg = estado.ctx.vitalidad;
    var d = cfg.descanso;
    var x = d[id];
    if (!x) return;
    var partes = [];
    ['hp', 'mp'].forEach(function (rec) {
      var max = v.calcB.recursos[rec].maximo;
      var bono = Core.modAtributo(valorAtributo(v.calcB, d.recursos[rec].atributo));
      var antes = valorActual(pj, rec, max);
      var res = Core.descansar(antes, max, x, bono, cfg, rec);
      if (res.recuperado > 0) {
        fijarActual(pj, rec, res.valor, max);
        partes.push(rec.toUpperCase() + ' +' + res.recuperado + ' (de ' + conSigno(antes) + ' a ' + conSigno(res.valor) + ')');
      }
    });
    refrescarVitales('[data-accion="descansar"][data-id="' + id + '"]');
    toast(x.nombre + ' (' + x.horas + ' h' + (x.extra ? ', +' + Math.round(x.extra * 100) + ' %' : '') + '): ' + (partes.length ? partes.join(' · ') : 'ya estaba todo al máximo') + '.');
  }

  /** El valor entero de un campo numérico, o null si está vacío o no es entero. */
  function enteroDe(id) {
    var c = document.getElementById(id);
    var v = c && c.value !== '' ? Number(c.value) : NaN;
    return Number.isInteger(v) ? v : null;
  }

  function accion(boton) {
    var a = boton.getAttribute('data-accion');
    var pj = pjActual();
    if (a === 'modo') {
      estado.modo = boton.getAttribute('data-valor') === 'jugar' ? 'jugar' : 'construir';
      guardar('ewe-modo', estado.modo);
      mostrar(pj);
    } else if (a === 'elegir') {
      elegirFeat(boton.getAttribute('data-id'));
    } else if (a === 'asignar-logro') {
      asignarLogro(boton.getAttribute('data-id'));
    } else if (a === 'tirar') {
      tirar(boton.getAttribute('data-recurso'), 'azar');
    } else if (a === 'registrar-tirada') {
      tirar(boton.getAttribute('data-recurso'), 'manual');
    } else if (a === 'rec') {
      var rec = boton.getAttribute('data-recurso');
      var delta = boton.getAttribute('data-delta');
      var max = estado.vista.calcB.recursos[rec].maximo;
      var actual = valorActual(pj, rec, max);
      fijarActual(pj, rec, delta === 'max' ? max : Math.max(minimoVital(rec, max), Math.min(max, actual + Number(delta))), max);
      refrescarVitales('[data-accion="rec"][data-recurso="' + rec + '"][data-delta="' + delta + '"]');
    } else if (a === 'descansar') {
      descansar(boton.getAttribute('data-id'));
    } else if (a === 'inscribir') {
      var slot = boton.getAttribute('data-slot');
      var sel = document.getElementById('insc-' + slot);
      if (!sel || !sel.value) { toast('Elige lo que quieres inscribir.', true); return; }
      var esTecnica = sel.value.slice(0, 2) === 't:';
      var idIns = sel.value.slice(2);
      var hab = esTecnica ? estado.vista.calcB.mana.tecnicas.filter(function (t) { return t.id === idIns; })[0] : estado.indiceFeats[idIns];
      agregar(esTecnica ? { tipo: 'inscribir', slot: slot, tecnica: idIns } : { tipo: 'inscribir', slot: slot, habilidad: idIns },
        '«' + (hab ? hab.nombre : idIns) + '» inscrita en ' + slot + ' (borrador).');
    } else if (a === 'desinscribir') {
      var slotD = boton.getAttribute('data-slot');
      agregar({ tipo: 'desinscribir', slot: slotD }, 'Se quitará la habilidad de ' + slotD + ' (borrador).');
    } else if (a === 'zeo-linea-nueva') {
      var zeoV = estado.vista.calcB.zeo;
      var zlT = document.getElementById('zl-t').value;
      var zlNom = (document.getElementById('zl-nombre').value || '').trim();
      var zlOri = (document.getElementById('zl-origen').value || '').trim();
      var zlDesc = (document.getElementById('zl-desc').value || '').trim();
      var zlRama = document.getElementById('zl-rama').value;
      var zlRef = zlT ? zeoV.catalogo.filter(function (c) { return c.id === zlT; })[0] : null;
      if (!zlRef && !zlNom) { toast('Elige una técnica del catálogo o escribe el nombre de una propia.', true); return; }
      var zlLinea = zeoV.slots.primeraLibre || zeoV.extras.proxima;
      var zlE = { tipo: 'zeo-tecnica', linea: zlLinea, nivel: 1, tecnica: zlRef ? zlRef.id : zlNom };
      if (document.getElementById('zl-pa').checked) zlE.activa = false;
      if (zlOri) zlE.origen = zlOri;
      if (!zlRef && zlRama) zlE.rama = zlRama;
      if (zlDesc) zlE.descripcion = zlDesc;
      agregar(zlE, 'Línea ' + zlLinea + ' (' + (zlRef ? zlRef.nombre : zlNom) + ') agregada al borrador.');
    } else if (a === 'zeo-activar') {
      var zaL = boton.getAttribute('data-linea');
      agregar({ tipo: 'zeo-activar', linea: zaL }, zaL + ' se activará (' + estado.vista.calcB.zeo.costoActivar + ' sx) en el borrador.');
    } else if (a === 'zeo-mejora') {
      var zmP = (document.getElementById('zm-t').value || '').split('|');
      if (zmP.length !== 3) { toast('Elige una mejora del catálogo.', true); return; }
      agregar({ tipo: 'zeo-tecnica', linea: zmP[0], nivel: Number(zmP[1]), tecnica: zmP[2] },
        'Mejora de ' + zmP[0] + ' (nivel ' + zmP[1] + ') agregada al borrador.');
    } else if (a === 'zeo-tecnica') {
      var ztL = document.getElementById('zt-l').value;
      var ztN = Number(document.getElementById('zt-n').value);
      var ztNom = (document.getElementById('zt-nombre').value || '').trim();
      var ztDesc = (document.getElementById('zt-desc').value || '').trim();
      var ztOri = (document.getElementById('zt-origen').value || '').trim();
      if (!ztNom) { toast('Escribe el nombre de la técnica, o elige una mejora del catálogo.', true); return; }
      var ztE = { tipo: 'zeo-tecnica', linea: ztL, nivel: ztN, tecnica: ztNom };
      if (ztDesc) ztE.descripcion = ztDesc;
      if (ztOri) ztE.origen = ztOri;
      agregar(ztE, 'Técnica de ' + ztL + ' (nivel ' + ztN + ', ' + ztNom + ') agregada al borrador.');
    } else if (a === 'cj-manual') {
      var cjQ = (document.getElementById('cj-q').value || '').trim().toLowerCase();
      var cjRef = estado.ctx.catalogoConjuros.filter(function (c) { return c.nombre.toLowerCase() === cjQ || c.id === cjQ; })[0];
      if (!cjRef) { toast(cjQ ? 'No hay un conjuro del manual con ese nombre.' : 'Escribe el nombre del conjuro y elígelo de la lista.', true); return; }
      var cjNv = document.getElementById('cj-n').value;
      var cjE = { tipo: 'conjuro', id: cjRef.id };
      if (cjNv !== '') cjE.nivel = Number(cjNv);
      agregar(cjE, cjRef.nombre + ' agregado al borrador.');
    } else if (a === 'cj-crear') {
      var cjNom = (document.getElementById('cj-nombre').value || '').trim();
      if (!cjNom) { toast('Escribe el nombre del conjuro.', true); return; }
      var cjNivel = document.getElementById('cj-nivel').value;
      if (cjNivel === '') { toast('Un conjuro propio necesita nivel (0 a 9).', true); return; }
      var cjP = { tipo: 'conjuro', nombre: cjNom, nivel: Number(cjNivel) };
      [['descripcion', 'cj-desc'], ['escuela', 'cj-escuela'], ['tiempo', 'cj-tiempo'], ['alcance', 'cj-alcance'],
        ['duracion', 'cj-duracion'], ['salvacion', 'cj-salv']].forEach(function (par) {
        var v = (document.getElementById(par[1]).value || '').trim();
        if (v) cjP[par[0]] = v;
      });
      agregar(cjP, cjNom + ' agregado al borrador.');
    } else if (a === 'tm-crear') {
      var tmNom = (document.getElementById('tm-nombre').value || '').trim();
      if (!tmNom) { toast('Escribe el nombre de la técnica.', true); return; }
      var tmE = { tipo: 'mana-tecnica', nombre: tmNom, nivel: Number(document.getElementById('tm-n').value) };
      if (document.getElementById('tm-t').value === 'activa') tmE.categoria = 'activa';
      [['costo', 'tm-costo'], ['descripcion', 'tm-desc']].forEach(function (par) {
        var v = (document.getElementById(par[1]).value || '').trim();
        if (v) tmE[par[0]] = v;
      });
      var tmCsx = document.getElementById('tm-csx').value;
      if (tmCsx !== '' && Number(tmCsx) > 0) tmE.costoSx = Number(tmCsx);
      agregar(tmE, 'Técnica «' + tmNom + '» agregada al borrador.');
    } else if (a === 'tm-sx') {
      var tmId = boton.getAttribute('data-id');
      var tmSxN = enteroDe('tm-sx-' + tmId);
      if (!tmSxN || tmSxN < 1) { toast('Escribe cuántos SX se suman: un entero positivo.', true); return; }
      agregar({ tipo: 'mana-tecnica-sx', id: tmId, cantidad: tmSxN }, 'SX +' + tmSxN + ' al contenedor (borrador).');
    } else if (a === 'mf-agregar') {
      var mfN = enteroDe('mf-n');
      if (!mfN) { toast('Escribe cuánta Mana force gana (+) o pierde (−): un entero distinto de 0.', true); return; }
      var mfNota = (document.getElementById('mf-nota').value || '').trim();
      var mfPorNivel = document.getElementById('mf-pn').checked;
      if (mfPorNivel && mfN < 1) { toast('Una Mana force por nivel es un entero positivo.', true); return; }
      var mfE = { tipo: 'mana-fuerza', fuente: document.getElementById('mf-f').value };
      mfE[mfPorNivel ? 'porNivel' : 'cantidad'] = mfN;
      if (mfNota) mfE.nota = mfNota;
      agregar(mfE, 'Mana force ' + deltaTxt(mfN) + (mfPorNivel ? ' por nivel' : '') + ' agregada al borrador.');
    } else if (a === 'gate-agregar') {
      var gtOp = (document.getElementById('gt-op').value || '').trim();
      var gtId = boton.getAttribute('data-id');
      var gtTag = document.getElementById('gt-tag').value;
      var gtFn = document.getElementById('gt-fn').value;
      var gtE = { tipo: 'gate', id: gtId, tag: gtTag };
      if (gtFn) gtE.funcion = gtFn;
      if (gtOp) gtE.oportunidad = gtOp;
      agregar(gtE, 'Gate ' + gtId + ' (' + nombreTagMana(gtTag) + ') agregado al borrador.');
    } else if (a === 'sx-ganar') {
      var gN = enteroDe('sx-gan-n');
      if (!gN || gN < 1) { toast('Escribe cuánto SX se ganó: un entero positivo.', true); return; }
      var gD = document.getElementById('sx-gan-d').value;
      if (gD === 'reserva') agregar({ tipo: 'sx', cantidad: gN }, 'SX +' + gN + ' a la reserva (borrador).');
      else {
        var gP = gD.split(':');
        var gE = { tipo: 'xp-subsistema', subsistema: gP[0], cantidad: gN };
        if (gP[0] === 'zeo') gE.rama = gP[1];
        agregar(gE, 'SX +' + gN + ' → ' + destinoSx(gP[0], gP[1]) + ' (borrador).');
      }
    } else if (a === 'sx-asignar') {
      var aN = enteroDe('sx-asi-n');
      if (!aN || aN < 1) { toast('Escribe cuánto SX asignar: un entero positivo.', true); return; }
      var aP = document.getElementById('sx-asi-d').value.split(':');
      var aE = { tipo: 'sx-asignar', subsistema: aP[0], cantidad: aN };
      if (aP[0] === 'zeo') aE.rama = aP[1];
      agregar(aE, aN + ' SX asignados a ' + destinoSx(aP[0], aP[1]) + ' (borrador).');
    } else if (a === 'ap-agregar') {
      var apAutor = (document.getElementById('ap-autor').value || '').trim();
      var apTexto = (document.getElementById('ap-texto').value || '').trim();
      var apRol = document.getElementById('ap-rol').value === 'gm' ? 'gm' : 'jugador';
      var apSes = document.getElementById('ap-ses').value;
      if (!apAutor) { toast('Escribe quién es el autor de la nota.', true); return; }
      if (!apTexto) { toast('Escribe la nota.', true); return; }
      guardar('ewe-autor', apAutor);
      guardar('ewe-rol', apRol);
      var apE = { tipo: 'apunte', autor: apAutor, rol: apRol, texto: apTexto };
      if (apSes) apE.sesion = apSes;
      agregar(apE, 'Nota de ' + apAutor + ' agregada al borrador.');
    } else if (a === 'rs-agregar') {
      var rsTexto = (document.getElementById('rs-texto').value || '').trim();
      var rsImg = estado.imagenSesion || (document.getElementById('rs-img').value || '').trim();
      var rsSes = document.getElementById('rs-ses').value;
      if (!rsTexto && !rsImg) { toast('Escribe el resumen o elige una imagen.', true); return; }
      var rsE = { tipo: 'resumen' };
      if (rsTexto) rsE.texto = rsTexto;
      if (rsImg) rsE.imagen = rsImg;
      if (rsSes) rsE.sesion = rsSes;
      if (agregar(rsE, 'Resumen de la sesión agregado al borrador.')) estado.imagenSesion = '';
    } else if (a === 'op-agregar') {
      var opTitulo = (document.getElementById('op-titulo').value || '').trim();
      var opLineas = (document.getElementById('op-lista').value || '').split('\n').map(function (t) { return t.trim(); }).filter(Boolean);
      if (!opTitulo) { toast('Escribe el título de las opciones.', true); return; }
      if (opLineas.length < 2) { toast('Escribe al menos dos opciones, una por línea.', true); return; }
      var opE = {
        tipo: 'opciones', id: idUnicoOpciones(opTitulo), titulo: opTitulo, alcance: document.getElementById('op-alcance').value === 'grupo' ? 'grupo' : 'individual',
        opciones: opLineas.map(function (t, i) { return { id: i < 26 ? String.fromCharCode(97 + i) : 'o' + (i + 1), texto: t }; }),
      };
      var opElige = enteroDe('op-elige');
      if (opElige && opElige > 1) opE.elige = opElige;
      var opTexto = (document.getElementById('op-texto').value || '').trim();
      if (opTexto) opE.texto = opTexto;
      var opSes = document.getElementById('op-ses').value;
      if (opSes) opE.sesion = opSes;
      agregar(opE, 'Opciones «' + opTitulo + '» agregadas al borrador.');
    } else if (a === 'decidir') {
      agregar({ tipo: 'decision', opciones: boton.getAttribute('data-op'), elegidas: [boton.getAttribute('data-o')] }, 'Decisión anotada en el borrador.');
    } else if (a === 'decidir-multi') {
      var dmOp = boton.getAttribute('data-op');
      var dmEleg = [];
      Array.prototype.forEach.call(app.querySelectorAll('input.op-chk'), function (el) {
        if (el.checked && el.getAttribute('data-op') === dmOp) dmEleg.push(el.value);
      });
      agregar({ tipo: 'decision', opciones: dmOp, elegidas: dmEleg }, 'Decisión anotada en el borrador.');
    } else if (a === 'ver-opciones') {
      var voId = boton.getAttribute('data-op');
      var voOf = estado.vista.calcB.opciones.lista.filter(function (o) { return o.id === voId; })[0];
      if (voOf) {
        estado.abiertos['ses-' + voOf.sesion + '-opc'] = true;
        guardar(CLAVE_ABIERTOS, JSON.stringify(estado.abiertos));
        mostrar(pj, true);
        var voEl = document.getElementById('op-' + voId);
        if (voEl && voEl.scrollIntoView) voEl.scrollIntoView({ block: 'center' });
      }
    } else if (a === 'importar') {
      importarEntradas(document.getElementById('imp-json').value || '');
    } else if (a === 'descargar') {
      var dsArea = document.getElementById('pk-json');
      var dsMsg = document.getElementById('pk-msg');
      try {
        var dsUrl = URL.createObjectURL(new Blob([dsArea.value], { type: 'application/json' }));
        var dsA = document.createElement('a');
        dsA.href = dsUrl;
        dsA.download = 'borrador-' + idPj(pj) + '.json';
        document.body.appendChild(dsA);
        dsA.click();
        document.body.removeChild(dsA);
        setTimeout(function () { URL.revokeObjectURL(dsUrl); }, 1000);
        if (dsMsg) dsMsg.textContent = 'Descargado.';
      } catch (err) {
        if (dsMsg) dsMsg.textContent = 'No se pudo descargar desde aquí: usa «Copiar JSON».';
      }
    } else if (a === 'quitar') {
      var borr = borradorDe(pj).slice();
      borr.splice(Number(boton.getAttribute('data-indice')), 1);
      fijarBorrador(pj, borr);
      mostrar(pj, true);
    } else if (a === 'vaciar') {
      fijarBorrador(pj, []);
      mostrar(pj, true);
    } else if (a === 'mas') {
      estado.picker.max += 40;
      var caja = document.getElementById('picker-lista');
      var arriba = caja ? caja.scrollTop : 0;
      refrescarPicker();
      caja = document.getElementById('picker-lista');
      if (caja) caja.scrollTop = arriba;
    } else if (a === 'quitar-retrato') {
      fijarRetrato(pj, '');
    } else if (a === 'ver-borrador') {
      verBorrador();
    } else if (a === 'copiar') {
      var area = document.getElementById('pk-json');
      copiar(area.value, area).then(function (ok) {
        var m = document.getElementById('pk-msg');
        if (m) m.textContent = ok ? 'Copiado.' : 'No se pudo copiar solo: el texto quedó seleccionado, cópialo con Ctrl+C.';
        if (!ok && area) { area.focus(); area.select(); }
      });
    }
  }

  function conectar() {
    var btn = document.getElementById('tema');
    if (btn) btn.addEventListener('click', function () {
      var noche = !esNoche();
      aplicarTema(noche);
      btn.setAttribute('aria-pressed', String(noche));
      btn.textContent = noche ? 'Tema noche' : 'Tema hielo';
    });
    var sel = document.getElementById('sel-pj');
    if (sel) sel.addEventListener('change', function () {
      estado.actual = sel.value;
      mostrar(estado.personajes[estado.actual]);
    });
    Array.prototype.forEach.call(app.querySelectorAll('details.desp, details.zlinea, details.ses-det'), function (d) {
      d.addEventListener('toggle', function () {
        estado.abiertos[d.getAttribute('data-id')] = d.open;
        guardar(CLAVE_ABIERTOS, JSON.stringify(estado.abiertos));
      });
    });
    var arch = document.getElementById('archivo');
    if (arch) arch.addEventListener('change', function () {
      var file = arch.files && arch.files[0];
      if (!file) return;
      var lector = new FileReader();
      lector.onload = function () {
        try {
          var pj = JSON.parse(lector.result);
          if (!pj || !Array.isArray(pj.sesiones) || !pj.atributos) throw new Error('El archivo no parece un personaje: faltan "sesiones" o "atributos".');
          estado.personajes['(archivo)'] = pj;
          if (estado.ids.indexOf('(archivo)') < 0) estado.ids.push('(archivo)');
          estado.actual = '(archivo)';
          pedirClase(pj.clase, estado.ctx.clasesDetalle).then(function () { mostrar(pj); });
        } catch (err) {
          avisoMsg('No se pudo abrir ' + file.name + ': ' + err.message);
        }
      };
      lector.onerror = function () { avisoMsg('No se pudo leer ' + file.name + '.'); };
      lector.readAsText(file);
    });
  }

  // ---- tooltips: un solo cuadro flotante para todos los [data-tip]; sale con el cursor, el teclado y el toque

  var tipOrigen = null;
  function cuadroTip() {
    var t = document.getElementById('tooltip');
    if (!t) {
      t = document.createElement('div');
      t.id = 'tooltip';
      t.setAttribute('role', 'tooltip');
      t.hidden = true;
      app.parentNode.appendChild(t);
    }
    return t;
  }
  function ocultarTip() {
    var t = document.getElementById('tooltip');
    if (t) t.hidden = true;
    if (tipOrigen && tipOrigen.removeAttribute) tipOrigen.removeAttribute('aria-describedby');
    tipOrigen = null;
  }
  function mostrarTip(el) {
    var texto = el.getAttribute('data-tip');
    if (!texto) return;
    if (tipOrigen && tipOrigen !== el && tipOrigen.removeAttribute) tipOrigen.removeAttribute('aria-describedby');
    var t = cuadroTip();
    t.textContent = texto;
    t.hidden = false;
    var r = el.getBoundingClientRect();
    var ancho = t.offsetWidth, alto = t.offsetHeight;
    var x = Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8));
    var y = r.bottom + 6;
    if (y + alto > window.innerHeight - 8) y = Math.max(8, r.top - alto - 6);
    t.style.left = x + 'px';
    t.style.top = y + 'px';
    el.setAttribute('aria-describedby', 'tooltip');
    tipOrigen = el;
  }
  function conTip(ev) { return ev.target && ev.target.closest ? ev.target.closest('[data-tip]') : null; }
  app.addEventListener('mouseover', function (ev) { var el = conTip(ev); if (el) mostrarTip(el); });
  app.addEventListener('mouseout', function (ev) {
    var el = conTip(ev);
    if (el && !(ev.relatedTarget && el.contains(ev.relatedTarget))) ocultarTip();
  });
  app.addEventListener('focusin', function (ev) { var el = conTip(ev); if (el) mostrarTip(el); });
  app.addEventListener('focusout', function (ev) { if (conTip(ev)) ocultarTip(); });
  document.addEventListener('click', function (ev) {
    var el = conTip(ev);
    if (el && app.contains(el)) mostrarTip(el); else ocultarTip();
  });
  // Al desplazar la página el tooltip sigue a su elemento; si este sale de la pantalla, se cierra.
  window.addEventListener('scroll', function () {
    if (!tipOrigen) return;
    var r = tipOrigen.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) ocultarTip(); else mostrarTip(tipOrigen);
  }, { passive: true });

  // Los clics y los filtros se atienden una sola vez, en #app, porque la página se redibuja entera.
  app.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-accion]') : null;
    if (b && !b.disabled) accion(b);
  });
  app.addEventListener('input', function (ev) {
    if (ev.target.id === 'pk-q') {
      estado.picker.q = ev.target.value;
      estado.picker.max = 40;
      refrescarPicker();
    } else if (ev.target.id === 'lg-q') {
      estado.logrosQ = ev.target.value;
      refrescarLogros();
    }
  });
  app.addEventListener('change', function (ev) {
    var id = ev.target.id;
    if (id === 'pk-tipo') estado.picker.tipo = ev.target.value;
    else if (id === 'pk-disp') estado.picker.soloDisp = ev.target.checked;
    else if (/^tr-(hp|mp)-dado$/.test(id)) { estado.dados[id.split('-')[1]] = ev.target.value; return; }
    else if (id === 'retrato-archivo') {
      var file = ev.target.files && ev.target.files[0];
      if (file) procesarRetrato(file);
      return;
    } else if (id === 'rs-archivo') {
      var fImg = ev.target.files && ev.target.files[0];
      if (fImg) procesarImagenSesion(fImg);
      return;
    } else if (id === 'imp-archivo') {
      var fImp = ev.target.files && ev.target.files[0];
      if (fImp) {
        var lImp = new FileReader();
        lImp.onload = function () { importarEntradas(String(lImp.result)); };
        lImp.onerror = function () { toast('No se pudo leer ' + fImp.name + '.', true); };
        lImp.readAsText(fImp);
      }
      return;
    } else return;
    estado.picker.max = 40;
    refrescarPicker();
  });
  app.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') ocultarTip();
    var m = /^tr-(hp|mp)-res$/.exec(ev.target.id || '');
    if (m && ev.key === 'Enter') { ev.preventDefault(); tirar(m[1], 'manual'); }
  });

  function esNoche() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function aplicarTema(noche) {
    document.documentElement.setAttribute('data-theme', noche ? 'dark' : 'light');
    guardar('ewe-tema', noche ? 'noche' : 'hielo');
  }

  var guardado = leerGuardado('ewe-tema');
  if (guardado) aplicarTema(guardado === 'noche');

  cargarDatos().then(function (d) {
    estado.ctx = d.ctx;
    estado.ctx.feats.forEach(function (ft) { estado.indiceFeats[ft.id] = ft; });
    estado.ctx.achievements.forEach(function (a) { estado.indiceLogros[a.id] = a; });
    estado.personajes = d.personajes;
    estado.ids = Object.keys(d.personajes);
    var pedido = new URLSearchParams(location.search).get('pj');
    estado.actual = estado.ids.indexOf(pedido) >= 0 ? pedido : estado.ids[0];
    mostrar(estado.personajes[estado.actual]);
  }).catch(function (err) {
    app.innerHTML = '<div class="page"><section class="aviso-carga"><h2>No se pudieron leer los datos</h2>' +
      '<p>' + esc(err.message) + '</p><p class="mute">El visor lee los archivos de <code>data/</code> y <code>characters/</code> con <code>fetch</code>, que no funciona al abrir el archivo con doble clic. ' +
      'Sírvelo desde la raíz del repo (por ejemplo <code>python3 -m http.server</code> y abre <code>/viewer/</code>) o desde GitHub Pages.</p></section></div>';
  });
})();
