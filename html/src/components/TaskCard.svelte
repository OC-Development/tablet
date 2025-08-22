<script>


{#if task.tags && task.tags.length}
<div class="tags">
{#each task.tags.slice(0,3) as tag}
<span>{tag}</span>
{/each}
{#if task.tags.length > 3}
<span class="more">+{task.tags.length-3}</span>
{/if}
</div>
{/if}


<div class="status {status}">{statusText[status] || status}</div>
</div>


<div class="body">
<h3 class="title" title={task.title}>{task.title}</h3>
{#if task.description}
<p class="desc">{task.description}</p>
{/if}


<div class="meta">
{#if task.assignee}
<div class="assignee" title={task.assignee}>
<i class="fa fa-user-circle"></i>
<span>{task.assignee}</span>
</div>
{/if}


{#if task.updatedAt}
<div class="time" title={task.updatedAt}>
<i class="fa fa-clock-o"></i>
<span>{new Date(task.updatedAt).toLocaleDateString()}</span>
</div>
{/if}
</div>


<div class="progress" aria-label="progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
<div class="bar" style={`width:${progress}%`}></div>
<div class="dot" style={`left: calc(${progress}% - 6px)`}></div>
</div>
</div>
</article>


<style>
:root{ --dzc:#00D1F5; --stroke:rgba(255,255,255,.12); --text:#e9eef7; --muted:#9aacbd }
.card{
display:flex;flex-direction:column;gap:10px;background:rgba(255,255,255,.04);border:1px solid var(--stroke);
border-radius:16px;overflow:hidden;position:relative;cursor:default;transition:.2s transform, .2s box-shadow;
box-shadow: 0 10px 24px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.02);
}
.card:hover{transform:translateY(-2px); box-shadow: 0 16px 30px rgba(0,0,0,.28)}
.thumb{position:relative;aspect-ratio:16/9;background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))}
img{width:100%;height:100%;object-fit:cover;display:block}
.noimg{width:100%;height:100%;display:grid;place-items:center;}
.noimg .dots{width:75%;height:55%;background:radial-gradient(circle at 30% 30%, var(--dzc) 0, transparent 35%),
radial-gradient(circle at 70% 40%, #ffffff60 0, transparent 32%),
radial-gradient(circle at 55% 70%, #ffffff30 0, transparent 25%);
filter: blur(6px); opacity:.6}
.tags{position:absolute;left:10px;bottom:10px;display:flex;gap:6px;flex-wrap:wrap}
.tags span{background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.18);padding:4px 8px;border-radius:999px;font-size:11px;color:#dfe9f5}
.tags .more{opacity:.8}


.status{position:absolute;right:10px;top:10px;padding:6px 9px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid rgba(255,255,255,.18)}
.status.active{background:linear-gradient(180deg, #13ef93, #0fbe74);color:#072b1d}
.status.pending{background:linear-gradient(180deg, var(--dzc), #0ca8bf);color:#03242a}
.status.blocked{background:linear-gradient(180deg, #ff8b53, #d66a30);color:#2b0f03}
.status.done{background:linear-gradient(180deg, #9fa7b3, #7a8291);color:#0b0f14}


.body{padding:8px 12px 14px}
.title{margin:0 0 4px 0;font-weight:800;letter-spacing:.2px;color:var(--text);font-size:15px;line-height:1.25}
.desc{margin:0 0 10px 0;color:var(--muted);font-size:12px;line-height:1.35;max-height:3.1em;overflow:hidden;text-overflow:ellipsis}


.meta{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:11px;margin-bottom:10px}
.assignee,.time{display:flex;gap:6px;align-items:center}


.progress{position:relative;height:8px;background:rgba(255,255,255,.06);border:1px solid var(--stroke);border-radius:999px;overflow:clip}
.bar{height:100%;background: linear-gradient(90deg, var(--dzc), #73ecff);box-shadow: inset 0 0 4px rgba(255,255,255,.2)}
.dot{position:absolute;top:50%;width:12px;height:12px;background:white;border-radius:50%;transform:translateY(-50%);box-shadow:0 2px 8px rgba(0,0,0,.35)}

</style>