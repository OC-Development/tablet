<script>
  import { onMount, onDestroy } from 'svelte';
  import { postJSON } from '../lib/nui';

  export let playerName = '';
  export let playerId; 
  
  let tab = 'rules';
  let rules = [];
  let ops = [];
  let loading = false;
  let error = '';

  let ruleQuery = '';
  $: filteredRules =
    (rules || []).filter(r => {
      const t = String(r?.title || '').toLowerCase();
      const b = String(r?.body  || '').toLowerCase();
      const q = ruleQuery.toLowerCase().trim();
      return !q || t.includes(q) || b.includes(q);
    });
  const getPlayerId = () => {
    if (typeof window === 'undefined') return 0;
    return Number(window.__playerId ?? window.playerId ?? window.myPlayerId ?? 0);
  };
  const norm = (s) => (String(s || '').trim().toLowerCase());

  function isMe(member) {
    const pid = playerId;
    console.log('Checking member:', member, 'for player ID:', pid);
    const mid = Number(member?.id ?? member?.source ?? 0);
    if (pid && mid && pid === mid) return true;          // مطابق ID
    // مطابقة بالاسم كـ fallback
    return norm(member?.name) === norm(playerName);
  }

  function fmtChannel(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return Math.round(n);
  }
  function normalizeOp(op) {
    const members = Array.isArray(op?.members) ? op.members : [];
    const maxFromOp = Number(op?.max || 0);
    const channelRaw = op?.channel ?? op?.meta?.channel ?? 0;
    return {
      name: op?.name || 'Operation',
      channel: channelRaw,
      max: Number.isFinite(maxFromOp) && maxFromOp > 0 ? maxFromOp : 0,
      members: members.map((m) => ({
        id: Number(m?.id ?? m?.source ?? m?.playerId ?? m?.cid ?? m?.citizenid ?? 0),
        name: m?.name || m?.label || 'Unknown',
        rank: m?.rank || 'Officer',
      })),
    };
  }

  async function loadRules() {
    loading = true; error = '';
    try {
      const res = await postJSON('police:getRules', {});
      let arr = Array.isArray(res?.items) ? res.items : [];
      if (!arr.length && import.meta?.env?.DEV) {
        arr = [
          { title: 'Use of Force', body: 'Apply minimal force necessary.' },
          { title: 'Evidence Handling', body: 'Store in evidence locker.' },
        ];
      }
      rules = arr;
    } catch {
      error = 'Failed to load rules.';
    } finally { loading = false; }
  }

  async function loadOps() {
    loading = true; error = '';
    try {
      const res = await postJSON('getOperations', {});
      let list = Array.isArray(res?.operations) ? res.operations.map(normalizeOp) : [];
      if (!list.length && import.meta?.env?.DEV) {
        list = [{
          name:'operation1', channel:1, max:7,
          members:[{id:7, name: playerName || 'Mr Orkoda', rank:'AOP'}]
        }];
      }
      ops = list;
    } catch {
      error = 'Failed to load operations.';
    } finally { loading = false; }
  }

  async function join(op){ if(!op?.name) return; try{ await postJSON('joinOperationFromTablet',{name:op.name}); }catch{} setTimeout(loadOps,180); }
async function leave(opName) {
  try {
    await postJSON("leaveOperation", { opName: opName });
  } catch {}
  setTimeout(loadOps, 180);
}

  function setTab(next){
    if (tab === next) return;
    tab = next;
    if (tab === 'rules' && !rules.length) loadRules();
    if (tab === 'ops'   && !ops.length)   loadOps();
  }

  function onOpsRefresh(){ loadOps(); }
  onMount(()=>{ setTab('rules'); if (typeof window!=='undefined') window.addEventListener('police:ops:refresh', onOpsRefresh); });
  onDestroy(()=>{ if (typeof window!=='undefined') window.removeEventListener('police:ops:refresh', onOpsRefresh); });
  loadRules();
</script>

<section class="police">
  <header class="p-header">
    <div class="h-left">
      <img class="h-icon" src="https://images.dz-crew.com/tablet/icons/rb_2401.png" alt="Police" />
      <div class="h-titles">
        <h2 class="title">Police App</h2>
        <p class="sub">Standard procedures & active operations</p>
      </div>
    </div>
    <nav class="tabs">
      <button class="tab {tab==='rules' ? 'active' : ''}" on:click={() => setTab('rules')}>Rules</button>
      <button class="tab {tab==='ops'   ? 'active' : ''}" on:click={() => setTab('ops')}>Operations</button>
    </nav>
  </header>

  <div class="content">
    {#if loading}
      <div class="muted">Loading…</div>
    {:else if error}
      <div class="muted">{error}</div>
    {:else}
{#if tab === 'rules'}
  <section class="rules">
    <div class="rules-toolbar">
      <input
        class="rules-search"
        type="text"
        placeholder="Search rules…"
        bind:value={ruleQuery}
        aria-label="Search rules"
      />
      <div class="rules-count">
        {filteredRules.length} / {rules.length || 0}
      </div>
    </div>

    {#if !filteredRules.length}
      <div class="muted">No rules found.</div>
    {:else}
      <div class="rule-grid">
        {#each filteredRules as r, i}
          <div class="rule-card">
            <div class="rule-head">
              <span class="r-num">{i + 1}</span>
              <h3 class="r-title">{r?.title || 'Untitled rule'}</h3>
            </div>
            <div class="rule-body">
              <p class="r-text">{r?.body || ''}</p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
{:else}


        <div class="ops-grid">
          {#if !ops.length}
            <div class="muted">No active operations.</div>
          {:else}
            {#each ops as o}
              {@const members = Array.isArray(o?.members) ? o.members : []}
              {@const cnt = members.length}
              {@const amMember = members.some(isMe)}

              <article class="opcard {amMember ? 'is-joined' : ''} {o.max && cnt > o.max ? 'is-over' : ''}">
                <div class="op-head">
                  <div class="op-title">
                    <img class="op-icon" src="https://images.dz-crew.com/tablet/icons/rb_2401.png" alt="op" />
                    <div>
                      <h3 title={o?.name || 'Operation'}>{o?.name || 'Operation'}</h3>
                      <div class="op-sub">
                        <span class="dot dot--ok"></span>
                        <span>Channel {o?.channel}</span>
                      </div>
                    </div>
                  </div>
                  <div class="op-stat">
                    <div class="op-count">{cnt}{#if o.max} / {o.max}{/if}</div>
                    <div class="op-count-label">Members</div>
                  </div>
                </div>

                <div class="op-body">
                  {#if !cnt}
                    <div class="muted small">No members</div>
                  {:else}
                    <ul class="member-list">
                      {#each members as m}
                        <li class="member">
                          <div class="avatar">{(m?.name || 'U').slice(0,2).toUpperCase()}</div>
                          <div class="m-meta">
                            <div class="m-name" title={m?.name || 'Unknown'}>{m?.name || 'Unknown'}</div>
                            <div class="m-sub">{m?.rank || 'Officer'}</div>
                          </div>
                          <span class="m-state"><span class="dot dot--ok"></span>Online</span>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </div>

                <div class="op-foot">
                  {#if amMember}
                    <button class="btn-ghost" disabled>Joined</button>
                    <button class="btn-danger" on:click={() => leave(o.name)}>⟲ Leave Operation</button>
                  {:else}
                    <button class="btn-success" on:click={() => join(o)}>＋ Join Operation</button>
                  {/if}
                </div>
              </article>
            {/each}
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</section>

<style>
  .police{ display:flex; flex-direction:column; gap:10px; }
  .p-header{ display:flex; align-items:center; justify-content:space-between; border:1px solid var(--border); border-radius:10px; background: var(--surface); padding:10px 12px; }
  .h-left{ display:flex; align-items:center; gap:10px; }
  .h-icon{ width:40px; height:40px; object-fit:contain; }
  .title{ margin:0; font:900 16px/1.1 var(--font); color:#cfe8ff; }
  .sub{ margin:0; color: var(--text-secondary); font:600 12px/1.3 var(--font); }
  .tabs{ display:flex; gap:6px; }
  .tab{ height:28px; padding:0 12px; border:1px solid var(--border); border-radius:999px; background: var(--surface-elevated); color: var(--text-secondary); font:800 11.5px/1 var(--font); cursor:pointer; transition:.15s ease; }
  .tab:hover{ border-color: var(--accent); color: var(--accent); transform: translateY(-1px); }
  .tab.active{ border-color: var(--accent); color: var(--accent); }
  .content{ border:1px solid var(--border); border-radius:10px; background: var(--surface); padding:10px; overflow:auto; min-height:260px; }
  .muted{ color:#a5b4c3; padding:10px; }
  .small{ font-size:12px; }
  .cards{ display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:10px; }
  .card{ border:1px solid var(--border); border-radius:10px; background: var(--surface-elevated); padding:10px; }
  .card-head{ display:flex; align-items:center; gap:8px; margin-bottom:6px; }
  .chip{ height:20px; padding:0 8px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:8px; background: rgba(255,255,255,.03); color:#cfe0ec; font:800 10.5px/1 var(--font); }
  .card-title{ margin:0; font:800 13px/1.1 var(--font); color:#e8f4ff; }
  .card-body{ margin:0; color:#d8e6f2; font:600 12px/1.45 var(--font); white-space:pre-wrap; }
  .ops-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:12px; }
  .opcard{ border:1px solid var(--border); border-radius:12px; background: rgba(255,255,255,.02); overflow:hidden; box-shadow: 0 8px 20px rgba(0,0,0,.25); display:flex; flex-direction:column; transition: border-color .15s ease, transform .12s ease; }
  .opcard:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.18); }
  .opcard.is-joined{ border-color: rgba(0,212,255,.28); }
  .opcard.is-over{ border-color: rgba(255, 120, 120, .35); }
  .op-head{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background: linear-gradient(180deg, rgba(0, 104, 171, .65), rgba(0, 45, 78, .65)); border-bottom: 1px solid rgba(255,255,255,.08); }
  .opcard.is-over .op-head{ background: linear-gradient(180deg, rgba(120,0,0,.6), rgba(60,0,0,.6)); }
  .op-title{ display:flex; align-items:center; gap:10px; min-width:0; }
  .op-icon{ width:36px; height:36px; object-fit:contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,.35)); }
  .op-title h3{ margin:0; font:800 14px/1.1 var(--font); color:#eaf7ff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .op-sub{ display:flex; align-items:center; gap:6px; color:#cfe8ff; font:700 11px/1 var(--font); opacity:.9; }
  .dot{ width:8px; height:8px; border-radius:50%; display:inline-block; }
  .dot--ok{ background:#41d494; box-shadow:0 0 0 2px rgba(65,212,148,.25); }
  .op-stat{ text-align:right; }
  .op-count{ font:900 18px/1 var(--font); color:#ffffff; text-shadow:0 1px 0 rgba(0,0,0,.35); }
  .op-count-label{ color:#cfe8ff; font:700 10px/1 var(--font); opacity:.85; }
  .op-body{ padding:10px 12px; background: var(--surface); }
  .member-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
  .member{ display:flex; align-items:center; gap:10px; padding:8px; border:1px solid var(--border); border-radius:10px; background: var(--surface-elevated); }
  .avatar{ width:28px; height:28px; border-radius:6px; display:grid; place-items:center; background: linear-gradient(135deg, var(--accent), #0f2533); color:#fff; font:800 11px/1 var(--font); border:1px solid rgba(255,255,255,.10); }
  .m-meta{ flex:1 1 auto; min-width:0; }
  .m-name{ color:#eaf2f9; font:800 12px/1 var(--font); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .m-sub{ color:#98a9b7; font:700 10px/1 var(--font); }
  .m-state{ color:#a9ffda; font:700 10px/1 var(--font); display:flex; align-items:center; gap:6px; }
  .op-foot{ display:flex; gap:8px; padding:10px 12px; border-top:1px solid var(--border); background: rgba(255,255,255,.02); }
  .op-foot .btn-success, .op-foot .btn-danger, .op-foot .btn-ghost{ flex:1 1 auto; height:34px; border-radius:8px; border:1px solid var(--border); font:800 12px/1 var(--font); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition: transform .1s ease, filter .15s ease, border-color .15s ease; }
  .btn-success{ background: linear-gradient(180deg, #1d6c46, #0f4c31); color:#e8fff5; border-color: rgba(0,0,0,.25); }
  .btn-success:hover{ transform: translateY(-1px); filter: brightness(1.05); border-color:#2b9a6c; }
  .btn-danger{ background: linear-gradient(180deg, #7a1f25, #59161a); color:#ffe9e9; border-color: rgba(0,0,0,.25); }
  .btn-danger:hover{ transform: translateY(-1px); filter: brightness(1.04); border-color:#b94141; }
  .btn-ghost{ background: rgba(255,255,255,.03); color:#cfe0ec; }
  .btn-ghost[disabled]{ opacity:.75; cursor:default; }
  @media (max-width: 560px){ .ops-grid{ grid-template-columns: 1fr; } }


/* ====== POLICE RULES – Grid design ====== */
.rules {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rules-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 10px;
  padding: 8px;
}

.rules-search {
  flex: 1 1 auto;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--text-primary);
  font: 700 12px/1 var(--font);
  outline: none;
}
.rules-search::placeholder { color: var(--text-muted); }

.rules-count {
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.03);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  font: 800 11px/1 var(--font);
}

.rule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.rule-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 12px;
  overflow: hidden;
  transition: transform .12s ease, border-color .15s ease;
}
.rule-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,.2);
}

.rule-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(180deg, rgba(0,104,171,.55), rgba(0,45,78,.55));
  color: #eaf7ff;
}

.r-num {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font: 900 12px/1 var(--font);
  color: #fff;
  background: linear-gradient(135deg, var(--accent), #0f2533);
  border: 1px solid rgba(255,255,255,.12);
}

.r-title {
  margin: 0;
  font: 800 13px/1.2 var(--font);
  color: #eaf7ff;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-body {
  padding: 10px 12px;
  background: var(--surface);
}

.r-text {
  margin: 0;
  color: #d8e6f2;
  font: 600 12.5px/1.55 var(--font);
  white-space: pre-wrap;
}

</style>
