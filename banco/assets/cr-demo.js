/* cr-demo.js — MODO DEMONSTRAÇÃO: imita o cliente do Supabase (from/rpc/auth) guardando tudo no navegador (localStorage).
   Só é usado quando SB_URL/SB_KEY estão vazios em cr-config.js. As telas usam o mesmo código nos dois modos. */
(function () {
  var P = 'cab_demo_', SKEY = P + 'session';
  function load(t) { try { return JSON.parse(localStorage.getItem(P + t) || '[]'); } catch (e) { return []; } }
  function save(t, a) { try { localStorage.setItem(P + t, JSON.stringify(a)); } catch (e) {} }
  function sess() { try { var s = JSON.parse(localStorage.getItem(SKEY) || 'null'); return s && s.exp > Date.now() ? s : null; } catch (e) { return null; } }
  function Q(t) { this.t = t; this.op = 'select'; this.fl = []; this.ord = null; this.lim = null; this.mode = 'many'; this.pl = null; }
  Q.prototype.select = function () { return this; };
  Q.prototype.insert = function (o) { this.op = 'insert'; this.pl = o; return this; };
  Q.prototype.update = function (o) { this.op = 'update'; this.pl = o; return this; };
  Q.prototype.delete = function () { this.op = 'delete'; return this; };
  Q.prototype.eq = function (k, v) { this.fl.push([k, v]); return this; };
  Q.prototype.order = function (k, o) { this.ord = [k, !(o && o.ascending === false)]; return this; };
  Q.prototype.limit = function (n) { this.lim = n; return this; };
  Q.prototype.single = function () { this.mode = 'single'; return this; };
  Q.prototype.maybeSingle = function () { this.mode = 'maybe'; return this; };
  Q.prototype.then = function (ok, no) { return this.run().then(ok, no); };
  Q.prototype.run = function () {
    var self = this, rows = load(this.t), data = null, error = null;
    var match = function (r) { return self.fl.every(function (f) { return String(r[f[0]]) === String(f[1]); }); };
    if (!sess()) return Promise.resolve({ data: null, error: { message: 'Sessão expirada. Entre de novo.', code: '401' } });
    if (this.op === 'select') {
      data = rows.filter(match);
      if (this.ord) { var k = this.ord[0], asc = this.ord[1]; data.sort(function (a, b) { return (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1); }); }
      if (this.lim) data = data.slice(0, this.lim);
    } else if (this.op === 'insert') {
      var arr = Array.isArray(this.pl) ? this.pl : [this.pl], out = [];
      for (var i = 0; i < arr.length; i++) {
        var r = JSON.parse(JSON.stringify(arr[i])), m = 0; rows.forEach(function (x) { if (x.id > m) m = x.id; });
        r.id = m + 1; r.criado_em = r.criado_em || new Date().toISOString();
        if (this.t === 'cab_cartas') { r.criado_por = (sess() || {}).user.email; if (rows.some(function (x) { return x.numero === r.numero; })) { error = { message: 'duplicate key value violates unique constraint "cab_cartas_numero_key"', code: '23505' }; break; } }
        rows.push(r); out.push(r);
      }
      if (!error) { save(this.t, rows); data = out; }
    } else if (this.op === 'update') {
      var up = []; rows.forEach(function (r) { if (match(r)) { Object.assign(r, self.pl); up.push(r); } }); save(this.t, rows); data = up;
    } else if (this.op === 'delete') {
      if (this.t === 'cab_auditoria') error = { message: 'auditoria é imutável' }; else { data = rows.filter(match); save(this.t, rows.filter(function (r) { return !match(r); })); }
    }
    if (!error && this.mode !== 'many') {
      data = (data || [])[0] || null;
      if (!data && this.mode === 'single') error = { message: 'Nenhum registro encontrado.', code: 'PGRST116' };
    }
    return Promise.resolve({ data: error ? null : data, error: error });
  };
  window.CABDemo = {
    entrar: function (email) { try { localStorage.setItem(SKEY, JSON.stringify({ exp: Date.now() + 8 * 3600e3, user: { id: 'demo', email: email, user_metadata: {} } })); } catch (e) {} },
    limpar: function () { Object.keys(localStorage).filter(function (k) { return k.indexOf(P) === 0; }).forEach(function (k) { localStorage.removeItem(k); }); },
    client: function () {
      return {
        from: function (t) { return new Q(t); },
        rpc: function (n, a) {
          a = a || {};
          if (n === 'cab_proximo_numero') {
            var c; try { c = JSON.parse(localStorage.getItem(P + 'contadores') || '{}'); } catch (e) { c = {}; }
            var ano = a.p_ano || new Date().getFullYear(); c[ano] = (c[ano] || 0) + 1; localStorage.setItem(P + 'contadores', JSON.stringify(c));
            return Promise.resolve({ data: 'CAB-' + ano + '-' + ('000' + c[ano]).slice(-4), error: null });
          }
          if (n === 'cab_log') { var l = load('cab_log'); l.push({ id: l.length + 1, acao: a.p_acao, detalhe: a.p_detalhe || null, user_email: (sess() || {}).user ? sess().user.email : null, criado_em: new Date().toISOString() }); save('cab_log', l); return Promise.resolve({ data: null, error: null }); }
          return Promise.resolve({ data: null, error: { message: 'rpc ' + n + ' não existe no modo demonstração' } });
        },
        auth: {
          getSession: function () { var s = sess(); return Promise.resolve({ data: { session: s ? { user: s.user, access_token: 'demo' } : null } }); },
          getUser: function () { var s = sess(); return Promise.resolve({ data: { user: s ? s.user : null } }); },
          setSession: function () { return Promise.resolve({}); },
          signOut: function () { try { localStorage.removeItem(SKEY); } catch (e) {} return Promise.resolve({}); },
          onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
        }
      };
    }
  };
})();
