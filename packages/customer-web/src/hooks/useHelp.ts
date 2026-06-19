const HELP_KEY = 'tableOrder.help.completedAt';

export function isHelpCompleted(): boolean {
  return !!localStorage.getItem(HELP_KEY);
}

export function markHelpCompleted(): void {
  localStorage.setItem(HELP_KEY, new Date().toISOString());
}

export function resetHelp(): void {
  localStorage.removeItem(HELP_KEY);
}
