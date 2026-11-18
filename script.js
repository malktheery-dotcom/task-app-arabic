/**
 * تطبيق إدارة المهام اليومية (TaskApp)
 * تم التطوير بأحدث ممارسات JavaScript (ES6+)
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // العناصر الأساسية (DOM Elements)
  // =========================================================================
  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const prioritySelect = document.getElementById('priority-select');
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDesc = document.getElementById('empty-desc');

  // عناصر البحث الفوري
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const searchBadge = document.getElementById('search-badge');
  const searchCount = document.getElementById('search-count');

  // عناصر الإحصائيات ونسبة الإنجاز
  const totalCountEl = document.getElementById('total-count');
  const pendingCountEl = document.getElementById('pending-count');
  const completedCountEl = document.getElementById('completed-count');
  const progressPercentEl = document.getElementById('progress-percent');
  const progressFillEl = document.getElementById('progress-fill');
  const currentDateEl = document.getElementById('current-date');

  // أزرار التحكم والمظهر
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  const toastContainer = document.getElementById('toast-container');

  // =========================================================================
  // حالة التطبيق (Application State)
  // =========================================================================
  const STORAGE_KEY = 'daily_tasks_app_data';
  const THEME_KEY = 'daily_tasks_theme';
  
  // تحميل المهام مع ضمان التوافق العكسي وحفظ أي بيانات سابقة
  let tasks = loadTasksFromStorage();
  let currentFilter = 'all';
  let searchQuery = '';

  // =========================================================================
  // التهيئة الأولية (Initialization)
  // =========================================================================
  initTheme();
  renderDate();
  renderTasks();
  updateStats();

  // =========================================================================
  // معالجات الأحداث (Event Listeners)
  // =========================================================================

  // إضافة مهمة جديدة
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const taskText = taskInput.value.trim();
    const priority = normalizePriority(prioritySelect.value);

    if (!taskText) {
      showToast('يرجى كتابة نص المهمة أولاً', 'danger');
      return;
    }

    addTask(taskText, priority);
    taskInput.value = '';
    taskInput.focus();
  });

  // معالجة البحث الفوري
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      
      // إظهار/إخفاء زر مسح البحث
      if (searchQuery.length > 0) {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }

      renderTasks();
    });
  }

  // مسح نص البحث
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      searchBadge.classList.add('hidden');
      searchInput.focus();
      renderTasks();
    });
  }

  // تغيير المظهر (Dark / Light Mode)
  themeToggleBtn.addEventListener('click', toggleTheme);

  // تبديل فلاتر العرض
  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      renderTasks();
    });
  });

  // مسح المهام المكتملة
  clearCompletedBtn.addEventListener('click', () => {
    const completedTasks = tasks.filter((t) => t.completed);
    if (completedTasks.length === 0) {
      showToast('لا توجد مهام مكتملة لحذفها', 'info');
      return;
    }

    if (confirm('هل أنت متأكد من رغبتك في حذف جميع المهام المكتملة؟')) {
      tasks = tasks.filter((t) => !t.completed);
      saveTasksToStorage();
      renderTasks();
      updateStats();
      showToast(`تم حذف ${completedTasks.length} من المهام المكتملة`, 'success');
    }
  });

  // =========================================================================
  // الدوال الأساسية لإدارة المهام (Task Operations)
  // =========================================================================

  /**
   * إضافة مهمة جديدة
   */
  function addTask(text, priority) {
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      text: text,
      completed: false,
      priority: priority,
      createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask); // إضافة في البداية
    saveTasksToStorage();
    renderTasks();
    updateStats();
    showToast('تمت إضافة المهمة بنجاح ✨', 'success');
  }

  /**
   * تبديل حالة اكتمال المهمة
   */
  function toggleTaskCompletion(id) {
    tasks = tasks.map((task) => {
      if (task.id === id) {
        const isCompleted = !task.completed;
        if (isCompleted) {
          showToast('أحسنت! تم إكمال المهمة 🎉', 'success');
        }
        return { ...task, completed: isCompleted };
      }
      return task;
    });

    saveTasksToStorage();
    renderTasks();
    updateStats();
  }

  /**
   * تحديث أولوية المهمة وحفظها تلقائياً
   */
  function updateTaskPriority(id, newPriority, taskElement, selectElement) {
    const validPriority = normalizePriority(newPriority);
    
    tasks = tasks.map((task) => {
      if (task.id === id) {
        return { ...task, priority: validPriority };
      }
      return task;
    });

    saveTasksToStorage();

    // تحديث التنسيقات والألوان فورياً في العنصر
    if (taskElement) {
      taskElement.classList.remove('priority-high', 'priority-medium', 'priority-low');
      taskElement.classList.add(`priority-${validPriority}`);
    }

    if (selectElement) {
      selectElement.className = `task-priority-select priority-${validPriority}`;
    }

    showToast(`تم تحديث الأولوية: ${getPriorityLabel(validPriority)}`, 'info');
  }

  /**
   * حذف مهمة مع تأثير حركي سلس
   */
  function deleteTask(id, taskElement) {
    taskElement.classList.add('removing');
    
    // الانتظار حتى اكتمال الأنميشن ثم الحذف الفعلي
    setTimeout(() => {
      tasks = tasks.filter((task) => task.id !== id);
      saveTasksToStorage();
      renderTasks();
      updateStats();
      showToast('تم حذف المهمة', 'info');
    }, 250);
  }

  // =========================================================================
  // عرض وعرض العناصر في الصفحة (Rendering)
  // =========================================================================

  /**
   * رسم قائمة المهام في الـ DOM مع دعم التصفية والبحث الفوري
   */
  function renderTasks() {
    taskList.innerHTML = '';

    // تصفية المهام بناءً على الفلتر الحالي والبحث الفوري
    const filteredTasks = tasks.filter((task) => {
      // مطابقة حالة المهمة
      const matchesFilter = 
        currentFilter === 'all' ||
        (currentFilter === 'pending' && !task.completed) ||
        (currentFilter === 'completed' && task.completed);

      // مطابقة نص البحث
      const matchesSearch = 
        !searchQuery ||
        task.text.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });

    // تحديث شارة عدد نتائج البحث
    if (searchQuery.length > 0 && searchBadge && searchCount) {
      searchBadge.classList.remove('hidden');
      searchCount.textContent = filteredTasks.length;
    } else if (searchBadge) {
      searchBadge.classList.add('hidden');
    }

    // إدارة الحالة الفارغة
    if (filteredTasks.length === 0) {
      emptyState.classList.remove('hidden');
      updateEmptyStateMessage();
    } else {
      emptyState.classList.add('hidden');
      filteredTasks.forEach((task) => {
        const taskItem = createTaskElement(task);
        taskList.appendChild(taskItem);
      });
    }
  }

  /**
   * إنشاء عنصر المهمة في الـ DOM بأمان وبدون ثغرات XSS
   */
  function createTaskElement(task) {
    const normalizedP = normalizePriority(task.priority);

    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''} priority-${normalizedP}`;
    li.dataset.id = task.id;

    // الحاوية الداخلية للمحتوى
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'task-content-wrapper';

    // خانة الاختيار المخصصة
    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'custom-checkbox';
    checkboxLabel.title = task.completed ? 'تعيين كغير مكتملة' : 'تحديد كمكتملة';

    const checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInput.checked = task.completed;
    checkboxInput.addEventListener('change', () => toggleTaskCompletion(task.id));

    const checkmark = document.createElement('span');
    checkmark.className = 'checkbox-checkmark';

    checkboxLabel.appendChild(checkboxInput);
    checkboxLabel.appendChild(checkmark);

    // تفاصيل المهمة
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'task-details';

    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = task.text;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'task-meta';

    // قائمة منسدلة لتحديد أولوية المهمة بلون وتنسيق مميز
    const priorityContainer = document.createElement('div');
    priorityContainer.className = 'priority-dropdown-container';

    const prioritySelectEl = document.createElement('select');
    prioritySelectEl.className = `task-priority-select priority-${normalizedP}`;
    prioritySelectEl.title = 'تغيير أولوية المهمة';
    prioritySelectEl.setAttribute('aria-label', 'تغيير أولوية المهمة');
    prioritySelectEl.innerHTML = `
      <option value="high" ${normalizedP === 'high' ? 'selected' : ''}>🔴 عالية</option>
      <option value="medium" ${normalizedP === 'medium' ? 'selected' : ''}>🟡 متوسطة</option>
      <option value="low" ${normalizedP === 'low' ? 'selected' : ''}>🟢 منخفضة</option>
    `;

    prioritySelectEl.addEventListener('change', (e) => {
      updateTaskPriority(task.id, e.target.value, li, prioritySelectEl);
    });

    priorityContainer.appendChild(prioritySelectEl);

    // وقت الإنشاء
    const timeSpan = document.createElement('span');
    timeSpan.textContent = formatTaskTime(task.createdAt);

    metaDiv.appendChild(priorityContainer);
    metaDiv.appendChild(timeSpan);

    detailsDiv.appendChild(textSpan);
    detailsDiv.appendChild(metaDiv);

    contentWrapper.appendChild(checkboxLabel);
    contentWrapper.appendChild(detailsDiv);

    // أزرار العمليات (حذف)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.title = 'حذف المهمة';
    deleteBtn.setAttribute('aria-label', 'حذف المهمة');
    deleteBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
    deleteBtn.addEventListener('click', () => deleteTask(task.id, li));

    actionsDiv.appendChild(deleteBtn);

    li.appendChild(contentWrapper);
    li.appendChild(actionsDiv);

    return li;
  }

  /**
   * تحديث نصوص الحالة الفارغة بناءً على التصفية الحالية والبحث
   */
  function updateEmptyStateMessage() {
    if (tasks.length === 0) {
      emptyTitle.textContent = 'لا توجد مهام حالياً';
      emptyDesc.textContent = 'أضف مهمتك الأولى لتنظيم يومك وزيادة إنتاجيتك!';
    } else if (searchQuery.length > 0) {
      emptyTitle.textContent = 'لا توجد نتائج تطابق بحثك';
      emptyDesc.textContent = `لم يتم العثور على أية مهام تحتوي على "${searchQuery}". جرب كلمة أخرى.`;
    } else if (currentFilter === 'pending') {
      emptyTitle.textContent = 'رائع! لا توجد مهام متبقية';
      emptyDesc.textContent = 'لقد أنجزت جميع المهام المجدولة بنجاح!';
    } else if (currentFilter === 'completed') {
      emptyTitle.textContent = 'لا توجد مهام مكتملة بعد';
      emptyDesc.textContent = 'أنجز بعض المهام لترى إنجازاتك هنا.';
    }
  }

  /**
   * تحديث الإحصائيات وشريط التقدم
   */
  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = total - completed;

    totalCountEl.textContent = total;
    pendingCountEl.textContent = pending;
    completedCountEl.textContent = completed;

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressPercentEl.textContent = `${percentage}%`;
    progressFillEl.style.width = `${percentage}%`;
  }

  // =========================================================================
  // وظائف المظهر والوقت والمساعدات (Theme & Date & Helpers)
  // =========================================================================

  /**
   * تهيئة الوضع الليلي / النهاري من LocalStorage
   */
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark'; // الافتراضي الوضع الليلي العصري
    setTheme(savedTheme);
  }

  /**
   * تبديل الوضع وتخزينه
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  /**
   * تطبيق المظهر المختار وتحديث الأيقونة
   */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    if (theme === 'dark') {
      themeIcon.className = 'fa-solid fa-sun';
      themeToggleBtn.title = 'التحويل للوضع النهاري';
    } else {
      themeIcon.className = 'fa-solid fa-moon';
      themeToggleBtn.title = 'التحويل للوضع الليلي';
    }
  }

  /**
   * عرض التاريخ الحالي باللغة العربية
   */
  function renderDate() {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const now = new Date();
    currentDateEl.textContent = now.toLocaleDateString('ar-SA', options);
  }

  /**
   * تنسيق توقيت المهمة بشكل لطيف
   */
  function formatTaskTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * توحيد قيم الأولويات مع الحفاظ الكامل على المهام السابقة
   */
  function normalizePriority(priority) {
    if (priority === 'high' || priority === 'عالية' || priority === 'عاجل') return 'high';
    if (priority === 'medium' || priority === 'متوسطة' || priority === 'متوسط') return 'medium';
    return 'low'; // الافتراضي للأولويات المنخفضة أو العادية السابقة 'normal' / 'low'
  }

  /**
   * تسمية مستوى الأولوية
   */
  function getPriorityLabel(priority) {
    const norm = normalizePriority(priority);
    switch (norm) {
      case 'high': return 'عالية 🔴';
      case 'medium': return 'متوسطة 🟡';
      default: return 'منخفضة 🟢';
    }
  }

  /**
   * إظهار إشعار Toast منبثق
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'danger') iconClass = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);

    // إزالة الإشعار بعد انتهاء مدة الأنميشن
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // =========================================================================
  // إدارة التخزين المحلي (LocalStorage) مع الحفاظ على البيانات
  // =========================================================================

  function saveTasksToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('تعذر حفظ البيانات في التخزين المحلي:', err);
    }
  }

  function loadTasksFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];

      // الحفاظ على جميع المهام السابقة مع ضبط صيغة الأولوية دون أي فقدان
      return parsed.map((item) => ({
        ...item,
        priority: normalizePriority(item.priority)
      }));
    } catch (err) {
      console.error('تعذر قراءة البيانات من التخزين المحلي:', err);
      return [];
    }
  }
});
