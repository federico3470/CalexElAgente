/* Calex - generador de archivos en el navegador (sin librerias, sin red).
 * Formatos: pdf, docx, xlsx, pptx, txt, csv, html, json, md, svg, ics, xml, zip.
 * API: window.CalexFiles = { TYPES, MIME, build, download, describe }.
 * Nada del contenido se ejecuta ni se evalua; todo texto se escapa antes de entrar en XML.
 */
(function (root) {
  'use strict';

  var MAX_IN = 2 * 1024 * 1024;
  var MAX_ZIP_TOTAL = 5 * 1024 * 1024;
  var MAX_ZIP_FILES = 100;
  var MAX_PAGES = 300;
  var MAX_TBL_ROWS = 5000;
  var MAX_TBL_COLS = 50;
  var MAX_SHEETS = 50;
  var MAX_SHEET_ROWS = 20000;
  var MAX_SHEET_COLS = 200;
  var MAX_SLIDES = 200;

  var TYPES = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 'html', 'json', 'md', 'svg', 'ics', 'xml', 'zip'];
  var MIME = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain;charset=utf-8',
    csv: 'text/csv;charset=utf-8',
    html: 'text/html;charset=utf-8',
    json: 'application/json;charset=utf-8',
    md: 'text/markdown;charset=utf-8',
    svg: 'image/svg+xml;charset=utf-8',
    ics: 'text/calendar;charset=utf-8',
    xml: 'application/xml;charset=utf-8',
    zip: 'application/zip'
  };
  var LABELS = {
    pdf: 'PDF', docx: 'Word', xlsx: 'Excel', pptx: 'PowerPoint', txt: 'Texto', csv: 'CSV',
    html: 'HTML', json: 'JSON', md: 'Markdown', svg: 'SVG', ics: 'Calendario', xml: 'XML', zip: 'ZIP'
  };
  var ALIAS = {
    word: 'docx', doc: 'docx', excel: 'xlsx', xls: 'xlsx', powerpoint: 'pptx', ppt: 'pptx',
    markdown: 'md', htm: 'html', text: 'txt', texto: 'txt', calendario: 'ics', ical: 'ics'
  };

  function normType(t) {
    var s = String(t == null ? '' : t).toLowerCase().replace(/^\./, '').trim();
    if (ALIAS[s]) s = ALIAS[s];
    return TYPES.indexOf(s) >= 0 ? s : null;
  }

  /* ------------------------------------------------------------ bytes */
  function utf8(s) { return new TextEncoder().encode(s); }
  function concat(arrs) {
    var n = 0, i;
    for (i = 0; i < arrs.length; i++) n += arrs[i].length;
    var out = new Uint8Array(n), p = 0;
    for (i = 0; i < arrs.length; i++) { out.set(arrs[i], p); p += arrs[i].length; }
    return out;
  }
  var CRC_T = (function () {
    var t = new Uint32Array(256), n, k, c;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(b) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function le(n, bytes) {
    var a = [];
    for (var i = 0; i < bytes; i++) a.push((n >>> (8 * i)) & 255);
    return a;
  }

  async function deflateRaw(data) {
    var cs = new CompressionStream('deflate-raw');
    var w = cs.writable.getWriter();
    w.write(data).catch(function () {});
    w.close().catch(function () {});
    var r = cs.readable.getReader(), chunks = [];
    for (;;) {
      var x = await r.read();
      if (x.done) break;
      chunks.push(x.value);
    }
    return concat(chunks);
  }

  async function makeZip(files) {
    var canDeflate = typeof CompressionStream === 'function';
    var now = new Date();
    var yr = Math.max(1980, now.getFullYear());
    var dTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    var dDate = ((yr - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    var parts = [], central = [], offset = 0;
    for (var i = 0; i < files.length; i++) {
      var f = files[i], nameB = utf8(f.name), crc = crc32(f.data), method = 0, body = f.data;
      if (canDeflate && f.data.length > 64) {
        try {
          var c = await deflateRaw(f.data);
          if (c.length < f.data.length) { body = c; method = 8; }
        } catch (e) { canDeflate = false; }
      }
      var lh = new Uint8Array([].concat(
        le(0x04034b50, 4), le(20, 2), le(0x0800, 2), le(method, 2), le(dTime, 2), le(dDate, 2),
        le(crc, 4), le(body.length, 4), le(f.data.length, 4), le(nameB.length, 2), le(0, 2)));
      parts.push(lh, nameB, body);
      central.push(new Uint8Array([].concat(
        le(0x02014b50, 4), le(20, 2), le(20, 2), le(0x0800, 2), le(method, 2), le(dTime, 2), le(dDate, 2),
        le(crc, 4), le(body.length, 4), le(f.data.length, 4), le(nameB.length, 2), le(0, 2), le(0, 2),
        le(0, 2), le(0, 2), le(0, 4), le(offset, 4))), nameB);
      offset += lh.length + nameB.length + body.length;
    }
    var cd = concat(central);
    var end = new Uint8Array([].concat(
      le(0x06054b50, 4), le(0, 2), le(0, 2), le(files.length, 2), le(files.length, 2),
      le(cd.length, 4), le(offset, 4), le(0, 2)));
    parts.push(cd, end);
    return concat(parts);
  }

  /* ------------------------------------------------------------ nombres */
  function safeName(name, ext) {
    var s = String(name == null ? '' : name).slice(0, 400);
    s = s.replace(/[\u0000-\u001F\u007F\u0080-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\/\\:*?"<>|]/g, '-');
    s = s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, function (x) { return x.length > 1 ? x.charAt(0) : ''; });
    s = s.replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim();
    var low = s.toLowerCase(), suf = '.' + ext;
    if (low.length > suf.length && low.slice(-suf.length) === suf) s = s.slice(0, s.length - suf.length);
    s = s.replace(/^[.\s-]+/, '').replace(/[.\s]+$/, '');
    var maxBase = 80 - suf.length;
    if (s.length > maxBase) s = s.slice(0, maxBase).replace(/[.\s]+$/, '');
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(s.split('.')[0].trim())) s = '_' + s;
    if (!s) s = 'documento';
    return s + suf;
  }

  function safePath(p, idx) {
    var s = String(p).slice(0, 4000).replace(/\\/g, '/').replace(/[\u0000-\u001F\u007F\u0080-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, '');
    s = s.replace(/^[A-Za-z]:/, '');
    var segs = s.split('/'), out = [];
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i].trim().slice(0, 300);
      if (!g || g === '.' || g === '..') continue;
      g = g.replace(/[:*?"<>|]/g, '-').replace(/\.{2,}/g, '.');
      if (g.length > 100) g = g.slice(0, 100);
      g = g.replace(/[ .]+$/, '');
      if (!g) continue;
      out.push(g);
    }
    var r = out.join('/');
    if (!r) r = 'archivo-' + idx + '.txt';
    if (r.length > 200) r = r.slice(r.length - 200).replace(/^\/+/, '') || ('archivo-' + idx + '.txt');
    return r;
  }

  /* ------------------------------------------------------------ XML */
  var XDECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  function xclean(s) {
    s = String(s == null ? '' : s);
    var o = '', i, c, d;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 0xD7FF) || (c >= 0xE000 && c <= 0xFFFD)) {
        o += s.charAt(i);
      } else if (c >= 0xD800 && c <= 0xDBFF) {
        d = s.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { o += s.charAt(i) + s.charAt(i + 1); i++; }
      }
    }
    return o;
  }
  function xesc(s) {
    return xclean(s).replace(/[&<>"']/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&apos;';
    });
  }
  var NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  var NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  var NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  var NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types';
  var NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  var NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
  var NS_S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  var RT = NS_R + '/';

  function relsXml(list) {
    return XDECL + '<Relationships xmlns="' + NS_REL + '">' + list.map(function (r) {
      return '<Relationship Id="' + r.id + '" Type="' + r.type + '" Target="' + xesc(r.target) + '"/>';
    }).join('') + '</Relationships>';
  }
  function ctXml(over) {
    return XDECL + '<Types xmlns="' + NS_CT + '">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      over.map(function (o) { return '<Override PartName="' + o[0] + '" ContentType="' + o[1] + '"/>'; }).join('') +
      '</Types>';
  }
  function nowIso() { return new Date().toISOString().replace(/\.\d+Z$/, 'Z'); }
  function coreXml(title) {
    var d = nowIso();
    return XDECL + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
      'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + xesc(title || '') + '</dc:title><dc:creator>Calex</dc:creator><cp:lastModifiedBy>Calex</cp:lastModifiedBy>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + d + '</dcterms:created>' +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + d + '</dcterms:modified></cp:coreProperties>';
  }
  function appXml() {
    return XDECL + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
      '<Application>Calex</Application></Properties>';
  }
  var CT_CORE = 'application/vnd.openxmlformats-package.core-properties+xml';
  var CT_APP = 'application/vnd.openxmlformats-officedocument.extended-properties+xml';
  var RT_CORE = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties';

  async function packOoxml(parts) {
    var files = parts.map(function (p) { return { name: p[0], data: utf8(p[1]) }; });
    return makeZip(files);
  }

  /* ------------------------------------------------------------ Markdown */
  var HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
  var SEP_RE = /^(?=.*\|)\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
  var LI_RE = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
  var PB_RE = /^<<<\s*p[aá]gina\s*>>>$/i;

  function parseInline(s) {
    s = String(s);
    var runs = [], b = false, it = false, buf = '', p = 0, n = s.length, lk = -2;
    function flush() { if (buf) { runs.push({ t: buf, b: b, i: it, c: false }); buf = ''; } }
    while (p < n) {
      var ch = s.charAt(p), nx = s.charAt(p + 1);
      if (ch === '\\' && nx && /[\\`*_{}\[\]()#+\-.!|>~]/.test(nx)) { buf += nx; p += 2; continue; }
      if (ch === '`') {
        var e = s.indexOf('`', p + 1);
        if (e > p) { flush(); runs.push({ t: s.slice(p + 1, e), b: b, i: it, c: true }); p = e + 1; continue; }
      }
      if (ch === '!' && nx === '[' || ch === '[') {
        var q0 = ch === '!' ? p + 1 : p, mm = null;
        if (lk < q0) lk = s.indexOf('](', q0);
        if (lk >= 0 && lk - q0 <= 400) mm = /^(!?)\[([^\]]{0,400})\]\(([^)\s]{0,2000})(?:\s+"[^"]{0,400}")?\)/.exec(s.slice(p, p + 3000));
        if (mm) {
          var tx = mm[2];
          if (!mm[1] && mm[3] && mm[3] !== tx && mm[3].charAt(0) !== '#') tx += ' (' + mm[3] + ')';
          buf += tx; p += mm[0].length; continue;
        }
      }
      if (ch === '*' || (ch === '_' && nx === '_')) {
        var m = nx === ch ? ch + ch : ch;
        if (m === '_') { buf += ch; p++; continue; }
        var isBold = m.length === 2, on = isBold ? b : it;
        var after = s.charAt(p + m.length), before = p > 0 ? s.charAt(p - 1) : '';
        if (!on) {
          var okOpen = after && !/\s/.test(after) && s.indexOf(m, p + m.length) > -1;
          if (ch === '_' && /[A-Za-z0-9]/.test(before)) okOpen = false;
          if (okOpen) { flush(); if (isBold) b = true; else it = true; p += m.length; continue; }
        } else if (before && !/\s/.test(before)) {
          flush(); if (isBold) b = false; else it = false; p += m.length; continue;
        }
        buf += m; p += m.length; continue;
      }
      buf += ch; p++;
    }
    flush();
    var out = [];
    runs.forEach(function (r) {
      var l = out[out.length - 1];
      if (l && l.b === r.b && l.i === r.i && l.c === r.c) l.t += r.t; else out.push(r);
    });
    return out;
  }
  /* Devuelve el texto de un encabezado "# texto" (o null). Sin regex con retroceso. */
  function mdHead(ln, maxIndent) {
    var m = (maxIndent ? /^ {0,3}(#{1,6})\s+/ : /^\s*(#{1,6})\s+/).exec(ln);
    if (!m) return null;
    var t = ln.slice(m[0].length).trim(), e = t.length;
    while (e > 0 && t.charAt(e - 1) === '#') e--;
    if (e < t.length && (e === 0 || /\s/.test(t.charAt(e - 1)))) t = t.slice(0, e).trim();
    return { n: m[1].length, t: t };
  }
  function runsText(runs) { return runs.map(function (r) { return r.t; }).join(''); }

  function splitRow(line) {
    var s = line.trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.length && s.charAt(s.length - 1) === '|' && s.charAt(s.length - 2) !== '\\') s = s.slice(0, -1);
    var cells = [], cur = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === '\\' && s.charAt(i + 1) === '|') { cur += '|'; i++; }
      else if (c === '|') { cells.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    cells.push(cur.trim());
    return cells;
  }

  function startsBlock(L, i) {
    var ln = L[i], tr = ln.trim();
    if (!tr) return true;
    if (PB_RE.test(tr)) return true;
    if (/^\s*(```|~~~)/.test(ln)) return true;
    if (HR_RE.test(ln)) return true;
    if (/^ {0,3}#{1,6}\s/.test(ln)) return true;
    if (/^\s*>/.test(ln)) return true;
    if (LI_RE.test(ln)) return true;
    if (isTableStart(L, i)) return true;
    return false;
  }
  function isTableStart(L, i) {
    var ln = L[i];
    if (ln.indexOf('|') < 0) return false;
    if (i + 1 < L.length && SEP_RE.test(L[i + 1]) && L[i + 1].indexOf('|') >= 0) return true;
    return /^\s*\|.*\|\s*$/.test(ln) && !SEP_RE.test(ln);
  }

  function parseMd(text) {
    var L = String(text).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
    var B = [], i = 0;
    while (i < L.length) {
      var ln = L[i], tr = ln.trim();
      if (!tr) { i++; continue; }
      if (PB_RE.test(tr)) { B.push({ t: 'pb' }); i++; continue; }
      if (/^\s*(```|~~~)/.test(ln)) {
        var code = []; i++;
        while (i < L.length && !/^\s*(```|~~~)\s*$/.test(L[i])) { code.push(L[i]); i++; }
        i++;
        B.push({ t: 'code', lines: code });
        continue;
      }
      if (HR_RE.test(ln)) { B.push({ t: 'hr' }); i++; continue; }
      var h = mdHead(ln, true);
      if (h) { B.push({ t: 'h', n: Math.min(h.n, 3), r: parseInline(h.t) }); i++; continue; }
      if (isTableStart(L, i)) {
        var rows = [], nc = 0;
        while (i < L.length && L[i].indexOf('|') >= 0 && L[i].trim()) {
          if (!SEP_RE.test(L[i])) { var cs = splitRow(L[i]); nc = Math.max(nc, cs.length); rows.push(cs); }
          i++;
        }
        nc = Math.min(nc, MAX_TBL_COLS);
        rows = rows.slice(0, MAX_TBL_ROWS).map(function (r) {
          var o = [];
          for (var c = 0; c < nc; c++) o.push(parseInline(r[c] || ''));
          return o;
        });
        if (rows.length && nc) B.push({ t: 'table', rows: rows, nc: nc });
        continue;
      }
      if (/^\s*>/.test(ln)) {
        var paras = [], cur = [];
        while (i < L.length && /^\s*>/.test(L[i])) {
          var q = L[i].replace(/^\s*>\s?/, '');
          if (!q.trim()) { if (cur.length) { paras.push(cur.join(' ')); cur = []; } }
          else cur.push(q.trim());
          i++;
        }
        if (cur.length) paras.push(cur.join(' '));
        B.push({ t: 'quote', paras: paras.map(parseInline) });
        continue;
      }
      var lm = LI_RE.exec(ln);
      if (lm) {
        var items = [], stack = [], cnt = [];
        while (i < L.length) {
          var l2 = L[i], m2 = LI_RE.exec(l2);
          if (!l2.trim()) {
            var j = i + 1;
            while (j < L.length && !L[j].trim()) j++;
            if (j < L.length && LI_RE.test(L[j])) { i = j; continue; }
            break;
          }
          if (m2) {
            var ind = m2[1].length;
            while (stack.length && ind < stack[stack.length - 1]) stack.pop();
            if (!stack.length || ind > stack[stack.length - 1]) stack.push(ind);
            var lvl = Math.min(stack.length - 1, 3);
            var ordered = /\d/.test(m2[2].charAt(0)), num = 0;
            cnt.length = lvl + 1;
            if (ordered) {
              if (!cnt[lvl]) cnt[lvl] = parseInt(m2[2], 10) - 1;
              cnt[lvl]++;
              num = cnt[lvl];
            } else cnt[lvl] = 0;
            items.push({ lvl: lvl, ordered: ordered, num: num, raw: m2[3] });
            i++;
          } else if (/^\s{2,}\S/.test(l2) && items.length && !startsBlock(L, i)) {
            var last = items[items.length - 1];
            last.raw += ' ' + l2.trim();
            i++;
          } else break;
        }
        items.forEach(function (it0) { it0.r = parseInline(it0.raw); delete it0.raw; });
        B.push({ t: 'list', items: items });
        continue;
      }
      var pl = [tr];
      i++;
      while (i < L.length && !startsBlock(L, i)) { pl.push(L[i].trim()); i++; }
      B.push({ t: 'p', r: parseInline(pl.join(' ')) });
    }
    return B;
  }

  /* ------------------------------------------------------------ PDF */
  var WIN_SPECIAL = {
    0x20AC: 128, 0x201A: 130, 0x0192: 131, 0x201E: 132, 0x2026: 133, 0x2020: 134, 0x2021: 135, 0x02C6: 136,
    0x2030: 137, 0x0160: 138, 0x2039: 139, 0x0152: 140, 0x017D: 142, 0x2018: 145, 0x2019: 146, 0x201C: 147,
    0x201D: 148, 0x2022: 149, 0x2013: 150, 0x2014: 151, 0x02DC: 152, 0x2122: 153, 0x0161: 154, 0x203A: 155,
    0x0153: 156, 0x017E: 158, 0x0178: 159
  };
  var WIN_REPL = {
    0x2192: '->', 0x2190: '<-', 0x2194: '<->', 0x21D2: '=>', 0x2264: '<=', 0x2265: '>=', 0x2260: '!=',
    0x2212: '-', 0x2010: '-', 0x2011: '-', 0x2012: '-', 0x2015: '-', 0x2009: ' ', 0x200A: ' ', 0x2002: ' ',
    0x2003: ' ', 0x202F: ' ', 0x2032: "'", 0x2033: '"', 0x2713: 'v', 0x2714: 'v', 0x2717: 'x', 0x2718: 'x',
    0x2605: '*', 0x2606: '*', 0x25CF: '\u0095', 0x25AA: '\u0095', 0x25E6: '-', 0x2248: '~', 0x221E: 'inf',
    0x200B: '', 0x200C: '', 0x200D: '', 0xFEFF: '', 0x00AD: '-', 0x2044: '/', 0x2215: '/'
  };
  function toWin(s) {
    s = String(s == null ? '' : s);
    try { s = s.normalize('NFC'); } catch (e) { /* sin normalize */ }
    var o = '', i, cp, k;
    for (i = 0; i < s.length; i++) {
      cp = s.charCodeAt(i);
      if (cp >= 0xD800 && cp <= 0xDBFF && i + 1 < s.length) {
        var d = s.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { i++; o += '?'; continue; }
      }
      if (cp === 9) { o += '    '; continue; }
      if (cp === 10 || cp === 13) { o += ' '; continue; }
      if (cp < 32 || cp === 127 || (cp >= 0x80 && cp <= 0x9F)) continue;
      if (cp < 127 || (cp >= 160 && cp <= 255)) { o += String.fromCharCode(cp); continue; }
      if (WIN_SPECIAL[cp]) { o += String.fromCharCode(WIN_SPECIAL[cp]); continue; }
      if (WIN_REPL[cp] !== undefined) { o += WIN_REPL[cp]; continue; }
      if (cp >= 0x300 && cp <= 0x36F) continue;
      k = String.fromCharCode(cp);
      try {
        var base = k.normalize('NFD').charAt(0);
        var bc = base.charCodeAt(0);
        if (bc !== cp && bc >= 32 && bc < 127) { o += base; continue; }
      } catch (e2) { /* nada */ }
      o += '?';
    }
    return o;
  }
  function pdfStr(s) {
    var o = '(';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c === 92 || c === 40 || c === 41) o += '\\' + s.charAt(i);
      else if (c < 32 || c > 126) o += '\\' + ('00' + (c & 255).toString(8)).slice(-3);
      else o += s.charAt(i);
    }
    return o + ')';
  }
  function fmt(n) { return (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, ''); }

  var WR = [], WB = [];
  (function () {
    function arr(a) { return a; }
    var reg = [].concat(
      [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278],
      [556, 556, 556, 556, 556, 556, 556, 556, 556, 556],
      [278, 278, 584, 584, 584, 556, 1015],
      [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611],
      [278, 278, 278, 469, 556, 333],
      [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500],
      [334, 260, 334, 584]);
    var bold = [].concat(
      [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278],
      [556, 556, 556, 556, 556, 556, 556, 556, 556, 556],
      [333, 333, 584, 584, 584, 611, 975],
      [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611],
      [333, 278, 333, 584, 556, 333],
      [556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500],
      [389, 280, 389, 584]);
    var misc = {
      128: 556, 130: 222, 131: 556, 132: 333, 133: 1000, 134: 556, 135: 556, 136: 333, 137: 1000, 139: 333, 140: 1000,
      145: 222, 146: 222, 147: 333, 148: 333, 149: 350, 150: 556, 151: 1000, 152: 333, 153: 1000, 155: 333, 156: 944,
      160: 278, 161: 333, 162: 556, 163: 556, 164: 556, 165: 556, 166: 260, 167: 556, 168: 333, 169: 737, 170: 370,
      171: 556, 172: 584, 173: 333, 174: 737, 175: 333, 176: 400, 177: 584, 178: 333, 179: 333, 180: 333, 181: 556,
      182: 537, 183: 278, 184: 333, 185: 333, 186: 365, 187: 556, 188: 834, 189: 834, 190: 834, 191: 611, 198: 1000,
      208: 722, 215: 584, 216: 778, 222: 667, 223: 611, 230: 889, 240: 556, 247: 584, 248: 611, 254: 556
    };
    var miscB = { 130: 278, 132: 500, 145: 278, 146: 278, 147: 500, 148: 500, 181: 611, 191: 611, 223: 611, 240: 611, 254: 611, 248: 611, 216: 778 };
    var acc = {
      A: 'ÀÁÂÃÄÅ', C: 'Ç', E: 'ÈÉÊË', I: 'ÌÍÎÏ',
      N: 'Ñ', O: 'ÒÓÔÕÖ', U: 'ÙÚÛÜ', Y: 'ÝŸ', S: 'Š', Z: 'Ž',
      a: 'àáâãäå', c: 'ç', e: 'èéêë', i: 'ìíîï',
      n: 'ñ', o: 'òóôõö', u: 'ùúûü', y: 'ýÿ', s: 'š', z: 'ž'
    };
    var b;
    for (b = 0; b < 256; b++) { WR[b] = 556; WB[b] = 556; }
    for (b = 32; b < 127; b++) { WR[b] = reg[b - 32]; WB[b] = bold[b - 32]; }
    for (b in misc) { WR[b] = misc[b]; WB[b] = miscB[b] !== undefined ? miscB[b] : misc[b]; }
    Object.keys(acc).forEach(function (base) {
      var bc = base.charCodeAt(0);
      acc[base].split('').forEach(function (ch) {
        var cp = ch.charCodeAt(0), byte = cp <= 255 ? cp : WIN_SPECIAL[cp];
        WR[byte] = WR[bc]; WB[byte] = WB[bc];
        if (base === 'i' || base === 'I') { WR[byte] = 278; WB[byte] = 278; }
      });
    });
    arr(0);
  })();

  function charW(code, font) {
    if (font === 'C') return 600;
    var w = (font === 'B' || font === 'BI') ? WB[code] : WR[code];
    return w === undefined ? 556 : w;
  }
  function strW(s, font, sz) {
    var w = 0;
    for (var i = 0; i < s.length; i++) w += charW(s.charCodeAt(i) & 255, font);
    return w * sz / 1000;
  }
  function runsToTokens(runs, size, forceB, forceI) {
    var toks = [];
    runs.forEach(function (r) {
      var bb = r.b || forceB, ii = r.i || forceI;
      var font = r.c ? 'C' : bb ? (ii ? 'BI' : 'B') : (ii ? 'I' : 'R');
      var sz = r.c ? size * 0.9 : size;
      var parts = toWin(r.t).split(/( +)/);
      parts.forEach(function (p) {
        if (!p) return;
        toks.push({ s: p, f: font, z: sz, sp: p.charAt(0) === ' ', w: strW(p, font, sz) });
      });
    });
    return toks;
  }
  function wrapTokens(toks, width) {
    var lines = [], cur = [], cw = 0, lim = width;
    function push() {
      while (cur.length && cur[cur.length - 1].sp) cw -= cur.pop().w;
      lines.push({ t: cur, w: cw });
      cur = []; cw = 0;
    }
    toks.forEach(function (tok) {
      if (tok.sp) { if (cur.length) { cur.push(tok); cw += tok.w; } return; }
      if (cw + tok.w <= lim + 0.01) { cur.push(tok); cw += tok.w; return; }
      if (cur.length) push();
      if (tok.w <= lim) { cur.push(tok); cw = tok.w; return; }
      var s = tok.s, k = 0;
      while (k < s.length) {
        var seg = '', sw = 0;
        while (k < s.length) {
          var cwid = charW(s.charCodeAt(k) & 255, tok.f) * tok.z / 1000;
          if (sw + cwid > lim && seg) break;
          seg += s.charAt(k); sw += cwid; k++;
        }
        cur = [{ s: seg, f: tok.f, z: tok.z, sp: false, w: sw }]; cw = sw;
        if (k < s.length) push();
      }
    });
    if (cur.length || !lines.length) push();
    return lines;
  }
  var FN = { R: 'F1', B: 'F2', I: 'F3', BI: 'F4', C: 'F5' };
  function drawLine(pg, x, base, line, color) {
    var segs = [], cx = x, seg = null;
    line.t.forEach(function (tk) {
      if (seg && seg.f === tk.f && seg.z === tk.z) { seg.s += tk.s; }
      else { seg = { s: tk.s, f: tk.f, z: tk.z, x: cx }; segs.push(seg); }
      cx += tk.w;
    });
    if (!segs.length) return;
    var ops = segs.map(function (g) {
      return 'BT /' + FN[g.f] + ' ' + fmt(g.z) + ' Tf ' + fmt(g.x) + ' ' + fmt(base) + ' Td ' + pdfStr(g.s) + ' Tj ET';
    }).join(' ');
    pg.push(color ? 'q ' + color + ' ' + ops + ' Q' : ops);
  }

  function buildPdf(md, warnings) {
    var PW = 595, PH = 842, M = 62.4, CW = PW - 2 * M, TOP = PH - M, BOT = M;
    var blocks = parseMd(md), pages = [], pg = null, y = TOP, title = '';
    var ABORT = { abort: true };
    function np() {
      if (pages.length >= MAX_PAGES) throw ABORT;
      pg = []; pages.push(pg); y = TOP;
    }
    function need(h) { if (y - h < BOT && y < TOP - 0.5) np(); }
    np();
    function textBlock(runs, size, opt) {
      opt = opt || {};
      var toks = runsToTokens(runs, size, !!opt.b, !!opt.i);
      var lines = wrapTokens(toks, CW - (opt.indent || 0));
      var lh = size * 1.38;
      lines.forEach(function (ln) {
        need(lh);
        if (opt.bar) pg.push('q 0.75 g ' + fmt(M + 3) + ' ' + fmt(y - lh) + ' 2.5 ' + fmt(lh) + ' re f Q');
        drawLine(pg, M + (opt.indent || 0), y - lh * 0.76, ln, opt.color);
        y -= lh;
      });
    }
    try {
      blocks.forEach(function (b) {
        var size, before, n;
        if (b.t === 'h') {
          size = [0, 20, 16, 13][b.n]; before = [0, 16, 12, 10][b.n];
          if (!title) title = runsText(b.r);
          var toks = runsToTokens(b.r, size, true, false), lines = wrapTokens(toks, CW), lh = size * 1.3;
          need(before + lines.length * lh + 34);
          if (y < TOP - 0.5) y -= before;
          lines.forEach(function (ln) {
            need(lh);
            drawLine(pg, M, y - lh * 0.78, ln, '0.12 0.16 0.27 rg');
            y -= lh;
          });
          y -= 4;
        } else if (b.t === 'p') {
          textBlock(b.r, 11);
          y -= 7;
        } else if (b.t === 'list') {
          b.items.forEach(function (it) {
            var indent = 16 + it.lvl * 18, lh = 11 * 1.38;
            var lines = wrapTokens(runsToTokens(it.r, 11, false, false), CW - indent);
            var mk = it.ordered ? it.num + '.' : (it.lvl ? '-' : '\u0095');
            var mkTok = { s: mk, f: 'R', z: 11, sp: false, w: strW(mk, 'R', 11) };
            lines.forEach(function (ln, k) {
              need(lh);
              if (k === 0) drawLine(pg, M + indent - 4 - mkTok.w, y - lh * 0.76, { t: [mkTok], w: mkTok.w });
              drawLine(pg, M + indent, y - lh * 0.76, ln);
              y -= lh;
            });
            y -= 2.5;
          });
          y -= 5;
        } else if (b.t === 'quote') {
          b.paras.forEach(function (r) {
            textBlock(r, 11, { i: true, indent: 16, bar: true, color: '0.3 g' });
            y -= 4;
          });
          y -= 3;
        } else if (b.t === 'code') {
          var cpl = Math.floor((CW - 12) / 5.4), clh = 12.2;
          y -= 3;
          b.lines.forEach(function (raw) {
            var s = toWin(raw), chunks = [];
            if (!s.length) chunks.push('');
            for (var q = 0; q < s.length; q += cpl) chunks.push(s.slice(q, q + cpl));
            chunks.forEach(function (c) {
              need(clh);
              pg.push('q 0.95 g ' + fmt(M) + ' ' + fmt(y - clh) + ' ' + fmt(CW) + ' ' + fmt(clh) + ' re f Q');
              if (c) pg.push('BT /F5 9 Tf ' + fmt(M + 6) + ' ' + fmt(y - clh * 0.76) + ' Td ' + pdfStr(c) + ' Tj ET');
              y -= clh;
            });
          });
          y -= 8;
        } else if (b.t === 'hr') {
          need(14);
          y -= 7;
          pg.push('q 0.7 G 0.75 w ' + fmt(M) + ' ' + fmt(y) + ' m ' + fmt(M + CW) + ' ' + fmt(y) + ' l S Q');
          y -= 7;
        } else if (b.t === 'pb') {
          if (y < TOP - 0.5) np();
        } else if (b.t === 'table') {
          pdfTable(b);
        }
        n = 0;
      });
    } catch (e) {
      if (e !== ABORT) throw e;
      warnings.push('El documento superaba el maximo de ' + MAX_PAGES + ' paginas y se recorto.');
    }

    function pdfTable(b) {
      var rows = b.rows, nc = b.nc, size = 9.5, lh = 12.5, pad = 4, c, r;
      var toks = rows.map(function (row, ri) {
        var a = [];
        for (var cc = 0; cc < nc; cc++) a.push(runsToTokens(row[cc] || [], size, ri === 0, false));
        return a;
      });
      var nat = [], mn = [];
      for (c = 0; c < nc; c++) {
        var nw = 0, mw = 0;
        for (r = 0; r < rows.length; r++) {
          var tt = toks[r][c], sum = 0;
          tt.forEach(function (k) { sum += k.w; if (!k.sp) mw = Math.max(mw, k.w); });
          nw = Math.max(nw, sum);
        }
        nat[c] = Math.min(Math.max(nw + 2 * pad, 28), CW);
        mn[c] = Math.min(mw + 2 * pad, nat[c]);
      }
      var sumN = 0, sumM = 0, widths = [];
      for (c = 0; c < nc; c++) { sumN += nat[c]; sumM += mn[c]; }
      if (sumN <= CW) widths = nat.slice();
      else if (sumM >= CW) widths = mn.map(function (w) { return w * CW / sumM; });
      else {
        var extra = CW - sumM, den = sumN - sumM;
        widths = nat.map(function (w, k) { return mn[k] + (w - mn[k]) * extra / den; });
      }
      var maxLines = Math.max(1, Math.floor(((TOP - BOT) * 0.45 - 2 * pad) / lh));
      var lay = toks.map(function (rowT) {
        var cells = rowT.map(function (t, k) {
          var ls = wrapTokens(t, Math.max(8, widths[k] - 2 * pad));
          return ls.length > maxLines ? ls.slice(0, maxLines) : ls;
        });
        var most = 1;
        cells.forEach(function (l) { most = Math.max(most, l.length); });
        return { cells: cells, h: most * lh + 2 * pad };
      });
      function drawRow(ri) {
        var rw = lay[ri], x = M, top = y;
        for (var k = 0; k < nc; k++) {
          var w = widths[k];
          pg.push('q ' + (ri === 0 ? '0.92 g ' : '') + '0.5 w 0.55 G ' + fmt(x) + ' ' + fmt(top - rw.h) + ' ' + fmt(w) + ' ' + fmt(rw.h) + ' re ' + (ri === 0 ? 'B' : 'S') + ' Q');
          rw.cells[k].forEach(function (line, q) {
            if (line.t.length) drawLine(pg, x + pad, top - pad - q * lh - size * 0.95, line);
          });
          x += w;
        }
        y -= rw.h;
      }
      y -= 2;
      for (var ri = 0; ri < lay.length; ri++) {
        if (y - lay[ri].h < BOT && y < TOP - 0.5) {
          np();
          if (ri > 0) drawRow(0);
        }
        drawRow(ri);
      }
      y -= 9;
    }

    /* ensamblado del archivo */
    var total = pages.length, objs = [];
    var fontNames = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique', 'Courier'];
    var kids = [], i;
    for (i = 0; i < total; i++) kids.push((9 + 2 * i) + ' 0 R');
    var ttl = toWin(title).replace(/[^\x20-\x7E\xA0-\xFF]/g, '').slice(0, 120);
    objs[1] = '<< /Type /Catalog /Pages 2 0 R /Lang (es-ES) >>';
    objs[2] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + total + ' >>';
    objs[3] = '<< /Producer (Calex) /Creator (Calex)' + (ttl ? ' /Title ' + pdfStr(ttl) : '') + ' >>';
    fontNames.forEach(function (fnm, k) {
      objs[4 + k] = '<< /Type /Font /Subtype /Type1 /BaseFont /' + fnm + ' /Encoding /WinAnsiEncoding >>';
    });
    var res = '<< /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R /F5 8 0 R >> >>';
    pages.forEach(function (ops, k) {
      var label = toWin('Página ' + (k + 1) + ' de ' + total);
      var fw = strW(label, 'R', 9);
      var footer = 'q 0.4 g BT /F1 9 Tf ' + fmt(PW - M - fw) + ' 36 Td ' + pdfStr(label) + ' Tj ET Q';
      var data = ops.concat([footer]).join('\n');
      objs[9 + 2 * k] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources ' + res + ' /Contents ' + (10 + 2 * k) + ' 0 R >>';
      objs[10 + 2 * k] = '<< /Length ' + data.length + ' >>\nstream\n' + data + '\nendstream';
    });
    var out = '%PDF-1.4\n%âãÏÓ\n', offs = [];
    for (i = 1; i < objs.length; i++) {
      offs[i] = out.length;
      out += i + ' 0 obj\n' + objs[i] + '\nendobj\n';
    }
    var xrefAt = out.length;
    out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
    for (i = 1; i < objs.length; i++) out += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n';
    out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xrefAt + '\n%%EOF\n';
    var bytes = new Uint8Array(out.length);
    for (i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  }

  /* ------------------------------------------------------------ DOCX */
  function dRun(r, forceB) {
    var pr = '', b = r.b || forceB;
    if (r.c) pr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>';
    if (b) pr += '<w:b/>';
    if (r.i) pr += '<w:i/>';
    if (r.c) pr += '<w:sz w:val="20"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>';
    if (!r.t) return '';
    return '<w:r>' + (pr ? '<w:rPr>' + pr + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + xesc(r.t) + '</w:t></w:r>';
  }
  function dRuns(runs, forceB) { return runs.map(function (r) { return dRun(r, forceB); }).join(''); }
  function dPara(style, runs, extra, forceB) {
    var ppr = (style ? '<w:pStyle w:val="' + style + '"/>' : '') + (extra || '');
    return '<w:p>' + (ppr ? '<w:pPr>' + ppr + '</w:pPr>' : '') + dRuns(runs, forceB) + '</w:p>';
  }

  var W_STYLES = XDECL + '<w:styles xmlns:w="' + NS_W + '">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>' +
    '<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="es-ES" w:eastAsia="es-ES" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>' +
    '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/>' +
    '<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
    '<w:style w:type="numbering" w:default="1" w:styleId="NoList"><w:name w:val="No List"/><w:uiPriority w:val="99"/><w:semiHidden/></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>' +
    '<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1F2A44"/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>' +
    '<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="1F2A44"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>' +
    '<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:color w:val="1F2A44"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/>' +
    '<w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/></w:pPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="29"/><w:qFormat/>' +
    '<w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="BFBFBF"/></w:pBdr><w:ind w:left="567"/></w:pPr><w:rPr><w:i/><w:color w:val="404040"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:customStyle="1" w:styleId="Codigo"><w:name w:val="Código"/><w:basedOn w:val="Normal"/><w:qFormat/>' +
    '<w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>' +
    '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style>' +
    '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="39"/>' +
    '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>' +
    '<w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/>' +
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/>' +
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/></w:tblBorders></w:tblPr></w:style>' +
    '</w:styles>';

  function wNumbering(extraNums) {
    var abs = '', lv;
    function lvls(kind) {
      var s = '';
      for (lv = 0; lv < 9; lv++) {
        var left = 720 + lv * 360;
        s += '<w:lvl w:ilvl="' + lv + '"><w:start w:val="1"/><w:numFmt w:val="' + (kind ? 'decimal' : 'bullet') + '"/>' +
          '<w:lvlText w:val="' + (kind ? '%' + (lv + 1) + '.' : (lv % 2 ? '-' : '•')) + '"/><w:lvlJc w:val="left"/>' +
          '<w:pPr><w:ind w:left="' + left + '" w:hanging="360"/></w:pPr></w:lvl>';
      }
      return s;
    }
    abs += '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>' + lvls(0) + '</w:abstractNum>';
    abs += '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' + lvls(1) + '</w:abstractNum>';
    var nums = '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>';
    for (var k = 0; k < extraNums; k++) {
      nums += '<w:num w:numId="' + (k + 2) + '"><w:abstractNumId w:val="1"/>';
      for (lv = 0; lv < 4; lv++) nums += '<w:lvlOverride w:ilvl="' + lv + '"><w:startOverride w:val="1"/></w:lvlOverride>';
      nums += '</w:num>';
    }
    return XDECL + '<w:numbering xmlns:w="' + NS_W + '">' + abs + nums + '</w:numbering>';
  }

  async function buildDocx(md) {
    var blocks = parseMd(md), body = '', numCount = 0, title = '';
    blocks.forEach(function (b) {
      if (b.t === 'h') {
        if (!title) title = runsText(b.r);
        body += dPara('Heading' + b.n, b.r);
      } else if (b.t === 'p') {
        body += dPara('', b.r);
      } else if (b.t === 'list') {
        var ordId = 0;
        b.items.forEach(function (it) {
          var id = 1;
          if (it.ordered) { if (!ordId) { numCount++; ordId = numCount + 1; } id = ordId; }
          body += dPara('ListParagraph', it.r, '<w:numPr><w:ilvl w:val="' + it.lvl + '"/><w:numId w:val="' + id + '"/></w:numPr>');
        });
      } else if (b.t === 'quote') {
        b.paras.forEach(function (r) { body += dPara('Quote', r); });
      } else if (b.t === 'code') {
        if (!b.lines.length) b.lines = [''];
        b.lines.forEach(function (l) { body += '<w:p><w:pPr><w:pStyle w:val="Codigo"/></w:pPr>' + (l ? dRun({ t: l }) : '') + '</w:p>'; });
      } else if (b.t === 'hr') {
        body += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="A6A6A6"/></w:pBdr></w:pPr></w:p>';
      } else if (b.t === 'pb') {
        body += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      } else if (b.t === 'table') {
        var gw = Math.floor(9412 / b.nc), grid = '', c;
        for (c = 0; c < b.nc; c++) grid += '<w:gridCol w:w="' + gw + '"/>';
        var t = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/>' +
          '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>' + grid + '</w:tblGrid>';
        b.rows.forEach(function (row, ri) {
          t += '<w:tr>' + (ri === 0 ? '<w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' : '');
          row.forEach(function (cell) {
            t += '<w:tc><w:tcPr><w:tcW w:w="' + gw + '" w:type="dxa"/>' +
              (ri === 0 ? '<w:shd w:val="clear" w:color="auto" w:fill="E7ECF4"/>' : '') + '</w:tcPr>' +
              dPara('', cell, '<w:spacing w:before="40" w:after="40"/>', ri === 0) + '</w:tc>';
          });
          t += '</w:tr>';
        });
        body += t + '</w:tbl><w:p/>';
      }
    });
    if (!body) body = '<w:p/>';
    var sect = '<w:sectPr><w:footerReference w:type="default" r:id="rId4"/><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1247" w:right="1247" w:bottom="1247" w:left="1247" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';
    var doc = XDECL + '<w:document xmlns:w="' + NS_W + '" xmlns:r="' + NS_R + '"><w:body>' + body + sect + '</w:body></w:document>';
    var sz = '<w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>';
    function fld(instr) { return '<w:fldSimple w:instr=" ' + instr + ' "><w:r>' + sz + '<w:t>1</w:t></w:r></w:fldSimple>'; }
    var ftr = XDECL + '<w:ftr xmlns:w="' + NS_W + '" xmlns:r="' + NS_R + '"><w:p><w:pPr><w:pStyle w:val="Footer"/><w:jc w:val="right"/></w:pPr>' +
      '<w:r>' + sz + '<w:t xml:space="preserve">Página </w:t></w:r>' + fld('PAGE') +
      '<w:r>' + sz + '<w:t xml:space="preserve"> de </w:t></w:r>' + fld('NUMPAGES') + '</w:p></w:ftr>';
    var wct = 'application/vnd.openxmlformats-officedocument.wordprocessingml.';
    return packOoxml([
      ['[Content_Types].xml', ctXml([
        ['/word/document.xml', wct + 'document.main+xml'], ['/word/styles.xml', wct + 'styles+xml'],
        ['/word/numbering.xml', wct + 'numbering+xml'], ['/word/footer1.xml', wct + 'footer+xml'],
        ['/docProps/core.xml', CT_CORE], ['/docProps/app.xml', CT_APP]])],
      ['_rels/.rels', relsXml([
        { id: 'rId1', type: RT + 'officeDocument', target: 'word/document.xml' },
        { id: 'rId2', type: RT_CORE, target: 'docProps/core.xml' },
        { id: 'rId3', type: RT + 'extended-properties', target: 'docProps/app.xml' }])],
      ['docProps/core.xml', coreXml(title)],
      ['docProps/app.xml', appXml()],
      ['word/document.xml', doc],
      ['word/_rels/document.xml.rels', relsXml([
        { id: 'rId1', type: RT + 'styles', target: 'styles.xml' },
        { id: 'rId2', type: RT + 'numbering', target: 'numbering.xml' },
        { id: 'rId4', type: RT + 'footer', target: 'footer1.xml' }])],
      ['word/styles.xml', W_STYLES],
      ['word/numbering.xml', wNumbering(numCount)],
      ['word/footer1.xml', ftr]
    ]);
  }

  /* ------------------------------------------------------------ XLSX */
  var FN_OK = { SUM: 1, AVERAGE: 1, MIN: 1, MAX: 1, COUNT: 1, ROUND: 1, IF: 1, ABS: 1, SUMIF: 1, COUNTIF: 1, AVERAGEIF: 1, CONCATENATE: 1, TODAY: 1 };
  function colIndex(letters) {
    var n = 0;
    for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) & 31);
    return n;
  }
  function colName(n) {
    var s = '';
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  function cleanFormula(t) {
    var s = t.slice(1);
    if (s.length > 500) return null;
    var out = '', i = 0, depth = 0, m, rest, tk = [];
    while (i < s.length) {
      var c = s.charAt(i);
      if (c === ' ') { out += c; i++; continue; }
      if (c === '"') {
        var j = i + 1, lit = '';
        while (j < s.length) {
          if (s.charAt(j) === '"') {
            if (s.charAt(j + 1) === '"') { lit += '""'; j += 2; continue; }
            break;
          }
          lit += s.charAt(j); j++;
        }
        if (j >= s.length || /[\u0000-\u001F]/.test(lit)) return null;
        out += '"' + lit + '"'; tk.push('v'); i = j + 1; continue;
      }
      rest = s.slice(i);
      m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?::(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7}))?(?![A-Za-z0-9_(.!\[])/.exec(rest);
      if (m) {
        if (colIndex(m[2].toUpperCase()) > 16384 || parseInt(m[4], 10) > 1048576 || parseInt(m[4], 10) < 1) return null;
        if (m[6] && (colIndex(m[6].toUpperCase()) > 16384 || parseInt(m[8], 10) > 1048576 || parseInt(m[8], 10) < 1)) return null;
        out += m[0].toUpperCase(); tk.push('v'); i += m[0].length; continue;
      }
      m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest);
      if (m) {
        var nm = m[0].toUpperCase();
        if (s.charAt(i + m[0].length) === '(') { if (!FN_OK[nm]) return null; tk.push('f:' + nm); }
        else if (nm !== 'TRUE' && nm !== 'FALSE') return null;
        else tk.push('v');
        out += nm; i += m[0].length; continue;
      }
      m = /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?%?/.exec(rest);
      if (m) { out += m[0]; tk.push('v'); i += m[0].length; continue; }
      if (c === '(') { depth++; out += c; tk.push('('); i++; continue; }
      if (c === ')') { depth--; if (depth < 0) return null; out += c; tk.push(')'); i++; continue; }
      if (c === ',' || c === ';') { out += ','; tk.push(','); i++; continue; }
      if ('+-*/^&'.indexOf(c) >= 0) { out += c; tk.push(c); i++; continue; }
      if (c === '<' || c === '>' || c === '=') {
        var two = s.substr(i, 2);
        if (two === '<=' || two === '>=' || two === '<>') { out += two; tk.push(two); i += 2; } else { out += c; tk.push(c); i++; }
        continue;
      }
      return null;
    }
    if (depth !== 0 || !out.trim()) return null;
    if (!validFormula(tk)) return null;
    return out;
  }
  /* Gramatica minima de Excel: Excel repara (y descarta) el libro si una formula no es sintacticamente valida. */
  var FN_ARITY = { SUM: [1, 255], AVERAGE: [1, 255], MIN: [1, 255], MAX: [1, 255], COUNT: [1, 255], ROUND: [2, 2], IF: [2, 3],
    ABS: [1, 1], SUMIF: [2, 3], COUNTIF: [2, 2], AVERAGEIF: [2, 3], CONCATENATE: [1, 255], TODAY: [0, 0] };
  function validFormula(tk) {
    var p = 0, steps = 0;
    function peek() { return tk[p]; }
    function expr() {
      if (++steps > 5000) throw new Error('x');
      var ok = add();
      while (ok && /^(=|<>|<|>|<=|>=|&)$/.test(peek() || '')) { p++; ok = add(); }
      return ok;
    }
    function add() {
      var ok = mul();
      while (ok && (peek() === '+' || peek() === '-')) { p++; ok = mul(); }
      return ok;
    }
    function mul() {
      var ok = pow();
      while (ok && (peek() === '*' || peek() === '/')) { p++; ok = pow(); }
      return ok;
    }
    function pow() {
      var ok = unary();
      while (ok && peek() === '^') { p++; ok = unary(); }
      return ok;
    }
    function unary() {
      while (peek() === '+' || peek() === '-') p++;
      return prim();
    }
    function prim() {
      var t = peek();
      if (t === 'v') { p++; return true; }
      if (t === '(') { p++; if (!expr() || peek() !== ')') return false; p++; return true; }
      if (t && t.slice(0, 2) === 'f:') {
        var ar = FN_ARITY[t.slice(2)], n = 0;
        p++;
        if (peek() !== '(') return false;
        p++;
        if (peek() !== ')') {
          for (;;) {
            if (!expr()) return false;
            n++;
            if (peek() === ',') { p++; continue; }
            break;
          }
        }
        if (peek() !== ')') return false;
        p++;
        return n >= ar[0] && n <= ar[1];
      }
      return false;
    }
    try { return expr() && p === tk.length; } catch (e) { return false; }
  }

  function parseNum(t) {
    if (!/^-?[\d.,]+$/.test(t) || !/\d/.test(t)) return null;
    var neg = t.charAt(0) === '-', u = neg ? t.slice(1) : t, norm;
    if (/^0\d/.test(u)) return null;
    var lc = u.lastIndexOf(','), ld = u.lastIndexOf('.');
    if (lc >= 0 && ld >= 0) {
      var dec = Math.max(lc, ld), thou = lc > ld ? '.' : ',';
      var ip = u.slice(0, dec), fr = u.slice(dec + 1);
      if (!/^\d+$/.test(fr)) return null;
      var parts = ip.split(thou);
      if (!/^\d{1,3}$/.test(parts[0]) || !parts.slice(1).every(function (p) { return /^\d{3}$/.test(p); })) return null;
      norm = parts.join('') + '.' + fr;
    } else if (lc >= 0 || ld >= 0) {
      var sep = lc >= 0 ? ',' : '.', ps = u.split(sep);
      if (ps.length > 2) {
        if (!(/^\d{1,3}$/.test(ps[0]) && ps.slice(1).every(function (p) { return /^\d{3}$/.test(p); }))) return null;
        norm = ps.join('');
      } else {
        if (!/^\d+$/.test(ps[0]) || !/^\d+$/.test(ps[1])) return null;
        norm = ps[0] + '.' + ps[1];
      }
    } else {
      if (!/^\d+$/.test(u)) return null;
      norm = u;
    }
    if (norm.replace(/\D/g, '').length > 15) return null;
    var v = parseFloat(norm);
    if (!isFinite(v)) return null;
    return neg ? -v : v;
  }

  function classify(raw) {
    var t = String(raw).trim();
    if (!t) return null;
    if (t.charAt(0) === '=') {
      var f = cleanFormula(t);
      if (f) return { k: 'f', v: f, st: /^TODAY\(\s*\)$/.test(f) ? 2 : 0 };
      return { k: 's', v: "'" + t };
    }
    var m = /^(-?\d+(?:[.,]\d+)?)\s*%$/.exec(t);
    if (m) {
      var pv = parseFloat(m[1].replace(',', '.'));
      return { k: 'n', v: parseFloat((pv / 100).toPrecision(12)), st: /[.,]/.test(m[1]) ? 4 : 3 };
    }
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (m) {
      var y = +m[1], mo = +m[2], d = +m[3], dt = new Date(Date.UTC(y, mo - 1, d));
      if (y >= 1900 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d) {
        var serial = Math.round((dt.getTime() - Date.UTC(1899, 11, 30)) / 86400000);
        if (serial >= 61) return { k: 'n', v: serial, st: 2 }; /* antes de 1900-03-01 Excel desplaza un dia: queda como texto */
      }
    }
    var nv = parseNum(t);
    if (nv !== null) return { k: 'n', v: nv, st: 0 };
    return { k: 's', v: t };
  }

  function parseCsv(text) {
    var first = '', i;
    for (i = 0; i < text.length; i++) { if (text.charAt(i) === '\n') break; first += text.charAt(i); }
    var best = ',', bc = -1, cands = [',', ';', '\t'];
    cands.forEach(function (d) {
      var q = false, n = 0;
      for (var k = 0; k < first.length; k++) {
        var ch = first.charAt(k);
        if (ch === '"') q = !q; else if (!q && ch === d) n++;
      }
      if (n > bc) { bc = n; best = d; }
    });
    var rows = [], row = [], cur = '', q2 = false;
    for (i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (q2) {
        if (c === '"') { if (text.charAt(i + 1) === '"') { cur += '"'; i++; } else q2 = false; }
        else cur += c;
      } else if (c === '"' && !cur) q2 = true;
      else if (c === best) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); });
  }

  function sheetRows(lines) {
    var nonBlank = lines.filter(function (l) { return l.trim(); });
    var withPipe = nonBlank.filter(function (l) { return l.indexOf('|') >= 0; }).length;
    if (nonBlank.length && withPipe * 2 >= nonBlank.length) {
      var rows = [];
      nonBlank.forEach(function (l) { if (!SEP_RE.test(l)) rows.push(splitRow(l)); });
      return rows;
    }
    return parseCsv(lines.join('\n'));
  }

  function parseSheets(text, warnings) {
    var lines = text.replace(/^﻿/, '').split(/\r\n?|\n/), sheets = [], cur = null;
    var HRE = /^\s*##\s*Hoja\s*:/i;
    var anyHeader = lines.some(function (l) { return HRE.test(l); });
    lines.forEach(function (l) {
      var m = HRE.exec(l);
      if (m) { cur = { name: l.slice(m[0].length).trim(), lines: [] }; sheets.push(cur); return; }
      if (!cur) {
        if (anyHeader || !l.trim()) return;
        cur = { name: 'Hoja 1', lines: [] }; sheets.push(cur);
      }
      cur.lines.push(l);
    });
    if (!sheets.length) sheets.push({ name: 'Hoja 1', lines: [] });
    if (sheets.length > MAX_SHEETS) { sheets = sheets.slice(0, MAX_SHEETS); warnings.push('Se recortaron las hojas al maximo de ' + MAX_SHEETS + '.'); }
    var used = {};
    sheets.forEach(function (sh, idx) {
      var nm = String(sh.name || '').replace(/[\[\]:*?\/\\\u0000-\u001F]/g, '-').replace(/^'+|'+$/g, '').trim();
      if (!nm) nm = 'Hoja ' + (idx + 1);
      nm = nm.slice(0, 31).replace(/^'+|'+$/g, '').trim();
      if (!nm) nm = 'Hoja ' + (idx + 1);
      if (/^history$/i.test(nm)) nm += '_';
      var base = nm, k = 2;
      while (used[nm.toLowerCase()]) { var suf = ' (' + k + ')'; nm = base.slice(0, 31 - suf.length).replace(/'+$/, '') + suf; k++; }
      used[nm.toLowerCase()] = 1;
      sh.name = nm;
      var rows = sheetRows(sh.lines);
      if (rows.length > MAX_SHEET_ROWS) { rows = rows.slice(0, MAX_SHEET_ROWS); warnings.push('Hoja ' + nm + ': filas recortadas.'); }
      rows = rows.map(function (r) { return r.length > MAX_SHEET_COLS ? r.slice(0, MAX_SHEET_COLS) : r; });
      sh.rows = rows;
    });
    return sheets;
  }

  var X_STYLES = XDECL + '<styleSheet xmlns="' + NS_S + '">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left/><right/><top/><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  async function buildXlsx(text, warnings) {
    var sheets = parseSheets(text, warnings);
    var sst = [], sstMap = {}, sstCount = 0, longCell = false;
    function si(s) {
      sstCount++;
      var k = '$' + s;
      if (sstMap[k] === undefined) { sstMap[k] = sst.length; sst.push(s); }
      return sstMap[k];
    }
    var sheetXmls = sheets.map(function (sh, idx) {
      var rows = sh.rows, maxC = 0, widths = [], xml = '', lastRow = rows.length;
      rows.forEach(function (r) { maxC = Math.max(maxC, r.length); });
      rows.forEach(function (r, ri) {
        var cells = '';
        r.forEach(function (raw, ci) {
          var cl = classify(raw);
          if (!cl) return;
          if (cl.k !== 'n' && cl.v.length > 32000) { cl.v = cl.v.slice(0, 32000); longCell = true; if (cl.k === 'f') cl = { k: 's', v: "'" + cl.v }; }
          var ref = colName(ci + 1) + (ri + 1), disp;
          var hdr = ri === 0;
          if (cl.k === 's') { cells += '<c r="' + ref + '" t="s"' + (hdr ? ' s="1"' : '') + '><v>' + si(cl.v) + '</v></c>'; disp = cl.v; }
          else if (cl.k === 'n') { cells += '<c r="' + ref + '"' + (hdr ? ' s="1"' : (cl.st ? ' s="' + cl.st + '"' : '')) + '><v>' + String(cl.v) + '</v></c>'; disp = cl.st === 2 ? '0000-00-00' : String(cl.v); }
          else { cells += '<c r="' + ref + '"' + (hdr ? ' s="1"' : (cl.st ? ' s="' + cl.st + '"' : '')) + '><f>' + xesc(cl.v) + '</f></c>'; disp = '0000000000'; }
          var len = 0, parts = String(disp).split('\n');
          parts.forEach(function (p) { len = Math.max(len, p.length); });
          widths[ci] = Math.max(widths[ci] || 0, len + (hdr ? 2 : 0));
        });
        if (cells) xml += '<row r="' + (ri + 1) + '">' + cells + '</row>';
      });
      var hasData = rows.length > 0 && maxC > 0;
      var ref = hasData ? 'A1:' + colName(maxC) + lastRow : 'A1';
      var cols = '';
      for (var c = 0; c < maxC; c++) {
        var w = Math.min(60, Math.max(8, (widths[c] || 0) + 3));
        cols += '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + w + '" customWidth="1"/>';
      }
      sh.ref = ref; sh.hasData = hasData;
      return XDECL + '<worksheet xmlns="' + NS_S + '" xmlns:r="' + NS_R + '"><dimension ref="' + ref + '"/>' +
        '<sheetViews><sheetView workbookViewId="0"' + (idx === 0 ? ' tabSelected="1"' : '') + '>' +
        (hasData ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' : '') +
        '</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>' +
        (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + xml + '</sheetData>' +
        (hasData ? '<autoFilter ref="' + ref + '"/>' : '') + '</worksheet>';
    });
    if (longCell) warnings.push('Hay celdas con mas de 32000 caracteres; se recortaron (limite de Excel).');
    var sstXml = XDECL + '<sst xmlns="' + NS_S + '" count="' + sstCount + '" uniqueCount="' + sst.length + '">' +
      sst.map(function (s) { return '<si><t xml:space="preserve">' + xesc(s) + '</t></si>'; }).join('') + '</sst>';
    var names = '';
    sheets.forEach(function (sh, i) {
      if (!sh.hasData) return;
      var abs = sh.ref.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2');
      names += '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + xesc(sh.name.replace(/'/g, "''")) + '\'!' + abs + '</definedName>';
    });
    var wb = XDECL + '<workbook xmlns="' + NS_S + '" xmlns:r="' + NS_R + '"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews><sheets>' +
      sheets.map(function (sh, i) { return '<sheet name="' + xesc(sh.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') +
      '</sheets>' + (names ? '<definedNames>' + names + '</definedNames>' : '') + '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>';
    var n = sheets.length;
    var rels = sheets.map(function (sh, i) { return { id: 'rId' + (i + 1), type: RT + 'worksheet', target: 'worksheets/sheet' + (i + 1) + '.xml' }; });
    rels.push({ id: 'rId' + (n + 1), type: RT + 'styles', target: 'styles.xml' });
    rels.push({ id: 'rId' + (n + 2), type: RT + 'sharedStrings', target: 'sharedStrings.xml' });
    var sct = 'application/vnd.openxmlformats-officedocument.spreadsheetml.';
    var over = [['/xl/workbook.xml', sct + 'sheet.main+xml']];
    sheets.forEach(function (sh, i) { over.push(['/xl/worksheets/sheet' + (i + 1) + '.xml', sct + 'worksheet+xml']); });
    over.push(['/xl/styles.xml', sct + 'styles+xml'], ['/xl/sharedStrings.xml', sct + 'sharedStrings+xml'],
      ['/docProps/core.xml', CT_CORE], ['/docProps/app.xml', CT_APP]);
    var parts = [
      ['[Content_Types].xml', ctXml(over)],
      ['_rels/.rels', relsXml([
        { id: 'rId1', type: RT + 'officeDocument', target: 'xl/workbook.xml' },
        { id: 'rId2', type: RT_CORE, target: 'docProps/core.xml' },
        { id: 'rId3', type: RT + 'extended-properties', target: 'docProps/app.xml' }])],
      ['docProps/core.xml', coreXml(sheets[0].name)],
      ['docProps/app.xml', appXml()],
      ['xl/workbook.xml', wb],
      ['xl/_rels/workbook.xml.rels', relsXml(rels)],
      ['xl/styles.xml', X_STYLES],
      ['xl/sharedStrings.xml', sstXml]
    ];
    sheetXmls.forEach(function (x, i) { parts.push(['xl/worksheets/sheet' + (i + 1) + '.xml', x]); });
    return packOoxml(parts);
  }

  /* ------------------------------------------------------------ PPTX */
  function parseSlides(text, warnings) {
    var lines = text.replace(/\r\n?/g, '\n').split('\n'), slides = [], cur = [];
    lines.forEach(function (l) {
      if (/^\s*---+\s*$/.test(l)) { slides.push(cur); cur = []; } else cur.push(l);
    });
    slides.push(cur);
    slides = slides.filter(function (s) { return s.some(function (l) { return l.trim(); }); });
    if (!slides.length) slides = [[]];
    if (slides.length > MAX_SLIDES) { slides = slides.slice(0, MAX_SLIDES); warnings.push('Se recortaron las diapositivas al maximo de ' + MAX_SLIDES + '.'); }
    var cut = false;
    return slides.map(function (ls) {
      var title = null, rest = [], k;
      for (k = 0; k < ls.length; k++) {
        var h = mdHead(ls[k], false);
        if (h && title === null) { title = h.t; rest = ls.slice(0, k).concat(ls.slice(k + 1)); break; }
      }
      if (title === null) {
        var f = -1;
        for (k = 0; k < ls.length; k++) if (ls[k].trim()) { f = k; break; }
        if (f >= 0) { title = ls[f].replace(/^\s*[-*+•]\s+/, '').trim(); rest = ls.slice(0, f).concat(ls.slice(f + 1)); }
        else { title = ''; rest = []; }
      }
      var paras = [];
      rest.forEach(function (l) {
        if (!l.trim()) return;
        if (paras.length >= 40) { if (!cut) { cut = true; warnings.push('Una diapositiva tenia mas de 40 lineas; se recortaron.'); } return; }
        if (SEP_RE.test(l) && l.indexOf('|') >= 0) return;
        var m = /^(\s*)[-*+•]\s+(.*)$/.exec(l);
        if (m) { paras.push({ k: 'b', lvl: m[1].length >= 2 ? 1 : 0, r: parseInline(m[2]) }); return; }
        m = /^(\s*)\d{1,3}[.)]\s+(.*)$/.exec(l);
        if (m) { paras.push({ k: 'n', lvl: m[1].length >= 2 ? 1 : 0, r: parseInline(m[2]) }); return; }
        m = mdHead(l, false);
        if (m) { paras.push({ k: 'h', lvl: 0, r: parseInline(m.t) }); return; }
        m = /^\s*>\s?(.*)$/.exec(l);
        if (m) { paras.push({ k: 'q', lvl: 0, r: parseInline(m[1]) }); return; }
        if (/^\s*\|/.test(l)) { paras.push({ k: 'p', lvl: 0, r: parseInline(splitRow(l).join('   |   ')) }); return; }
        paras.push({ k: 'p', lvl: 0, r: parseInline(l.trim()) });
      });
      return { title: runsText(parseInline(title)), paras: paras };
    });
  }

  function aRuns(runs, szPt, color, forceB, forceI) {
    var s = '';
    runs.forEach(function (r) {
      if (!r.t) return;
      var b = r.b || forceB, i = r.i || forceI;
      s += '<a:r><a:rPr lang="es-ES" sz="' + Math.round(szPt * 100) + '"' + (b ? ' b="1"' : '') + (i ? ' i="1"' : '') + ' dirty="0">' +
        '<a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill>' + (r.c ? '<a:latin typeface="Courier New"/>' : '') +
        '</a:rPr><a:t>' + xesc(r.t) + '</a:t></a:r>';
    });
    return s;
  }
  function estimateSize(paras) {
    var sizes = [28, 26, 24, 22, 20, 18, 16, 14, 12];
    for (var k = 0; k < sizes.length; k++) {
      var s = sizes[k], h = 0;
      for (var i = 0; i < paras.length; i++) {
        var p = paras[i], len = runsText(p.r).length, sz = p.lvl ? s - 2 : s;
        var cpl = Math.max(10, (820 - (p.lvl + 1) * 27) / (0.5 * sz));
        h += Math.max(1, Math.ceil(len / cpl)) * sz * 1.2 + 8;
      }
      if (h <= 340) return s;
    }
    return 12;
  }
  function sp(id, name, ph, x, y, cx, cy, anchor, paras, extra) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="' + name + '"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr>' + ph + '</p:nvPr></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm></p:spPr>' +
      '<p:txBody><a:bodyPr vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="' + anchor + '"><a:normAutofit/></a:bodyPr><a:lstStyle/>' +
      (paras || '<a:p><a:endParaRPr lang="es-ES"/></a:p>') + '</p:txBody></p:sp>' + (extra || '');
  }
  function rect(id, x, y, cx, cy, color) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Linea ' + id + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>' +
      '<a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>';
  }
  var GRP = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
  var PNS = 'xmlns:a="' + NS_A + '" xmlns:r="' + NS_R + '" xmlns:p="' + NS_P + '"';

  function slideXml(sl, cover) {
    var tree, bg = '', title = sl.title;
    if (cover) {
      bg = '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="1F2A44"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>';
      var tsz = title.length <= 40 ? 44 : title.length <= 70 ? 36 : 30;
      var tp = '<a:p><a:pPr algn="l"/>' + aRuns([{ t: title }], tsz, 'FFFFFF', true, false) + '</a:p>';
      var sub = sl.paras.slice(0, 6).map(function (p) {
        return '<a:p><a:pPr marL="0" indent="0" algn="l"><a:buNone/></a:pPr>' + aRuns(p.r, 22, 'D0D7E5', false, false) + '</a:p>';
      }).join('');
      tree = sp(2, 'Titulo 1', '<p:ph type="ctrTitle"/>', 914400, 1700000, 10363200, 1800000, 'b', tp) +
        rect(4, 914400, 3650000, 1200000, 45720, '5B9BD5') +
        sp(3, 'Subtitulo 2', '<p:ph type="subTitle" idx="1"/>', 914400, 3850000, 10363200, 1700000, 't', sub || null);
    } else {
      var ts = title.length <= 40 ? 32 : title.length <= 60 ? 28 : 24;
      var tpar = '<a:p>' + aRuns([{ t: title }], ts, '1F2A44', true, false) + '</a:p>';
      var size = estimateSize(sl.paras);
      var body = sl.paras.map(function (p) {
        var sz = p.lvl ? size - 2 : size, ppr, runs;
        if (p.k === 'b') ppr = '<a:pPr marL="' + (342900 + p.lvl * 342900) + '" indent="-285750" lvl="' + p.lvl + '"><a:spcBef><a:spcPts val="600"/></a:spcBef><a:buFont typeface="Arial"/><a:buChar char="•"/></a:pPr>';
        else if (p.k === 'n') ppr = '<a:pPr marL="' + (400050 + p.lvl * 342900) + '" indent="-400050" lvl="' + p.lvl + '"><a:spcBef><a:spcPts val="600"/></a:spcBef><a:buFont typeface="+mj-lt"/><a:buAutoNum type="arabicPeriod"/></a:pPr>';
        else ppr = '<a:pPr marL="0" indent="0"><a:spcBef><a:spcPts val="600"/></a:spcBef><a:buNone/></a:pPr>';
        runs = aRuns(p.r, sz, '333333', p.k === 'h', p.k === 'q');
        return '<a:p>' + ppr + runs + '</a:p>';
      }).join('');
      tree = sp(2, 'Titulo 1', '<p:ph type="title"/>', 609600, 380000, 10972800, 900000, 'ctr', tpar) +
        rect(4, 609600, 1330000, 1200000, 36000, '2F6DB5') +
        sp(3, 'Contenido 2', '<p:ph idx="1"/>', 609600, 1600000, 10972800, 4500000, 't', body || null);
    }
    return XDECL + '<p:sld ' + PNS + '><p:cSld>' + bg + '<p:spTree>' + GRP + tree + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
  }

  var THEME = XDECL + '<a:theme xmlns:a="' + NS_A + '" name="Calex"><a:themeElements>' +
    '<a:clrScheme name="Calex"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>' +
    '<a:dk2><a:srgbClr val="1F2A44"/></a:dk2><a:lt2><a:srgbClr val="EEF1F6"/></a:lt2>' +
    '<a:accent1><a:srgbClr val="2F6DB5"/></a:accent1><a:accent2><a:srgbClr val="5B9BD5"/></a:accent2>' +
    '<a:accent3><a:srgbClr val="70AD47"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>' +
    '<a:accent5><a:srgbClr val="ED7D31"/></a:accent5><a:accent6><a:srgbClr val="7F7F7F"/></a:accent6>' +
    '<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>' +
    '<a:fontScheme name="Calex"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
    '<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
    '<a:fmtScheme name="Calex"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
    '<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
    '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>' +
    '</a:themeElements></a:theme>';

  function lvlStyle(n, sz, bullet) {
    var s = '';
    for (var i = 1; i <= n; i++) {
      s += '<a:lvl' + i + 'pPr marL="' + (bullet ? 342900 * i : 0) + '" indent="' + (bullet ? -285750 : 0) + '" algn="l">' +
        (bullet ? '<a:buFont typeface="Arial"/><a:buChar char="•"/>' : '<a:buNone/>') +
        '<a:defRPr sz="' + Math.max(1200, sz - (i - 1) * 200) + '"><a:solidFill><a:srgbClr val="' + (bullet ? '333333' : '1F2A44') + '"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl' + i + 'pPr>';
    }
    return s;
  }
  function phSp(id, name, ph, x, y, cx, cy) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="' + name + '"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr>' + ph + '</p:nvPr></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm></p:spPr>' +
      '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="es-ES"/><a:t>Texto</a:t></a:r></a:p></p:txBody></p:sp>';
  }
  var MASTER = XDECL + '<p:sldMaster ' + PNS + '><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>' + GRP +
    phSp(2, 'Titulo 1', '<p:ph type="title"/>', 609600, 380000, 10972800, 900000) +
    phSp(3, 'Texto 2', '<p:ph type="body" idx="1"/>', 609600, 1600000, 10972800, 4500000) +
    '</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/><p:sldLayoutId id="2147483650" r:id="rId2"/></p:sldLayoutIdLst>' +
    '<p:txStyles><p:titleStyle>' + lvlStyle(1, 3200, false).replace('<a:defRPr sz="3200">', '<a:defRPr sz="3200" b="1">').replace('+mn-lt', '+mj-lt') + '</p:titleStyle>' +
    '<p:bodyStyle>' + lvlStyle(5, 2400, true) + '</p:bodyStyle><p:otherStyle>' + lvlStyle(1, 1800, false) + '</p:otherStyle></p:txStyles></p:sldMaster>';
  var LAYOUT1 = XDECL + '<p:sldLayout ' + PNS + ' type="title" preserve="1"><p:cSld name="Portada"><p:spTree>' + GRP +
    phSp(2, 'Titulo 1', '<p:ph type="ctrTitle"/>', 914400, 1700000, 10363200, 1800000) +
    phSp(3, 'Subtitulo 2', '<p:ph type="subTitle" idx="1"/>', 914400, 3850000, 10363200, 1700000) +
    '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
  var LAYOUT2 = XDECL + '<p:sldLayout ' + PNS + ' type="obj" preserve="1"><p:cSld name="Titulo y contenido"><p:spTree>' + GRP +
    phSp(2, 'Titulo 1', '<p:ph type="title"/>', 609600, 380000, 10972800, 900000) +
    phSp(3, 'Contenido 2', '<p:ph idx="1"/>', 609600, 1600000, 10972800, 4500000) +
    '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';

  async function buildPptx(text, warnings) {
    var slides = parseSlides(text, warnings), n = slides.length, i;
    var pct = 'application/vnd.openxmlformats-officedocument.presentationml.';
    var over = [['/ppt/presentation.xml', pct + 'presentation.main+xml'],
      ['/ppt/slideMasters/slideMaster1.xml', pct + 'slideMaster+xml'],
      ['/ppt/slideLayouts/slideLayout1.xml', pct + 'slideLayout+xml'],
      ['/ppt/slideLayouts/slideLayout2.xml', pct + 'slideLayout+xml'],
      ['/ppt/theme/theme1.xml', 'application/vnd.openxmlformats-officedocument.theme+xml'],
      ['/ppt/presProps.xml', pct + 'presProps+xml'], ['/ppt/viewProps.xml', pct + 'viewProps+xml'],
      ['/ppt/tableStyles.xml', pct + 'tableStyles+xml'],
      ['/docProps/core.xml', CT_CORE], ['/docProps/app.xml', CT_APP]];
    var prels = [{ id: 'rId1', type: RT + 'slideMaster', target: 'slideMasters/slideMaster1.xml' }], ids = '';
    for (i = 0; i < n; i++) {
      over.push(['/ppt/slides/slide' + (i + 1) + '.xml', pct + 'slide+xml']);
      prels.push({ id: 'rId' + (i + 2), type: RT + 'slide', target: 'slides/slide' + (i + 1) + '.xml' });
      ids += '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>';
    }
    prels.push({ id: 'rId' + (n + 2), type: RT + 'presProps', target: 'presProps.xml' },
      { id: 'rId' + (n + 3), type: RT + 'viewProps', target: 'viewProps.xml' },
      { id: 'rId' + (n + 4), type: RT + 'theme', target: 'theme/theme1.xml' },
      { id: 'rId' + (n + 5), type: RT + 'tableStyles', target: 'tableStyles.xml' });
    var pres = XDECL + '<p:presentation ' + PNS + ' saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
      '<p:sldIdLst>' + ids + '</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>';
    var parts = [
      ['[Content_Types].xml', ctXml(over)],
      ['_rels/.rels', relsXml([
        { id: 'rId1', type: RT + 'officeDocument', target: 'ppt/presentation.xml' },
        { id: 'rId2', type: RT_CORE, target: 'docProps/core.xml' },
        { id: 'rId3', type: RT + 'extended-properties', target: 'docProps/app.xml' }])],
      ['docProps/core.xml', coreXml(slides[0].title)],
      ['docProps/app.xml', appXml()],
      ['ppt/presentation.xml', pres],
      ['ppt/_rels/presentation.xml.rels', relsXml(prels)],
      ['ppt/slideMasters/slideMaster1.xml', MASTER],
      ['ppt/slideMasters/_rels/slideMaster1.xml.rels', relsXml([
        { id: 'rId1', type: RT + 'slideLayout', target: '../slideLayouts/slideLayout1.xml' },
        { id: 'rId2', type: RT + 'slideLayout', target: '../slideLayouts/slideLayout2.xml' },
        { id: 'rId3', type: RT + 'theme', target: '../theme/theme1.xml' }])],
      ['ppt/slideLayouts/slideLayout1.xml', LAYOUT1],
      ['ppt/slideLayouts/_rels/slideLayout1.xml.rels', relsXml([{ id: 'rId1', type: RT + 'slideMaster', target: '../slideMasters/slideMaster1.xml' }])],
      ['ppt/slideLayouts/slideLayout2.xml', LAYOUT2],
      ['ppt/slideLayouts/_rels/slideLayout2.xml.rels', relsXml([{ id: 'rId1', type: RT + 'slideMaster', target: '../slideMasters/slideMaster1.xml' }])],
      ['ppt/theme/theme1.xml', THEME],
      ['ppt/presProps.xml', XDECL + '<p:presentationPr ' + PNS + '/>'],
      ['ppt/viewProps.xml', XDECL + '<p:viewPr ' + PNS + '><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr></p:viewPr>'],
      ['ppt/tableStyles.xml', XDECL + '<a:tblStyleLst xmlns:a="' + NS_A + '" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>']
    ];
    slides.forEach(function (sl, k) {
      parts.push(['ppt/slides/slide' + (k + 1) + '.xml', slideXml(sl, k === 0)]);
      parts.push(['ppt/slides/_rels/slide' + (k + 1) + '.xml.rels', relsXml([
        { id: 'rId1', type: RT + 'slideLayout', target: '../slideLayouts/slideLayout' + (k === 0 ? 1 : 2) + '.xml' }])]);
    });
    return packOoxml(parts);
  }

  /* ------------------------------------------------------------ texto y zip */
  function cleanText(s) {
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
    return s;
  }
  /* Fuerza utf-8 en cualquier <meta ... charset=...> existente. Un solo recorrido, sin retroceso. */
  function fixMetaCharset(s) {
    var re = /<meta(?=[\s\/>])/gi, m, gt = -2, out = '', last = 0, found = false;
    while ((m = re.exec(s))) {
      if (gt < m.index) { gt = s.indexOf('>', m.index); if (gt < 0) break; }
      var tag = s.slice(m.index, gt + 1);
      re.lastIndex = gt + 1;
      if (/charset\s*=/i.test(tag)) {
        found = true;
        out += s.slice(last, m.index) + tag.replace(/(charset\s*=\s*["']?)[^"'\s;>\/]+/i, '$1utf-8');
        last = gt + 1;
      }
    }
    return { s: out + s.slice(last), found: found };
  }
  function openTagEnd(s, name) {
    var m = new RegExp('<' + name + '(?=[\s>/])', 'i').exec(s);
    if (!m) return -1;
    var gt = s.indexOf('>', m.index);
    return gt < 0 ? -1 : gt + 1;
  }
  function ensureCharset(s) {
    var fx = fixMetaCharset(s);
    if (fx.found) return fx.s;
    var meta = '<meta charset="utf-8">', e = openTagEnd(s, 'head');
    if (e > 0) return s.slice(0, e) + meta + s.slice(e);
    e = openTagEnd(s, 'html');
    if (e > 0) return s.slice(0, e) + '<head>' + meta + '</head>' + s.slice(e);
    var dm = /^\s*<!doctype[^>]*>/i.exec(s);
    if (dm) return s.slice(0, dm[0].length) + '\n' + meta + s.slice(dm[0].length);
    return '<!doctype html>\n' + meta + '\n' + s;
  }
  function fixXmlEncoding(s) {
    return s.replace(/^(\s*<\?xml\b[^>]*?\bencoding\s*=\s*)(["'])([^"']*)\2/i, function (all, a, q, enc) {
      return /^utf-?8$/i.test(enc) ? all : a + q + 'UTF-8' + q;
    });
  }
  var BOM = [0xEF, 0xBB, 0xBF];

  function parseZipSpec(s, warnings) {
    var L = s.replace(/\r\n?/g, '\n').split('\n'), files = [], cur = null;
    var H = /^\s*===\s*archivo\s*:/i;
    L.forEach(function (l) {
      var m = H.exec(l), rest = m ? l.slice(m[0].length).trim() : '';
      if (m && rest.length > 3 && rest.slice(-3) === '===' && rest.slice(0, -3).trim()) {
        cur = { path: rest.slice(0, -3).trim(), lines: [] }; files.push(cur);
      } else if (cur) cur.lines.push(l);
    });
    if (!files.length) files = [{ path: 'contenido.txt', lines: L }];
    if (files.length > MAX_ZIP_FILES) { files = files.slice(0, MAX_ZIP_FILES); warnings.push('Se recortaron los archivos al maximo de ' + MAX_ZIP_FILES + '.'); }
    var out = [], used = {}, total = 0;
    files.forEach(function (f, idx) {
      var text = f.lines.join('\n').replace(/\n+$/, '');
      if (text) text += '\n';
      var data = utf8(cleanText(text));
      if (total + data.length > MAX_ZIP_TOTAL) { warnings.push('Se omitio ' + f.path + ' por superar 5 MB en total.'); return; }
      total += data.length;
      var p = safePath(f.path, idx + 1), q = p, k = 2;
      while (used[q.toLowerCase()]) {
        var dot = p.lastIndexOf('.'), slash = p.lastIndexOf('/');
        q = dot > slash + 1 ? p.slice(0, dot) + '-' + k + p.slice(dot) : p + '-' + k;
        k++;
      }
      used[q.toLowerCase()] = 1;
      out.push({ name: q, data: data });
    });
    return out;
  }

  /* ------------------------------------------------------------ API */
  async function build(type, content, name) {
    var t = normType(type);
    if (!t) throw new Error('Formato de archivo no admitido.');
    var s = content == null ? '' : String(content);
    if (s.length > MAX_IN) throw new Error('El contenido supera el limite de 2 MB.');
    var warnings = [], bytes;
    if (t === 'pdf') bytes = buildPdf(cleanText(s), warnings);
    else if (t === 'docx') bytes = await buildDocx(cleanText(s));
    else if (t === 'xlsx') bytes = await buildXlsx(cleanText(s), warnings);
    else if (t === 'pptx') bytes = await buildPptx(cleanText(s), warnings);
    else if (t === 'zip') bytes = await makeZip(parseZipSpec(s, warnings));
    else {
      var x = cleanText(s);
      if (t === 'txt' || t === 'csv') bytes = concat([new Uint8Array(BOM), utf8(x)]);
      else if (t === 'html') bytes = utf8(ensureCharset(x));
      else if (t === 'xml' || t === 'svg') bytes = utf8(fixXmlEncoding(x));
      else if (t === 'ics') {
        x = x.replace(/\r\n?|\n/g, '\r\n');
        if (x && !/\r\n$/.test(x)) x += '\r\n';
        if (x && !/BEGIN:VCALENDAR/i.test(x)) warnings.push('El calendario no contiene BEGIN:VCALENDAR.');
        bytes = utf8(x);
      } else {
        if (t === 'json') { try { JSON.parse(x); } catch (e) { warnings.push('El JSON no es valido.'); } }
        bytes = utf8(x);
      }
    }
    var mime = MIME[t];
    return { blob: new Blob([bytes], { type: mime }), name: safeName(name, t), mime: mime, warnings: warnings };
  }

  async function download(type, content, name) {
    var r = await build(type, content, name);
    var url = URL.createObjectURL(r.blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = r.name;
    a.rel = 'noopener';
    if (a.style) a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    try { document.body.removeChild(a); } catch (e) { /* nada */ }
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return r;
  }

  function describe(type) {
    var t = normType(type);
    return t ? LABELS[t] : 'Archivo';
  }

  root.CalexFiles = { TYPES: TYPES.slice(), MIME: MIME, build: build, download: download, describe: describe };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
