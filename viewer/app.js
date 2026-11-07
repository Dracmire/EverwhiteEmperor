/* EverwhiteEmperor: visor de personajes (solo lectura).
 * Lee data/*.json y characters/<id>.json, calcula con src/core.js y dibuja la página.
 * En el archivo único de dist/ los datos vienen embebidos en window.EWE_DATA. */
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
  var ATRIBUTOS = { STR: 'Fuerza', DEX: 'Destreza', CON: 'Constitución', INT: 'Inteligencia', WIS: 'Sabiduría', CHA: 'Carisma' };
  var ORDEN_ATRIBUTOS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

  function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ } }
  function leerGuardado(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }

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

  // ---------------------------------------------------------------------- dibujo

  function chip(texto, tono) { return '<span class="chip ' + (tono || '') + '">' + esc(texto) + '</span>'; }

  function seccionAvisos(calc) {
    if (!calc.avisos.length) return '';
    var li = calc.avisos.map(function (a) {
      return '<li><b>Sesión ' + esc(a.sesion) + (a.indice === null ? '' : ', entrada ' + (a.indice + 1)) + ':</b> ' + esc(a.mensaje) + '</li>';
    }).join('');
    return '<section class="avisos" role="alert"><b>' + plural(calc.avisos.length, 'aviso', 'avisos') +
      ' del registro</b><ul>' + li + '</ul><span class="vacio">Las entradas con error no se aplicaron al personaje.</span></section>';
  }

  function seccionHeroe(calc, pj) {
    var n = calc.nivel;
    var attrs = ORDEN_ATRIBUTOS.filter(function (k) { return pj.atributos[k] !== undefined; }).map(function (k) {
      var v = pj.atributos[k];
      var pref = calc.personaje.preferidos.indexOf(k) >= 0;
      return '<div class="attr"><div class="top"><span class="ab">' + k + '</span><span class="mod num">' + signo(Math.floor((v - 10) / 2)) + '</span></div>' +
        '<span class="score">' + v + '</span><span class="mute" style="font-size:13px">' + ATRIBUTOS[k] + '</span>' +
        (pref ? '<span class="chip acc">Preferido</span>' : '') + '</div>';
    }).join('');
    var pref = calc.personaje.preferidos;
    var perfilTexto = pref.length
      ? 'Preferido: atributo del perfil racial de ' + esc(calc.personaje.razaNombre) + ' (' + esc(pref.join(' y ')) + '). Perfil racial: ' +
        (calc.personaje.perfilRacial ? 'se cumple, hay descuento en los racials.' : 'no se cumple, sin descuento.')
      : '';
    var progreso = n.maximo && calc.xp >= n.fin ? 'Nivel máximo' : 'Faltan <strong>' + f(n.faltan) + ' XP</strong> para el nivel ' + (n.nivel + 1);
    return '<section class="hero">' +
      '<div class="card" style="padding:28px;gap:24px;justify-content:space-between"><div style="display:flex;flex-direction:column;gap:6px"><h1>' + esc(pj.nombre) + '</h1>' +
      '<p class="mute">' + esc(calc.personaje.claseNombre) + ' · ' + esc(calc.personaje.razaNombre) + ' · ' + plural(Math.max(0, calc.sesiones.length - 1), 'sesión registrada', 'sesiones registradas') + '</p></div>' +
      '<div class="nivel-row"><div class="nivel-num"><span class="eyebrow">Nivel</span><b>' + n.nivel + '</b></div>' +
      '<div class="xp-block"><div class="row-between"><span class="xp-big num">' + f(calc.xp) + ' <small>XP</small></span>' +
      '<span class="mute num" style="font-size:14px">El nivel ' + n.nivel + ' abarca ' + f(n.inicio) + ' – ' + f(n.fin) + '</span></div>' +
      '<div class="bar" role="progressbar" aria-label="Progreso hacia el nivel ' + (n.nivel + 1) + '" aria-valuemin="' + n.inicio + '" aria-valuemax="' + n.fin + '" aria-valuenow="' + Math.min(calc.xp, n.fin) + '"><i style="width:' + (n.progreso * 100).toFixed(1) + '%"></i></div>' +
      '<span style="font-size:14px">' + progreso + '</span></div></div></div>' +
      '<div class="card"><h2>Atributos</h2><div class="grid g120">' + attrs + '</div>' +
      (perfilTexto ? '<p class="mute" style="font-size:13px">' + perfilTexto + '</p>' : '') + '</div></section>';
  }

  function seccionZeo(calc) {
    var z = calc.zeo;
    var limitan = z.ramas.filter(function (r) { return r.limita; });
    var nivelesTxt = z.ramas.map(function (r) { return r.nivel; }).join(', ');
    var lectura = z.lectura === 'costo-por-nivel' ? 'costo por nivel' : 'umbral acumulado';
    var resumen = limitan.length === z.ramas.length
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
    return '<section class="card" style="padding:28px;gap:24px">' +
      '<div class="zeo-head"><div style="display:flex;flex-direction:column;gap:8px;flex:1 1 360px;min-width:0"><h2>Zeo</h2>' +
      '<p class="sub">El nivel zeo es el menor de las tres ramas. ' + resumen + ' Tabla de ' + esc(z.unidad) + ' por nivel: ' + z.niveles.join(' · ') + ' (lectura: ' + lectura + ', por confirmar).</p></div>' +
      '<div class="zeo-nivel"><div style="display:flex;flex-direction:column"><span class="eyebrow">Nivel zeo</span><span class="mute num" style="font-size:13px">= mín(' + nivelesTxt + ')</span></div><b>' + z.nivel + '</b></div></div>' +
      '<div class="grid g300">' + ramas + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:14px"><div style="display:flex;flex-direction:column;gap:4px"><h3 style="font-size:20px">Líneas de técnica</h3>' +
      '<p class="sub">' + z.lineas.length + ' líneas base, cada una una cadena de técnicas con requisitos enlazados. Nacen con los pisos 1 a 3; el piso 4 se abre con 10 niveles acumulados en la línea y el piso 5 con 20.</p></div>' +
      '<div class="grid g190">' + lineas + '</div></div></section>';
  }

  function etiquetaSesion(calc, id) {
    var i = calc.sesiones.findIndex(function (s) { return s.id === id; });
    return i <= 0 ? 'la creación' : 'la sesión ' + i;
  }

  function seccionTres(calc) {
    var manaPartes = calc.sesiones.filter(function (s) { return s.mana > 0; }).map(function (s) { return '+' + s.mana; });
    var mana = '<div class="card compact"><h2>Mana</h2><div class="big"><b class="num">' + f(calc.mana.total) + '</b><span class="mute">de mana ganado</span></div>' +
      '<p class="mute" style="font-size:14px">Magic reemplaza el casteo por mana: las habilidades tipo conjuro lo gastan.' + (manaPartes.length ? ' Ganado por sesión: ' + manaPartes.join(', ') + '.' : '') + '</p>' +
      (calc.mana.tabla ? '' : '<span class="chip soft" style="align-self:flex-start">Tabla de niveles de mana: pendiente</span>') + '</div>';
    var conFate = calc.logros.filter(function (l) { return l.fate > 0; });
    var fate = '<div class="card compact"><h2>Fate</h2><div class="big"><b class="num gold">' + calc.fate + '</b><span class="mute">disponible</span></div>' +
      '<p class="mute" style="font-size:14px">' + (conFate.length ? 'Ganado con ' + conFate.map(function (l) { return '«' + esc(l.nombre) + '» en ' + etiquetaSesion(calc, l.sesion); }).join(' y ') + '. ' : '') +
      'Fate es una ganancia adicional: no es XP y no sube de nivel.</p></div>';
    var nivel = calc.nivel.nivel;
    var filas = calc.logros.map(function (l) {
      return '<div class="logro usado"><span class="n">Nivel ' + l.nivel + '</span><span class="t">' + esc(l.nombre) + '</span><span style="font-size:12px;font-weight:700">Usado 1/1</span></div>';
    }).join('');
    var hayEnActual = calc.logros.some(function (l) { return l.nivel === nivel; });
    var sig = hayEnActual
      ? (nivel < 20 ? '<div class="logro libre"><span class="n">Nivel ' + (nivel + 1) + '</span><span class="t" style="font-weight:400;font-size:14px">Disponible al subir de nivel</span></div>' : '')
      : '<div class="logro libre"><span class="n">Nivel ' + nivel + '</span><span class="t" style="font-weight:400;font-size:14px">Disponible ahora</span></div>';
    var logros = '<div class="card compact"><h2>Achievement feats</h2><p class="mute" style="font-size:14px">Máximo uno por nivel.</p><div class="lista">' + filas + sig + '</div></div>';
    return '<section class="grid g300" style="gap:24px">' + mana + fate + logros + '</section>';
  }

  function seccionMeritos(calc, pj) {
    var m = calc.meritos;
    var caja = function (rotuloTxt, valor, cls) { return '<div class="caja ' + (cls || '') + '"><small>' + rotuloTxt + '</small><b>' + valor + '</b></div>'; };
    var lista = m.lista.map(function (g) {
      var tipo = g.tipo === 'defecto' ? 'Defecto' : (g.categoria === 'racial' ? 'Racial · ' + g.rareza : 'Mérito · ' + g.rareza);
      var nota = g.tipo === 'defecto' ? 'Aporta ' + plural(g.puntos, 'punto', 'puntos') + ' al fondo'
        : (g.descuento > 0 ? 'Costo base ' + g.costoBase + ', menos ' + g.descuento + ' por perfil racial' : (g.categoria === 'racial' ? 'Racial sin descuento (costo base ' + g.costoBase + ')' : 'Mérito común'));
      return '<div class="item"><div class="t"><b>' + esc(g.nombre) + '</b><small>' + esc(nota) + '</small></div>' +
        '<span class="chip ' + (g.tipo === 'defecto' ? '' : 'acc') + '">' + esc(tipo) + '</span>' +
        '<span class="v">' + (g.tipo === 'defecto' ? '+' : '−') + g.puntos + '</span></div>';
    }).join('');
    var traits = calc.traits.length
      ? '<div style="display:flex;flex-direction:column;gap:10px"><h3 style="font-size:20px">Traits</h3>' + calc.traits.map(function (t) {
        return '<div class="item"><div class="t"><b>' + esc(t.nombre) + '</b><ul class="componentes">' + t.incluye.map(function (c) {
          return '<li>' + esc(c.nombre) + ' <span class="mute">(' + (c.tipo === 'feat' ? 'feat' : 'ventaja') + ')</span></li>';
        }).join('') + '</ul></div><span class="chip gold">Trait</span></div>';
      }).join('') + '</div>'
      : '';
    return '<div class="card" style="flex:1.2 1 520px;min-width:0"><div style="display:flex;flex-direction:column;gap:8px"><h2>Méritos y defectos</h2>' +
      '<p class="sub">Los méritos solo se pagan con defectos. Puntos iniciales: floor(' + calc.nivel.nivel + ' / 2) + 1 = ' + m.iniciales + '. Un mérito heroico cuesta 10 puntos.</p></div>' +
      '<div class="cajas">' + caja('Iniciales', m.iniciales) + caja('Defectos', '+' + m.defectos) + caja('Méritos', '−' + m.meritos) + caja('Saldo', m.total, m.total < 0 ? 'neg' : 'saldo') + '</div>' +
      '<div class="lista">' + (lista || '<p class="mute">Sin méritos ni defectos registrados.</p>') + '</div>' + traits +
      (pj.datosDeEjemplo ? '<p class="mute" style="font-size:13px">Los costos, el valor de los defectos y el descuento por perfil racial son valores de ejemplo: están pendientes del diseñador.</p>' : '') + '</div>';
  }

  function seccionFeats(calc, pj) {
    var ft = calc.feats;
    var slots = ft.niveles.map(function (nv, i) {
      var cls = i < ft.slotsUsados ? 'usado' : i < ft.slotsTotales ? 'libre' : 'futuro';
      return '<span class="slot ' + cls + '">Nv. ' + nv + '</span>';
    }).join('');
    var lista = ft.lista.map(function (x) {
      var activo = x.tipo === 'habilidad-tipo-conjuro';
      return '<div class="item"><div class="t"><b>' + esc(x.nombre) + '</b></div><span class="chip ' + (activo ? 'acc' : '') + '">' + (activo ? 'Habilidad tipo conjuro' : 'Pasivo') + '</span></div>';
    }).join('');
    var activos = ft.lista.filter(function (x) { return x.tipo === 'habilidad-tipo-conjuro'; });
    return '<div class="card" style="flex:1 1 380px;min-width:0"><div style="display:flex;flex-direction:column;gap:8px"><h2>Feats</h2>' +
      '<p class="sub">' + ft.slotsUsados + ' de ' + ft.slotsTotales + ' slots usados. Un slot nuevo cada dos niveles, desde el 1' + (ft.proximoSlot ? '; el próximo llega al nivel ' + ft.proximoSlot : '') + '.</p></div>' +
      '<div class="slots">' + slots + '</div><div class="lista">' + (lista || '<p class="mute">Sin feats.</p>') + '</div>' +
      (activos.length ? '<p class="mute" style="font-size:13px">' + esc(activos.map(function (a) { return a.nombre; }).join(', ')) + (activos.length === 1 ? ' es un feat de ejecución activa: se reclasifica' : ' son feats de ejecución activa: se reclasifican') + ' como habilidad tipo conjuro.</p>' : '') + '</div>';
  }

  function seccionEquipo(calc) {
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
    return '<section class="card"><div class="zeo-head"><div style="display:flex;flex-direction:column;gap:8px;flex:1 1 340px;min-width:0"><h2>Equipo</h2>' +
      '<p class="sub">1 armadura, 1 arma y 3 objetos mágicos. La armadura y el arma no cuentan dentro de los 3 objetos, y cada extremidad sostiene un solo objeto; la armadura no ocupa extremidad.</p></div>' +
      '<div class="chips">' + chip('Armadura ' + e.conteo.armadura + '/' + e.limites.armadura, 'soft') + chip('Arma ' + e.conteo.arma + '/' + e.limites.arma, 'soft') + chip('Objetos mágicos ' + e.conteo.objetos + '/' + e.limites.objetos, 'soft') + '</div></div>' +
      '<div class="grid g210">' + tarjetas + '</div></section>';
  }

  function dTxt(d) { return d === 0 ? 'Δ0' : d > 0 ? 'Δ+' + d : 'Δ−' + Math.abs(d); }

  function chipsDeSesion(s) {
    var c = [];
    var zeo = Object.keys(s.zeo);
    if (zeo.length) c.push(['Zeo · ' + zeo.map(function (r) { return Core.rotulo(r) + ' +' + s.zeo[r]; }).join(' · '), '']);
    var li = Object.keys(s.lineas);
    if (li.length) c.push(['Líneas · ' + li.map(function (l) { return l + ' +' + s.lineas[l]; }).join(' · '), '']);
    if (s.mana) c.push(['Mana +' + s.mana, '']);
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

  function paginaCompleta(calc, pj, estado) {
    var sel = '';
    if (estado.ids.length > 1) {
      sel = '<label class="mute" style="font-size:13px">Personaje <select class="btn" id="sel-pj" aria-label="Personaje">' + estado.ids.map(function (id) {
        return '<option value="' + esc(id) + '"' + (id === estado.actual ? ' selected' : '') + '>' + esc(estado.personajes[id].nombre || id) + '</option>';
      }).join('') + '</select></label>';
    }
    var tema = esNoche();
    return '<div class="page">' +
      '<header class="topbar"><div class="brand"><b>EverwhiteEmperor</b><span class="eyebrow">Visor de personajes</span></div>' +
      '<div class="tools">' + (pj.datosDeEjemplo ? chip('Datos de ejemplo · personaje inventado', 'gold') : '') + sel +
      '<label class="btn file">Abrir otro personaje (.json)<input type="file" id="archivo" accept="application/json,.json"></label>' +
      '<button class="btn" id="tema" type="button" aria-pressed="' + tema + '">' + (tema ? 'Tema noche' : 'Tema hielo') + '</button></div></header>' +
      '<div id="msg" role="status"></div>' +
      seccionAvisos(calc) + seccionHeroe(calc, pj) + seccionZeo(calc) + seccionTres(calc) +
      '<section class="cols">' + seccionMeritos(calc, pj) + seccionFeats(calc, pj) + '</section>' +
      seccionEquipo(calc) + seccionSesiones(calc) +
      '<footer><p class="pie">' + (pj.datosDeEjemplo ? 'Los nombres de raza, méritos, objetos y logros son inventados. ' : '') +
      'Las reglas de Pathfinder 1e se usan bajo la OGL 1.0a; el proyecto es gratuito y no tiene afiliación con Paizo.</p></footer></div>';
  }

  // ----------------------------------------------------------------- arranque

  var estado = { ctx: null, personajes: {}, ids: [], actual: null };

  function mostrar(pj) {
    var calc;
    try {
      calc = Core.calcularPersonaje(estado.ctx, pj);
    } catch (err) {
      app.innerHTML = '<div class="page"><section class="aviso-carga"><h2>No se pudo calcular el personaje</h2><p>' + esc(err.message) + '</p></section></div>';
      return;
    }
    app.innerHTML = paginaCompleta(calc, pj, estado);
    document.title = pj.nombre + ' · EverwhiteEmperor';
    conectar();
  }

  function avisoMsg(texto) {
    var m = document.getElementById('msg');
    if (m) m.innerHTML = texto ? '<div class="avisos"><b>' + esc(texto) + '</b></div>' : '';
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
