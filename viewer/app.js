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
        return { ctx: Core.armarContexto(raw), personajes: personajes };
      });
    });
  }

  // ----------------------------------------------------------------------- estado

  var estado = {
    ctx: null, indiceFeats: {}, personajes: {}, ids: [], actual: null,
    modo: leerGuardado('ewe-modo') === 'jugar' ? 'jugar' : 'construir',
    abiertos: leerJsonGuardado(CLAVE_ABIERTOS, {}),
    picker: { q: '', tipo: 'todos', soloDisp: true, max: 40 },
    logrosQ: '', indiceLogros: {}, dados: {},
    actuales: {}, retratos: {},
    borradores: {},
    vista: null,
  };

  function pjActual() { return estado.personajes[estado.actual]; }
  function claveBorrador(pj) { return 'ewe-borrador-' + (pj.personaje || estado.actual); }

  function entradaValida(e) {
    if (!e || typeof e !== 'object') return false;
    if (e.tipo === 'feat' || e.tipo === 'achievement') return typeof e.id === 'string';
    if (e.tipo === 'tirada') return (e.recurso === 'hp' || e.recurso === 'mp') && typeof e.dado === 'string' && typeof e.resultado === 'number';
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
  function valorActual(pj, rec, max) {
    var v = actualesDe(pj)[rec];
    return typeof v === 'number' ? Math.max(0, Math.min(max, Math.round(v))) : max;
  }
  function fijarActual(pj, rec, valor, max) {
    var a = actualesDe(pj);
    if (valor >= max) delete a[rec]; else a[rec] = valor;
    guardar('ewe-actual-' + idPj(pj), JSON.stringify(a));
  }

  function htmlVital(rec, etiqueta, r, pj) {
    var max = r.maximo;
    var act = valorActual(pj, rec, max);
    var ancho = max > 0 ? Math.round(act / max * 100) : 0;
    var btn = function (delta, texto, accesible) {
      return '<button class="btn mini" type="button" data-accion="rec" data-recurso="' + rec + '" data-delta="' + delta + '" aria-label="' + accesible + '">' + texto + '</button>';
    };
    return '<div class="vital ' + rec + '"><div class="vital-top"><span><b>' + etiqueta + '</b> <span class="mute">dado + ' + r.atributo + ' ' + r.valor + ' (' + signo(r.mod) + ')</span></span>' +
      '<span class="vital-num num" aria-live="polite"><b>' + act + '</b> / ' + max + '</span></div>' +
      '<div class="bar" role="progressbar" aria-label="' + etiqueta + ' actuales" aria-valuemin="0" aria-valuemax="' + max + '" aria-valuenow="' + act + '"><i style="width:' + ancho + '%"></i></div>' +
      '<div class="vital-ctl">' + btn(-5, '−5', 'Restar 5 de ' + etiqueta) + btn(-1, '−1', 'Restar 1 de ' + etiqueta) + btn(1, '+1', 'Sumar 1 a ' + etiqueta) + btn(5, '+5', 'Sumar 5 a ' + etiqueta) +
      btn('max', 'Máx', 'Llevar ' + etiqueta + ' al máximo') + '</div>' +
      (r.pendientes.length ? '<span class="chip warn">Faltan tiradas: ' + (r.pendientes.length === 1 ? 'nivel ' : 'niveles ') + esc(r.pendientes.join(', ')) + '</span>' : '') + '</div>';
  }

  function htmlVitales(calcB, pj) {
    var hayBorrador = calcB.sesiones.some(function (s) { return s.id === 'borrador' && s.tiradas.length; });
    return htmlVital('hp', 'HP', calcB.recursos.hp, pj) + htmlVital('mp', 'MP', calcB.recursos.mp, pj) +
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
      '<div class="ficha-nombre"><h1>' + esc(pj.nombre) + '</h1><p class="mute">' + esc(calc.personaje.claseNombre) + ' · ' + esc(calc.personaje.razaNombre) + ' · ' +
      plural(Math.max(0, calc.sesiones.length - 1), 'sesión registrada', 'sesiones registradas') + '</p></div>' +
      '<div class="ficha-nivel"><div class="nivel-num chico"><span class="eyebrow">Nivel</span><b>' + n.nivel + '</b></div>' +
      '<div class="xp-block"><div class="row-between"><span class="xp-big num">' + f(calc.xp) + ' <small>XP</small></span>' +
      '<span class="mute num" style="font-size:13px">Nivel ' + n.nivel + ': ' + f(n.inicio) + ' – ' + f(n.fin) + '</span></div>' +
      barraXp(calc) + '<span style="font-size:14px">' + textoProgreso(calc) + '</span></div></div>' +
      '<div class="vitales" id="vitales">' + htmlVitales(calcB, pj) + '</div></div>' +
      bloqueAtributos(calc) + perfilTexto + '</section>';
  }

  // ---- subsistemas plegables: zeo, mana y magia

  function seccionZeo(calc) {
    var z = calc.zeo;
    var limitan = z.ramas.filter(function (r) { return r.limita; });
    var nivelesTxt = z.ramas.map(function (r) { return r.nivel; }).join(', ');
    var lectura = z.lectura === 'costo-por-nivel' ? 'costo por nivel' : 'umbral acumulado';
    var resumenTxt = limitan.length === z.ramas.length
      ? 'Las tres ramas están en el mismo nivel.'
      : 'Hoy lo limita ' + limitan.map(function (r) { return Core.rotulo(r.rama); }).join(' y ') + ': con ' + f(limitan[0].falta) + ' sx más en esa rama el nivel de la rama sube a ' + (limitan[0].nivel + 1) + '.';
    var ramas = z.ramas.map(function (r) {
      var segs = r.segs.map(function (s) {
        return '<div class="seg" style="flex:' + s.ancho + ' 1 0px"><div class="bar"><i style="width:' + (s.llenado * 100).toFixed(1) + '%"></i></div><span class="num">' + s.fin + '</span></div>';
      }).join('');
      return '<div class="inner" style="--rc:var(--' + esc(r.rama) + ', var(--acc));display:flex;flex-direction:column;gap:14px;padding:20px">' +
        '<div class="rama-top"><div class="rama-nombre"><i aria-hidden="true"></i><h3>' + esc(Core.rotulo(r.rama)) + '</h3></div><span class="chip">Nivel ' + r.nivel + '</span></div>' +
        '<div class="sx num"><b>' + f(r.sx) + '</b><span class="mute">' + esc(z.unidad) + '</span></div>' +
        '<div class="segs">' + segs + '</div>' +
        '<div class="row-between" style="align-items:center"><span style="font-size:14px">' +
        (r.sx >= r.fin ? 'Rama completa' : 'Faltan ' + f(r.falta) + ' ' + esc(z.unidad) + ' para el nivel ' + (r.nivel + 1)) + '</span>' +
        (r.limita && limitan.length < z.ramas.length ? '<span class="chip acc">Limita el nivel zeo</span>' : '') + '</div></div>';
    }).join('');
    var lineas = z.lineas.map(function (l) {
      var pips = '';
      for (var i = 1; i <= l.pisosMax; i++) pips += '<i class="' + (i <= l.pisosAbiertos ? '' : 'cerrado') + '"></i>';
      var marcas = l.marcas.filter(function (m) { return m < 1; }).map(function (m) { return '<s style="left:' + (m * 100) + '%"></s>'; }).join('');
      var texto = 'Pisos 1 a ' + l.pisosAbiertos + ' abiertos' + (l.siguiente ? ' · piso ' + l.siguiente.piso + ' en ' + plural(l.siguiente.falta, 'nivel', 'niveles') : ' · todos los pisos abiertos');
      return '<div class="linea"><div class="row-between" style="align-items:baseline;gap:8px"><span class="id">' + esc(l.id) + '</span>' +
        '<span class="mute num" style="font-size:13px"><strong>' + l.niveles + '</strong> niveles</span></div>' +
        '<div class="pips" aria-hidden="true">' + pips + '</div>' +
        '<div class="mini" aria-hidden="true"><i style="width:' + (l.llenado * 100).toFixed(1) + '%"></i>' + marcas + '</div>' +
        '<span class="mute" style="font-size:13px">' + texto + '</span></div>';
    }).join('');
    var cuerpo = '<div class="zeo-head"><p class="sub" style="flex:1 1 360px;min-width:0">El nivel zeo es el menor de las tres ramas. ' + resumenTxt +
      ' Tabla de ' + esc(z.unidad) + ' por nivel: ' + z.niveles.join(' · ') + ' (lectura: ' + lectura + ', por confirmar).</p>' +
      '<div class="zeo-nivel"><div style="display:flex;flex-direction:column"><span class="eyebrow">Nivel zeo</span><span class="mute num" style="font-size:13px">= mín(' + nivelesTxt + ')</span></div><b>' + z.nivel + '</b></div></div>' +
      '<div class="grid g300">' + ramas + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:14px"><div style="display:flex;flex-direction:column;gap:4px"><h3 style="font-size:20px">Líneas de técnica</h3>' +
      '<p class="sub">' + z.lineas.length + ' líneas base, cada una una cadena de técnicas con requisitos enlazados. Nacen con los pisos 1 a 3; el piso 4 se abre con 10 niveles acumulados en la línea y el piso 5 con 20.</p></div>' +
      '<div class="grid g190">' + lineas + '</div></div>';
    var resumen = chip('Nivel zeo ' + z.nivel, 'acc') + z.ramas.map(function (r) { return chip(Core.rotulo(r.rama) + ' ' + f(r.sx) + ' ' + z.unidad, 'soft'); }).join('');
    return desplegable('zeo', 'Zeo', resumen, cuerpo);
  }

  function seccionMana(calc) {
    var manaPartes = calc.sesiones.filter(function (s) { return s.mana > 0; }).map(function (s) { return '+' + s.mana; });
    var cuerpo = '<div class="big"><b class="num">' + f(calc.mana.total) + '</b><span class="mute">de mana ganado</span></div>' +
      '<p class="mute" style="font-size:14px">Magic reemplaza el casteo por mana: las habilidades tipo conjuro lo gastan.' + (manaPartes.length ? ' Ganado por sesión: ' + manaPartes.join(', ') + '.' : '') + '</p>' +
      (calc.mana.tabla ? '' : '<span class="chip soft" style="align-self:flex-start">Tabla de niveles de mana: pendiente</span>');
    return desplegable('mana', 'Mana', chip(f(calc.mana.total) + ' de mana ganado', 'acc'), cuerpo);
  }

  function seccionMagia(calc) {
    var hab = calc.feats.lista.filter(function (x) { return x.tipo === 'habilidad-tipo-conjuro'; });
    var lista = hab.map(function (x) {
      var cat = estado.indiceFeats[x.convertidoDe];
      return '<div class="item"><div class="t"><b>' + esc(x.nombre) + '</b><small>Convertido del feat ' + esc(cat ? cat.nombre : x.convertidoDe) + '</small>' +
        (cat && cat.resumen ? '<small>' + esc(cat.resumen) + '</small>' : '') + '</div>' +
        '<span class="chip soft">Costo en mana: pendiente</span>' + enlaceFeat(cat) + '</div>';
    }).join('');
    var cuerpo = '<p class="sub">Magia es lo que reemplaza el casteo: habilidades tipo conjuro que gastan mana. Hoy salen de los feats de ejecución activa de Pathfinder, que se reclasifican aquí. El catálogo de conjuros y el costo en mana de cada habilidad están pendientes de diseño.</p>' +
      '<div class="lista">' + (lista || '<p class="mute">Todavía no hay habilidades tipo conjuro. Un feat de ejecución activa aparece aquí al ganarlo.</p>') + '</div>' +
      '<div class="cajas"><div class="caja"><small>Mana ganado</small><b>' + f(calc.mana.total) + '</b></div><div class="caja"><small>Habilidades</small><b>' + hab.length + '</b></div></div>';
    return desplegable('magia', 'Magia', chip(plural(hab.length, 'habilidad tipo conjuro', 'habilidades tipo conjuro'), 'acc') + chip('Mana ' + f(calc.mana.total), 'soft'), cuerpo);
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

  // ---- méritos y defectos

  function listaMeritos(m, tipo) {
    return m.lista.filter(function (g) { return tipo === 'defecto' ? g.tipo === 'defecto' : g.tipo !== 'defecto'; }).map(function (g) {
      var etiqueta = g.tipo === 'defecto' ? 'Defecto' : (g.categoria === 'racial' ? 'Racial · ' + g.rareza : 'Mérito · ' + g.rareza);
      var nota = g.tipo === 'defecto' ? 'Aporta ' + plural(g.puntos, 'punto', 'puntos') + ' al fondo'
        : (g.descuento > 0 ? 'Costo base ' + g.costoBase + ', menos ' + g.descuento + ' por perfil racial' : (g.categoria === 'racial' ? 'Racial sin descuento (costo base ' + g.costoBase + ')' : 'Mérito común'));
      return '<div class="item"><div class="t"><b>' + esc(g.nombre) + '</b><small>' + esc(nota) + '</small></div>' +
        '<span class="chip ' + (g.tipo === 'defecto' ? '' : 'acc') + '">' + esc(etiqueta) + '</span>' +
        '<span class="v">' + (g.tipo === 'defecto' ? '+' : '−') + g.puntos + '</span></div>';
    }).join('');
  }

  function listaTraits(calc) {
    return calc.traits.length
      ? '<div style="display:flex;flex-direction:column;gap:10px"><h3 style="font-size:20px">Traits</h3>' + calc.traits.map(function (t) {
        return '<div class="item"><div class="t"><b>' + esc(t.nombre) + '</b><ul class="componentes">' + t.incluye.map(function (c) {
          return '<li>' + esc(c.nombre) + ' <span class="mute">(' + (c.tipo === 'feat' ? 'feat' : 'ventaja') + ')</span></li>';
        }).join('') + '</ul></div><span class="chip gold">Trait</span></div>';
      }).join('') + '</div>'
      : '';
  }

  function seccionMeritos(calc, pj, con) {
    var m = calc.meritos;
    var caja = function (rotuloTxt, valor, cls) { return '<div class="caja ' + (cls || '') + '"><small>' + rotuloTxt + '</small><b>' + valor + '</b></div>'; };
    var lista = listaMeritos(m, 'merito');
    var cuerpo = (con ? '<p class="sub">Los méritos solo se pagan con defectos. Puntos iniciales: floor(' + calc.nivel.nivel + ' / 2) + 1 = ' + m.iniciales + '. Un mérito heroico cuesta 10 puntos.</p>' : '') +
      '<div class="cajas">' + caja('Iniciales', m.iniciales) + caja('Defectos', '+' + m.defectos) + caja('Méritos', '−' + m.meritos) + caja('Saldo', m.total, m.total < 0 ? 'neg' : 'saldo') + '</div>' +
      '<div class="lista">' + (lista || '<p class="mute">Sin méritos registrados.</p>') + '</div>' + listaTraits(calc) +
      (con && pj.datosDeEjemplo ? '<p class="mute" style="font-size:13px">Los costos, el valor de los defectos y el descuento por perfil racial son valores de ejemplo: están pendientes del diseñador.</p>' : '');
    var cantidad = m.lista.filter(function (g) { return g.tipo !== 'defecto'; }).length;
    return desplegable('meritos', 'Méritos', chip('Saldo ' + m.total, m.total < 0 ? 'warn' : 'acc') + chip(plural(cantidad, 'mérito', 'méritos'), 'soft'), cuerpo);
  }

  function seccionDefectos(calc, con) {
    var m = calc.meritos;
    var lista = listaMeritos(m, 'defecto');
    var cantidad = m.lista.filter(function (g) { return g.tipo === 'defecto'; }).length;
    var cuerpo = (con ? '<p class="sub">Cada defecto aporta puntos al fondo con el que se pagan los méritos.</p>' : '') +
      '<div class="lista">' + (lista || '<p class="mute">Sin defectos registrados.</p>') + '</div>';
    return desplegable('defectos', 'Defectos', chip('+' + m.defectos + ' puntos', 'acc') + chip(plural(cantidad, 'defecto', 'defectos'), 'soft'), cuerpo);
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

  /** Vista Jugar: los feats pasivos son una lista corta; solo las habilidades activas llevan tarjeta. */
  function seccionFeatsJuego(calc, calcB) {
    var ft = calcB.feats;
    var confirmados = calc.feats.lista.length;
    var pasivos = [], activos = [];
    ft.lista.forEach(function (x, i) { (x.tipo === 'habilidad-tipo-conjuro' ? activos : pasivos).push({ x: x, borrador: i >= confirmados }); });
    var filas = pasivos.map(function (o) {
      var cat = estado.indiceFeats[o.x.id];
      return '<li class="pasivo"><span class="nm">' + esc(o.x.nombre) + '</span>' + (o.borrador ? chip('Borrador', 'gold') : '') +
        (cat && cat.resumen ? '<span class="mute res">' + esc(cat.resumen) + '</span>' : '') + enlaceFeat(cat) + '</li>';
    }).join('');
    var tarjetas = activos.map(function (o) {
      var cat = estado.indiceFeats[o.x.convertidoDe];
      return '<div class="tarjeta-activa"><div class="row-between" style="align-items:center"><b>' + esc(o.x.nombre) + '</b>' + (o.borrador ? chip('Borrador', 'gold') : chip('Activa', 'acc')) + '</div>' +
        (cat && cat.resumen ? '<small class="mute">' + esc(cat.resumen) + '</small>' : '') +
        '<div class="acc-fila">' + chip('Costo en mana: pendiente', 'soft') + enlaceFeat(cat) + '</div></div>';
    }).join('');
    return '<section class="card feats-juego"><div class="row-between" style="align-items:center"><h2>Feats</h2>' +
      '<span class="chips">' + chip(ft.slotsUsados + ' de ' + ft.slotsTotales + ' slots', ft.slotsLibres ? 'acc' : 'soft') + (ft.slotsLibres ? chip(plural(ft.slotsLibres, 'libre', 'libres'), 'gold') : '') + '</span></div>' +
      '<div class="bloque-feats"><span class="eyebrow">Pasivos</span>' +
      (filas ? '<ul class="pasivos">' + filas + '</ul>' : '<p class="mute">Sin feats pasivos.</p>') + '</div>' +
      (tarjetas ? '<div class="bloque-feats"><span class="eyebrow">Activos</span><div class="grid g300">' + tarjetas + '</div></div>' : '') + '</section>';
  }

  function seccionFeats(calc, calcB, pj, con) {
    var ft = calcB.feats;
    var confirmados = calc.feats.lista.length;
    var slots = ft.niveles.map(function (nv, i) {
      var cls = i < ft.slotsUsados ? 'usado' : i < ft.slotsTotales ? 'libre' : 'futuro';
      return '<span class="slot ' + cls + '">Nv. ' + nv + '</span>';
    }).join('');
    var lista = ft.lista.map(function (x, i) { return itemFeat(x, i >= confirmados, con); }).join('');
    var activos = ft.lista.filter(function (x) { return x.tipo === 'habilidad-tipo-conjuro'; });
    var cuerpo = (con ? '<p class="sub">' + ft.slotsUsados + ' de ' + ft.slotsTotales + ' slots usados. Un slot en el nivel 1 y uno más cada dos niveles' + (ft.proximoSlot ? '; el próximo llega al nivel ' + ft.proximoSlot : '') + '.</p>' : '') +
      '<div class="slots">' + slots + '</div><div class="lista">' + (lista || '<p class="mute">Sin feats.</p>') + '</div>' +
      (activos.length ? '<p class="mute" style="font-size:13px">' + esc(activos.map(function (a) { return a.nombre; }).join(', ')) + (activos.length === 1 ? ' es un feat de ejecución activa: se reclasifica' : ' son feats de ejecución activa: se reclasifican') + ' como habilidad tipo conjuro.</p>' : '') +
      (con ? bloquePicker(calcB, pj) : '');
    var hayBorr = ft.lista.length > confirmados;
    var resumen = chip(ft.slotsUsados + ' de ' + ft.slotsTotales + ' slots', ft.slotsLibres ? 'acc' : 'soft') + (ft.slotsLibres ? chip(plural(ft.slotsLibres, 'libre', 'libres'), 'gold') : '') +
      (hayBorr ? chip('Con borrador', 'gold') : '');
    return desplegable('feats', 'Feats', resumen, cuerpo);
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

  function etiquetaEntrada(e) {
    if (e.tipo === 'feat') {
      var cat = estado.indiceFeats[e.id];
      return 'Feat · ' + (cat ? cat.nombre : e.id) + (e.eleccion ? ' (' + e.eleccion + ')' : '');
    }
    if (e.tipo === 'achievement') {
      var a = estado.indiceLogros[e.id];
      return 'Achievement · ' + (a ? a.nombre : e.id) + (typeof e.fate === 'number' ? ' (fate ' + e.fate + ')' : '');
    }
    return e.recurso.toUpperCase() + ' · ' + e.dado + ' → ' + e.resultado;
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
        '<div class="acc-fila"><button class="btn prim" type="button" data-accion="copiar">Copiar JSON</button><button class="btn" type="button" data-accion="vaciar">Vaciar borrador</button><span id="pk-msg" role="status" class="mute" style="font-size:14px"></span></div>'
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
    var li = Object.keys(s.lineas);
    if (li.length) c.push(['Líneas · ' + li.map(function (l) { return l + ' +' + s.lineas[l]; }).join(' · '), '']);
    if (s.mana) c.push(['Mana +' + s.mana, '']);
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

  function seccionSesiones(calc) {
    var filas = calc.sesiones.map(function (s, i) {
      var chips = chipsDeSesion(s).map(function (c) { return chip(c[0], c[1]); }).join('');
      return '<div class="sesion"><div class="cuando"><b>' + (i === 0 ? 'Creación' : 'Sesión ' + i) + '</b><small>' + esc(fecha(s.fecha)) + '</small></div>' +
        '<div class="cuerpo"><div class="row-between"><h3>' + esc(s.titulo) + '</h3><div class="delta num"><b>' + (s.xpGanada >= 0 ? '+' : '−') + f(Math.abs(s.xpGanada)) + ' XP</b><small>Acumulado: ' + f(s.xpAcumulada) + ' XP</small></div></div>' +
        (chips ? '<div class="chips">' + chips + '</div>' : '') +
        (s.filasXp.length ? '<div class="filas">' + s.filasXp.map(filaXp).join('') + '</div>' : '') + '</div></div>';
    }).join('');
    return '<section class="card" style="padding:28px;gap:24px"><div style="display:flex;flex-direction:column;gap:8px"><h2>Sesiones</h2>' +
      '<p class="sub">Cada fila guarda sus entradas (tag, grado, nivel del contenido y cantidad). La XP se calcula: 40 × multiplicador por Δ × grado del tag. Δ es el nivel del contenido menos el nivel del personaje.</p></div>' +
      '<div style="display:flex;flex-direction:column;gap:22px">' + filas + '</div></section>';
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
    // Todo lo que no es la base, los atributos o el registro de sesiones va plegado.
    var plegables = '<section class="desp-grupo">' +
      (con ? seccionBorrador(calcB, pj, borr) + seccionFeats(calc, calcB, pj, con) : '') +
      seccionLogros(calc, calcB, con) + seccionEquipo(calc, con) +
      seccionMeritos(calc, pj, con) + seccionDefectos(calc, con) + seccionTiradas(calcB, con) +
      seccionZeo(calcB) + seccionMana(calcB) + seccionMagia(calcB) + '</section>';
    return '<div class="page">' +
      '<header class="topbar"><div class="brand"><b>EverwhiteEmperor</b><span class="eyebrow">Visor de personajes</span></div>' +
      '<div class="tools">' + selectorModo() + (pj.datosDeEjemplo ? chip('Datos de ejemplo · personaje inventado', 'gold') : '') + sel +
      '<label class="btn file">Abrir otro personaje (.json)<input type="file" id="archivo" accept="application/json,.json"></label>' +
      '<button class="btn" id="tema" type="button" aria-pressed="' + tema + '">' + (tema ? 'Tema noche' : 'Tema hielo') + '</button></div></header>' +
      '<div id="msg" role="status"></div>' + seccionAvisos(calcB) + seccionFicha(calc, calcB, pj, con) + avisoBorrador + (con ? '' : seccionFeatsJuego(calc, calcB)) + plegables + seccionSesiones(calc) +
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

  function refrescarVitales(rec, delta) {
    var v = estado.vista;
    var cont = document.getElementById('vitales');
    if (!v || !cont) return;
    cont.innerHTML = htmlVitales(v.calcB, v.pj);
    var otra = cont.querySelector('[data-accion="rec"][data-recurso="' + rec + '"][data-delta="' + delta + '"]');
    if (otra) otra.focus();
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
      fijarActual(pj, rec, delta === 'max' ? max : Math.max(0, Math.min(max, actual + Number(delta))), max);
      refrescarVitales(rec, delta);
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
    Array.prototype.forEach.call(app.querySelectorAll('details.desp'), function (d) {
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
          mostrar(pj);
        } catch (err) {
          avisoMsg('No se pudo abrir ' + file.name + ': ' + err.message);
        }
      };
      lector.onerror = function () { avisoMsg('No se pudo leer ' + file.name + '.'); };
      lector.readAsText(file);
    });
  }

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
    } else return;
    estado.picker.max = 40;
    refrescarPicker();
  });
  app.addEventListener('keydown', function (ev) {
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
