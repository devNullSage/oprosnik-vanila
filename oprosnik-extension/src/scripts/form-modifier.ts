/**
 * form-modifier.ts
 * Этот скрипт отвечает только за модификацию элементов формы опросника.
 */
console.log('Oprosnik Helper: Form Modifier Script Loaded.');

function hideCallDurationElement(): void {
  const callDurationSelect = document.getElementById('call_duration_id');
  if (callDurationSelect) {
    const callDurationContainer = callDurationSelect.closest<HTMLDivElement>('.row');
    if (callDurationContainer) {
      callDurationContainer.style.display = 'none';
      console.log('Элемент "Длительность звонка" был успешно скрыт.');
    }
  }
}

function removeSpecificOptions(selectors: Record<string, string[]>): void {
  for (const selectId in selectors) {
    if (Object.prototype.hasOwnProperty.call(selectors, selectId)) {
      const selectElement = document.getElementById(selectId) as HTMLSelectElement | null;
      if (selectElement) {
        const valuesToRemove = selectors[selectId];
        valuesToRemove.forEach(value => {
          const optionToRemove = selectElement.querySelector<HTMLOptionElement>(`option[value="${value}"]`);
          if (optionToRemove) {
            optionToRemove.remove();
          }
        });
      }
    }
  }
}

// --- Main Execution ---

hideCallDurationElement();

const optionsToRemove: Record<string, string[]> = {
  'type_group': ['КДГ 1 ЛТП'],
  'type_id': ['333', '42', '400']
};

// Remove from static lists immediately
removeSpecificOptions({ 'type_group': optionsToRemove.type_group });

// Poll and remove from dynamic lists
setInterval(() => {
  removeSpecificOptions({ 'type_id': optionsToRemove.type_id });
}, 300);
