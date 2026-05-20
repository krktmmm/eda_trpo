(function () {
  'use strict';

  /**
   * Инициализирует все кастомные дропдауны на странице.
   * Вызывается автоматически при загрузке скрипта.
   */
  function initDropdowns() {
    // Ищем все <select> внутри .settings-container (можно расширить селектор)
    const selects = document.querySelectorAll('.settings-container select');
    selects.forEach(buildDropdown);
  }

  /**
   * Превращает один <select> в кастомный dropdown.
   * @param {HTMLSelectElement} select
   */
  function buildDropdown(select) {
    // Не дублируем, если уже заменён
    if (select.dataset.dropdownBuilt) return;
    select.dataset.dropdownBuilt = 'true';

    // Скрываем оригинальный <select>, но оставляем его в DOM
    // чтобы форма по-прежнему отправляла данные
    select.style.display = 'none';

    // --- Обёртка ---
    const wrapper = document.createElement('div');
    wrapper.className = 'cd-wrapper';
    wrapper.setAttribute('role', 'combobox');
    wrapper.setAttribute('aria-haspopup', 'listbox');
    wrapper.setAttribute('aria-expanded', 'false');
    wrapper.setAttribute('tabindex', '0');

    // --- Кнопка (отображает текущий выбор) ---
    const trigger = document.createElement('div');
    trigger.className = 'cd-trigger';

    const triggerText = document.createElement('span');
    triggerText.className = 'cd-trigger-text';
    triggerText.textContent = select.options[select.selectedIndex]?.text || '';

    const triggerArrow = document.createElement('span');
    triggerArrow.className = 'cd-arrow';
    triggerArrow.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>`;

    trigger.appendChild(triggerText);
    trigger.appendChild(triggerArrow);

    // --- Список опций ---
    const list = document.createElement('ul');
    list.className = 'cd-list';
    list.setAttribute('role', 'listbox');

    Array.from(select.options).forEach((opt, i) => {
      const item = document.createElement('li');
      item.className = 'cd-item';
      item.setAttribute('role', 'option');
      item.dataset.value = opt.value;
      item.dataset.index = i;
      item.textContent = opt.text;

      if (opt.selected) {
        item.classList.add('cd-item--selected');
        item.setAttribute('aria-selected', 'true');
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        selectOption(select, wrapper, triggerText, list, item);
        closeDropdown(wrapper, list);
      });

      list.appendChild(item);
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(list);

    // Вставляем кастомный дропдаун перед скрытым <select>
    select.parentNode.insertBefore(wrapper, select);

    // --- События ---

    // Открыть / закрыть по клику на триггер
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.contains('cd-open');
      closeAllDropdowns();
      if (!isOpen) openDropdown(wrapper, list);
    });

    // Клавиатурная навигация
    wrapper.addEventListener('keydown', (e) => handleKeydown(e, select, wrapper, triggerText, list));

    // Закрыть при клике вне
    document.addEventListener('click', () => closeDropdown(wrapper, list));
  }

  function openDropdown(wrapper, list) {
    wrapper.classList.add('cd-open');
    wrapper.setAttribute('aria-expanded', 'true');
    // Позиционируем список (чтобы не уходил за край экрана)
    const rect = wrapper.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < list.offsetHeight && rect.top > list.offsetHeight) {
      list.classList.add('cd-list--top');
    } else {
      list.classList.remove('cd-list--top');
    }
    // Прокручиваем к выбранному элементу
    const selected = list.querySelector('.cd-item--selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }

  function closeDropdown(wrapper, list) {
    wrapper.classList.remove('cd-open');
    wrapper.setAttribute('aria-expanded', 'false');
    list.classList.remove('cd-list--top');
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.cd-wrapper.cd-open').forEach((w) => {
      w.classList.remove('cd-open');
      w.setAttribute('aria-expanded', 'false');
    });
  }

  function selectOption(select, wrapper, triggerText, list, item) {
    // Снять выделение со всех
    list.querySelectorAll('.cd-item').forEach((i) => {
      i.classList.remove('cd-item--selected');
      i.removeAttribute('aria-selected');
    });
    // Выделить выбранный
    item.classList.add('cd-item--selected');
    item.setAttribute('aria-selected', 'true');

    // Обновить текст кнопки
    triggerText.textContent = item.textContent;

    // Синхронизировать с оригинальным <select>
    select.value = item.dataset.value;
    // Пробросить событие change (нужно для скриптов в settings.html)
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function handleKeydown(e, select, wrapper, triggerText, list) {
    const isOpen = wrapper.classList.contains('cd-open');
    const items = Array.from(list.querySelectorAll('.cd-item'));
    const currentIndex = items.findIndex((i) => i.classList.contains('cd-item--selected'));

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          openDropdown(wrapper, list);
        } else {
          const focused = list.querySelector('.cd-item--focused');
          if (focused) selectOption(select, wrapper, triggerText, list, focused);
          closeDropdown(wrapper, list);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          openDropdown(wrapper, list);
        } else {
          moveFocus(items, currentIndex, 1);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        moveFocus(items, currentIndex, -1);
        break;

      case 'Escape':
        closeDropdown(wrapper, list);
        wrapper.focus();
        break;

      case 'Tab':
        closeDropdown(wrapper, list);
        break;
    }
  }

  function moveFocus(items, currentIndex, direction) {
    // Убрать подсветку
    items.forEach((i) => i.classList.remove('cd-item--focused'));
    let next = currentIndex + direction;
    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;
    items[next].classList.add('cd-item--focused');
    items[next].scrollIntoView({ block: 'nearest' });
  }

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDropdowns);
  } else {
    initDropdowns();
  }

  // Публичный API (если нужно вызвать вручную после динамической вставки DOM)
  window.CustomDropdown = { init: initDropdowns };
})();