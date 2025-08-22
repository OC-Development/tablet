<script>
  import { onMount, onDestroy } from 'svelte';

  import { postJSON } from '../lib/nui';

  // ------------- Tabs / State -------------
  let tab = 'home'; // home | legal | illegal | progress
  let loading = false;
  let error = '';

  // progress
  let dailyXP = 0, weeklyXP = 0, milestoneXP = 0;
  const PROG_TOTAL = { daily: 4, weekly: 49, milestone: 1460 };

  // tasks
  let legalTasks = [];
  let illegalTasks = [];

  // filters
  let qLegal = '', qIllegal = '';

  // segmented progress (like ProfileView)
  const SEGMENTS = 12;
  function toSegments(cur, need, n = SEGMENTS) {
    if (!need || need <= 0) return Array.from({ length: n }, () => 0);
    const r = Math.max(0, Math.min(1, cur / need));
    const total = r * n;
    const full = Math.floor(total);
    const part = total - full;
    return Array.from({ length: n }, (_, i) => (i < full ? 1 : (i === full ? part : 0)));
  }
  function pct(cur, need) {
    if (!need || need <= 0) return 0;
    return Math.max(0, Math.min(100, Math.floor((cur / need) * 100)));
  }

  // ------------- Derived -------------
  $: fLegal = legalTasks
    .filter(t => String(t?.title||'').toLowerCase().includes(qLegal.toLowerCase()));

  $: fIllegal = illegalTasks
    .filter(t => String(t?.title||'').toLowerCase().includes(qIllegal.toLowerCase()));

  // ------------- Loaders -------------
  async function loadProgress() {
    loading = true; error = '';
    try {
      const r = await postJSON('getProgressData', {});
      // original script كان يتوقع حقول dailyTasksXP/weeklyTasksXP/milestonesXP في "data" أو كجذر
      const d = r?.data ?? r ?? {};
      dailyXP = Number(d.dailyTasksXP || 0);
      weeklyXP = Number(d.weeklyTasksXP || 0);
      milestoneXP = Number(d.milestonesXP || 0);
    } catch (e) {
      error = 'Failed to load progress.';
    } finally {
      loading = false;
    }
  }

async function loadLegal() {
  loading = true; error = '';
  try {
    await postJSON('refreshTasks', {});   // asks client → server to push fresh tasks
    // The list will be set by the NUI message "loadTasks" which you already send.
  } catch (e) {
    error = 'Failed to load legal tasks.';
  } finally { loading = false; }
}

async function loadIllegal() {
  loading = true; error = '';
  try {
    await postJSON('refreshTasks', {});   // same
  } catch (e) {
    error = 'Failed to load illegal tasks.';
  } finally { loading = false; }
}


  function normalizeTasks(arr) {
    return arr.map(t => ({
      id: t.id ?? cryptoRandom(),
      title: t.title || 'Untitled task',
      image: t.image || '',
      completed: Number(t.completed || 0),
      required: Number(t.required || 1),
      claimed: Boolean(t.claimed),
      reward: t.reward ?? null,
      meta: Object.fromEntries(
        Object.entries(t).filter(([k]) => !['id','title','image','completed','required','claimed','reward'].includes(k))
      )
    }));
  }
  function cryptoRandom() {
    try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch { return Math.floor(Math.random()*1e9); }
  }

  // ------------- Actions -------------
  async function claim(task, type) {
    if (task.claimed || task.completed < task.required) return;
    const r = await postJSON('claimReward', { taskName: task.title });
    if (r?.success) {
      task.claimed = true;
      // refresh progress + lists
      loadProgress();
      if (type === 'legal') loadLegal();
      else loadIllegal();
    }
  }

  function openTab(t) {
    tab = t;
    if (t === 'progress') loadProgress();
    if (t === 'legal') loadLegal();
    if (t === 'illegal') loadIllegal();
  }

  function closeApp() {
    fetch(`https://${(typeof GetParentResourceName === 'function' && GetParentResourceName()) || 'debug'}/closeUI`, {method:'POST',body:'{}'}).catch(()=>{});
  }

  // ------------- NUI bridge (same events your script emits) -------------
function onMessage(ev) {
  const d = ev.data || {};
  if (d.type === 'loadTasks') {
    legalTasks  = normalizeTasks(d.legalTasks || []);
    illegalTasks= normalizeTasks(d.illegalTasks || []);
  }
  if (d.type === 'updateProgress') {
    const data = d?.data || {};
    dailyXP     = Number(data.dailyTasksXP || 0);
    weeklyXP    = Number(data.weeklyTasksXP || 0);
    milestoneXP = Number(data.milestonesXP || 0);
  }
  if (d.type === 'updateProgresstask') {
    // Optional: show tasksCompletedToday if you want
  }
}


  // ------------- DEV Demo -------------
  function loadDemo() {
    dailyXP = 2; weeklyXP = 17; milestoneXP = 430;
    legalTasks = normalizeTasks([
      { id:1, title:'Deliver supplies', image:'https://picsum.photos/seed/leg1/400/260', completed:1, required:3, reward:{type:'money', amount:{min:250, max:500}, moneyType:'cash'}, zone:'Docks' },
      { id:2, title:'Repair vehicle', image:'https://picsum.photos/seed/leg2/400/260', completed:3, required:3, claimed:false, reward:{itemName:'RepairKit', itemCount:{min:1,max:2}} },
    ]);
    illegalTasks = normalizeTasks([
      { id:3, title:'Steal data', image:'https://picsum.photos/seed/ill1/400/260', completed:2, required:5, reward:{type:'money', amount:{min:1200, max:2500}, moneyType:'black'} },
      { id:4, title:'Hacked ATM', image:'https://picsum.photos/seed/ill2/400/260', completed:5, required:5, claimed:false, reward:{itemName:'USB', itemCount:{min:1,max:1}} },
    ]);
  }

  onMount(() => {
    window.addEventListener('message', onMessage);
    // افتح تبويب Progress مباشرة ليركّب القيم
    if (import.meta.env.DEV) { loadDemo(); }
  });
  onDestroy(() => window.removeEventListener('message', onMessage));
</script>

<section class="tasks-app">
  <header class="ta-head">
    <div class="left">
      <h3 class="title">Tasks & Missions</h3>
      <p class="sub">اختر تبويبًا: مهام قانونية / غير قانونية / التقدّم</p>
    </div>
    <nav class="tabs">
      <button class="tab {tab==='home'?'active':''}" on:click={() => openTab('home')}>Home</button>
      <button class="tab {tab==='legal'?'active':''}" on:click={() => openTab('legal')}>Legal</button>
      <button class="tab {tab==='illegal'?'active':''}" on:click={() => openTab('illegal')}>Illegal</button>
      <button class="tab {tab==='progress'?'active':''}" on:click={() => openTab('progress')}>Progress</button>
      <button class="tab danger" on:click={closeApp}>Close</button>
    </nav>
  </header>

  <div class="panel">
    {#if loading}
      <div class="muted">Loading…</div>
    {:else if error}
      <div class="muted">{error}</div>
    {:else}
      {#if tab === 'home'}
        <div class="home-wrap">
          <div class="hero">
            <h2>Welcome!</h2>
            <p>ابدأ بالاطلاع على التقدّم أو تصفّح المهام المتاحة.</p>
            <div class="cta">
              <button class="btn-primary" on:click={() => openTab('legal')}>Browse Legal</button>
              <button class="btn" on:click={() => openTab('illegal')}>Browse Illegal</button>
              <button class="btn" on:click={() => openTab('progress')}>View Progress</button>
            </div>
          </div>
        </div>

      {:else if tab === 'progress'}
        <div class="progress-grid">
          <!-- Daily -->
          <article class="p-card">
            <header class="p-top">
              <div class="p-title">Daily</div>
              <div class="p-lbl">{dailyXP} / {PROG_TOTAL.daily} Pts</div>
            </header>
            <div class="segbar" style="--n:{SEGMENTS}">
              {#each toSegments(dailyXP, PROG_TOTAL.daily) as f}
                <span class="seg"><span class="fill" style="--f:{f}"></span></span>
              {/each}
            </div>
            <footer class="p-foot">{pct(dailyXP, PROG_TOTAL.daily)}%</footer>
          </article>

          <!-- Weekly -->
          <article class="p-card">
            <header class="p-top">
              <div class="p-title">Weekly</div>
              <div class="p-lbl">{weeklyXP} / {PROG_TOTAL.weekly} Pts</div>
            </header>
            <div class="segbar" style="--n:{SEGMENTS}">
              {#each toSegments(weeklyXP, PROG_TOTAL.weekly) as f}
                <span class="seg"><span class="fill" style="--f:{f}"></span></span>
              {/each}
            </div>
            <footer class="p-foot">{pct(weeklyXP, PROG_TOTAL.weekly)}%</footer>
          </article>

          <!-- Milestones -->
          <article class="p-card">
            <header class="p-top">
              <div class="p-title">Milestones</div>
              <div class="p-lbl">{milestoneXP} / {PROG_TOTAL.milestone} Pts</div>
            </header>
            <div class="segbar" style="--n:{SEGMENTS}">
              {#each toSegments(milestoneXP, PROG_TOTAL.milestone) as f}
                <span class="seg"><span class="fill" style="--f:{f}"></span></span>
              {/each}
            </div>
            <footer class="p-foot">{pct(milestoneXP, PROG_TOTAL.milestone)}%</footer>
          </article>
        </div>

      {:else if tab === 'legal'}
        <div class="toolbar">
          <input class="input" placeholder="Filter legal tasks…" bind:value={qLegal} />
          <button class="btn" on:click={loadLegal}>↻ Refresh</button>
        </div>
        <div class="cards">
          {#each fLegal as t}
            <article class="card {t.claimed?'done':''}">
              {#if t.image}<img class="img" src={t.image} alt="" />{/if}
              <div class="c-body">
                <h4 class="c-title" title={t.title}>{t.title}</h4>
                <div class="c-sub">{t.completed} / {t.required}</div>

                <!-- meta -->
                {#if Object.keys(t.meta).length}
                  <ul class="meta">
                    {#each Object.entries(t.meta) as [k,v]}
                      <li><span class="k">{k}</span><span class="v">{String(v)}</span></li>
                    {/each}
                  </ul>
                {/if}

                <!-- reward -->
                {#if t.reward}
                  <div class="reward">
                    {#if t.reward.type === 'money'}
                      💵 {t.reward.amount?.min}–{t.reward.amount?.max} ({t.reward.moneyType||'cash'})
                    {:else}
                      🎁 {t.reward.itemName} × {t.reward.itemCount?.min}–{t.reward.itemCount?.max}
                    {/if}
                  </div>
                {/if}
              </div>
              <div class="c-foot">
                {#if !t.claimed && t.completed >= t.required}
                  <button class="btn-primary" on:click={() => claim(t,'legal')}>Claim</button>
                {:else if t.claimed}
                  <button class="btn" disabled>Claimed</button>
                {:else}
                  <button class="btn" disabled>In progress</button>
                {/if}
              </div>
            </article>
          {/each}
          {#if !fLegal.length}
            <div class="muted">No legal tasks found.</div>
          {/if}
        </div>

      {:else if tab === 'illegal'}
        <div class="toolbar">
          <input class="input" placeholder="Filter illegal tasks…" bind:value={qIllegal} />
          <button class="btn" on:click={loadIllegal}>↻ Refresh</button>
        </div>
        <div class="cards">
          {#each fIllegal as t}
            <article class="card {t.claimed?'done':''}">
              {#if t.image}<img class="img" src={t.image} alt="" />{/if}
              <div class="c-body">
                <h4 class="c-title" title={t.title}>{t.title}</h4>
                <div class="c-sub">{t.completed} / {t.required}</div>

                {#if Object.keys(t.meta).length}
                  <ul class="meta">
                    {#each Object.entries(t.meta) as [k,v]}
                      <li><span class="k">{k}</span><span class="v">{String(v)}</span></li>
                    {/each}
                  </ul>
                {/if}

                {#if t.reward}
                  <div class="reward">
                    {#if t.reward.type === 'money'}
                      💵 {t.reward.amount?.min}–{t.reward.amount?.max} ({t.reward.moneyType||'cash'})
                    {:else}
                      🎁 {t.reward.itemName} × {t.reward.itemCount?.min}–{t.reward.itemCount?.max}
                    {/if}
                  </div>
                {/if}
              </div>
              <div class="c-foot">
                {#if !t.claimed && t.completed >= t.required}
                  <button class="btn-primary" on:click={() => claim(t,'illegal')}>Claim</button>
                {:else if t.claimed}
                  <button class="btn" disabled>Claimed</button>
                {:else}
                  <button class="btn" disabled>In progress</button>
                {/if}
              </div>
            </article>
          {/each}
          {#if !fIllegal.length}
            <div class="muted">No illegal tasks found.</div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</section>

<style>
  .tasks-app{ display:flex; flex-direction:column; gap:10px; }
  .ta-head{
    display:flex; align-items:center; justify-content:space-between;
    border:1px solid var(--border); border-radius:10px; background: var(--surface); padding:10px 12px;
  }
  .title{ margin:0; font:900 16px/1.1 var(--font); color:#cfe8ff; }
  .sub{ margin:0; color: var(--text-secondary); font:600 12px/1.3 var(--font); }
  .tabs{ display:flex; gap:6px; }
  .tab{
    height:28px; padding:0 12px; border:1px solid var(--border);
    border-radius:999px; background: var(--surface-elevated);
    color: var(--text-secondary); font:800 11.5px/1 var(--font);
    cursor:pointer; transition:.15s ease;
  }
  .tab:hover{ border-color: var(--accent); color: var(--accent); transform: translateY(-1px); }
  .tab.active{ border-color: var(--accent); color: var(--accent); }
  .tab.danger{ color:#f4b3b3; }

  .panel{
    border:1px solid var(--border); border-radius:10px; background: var(--surface);
    padding:10px; min-height: 360px;
  }

  .muted{ color:#a5b4c3; padding:10px; }

  /* Home */
  .home-wrap{ display:grid; place-items:center; min-height:300px; }
  .hero{ text-align:center; display:flex; flex-direction:column; gap:10px; }
  .hero h2{ margin:0; font:900 18px/1.1 var(--font); color:#eaf7ff; }
  .cta{ display:flex; gap:8px; justify-content:center; }
  .btn{
    height:34px; padding:0 14px; border-radius:8px; border:1px solid var(--border);
    background: var(--surface-elevated); color:#cfe0ec; font:800 12px/1 var(--font);
    cursor:pointer; transition: transform .1s ease, border-color .15s ease, filter .15s ease;
  }
  .btn:hover{ transform: translateY(-1px); border-color: var(--accent); color: var(--accent); }
  .btn-primary{
    background: linear-gradient(180deg, #1d6c46, #0f4c31); color:#e8fff5; border-color: rgba(0,0,0,.25);
  }
  .btn-primary:hover{ filter: brightness(1.06); border-color:#2b9a6c; }

  /* Toolbar */
  .toolbar{ display:flex; gap:8px; margin-bottom:8px; }
  .input{
    flex:1 1 auto; height:34px; padding:0 10px; border:1px solid var(--border); border-radius:8px;
    background: var(--surface-elevated); color:#fff; font:700 12px/1 var(--font); outline:none;
  }

  /* Cards */
  .cards{ display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:10px; }
  .card{
    border:1px solid var(--border); border-radius:10px; background: rgba(255,255,255,.03);
    overflow:hidden; display:flex; flex-direction:column;
    transition: border-color .15s ease, transform .12s ease;
  }
  .card:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.18); }
  .card.done{ border-color: rgba(0,212,255,.28); }
  .img{ width:100%; height:140px; object-fit:cover; display:block; }
  .c-body{ padding:10px; display:flex; flex-direction:column; gap:6px; }
  .c-title{ margin:0; font:800 13px/1.2 var(--font); color:#e2e8f0; }
  .c-sub{ color:#a0aec0; font:700 11px/1 var(--font); }
  .meta{ list-style:none; margin:2px 0 0; padding:0; display:flex; flex-direction:column; gap:4px; }
  .meta .k{ color:#8fb8d7; font:700 10px/1 var(--font); }
  .meta .v{ color:#cfd8df; font:700 10px/1 var(--font); }
  .reward{ color:#bdeaff; font:700 11px/1 var(--font); }
  .c-foot{ padding:10px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:6px; }

  /* Progress cards */
  .progress-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:10px; }
  .p-card{ border:1px solid var(--border); border-radius:10px; background: rgba(255,255,255,.03); padding:10px; }
  .p-top{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
  .p-title{ color:#e8f6ff; font:800 12.5px/1 var(--font); }
  .p-lbl{ color:#9fb0bd; font:700 11px/1 var(--font); }
  .p-foot{ color:#a9c7e2; font:800 11px/1 var(--font); }

  /* segmented bar */
  .segbar{ --n:12; display:grid; grid-template-columns: repeat(var(--n), 1fr); gap:4px; height:9px; }
  .seg{ position:relative; border-radius:2px; overflow:hidden; background: rgba(255,255,255,.06); outline: 1px solid rgba(255,255,255,.10); }
  .fill{ position:absolute; inset:0; width: calc(var(--f) * 100%); background: linear-gradient(90deg, var(--accent), #1b9bd1); border-radius: inherit; }

  @media (max-width: 860px){
    .ta-head{ flex-direction:column; align-items:flex-start; gap:8px; }
  }
</style>
