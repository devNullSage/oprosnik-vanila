/**
 * sidebar-hider.ts
 * Этот скрипт отвечает только за логику скрытия сайдбара.
 */
console.log('Oprosnik Helper: Sidebar Hider Script Loaded.');

function createSidebarToggleButton(): void {
  const navBar = document.querySelector<HTMLUListElement>('.main-header .navbar-nav');

  if (!navBar) {
    console.error('Не удалось найти панель навигации для добавления кнопки.');
    return;
  }

  const toggleBtn = document.createElement('button');
  toggleBtn.innerText = 'Скрыть/Показать сайдбар';
  toggleBtn.className = 'btn oprosnik-helper-btn';
  toggleBtn.type = 'button';
  toggleBtn.style.marginLeft = '15px';

  toggleBtn.addEventListener('click', toggleSidebarVisibility);

  const navItem = document.createElement('li');
  navItem.className = 'nav-item';
  navItem.appendChild(toggleBtn);

  navBar.appendChild(navItem);
}

function toggleSidebarVisibility(): void {
  document.body.classList.toggle('sidebar-hidden-by-extension');
  const isHidden = document.body.classList.contains('sidebar-hidden-by-extension');
  console.log(`Сайдбар теперь ${isHidden ? 'скрыт' : 'видим'}.`);
}

// --- Main Execution ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createSidebarToggleButton);
} else {
  createSidebarToggleButton();
}
