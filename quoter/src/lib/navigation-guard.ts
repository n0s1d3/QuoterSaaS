let blocker: (() => boolean) | null = null

/** Keep private drafts in memory only; never store customer data in browser storage. */
export function registerNavigationBlocker(check: () => boolean) {
  blocker = check
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!check()) return
    event.preventDefault()
    event.returnValue = ''
  }
  window.addEventListener('beforeunload', beforeUnload)
  return () => {
    if (blocker === check) blocker = null
    window.removeEventListener('beforeunload', beforeUnload)
  }
}

export function confirmNavigation() {
  return !blocker?.() || window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos y salir?')
}
