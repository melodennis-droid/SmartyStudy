// ==================== APP STATE ====================
const appState = {
    subjects: JSON.parse(localStorage.getItem('subjects')) || [],
    tasks: JSON.parse(localStorage.getItem('tasks')) || [],
    events: JSON.parse(localStorage.getItem('events')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    notes: JSON.parse(localStorage.getItem('notes')) || [],
    profile: JSON.parse(localStorage.getItem('profile')) || {},
    pomodoroCycles: JSON.parse(localStorage.getItem('pomodoroCycles')) || 0,
    achievements: JSON.parse(localStorage.getItem('achievements')) || [],
    studySessions: JSON.parse(localStorage.getItem('studySessions')) || [],
    currentPage: 'dashboard',
    pomodoroInterval: null,
    pomodoroTime: 1500,
    isBreak: false
};

const studyTimer = {
    subjectId: null,
    elapsed: 0,
    interval: null
};

let performanceChartInstance = null;
let weeklyChartInstance = null;
let currentDate = new Date();

// ==================== NAVIGATION ====================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    appState.currentPage = page;
    loadPageContent(page);

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

function loadPageContent(page) {
    switch (page) {
        case 'dashboard': updateDashboard(); break;
        case 'subjects': renderSubjects(); updateStudyTimerSubjectSelect(); break;
        case 'tasks': updateTaskSubjectSelect(); renderTasks(); break;
        case 'calendar': renderCalendar(); break;
        case 'pomodoro': updatePomodoroSubjectSelect(); break;
        case 'goals': renderGoals(); break;
        case 'notes': renderNotes(); break;
        case 'achievements': renderAchievements(); break;
        case 'profile': renderProfile(); break;
    }
}

// ==================== THEME ====================
function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('themeToggle');

    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        btn.innerHTML = '<span>☀️</span> Modo Claro';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        btn.innerHTML = '<span>🌙</span> Modo Escuro';
        localStorage.setItem('theme', 'light');
    }
}

// ==================== SUBJECTS ====================
function addSubject() {
    const name = document.getElementById('subjectName').value.trim();
    const teacher = document.getElementById('subjectTeacher').value.trim();
    const color = document.getElementById('subjectColor').value;

    if (!name) {
        alert('Por favor, insira o nome da matéria!');
        return;
    }

    const subject = {
        id: Date.now(),
        name,
        teacher,
        color,
        createdAt: new Date().toISOString()
    };

    appState.subjects.push(subject);
    saveData();
    renderSubjects();
    updateStudyTimerSubjectSelect();
    updatePomodoroSubjectSelect();

    document.getElementById('subjectName').value = '';
    document.getElementById('subjectTeacher').value = '';

    checkAchievements();
}

function deleteSubject(id) {
    if (confirm('Tem certeza que deseja excluir esta matéria?')) {
        if (studyTimer.subjectId === id) stopStudyTimer();
        appState.subjects = appState.subjects.filter(s => s.id !== id);
        saveData();
        renderSubjects();
        updateStudyTimerSubjectSelect();
        updatePomodoroSubjectSelect();
        updateDashboard();
    }
}

function renderSubjects() {
    const container = document.getElementById('subjectsList');

    if (appState.subjects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">Nenhuma matéria cadastrada.</p>';
        return;
    }

    container.innerHTML = appState.subjects.map(subject => `
        <div class="subject-card" style="background: ${subject.color}">
            <h4>${subject.name}</h4>
            <p class="teacher">${subject.teacher || 'Sem professor'}</p>
            <span class="time-badge">⏱️ ${formatDuration(getSubjectStudySeconds(subject.id))}</span>
            <button class="delete-btn" onclick="deleteSubject(${subject.id})">×</button>
        </div>
    `).join('');
}

// ==================== STUDY TIMER ====================
function getSubjectStudySeconds(subjectId) {
    return appState.studySessions
        .filter(s => s.subjectId === subjectId)
        .reduce((total, s) => total + s.duration, 0);
}

function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h${String(minutes).padStart(2, '0')}min`;
    return `${minutes}min`;
}

function updateStudyTimerSubjectSelect() {
    const select = document.getElementById('studyTimerSubject');
    const prev = select.value;
    select.innerHTML = '<option value="">Selecione a matéria</option>' +
        appState.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (studyTimer.subjectId && appState.subjects.some(s => s.id === studyTimer.subjectId)) {
        select.value = studyTimer.subjectId;
    } else if (prev) select.value = prev;
}

function updatePomodoroSubjectSelect() {
    const select = document.getElementById('pomodoroSubject');
    const prev = select.value;
    select.innerHTML = '<option value="">Sem matéria específica</option>' +
        appState.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (prev) select.value = prev;
}

function startStudyTimer() {
    const select = document.getElementById('studyTimerSubject');
    const subjectId = Number(select.value);

    if (!subjectId) {
        alert('Selecione uma matéria!');
        return;
    }

    if (studyTimer.interval && studyTimer.subjectId !== subjectId) {
        if (!confirm('Já existe um cronômetro rodando. Deseja finalizar e começar nesta matéria?')) {
            select.value = studyTimer.subjectId;
            return;
        }
        stopStudyTimer();
    }

    studyTimer.subjectId = subjectId;
    select.disabled = true;
    document.getElementById('studyTimerStartBtn').disabled = true;

    if (studyTimer.interval) return;

    studyTimer.interval = setInterval(() => {
        studyTimer.elapsed++;
        updateStudyTimerDisplay();
    }, 1000);
}

function pauseStudyTimer() {
    if (studyTimer.interval) {
        clearInterval(studyTimer.interval);
        studyTimer.interval = null;
    }
    document.getElementById('studyTimerSubject').disabled = false;
    document.getElementById('studyTimerStartBtn').disabled = false;
}

function stopStudyTimer() {
    pauseStudyTimer();

    if (studyTimer.subjectId && studyTimer.elapsed > 0) {
        const subject = appState.subjects.find(s => s.id === studyTimer.subjectId);
        const session = {
            id: Date.now(),
            subjectId: studyTimer.subjectId,
            subjectName: subject ? subject.name : 'Matéria removida',
            duration: studyTimer.elapsed,
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };
        appState.studySessions.push(session);
        saveData();
        renderSubjects();
        updateDashboard();
        checkAchievements();
    }

    studyTimer.subjectId = null;
    studyTimer.elapsed = 0;
    updateStudyTimerDisplay();
}

function updateStudyTimerDisplay() {
    const display = document.getElementById('studyTimerDisplay');
    if (!display) return;
    const hours = Math.floor(studyTimer.elapsed / 3600);
    const minutes = Math.floor((studyTimer.elapsed % 3600) / 60);
    const seconds = studyTimer.elapsed % 60;
    display.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ==================== TASKS ====================
function updateTaskSubjectSelect() {
    const select = document.getElementById('taskSubject');
    select.innerHTML = '<option value="">Matéria</option>' +
        appState.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const subject = document.getElementById('taskSubject').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const priority = document.getElementById('taskPriority').value;

    if (!title || !subject) {
        alert('Preencha o título e selecione a matéria!');
        return;
    }

    const task = {
        id: Date.now(),
        title,
        subject,
        dueDate,
        priority,
        completed: false,
        createdAt: new Date().toISOString()
    };

    appState.tasks.push(task);
    saveData();
    renderTasks();

    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDueDate').value = '';
}

function toggleTask(id) {
    const task = appState.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveData();
        renderTasks();
        updateDashboard();
        checkAchievements();
    }
}

function deleteTask(id) {
    appState.tasks = appState.tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
    updateDashboard();
}

function renderTasks() {
    const container = document.getElementById('tasksList');

    if (appState.tasks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">Nenhuma tarefa cadastrada.</p>';
        return;
    }

    container.innerHTML = appState.tasks
        .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        })
        .map(task => `
            <div class="task-item priority-${task.priority} ${task.completed ? 'completed' : ''}">
                <div class="task-left">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})" />
                    <div class="task-info">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">${task.subject} • ${task.dueDate || 'Sem data'} • ${task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}</div>
                    </div>
                </div>
                <div class="task-actions">
                    <button onclick="deleteTask(${task.id})" class="btn btn-secondary btn-sm">🗑️</button>
                </div>
            </div>
        `).join('');
}

// ==================== CALENDAR ====================
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    document.getElementById('currentMonth').textContent =
        new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    dayLabels.forEach(day => {
        const el = document.createElement('div');
        el.className = 'day-label';
        el.textContent = day;
        grid.appendChild(el);
    });

    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        grid.appendChild(el);
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const el = document.createElement('div');
        el.className = 'calendar-day';

        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            el.classList.add('today');
        }

        const eventsOnDay = appState.events.filter(e => e.date === dateStr);
        if (eventsOnDay.length > 0) {
            el.classList.add('has-event');
        }

        el.innerHTML = `${day}${eventsOnDay.length > 0 ? '<div class="event-dot"></div>' : ''}`;
        el.onclick = () => showEventsForDay(dateStr, eventsOnDay);
        grid.appendChild(el);
    }

    renderEvents();
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

function showEventsForDay(date, events) {
    const title = prompt('Adicionar evento para ' + new Date(date + 'T00:00:00').toLocaleDateString('pt-BR') + ':\n\nTítulo:');
    if (title) {
        const event = { id: Date.now(), date, title, type: 'event' };
        appState.events.push(event);
        saveData();
        renderCalendar();
    }
}

function deleteEvent(id) {
    appState.events = appState.events.filter(e => e.id !== id);
    saveData();
    renderCalendar();
}

function renderEvents() {
    const container = document.getElementById('eventsList');
    const upcoming = appState.events.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 10);

    if (upcoming.length === 0) {
        container.innerHTML = '<h4>📌 Eventos Próximos</h4><p style="color: #94a3b8; margin-top: 8px;">Nenhum evento próximo.</p>';
        return;
    }

    container.innerHTML = '<h4>📌 Eventos Próximos</h4>' +
        upcoming.map(event => `
            <div class="event-item">
                <span class="event-title">${event.title}</span>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="event-date">${new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    <button onclick="deleteEvent(${event.id})" class="btn btn-secondary btn-sm">🗑️</button>
                </div>
            </div>
        `).join('');
}

// ==================== POMODORO ====================
function startPomodoro() {
    if (appState.pomodoroInterval) return;

    appState.pomodoroInterval = setInterval(() => {
        appState.pomodoroTime--;
        updateTimerDisplay();

        if (appState.pomodoroTime <= 0) {
            clearInterval(appState.pomodoroInterval);
            appState.pomodoroInterval = null;

            if (!appState.isBreak) {
                appState.pomodoroCycles++;
                document.getElementById('pomodoroCycles').textContent = appState.pomodoroCycles;
                logPomodoroFocusSession();
                saveData();
                checkAchievements();
                alert('🎉 Foco concluído! Hora da pausa.');
                startBreak();
            } else {
                alert('⏰ Pausa concluída! Volte aos estudos.');
                resetPomodoro();
            }
        }
    }, 1000);
}

function logPomodoroFocusSession() {
    const select = document.getElementById('pomodoroSubject');
    const subjectId = select ? Number(select.value) : 0;
    const focusMinutes = parseInt(document.getElementById('focusSlider').value);

    const subject = subjectId ? appState.subjects.find(s => s.id === subjectId) : null;
    const session = {
        id: Date.now(),
        subjectId: subjectId || null,
        subjectName: subject ? subject.name : 'Geral',
        duration: focusMinutes * 60,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
    };
    appState.studySessions.push(session);
}

function startBreak() {
    appState.isBreak = true;
    const breakMinutes = parseInt(document.getElementById('breakSlider').value);
    appState.pomodoroTime = breakMinutes * 60;
    updateTimerDisplay();
    startPomodoro();
}

function pausePomodoro() {
    clearInterval(appState.pomodoroInterval);
    appState.pomodoroInterval = null;
}

function resetPomodoro() {
    pausePomodoro();
    appState.isBreak = false;
    const focusMinutes = parseInt(document.getElementById('focusSlider').value);
    appState.pomodoroTime = focusMinutes * 60;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(appState.pomodoroTime / 60);
    const seconds = appState.pomodoroTime % 60;
    document.getElementById('timerDisplay').textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ==================== GOALS ====================
function addGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const target = parseFloat(document.getElementById('goalTarget').value);

    if (!title || !target) {
        alert('Preencha todos os campos!');
        return;
    }

    const goal = {
        id: Date.now(),
        title,
        target,
        progress: 0,
        createdAt: new Date().toISOString()
    };

    appState.goals.push(goal);
    saveData();
    renderGoals();

    document.getElementById('goalTitle').value = '';
    document.getElementById('goalTarget').value = '';
}

function updateGoalProgress(id, progress) {
    const goal = appState.goals.find(g => g.id === id);
    if (goal) {
        goal.progress = Math.max(0, Math.min(Number(progress), goal.target));
        saveData();
        renderGoals();
        checkAchievements();
    }
}

function deleteGoal(id) {
    appState.goals = appState.goals.filter(g => g.id !== id);
    saveData();
    renderGoals();
}

function renderGoals() {
    const container = document.getElementById('goalsList');

    if (appState.goals.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">Nenhuma meta definida.</p>';
        return;
    }

    container.innerHTML = appState.goals.map(goal => `
        <div class="goal-item">
            <div class="goal-header">
                <span class="goal-title">${goal.title}</span>
                <span class="goal-progress-text">${goal.progress} / ${goal.target}</span>
            </div>
            <div class="goal-bar">
                <div class="fill" style="width: ${(goal.progress / goal.target) * 100}%"></div>
            </div>
            <div class="goal-controls">
                <input type="number" min="0" max="${goal.target}" value="${goal.progress}"
                    onchange="updateGoalProgress(${goal.id}, this.value)" class="input-field" style="width: 100px;" />
                <button onclick="deleteGoal(${goal.id})" class="btn btn-secondary btn-sm">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ==================== NOTES ====================
function addNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();

    if (!title || !content) {
        alert('Preencha todos os campos!');
        return;
    }

    const note = {
        id: Date.now(),
        title,
        content,
        createdAt: new Date().toISOString()
    };

    appState.notes.push(note);
    saveData();
    renderNotes();

    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
}

function deleteNote(id) {
    appState.notes = appState.notes.filter(n => n.id !== id);
    saveData();
    renderNotes();
}

function renderNotes() {
    const container = document.getElementById('notesList');

    if (appState.notes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">Nenhuma nota criada.</p>';
        return;
    }

    container.innerHTML = appState.notes.map(note => `
        <div class="note-card">
            <h4>${note.title}</h4>
            <p>${note.content.substring(0, 120)}${note.content.length > 120 ? '...' : ''}</p>
            <div class="note-footer">
                <span class="note-date">${new Date(note.createdAt).toLocaleDateString('pt-BR')}</span>
                <button onclick="deleteNote(${note.id})" class="btn btn-secondary btn-sm">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ==================== ACHIEVEMENTS ====================
const achievementsList = [
    { id: 'first_subject', icon: '📚', title: 'Primeira Matéria', description: 'Cadastrar primeira matéria', condition: () => appState.subjects.length >= 1 },
    { id: 'five_subjects', icon: '📚📚', title: 'Estudante Dedicado', description: 'Cadastrar 5 matérias', condition: () => appState.subjects.length >= 5 },
    { id: 'first_task', icon: '✅', title: 'Primeira Tarefa', description: 'Completar primeira tarefa', condition: () => appState.tasks.some(t => t.completed) },
    { id: 'ten_tasks', icon: '🏅', title: 'Produtivo', description: 'Completar 10 tarefas', condition: () => appState.tasks.filter(t => t.completed).length >= 10 },
    { id: 'pomodoro_1', icon: '⏱️', title: 'Foco Inicial', description: 'Completar 1 ciclo Pomodoro', condition: () => appState.pomodoroCycles >= 1 },
    { id: 'pomodoro_10', icon: '🔥', title: 'Super Foco', description: 'Completar 10 ciclos Pomodoro', condition: () => appState.pomodoroCycles >= 10 },
    { id: 'goal_complete', icon: '🎯', title: 'Meta Atingida', description: 'Completar uma meta', condition: () => appState.goals.some(g => g.progress >= g.target) },
    { id: 'first_note', icon: '📝', title: 'Anotador', description: 'Criar primeira nota', condition: () => appState.notes.length >= 1 },
    { id: 'first_study_session', icon: '⏳', title: 'Primeira Cronometrada', description: 'Registrar primeira sessão de estudo', condition: () => appState.studySessions.length >= 1 },
    { id: 'study_1h', icon: '⌛', title: 'Uma Hora de Estudo', description: 'Acumular 1 hora de estudo', condition: () => appState.studySessions.reduce((t, s) => t + s.duration, 0) >= 3600 },
    { id: 'study_10h', icon: '🕐', title: 'Maratonista', description: 'Acumular 10 horas de estudo', condition: () => appState.studySessions.reduce((t, s) => t + s.duration, 0) >= 36000 },
];

function checkAchievements() {
    let unlocked = false;
    achievementsList.forEach(achievement => {
        if (!appState.achievements.includes(achievement.id) && achievement.condition()) {
            appState.achievements.push(achievement.id);
            unlocked = true;
            alert(`🏆 Conquista desbloqueada: ${achievement.title}!`);
        }
    });

    if (unlocked) {
        saveData();
        renderAchievements();
        updateDashboard();
    }
}

function renderAchievements() {
    const container = document.getElementById('achievementsList');
    container.innerHTML = achievementsList.map(achievement => {
        const unlocked = appState.achievements.includes(achievement.id);
        return `
            <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                <div class="icon">${achievement.icon}</div>
                <h4>${achievement.title}</h4>
                <p>${achievement.description}</p>
                <div class="status">${unlocked ? '✅ Desbloqueado' : '🔒 Bloqueado'}</div>
            </div>
        `;
    }).join('');
}

// ==================== PROFILE ====================
function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const course = document.getElementById('profileCourse').value.trim();
    const semester = document.getElementById('profileSemester').value.trim();

    if (!name) {
        alert('Por favor, insira seu nome!');
        return;
    }

    appState.profile = { name, course, semester };
    saveData();
    renderProfile();
}

function renderProfile() {
    const profile = appState.profile;

    document.getElementById('profileName').value = profile.name || '';
    document.getElementById('profileCourse').value = profile.course || '';
    document.getElementById('profileSemester').value = profile.semester || '';

    document.getElementById('profileAvatar').textContent = profile.name ? profile.name.charAt(0).toUpperCase() : '?';
    document.getElementById('profileNameDisplay').textContent = profile.name || 'Seu Nome';
    document.getElementById('profileCourseDisplay').textContent = profile.course || 'Curso não definido';
    document.getElementById('profileSemesterDisplay').textContent = profile.semester ? `${profile.semester}° Semestre` : 'Semestre não definido';
}

// ==================== DASHBOARD ====================
function updateDashboard() {
    document.getElementById('totalSubjects').textContent = appState.subjects.length;
    document.getElementById('completedTasks').textContent = appState.tasks.filter(t => t.completed).length;

    const totalSeconds = appState.studySessions.reduce((t, s) => t + s.duration, 0);
    document.getElementById('studyHours').textContent = (totalSeconds / 3600).toFixed(1) + 'h';

    document.getElementById('achievementsCount').textContent = appState.achievements.length;

    renderPerformanceChart();
    renderWeeklyChart();
}

function renderPerformanceChart() {
    const canvas = document.getElementById('performanceChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = appState.subjects.map(s => s.name);
    const data = appState.subjects.map(s => +(getSubjectStudySeconds(s.id) / 60).toFixed(1));
    const colors = appState.subjects.map(s => s.color);

    if (performanceChartInstance) performanceChartInstance.destroy();

    if (labels.length === 0) return;

    performanceChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Minutos estudados',
                data,
                backgroundColor: colors,
                borderRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { display: false } } }
        }
    });
}

function renderWeeklyChart() {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const days = [];
    const labels = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
        labels.push(d.toLocaleDateString('pt-BR', { weekday: 'short' }));
    }

    const data = days.map(day =>
        +(appState.studySessions
            .filter(s => s.date === day)
            .reduce((total, s) => total + s.duration, 0) / 60).toFixed(1)
    );

    if (weeklyChartInstance) weeklyChartInstance.destroy();

    weeklyChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Minutos por dia',
                data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#3b82f6',
                pointRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { display: false } } }
        }
    });
}

// ==================== DATA PERSISTENCE ====================
function saveData() {
    localStorage.setItem('subjects', JSON.stringify(appState.subjects));
    localStorage.setItem('tasks', JSON.stringify(appState.tasks));
    localStorage.setItem('events', JSON.stringify(appState.events));
    localStorage.setItem('goals', JSON.stringify(appState.goals));
    localStorage.setItem('notes', JSON.stringify(appState.notes));
    localStorage.setItem('profile', JSON.stringify(appState.profile));
    localStorage.setItem('pomodoroCycles', JSON.stringify(appState.pomodoroCycles));
    localStorage.setItem('achievements', JSON.stringify(appState.achievements));
    localStorage.setItem('studySessions', JSON.stringify(appState.studySessions));
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').innerHTML = '<span>☀️</span> Modo Claro';
    }

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.dataset.page);
        });
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebarToggle');
        if (window.innerWidth <= 768 && sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) && !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Pomodoro sliders
    document.getElementById('focusSlider').addEventListener('input', function() {
        document.getElementById('focusTime').textContent = this.value;
        if (!appState.pomodoroInterval && !appState.isBreak) {
            appState.pomodoroTime = this.value * 60;
            updateTimerDisplay();
        }
    });

    document.getElementById('breakSlider').addEventListener('input', function() {
        document.getElementById('breakTime').textContent = this.value;
    });

    // Initialize
    navigateTo('dashboard');
    renderAchievements();
});