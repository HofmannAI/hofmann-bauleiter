<script lang="ts" module>
  let setShow: ((m: string) => void) | null = null;

  /** Show a toast from anywhere. Imports must be top-level. */
  export function toast(message: string) {
    setShow?.(message);
  }
</script>

<script lang="ts">
  let visible = $state(false);
  let message = $state('');
  let timer: ReturnType<typeof setTimeout> | null = null;

  setShow = (m: string) => {
    message = m;
    visible = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (visible = false), 2200);
  };
</script>

<div class="toast" class:show={visible} role="status" aria-live="polite">{message}</div>
