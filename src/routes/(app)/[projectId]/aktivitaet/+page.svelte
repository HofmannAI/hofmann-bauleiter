<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { timeAgo } from '$lib/util/time';
  let { data } = $props();
</script>

<div class="page">
  <h2 class="section-title">Aktivität <span class="count">{data.entries.length}</span></h2>
  {#if data.entries.length === 0}
    <div class="empty">
      <div class="empty-emoji">·</div>
      <div class="empty-text">Noch keine Einträge.</div>
    </div>
  {:else}
    <div class="activity-feed">
      {#each data.entries as a (a.id)}
        <div class="activity-item">
          <span class="activity-icon" class:photo={a.type === 'photo'} class:defect={a.type === 'defect'}>
            <Icon name={a.type === 'photo' ? 'photo' : a.type === 'defect' ? 'defect' : 'check'} size={15} />
          </span>
          <span class="activity-text">
            <span class="activity-line1">{a.message}</span>
            <span class="activity-line2">{a.userName ?? 'System'} · {timeAgo(a.ts)}</span>
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>
