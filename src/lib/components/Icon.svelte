<script lang="ts" module>
  export type IconName =
    | 'back' | 'check' | 'photo' | 'edit' | 'delete' | 'plus' | 'menu'
    | 'more' | 'close' | 'logout' | 'home' | 'list' | 'gantt' | 'tasks'
    | 'defect' | 'activity' | 'calendar' | 'clock' | 'archive' | 'restore'
    | 'logo' | 'pin' | 'download' | 'upload' | 'eye' | 'send' | 'chevron-right'
    | 'chevron-down' | 'chevron-left' | 'building' | 'apartment' | 'file'
    | 'gear' | 'phone' | 'mail';
</script>

<script lang="ts">
  type Props = { name: IconName; size?: number };
  let { name, size = 18 }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'back' || name === 'chevron-left'}
    <path d="M19 12H5M12 19l-7-7 7-7" />
  {:else if name === 'check'}
    <path d="M5 12l5 5L20 7" />
  {:else if name === 'photo'}
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="11" r="2" />
    <path d="M21 17l-5-5-5 5-3-3-5 5" />
  {:else if name === 'edit'}
    <path d="M3 21h4l11-11-4-4L3 17v4z" />
    <path d="M14 6l4 4" />
  {:else if name === 'delete'}
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  {:else if name === 'plus'}
    <path d="M12 5v14M5 12h14" />
  {:else if name === 'menu' || name === 'more'}
    <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
  {:else if name === 'close'}
    <path d="M18 6L6 18M6 6l12 12" />
  {:else if name === 'logout'}
    <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
  {:else if name === 'home'}
    <path d="M3 11l9-8 9 8M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
  {:else if name === 'list'}
    <path d="M9 6h12M9 12h12M9 18h12" />
    <circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" />
  {:else if name === 'gantt'}
    <rect x="3" y="5" width="10" height="3" rx="1" />
    <rect x="7" y="11" width="11" height="3" rx="1" />
    <rect x="5" y="17" width="14" height="3" rx="1" />
  {:else if name === 'tasks'}
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8l1.5 1.5L13 6M8 14l1.5 1.5L13 12" />
    <path d="M16 9h2M16 15h2" />
  {:else if name === 'defect'}
    <circle cx="12" cy="12" r="10" />
    <path d="M12 7v6M12 17h.01" />
  {:else if name === 'activity'}
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  {:else if name === 'calendar'}
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 11h18" />
  {:else if name === 'clock'}
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  {:else if name === 'archive'}
    <rect x="3" y="3" width="18" height="4" rx="1" />
    <path d="M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7M10 11h4" />
  {:else if name === 'restore'}
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
  {:else if name === 'logo'}
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="17" cy="17" r="2" fill="currentColor" />
  {:else if name === 'pin'}
    <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
    <circle cx="12" cy="9" r="2.5" />
  {:else if name === 'download'}
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  {:else if name === 'upload'}
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  {:else if name === 'eye'}
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  {:else if name === 'send'}
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  {:else if name === 'chevron-right'}
    <path d="M9 6l6 6-6 6" />
  {:else if name === 'chevron-down'}
    <path d="M6 9l6 6 6-6" />
  {:else if name === 'building'}
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
  {:else if name === 'apartment'}
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  {:else if name === 'file'}
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  {:else if name === 'gear'}
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.36.15.66.4.87.7" />
  {:else if name === 'phone'}
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
  {:else if name === 'mail'}
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  {/if}
</svg>
