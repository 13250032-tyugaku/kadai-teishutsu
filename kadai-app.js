const q = (id) => document.getElementById(id);
const taskNameInput = q('task-name'), taskSubjectInput = q('task-subject'), taskMonthInput = q('task-month'), taskDayInput = q('task-day'), taskHourInput = q('task-hour'), taskMinuteInput = q('task-minute'), addBtn = q('add-btn'), taskList = q('task-list'), settingsToggleBtn = q('settings-toggle-btn'), settingsModal = q('settings-modal'), settingsCloseBtn = q('settings-close-btn'), modalCloseFooterBtn = q('modal-close-footer-btn'), settingNotifyToggle = q('setting-notify-toggle'), settingNotifyTiming = q('setting-notify-timing'), settingDefaultHour = q('setting-default-hour'), settingDefaultMinute = q('setting-default-minute'), newSubjectInput = q('new-subject-input'), addSubjectBtn = q('add-subject-btn'), subjectTagsContainer = q('subject-tags-container'), settingDarkModeToggle = q('setting-darkmode-toggle');

let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
let customSubjects = JSON.parse(localStorage.getItem('myCustomSubjects')) || [
    { name: '国語', color: '#ff4d4f' }, { name: '数学', color: '#1890ff' },
    { name: '英語', color: '#722ed1' }, { name: '理科', color: '#52c41a' }, { name: '社会', color: '#fa8c16' }
];
let appSettings = JSON.parse(localStorage.getItem('myAppSettings')) || { notifyEnabled: false, notifyTiming: "1d", defaultHour: "", defaultMinute: "00", darkMode: false };

// 🎨 選択されたカラーパレットの色を管理する変数（初期値は赤）
let selectedPaletteColor = '#ff4d4f';

const saveAndRender = () => { localStorage.setItem('myTasks', JSON.stringify(tasks)); renderTasks(); };
const saveAppSettings = () => { localStorage.setItem('myAppSettings', JSON.stringify(appSettings)); };
const toggleModal = (show) => settingsModal.style.display = show ? "flex" : "none";

settingsToggleBtn.addEventListener('click', () => toggleModal(true));
[settingsCloseBtn, modalCloseFooterBtn].forEach(b => b.addEventListener('click', () => toggleModal(false)));
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) toggleModal(false); });

const updateSubjectUI = () => {
    localStorage.setItem('myCustomSubjects', JSON.stringify(customSubjects));
    const cur = taskSubjectInput.value;
    taskSubjectInput.innerHTML = [...customSubjects.map(s => s.name), 'その他'].map(n => `<option value="${n}">${n}</option>`).join('');
    if ([...customSubjects.map(s => s.name), 'その他'].includes(cur)) taskSubjectInput.value = cur;

    subjectTagsContainer.innerHTML = customSubjects.map(s => `
        <span class="setting-sub-badge" style="background-color: ${s.color};">${s.name} 
            <button class="sub-del-btn" onclick="deleteSubject('${s.name}')">×</button>
        </span>`).join('');
};

// 🎨 円形カラーパレットの選択処理を安全に動かすロジック
const initColorPalette = () => {
    const paletteContainer = document.getElementById('color-palette-container');
    if (!paletteContainer) return;
    
    paletteContainer.addEventListener('click', (e) => {
        const circle = e.target.closest('.palette-circle');
        if (!circle) return;
        
        document.querySelectorAll('.palette-circle').forEach(c => c.classList.remove('active'));
        circle.classList.add('active');
        selectedPaletteColor = circle.getAttribute('data-color') || '#ff4d4f';
    });
};

addSubjectBtn.addEventListener('click', () => {
    let name = newSubjectInput.value.trim();
    if (!name || name === 'その他' || customSubjects.some(s => s.name === name)) return alert('登録できないか、既に存在します。');
    
    customSubjects.push({ name, color: selectedPaletteColor });
    newSubjectInput.value = '';
    updateSubjectUI();
});

window.deleteSubject = (name) => { customSubjects = customSubjects.filter(sub => sub.name !== name); updateSubjectUI(); };

updateSubjectUI();
initColorPalette();

taskMonthInput.addEventListener('input', () => {
    let v = parseInt(taskMonthInput.value, 10);
    if (taskMonthInput.value.length >= 2 || (v >= 2 && v <= 9)) taskDayInput.focus();
});

const toggleTimeSelect = (hourEl, minEl, colonId) => {
    const show = hourEl.value !== "";
    minEl.style.display = q(colonId).style.display = show ? "inline-block" : "none";
};
taskHourInput.addEventListener('change', () => toggleTimeSelect(taskHourInput, taskMinuteInput, 'task-colon'));
settingDefaultHour.addEventListener('change', () => {
    toggleTimeSelect(settingDefaultHour, settingDefaultMinute, 'setting-default-colon');
    appSettings.defaultHour = taskHourInput.value = settingDefaultHour.value;
    saveAppSettings(); toggleTimeSelect(taskHourInput, taskMinuteInput, 'task-colon');
});

settingDarkModeToggle.checked = appSettings.darkMode;
document.body.classList.toggle('dark-mode', appSettings.darkMode);
settingDarkModeToggle.addEventListener('change', () => {
    appSettings.darkMode = settingDarkModeToggle.checked;
    saveAppSettings(); document.body.classList.toggle('dark-mode', appSettings.darkMode);
});
settingNotifyToggle.checked = appSettings.notifyEnabled;
settingNotifyTiming.value = appSettings.notifyTiming;
settingDefaultHour.value = appSettings.defaultHour;
settingDefaultMinute.value = appSettings.defaultMinute;
toggleTimeSelect(settingDefaultHour, settingDefaultMinute, 'setting-default-colon');
taskHourInput.value = appSettings.defaultHour;
taskMinuteInput.value = appSettings.defaultMinute;
toggleTimeSelect(taskHourInput, taskMinuteInput, 'task-colon');

settingNotifyToggle.addEventListener('change', () => {
    if (settingNotifyToggle.checked) {
        if (!("Notification" in window)) return (alert("未対応のブラウザです。"), settingNotifyToggle.checked = false);
        Notification.requestPermission().then(p => {
            if (p === "granted") {
                appSettings.notifyEnabled = true; saveAppSettings();
                new Notification("提出課題マネージャー", { body: "通知が許可されました！" }); checkAllDeadlines();
            } else { alert("通知がブロックされています。"); settingNotifyToggle.checked = appSettings.notifyEnabled = false; saveAppSettings(); }
        });
    } else { appSettings.notifyEnabled = false; saveAppSettings(); }
});
settingNotifyTiming.addEventListener('change', () => { appSettings.notifyTiming = settingNotifyTiming.value; saveAppSettings(); checkAllDeadlines(); });
settingDefaultMinute.addEventListener('change', () => { appSettings.defaultMinute = taskMinuteInput.value = settingDefaultMinute.value; saveAppSettings(); });

if (appSettings.notifyEnabled && Notification.permission === "granted") checkAllDeadlines();
function checkAllDeadlines() {
    if (!appSettings.notifyEnabled || Notification.permission !== "granted") return;
    let alertCount = 0, now = new Date();
    tasks.forEach(t => {
        if (t.status === '完了') return;
        
        let p = t.deadline.split('/');
        if (p.length !== 2) return;
        const deadlineDate = new Date(t.year, parseInt(p[0], 10) - 1, parseInt(p[1], 10));
        if (t.time && t.time.includes(':')) {
            let hm = t.time.split(':');
            deadlineDate.setHours(parseInt(hm[0], 10), parseInt(hm[1], 10), 0, 0);
        } else {
            deadlineDate.setHours(23, 59, 59, 999);
        }
        
        const diffMs = deadlineDate - now;
        let targetMs = { "1h": 3600000, "3h": 10800000, "6h": 21600000, "1d": 86400000, "3d": 259200000 }[appSettings.notifyTiming];
        if (diffMs > 0 && diffMs <= targetMs) alertCount++;
    });
    if (alertCount > 0) {
        let lbl = { "1h":"1時間以内", "3h":"3時間以内", "6h":"6時間以内", "1d":"1日前〜当日", "3d":"3日前〜当日" }[appSettings.notifyTiming];
        new Notification("課題の提出期限アラート", { body: `締切が【${lbl}】の課題が ${alertCount} 件あります！`, icon: "https://fav.farm📝" });
    }
}

const getDeadline = (m, d) => {
    if (!m && !d) {
        const t = new Date(); t.setDate(t.getDate() + 7);
        return { m: String(t.getMonth() + 1).padStart(2, '0'), d: String(t.getDate()).padStart(2, '0') };
    }
    m = parseInt(m, 10); d = parseInt(d, 10);
    return (m >= 1 && m <= 12 && d >= 1 && d <= 31 && new Date(new Date().getFullYear(), m - 1, d).getDate() === d) ? { m: String(m).padStart(2, '0'), d: String(d).padStart(2, '0') } : null;
};

const pushTask = (name, subject, dl, time) => {
    tasks.push({ id: Date.now(), name, subject, deadline: `${dl.m}/${dl.d}`, year: new Date().getFullYear(), time, status: '未着手' });
    
    tasks.sort((a, b) => {
        let pA = a.deadline.split('/');
        let pB = b.deadline.split('/');
        let dA = new Date(a.year, parseInt(pA[0], 10) - 1, parseInt(pA[1], 10));
        let dB = new Date(b.year, parseInt(pB[0], 10) - 1, parseInt(pB[1], 10));
        if (a.time && a.time.includes(':')) { let hm = a.time.split(':'); dA.setHours(parseInt(hm[0], 10), parseInt(hm[1], 10)); }
        else { dA.setHours(23, 59); }
        if (b.time && b.time.includes(':')) { let hm = b.time.split(':'); dB.setHours(parseInt(hm[0], 10), parseInt(hm[1], 10)); }
        else { dB.setHours(23, 59); }
        return dA - dB;
    });

    saveAndRender(); checkAllDeadlines();
};

addBtn.addEventListener('click', () => {
    if (!taskNameInput.value) return alert('課題名を入力してください！');
    let dl = getDeadline(taskMonthInput.value.trim(), taskDayInput.value.trim());
    if (!dl) return alert('日付の入力が正しくありません');
    pushTask(taskNameInput.value, taskSubjectInput.value, dl, taskHourInput.value ? `${taskHourInput.value}:${taskMinuteInput.value}` : '');
    taskNameInput.value = taskMonthInput.value = taskDayInput.value = '';
    taskHourInput.value = appSettings.defaultHour; taskMinuteInput.value = appSettings.defaultMinute;
    toggleTimeSelect(taskHourInput, taskMinuteInput, 'task-colon');
});

window.toggleStatus = (id) => {
    let t = tasks.find(x => x.id === id); if (!t) return;
    t.status = t.status === '未着手' ? '進行中' : '未着手'; saveAndRender();
};

// 🕒 残り時間を正確に計算するロジック（インデックスバグを完全修正）
const getRemainingTimeString = (year, deadlineStr, timeStr) => {
    if (!deadlineStr || typeof deadlineStr !== 'string' || !deadlineStr.includes('/')) {
        return '';
    }
    const p = deadlineStr.split('/');
    if (p.length !== 2) return '';

    const now = new Date();
    const deadlineDate = new Date(year, parseInt(p[0], 10) - 1, parseInt(p[1], 10));
    
    if (timeStr && timeStr.includes(':')) {
        const hm = timeStr.split(':');
        deadlineDate.setHours(parseInt(hm[0], 10), parseInt(hm[1], 10), 0, 0);
    } else {
        deadlineDate.setHours(23, 59, 59, 999);
    }

    const diffMs = deadlineDate - now;

    if (diffMs <= 0) {
        return '<span style="color: #ff4d4f; font-weight: bold;">⚠️ 期限切れ</span>';
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // 時間指定がない場合
    if (!timeStr) {
        if (diffDays < 1) {
            return `（今日中）`;
        }
        return `（後${diffDays}日）`;
    }

    // 時間指定がある場合
    if (diffMins < 60) {
        return `（後${diffMins}分）`;
    }
    if (diffHours < 24) {
        return `（後${diffHours}時間）`;
    }
    return `（後${diffDays}日）`;
};

function renderTasks() {
    taskList.innerHTML = tasks.map(t => {
        let badgeColor = (customSubjects.find(s => s.name === t.subject) || { color: '#8c8c8c' }).color;
        let style = t.status === '進行中' ? 'background:#faad14;color:white;' : 'background:#f5f5f5;color:#666;border:1px solid #ccc;';
        
        let remainingText = getRemainingTimeString(t.year, t.deadline, t.time);

        return `<li class="task-item">
            <div class="task-info">
                <div class="task-title-line">
                    <span class="subject-badge" style="background-color: ${badgeColor};">${t.subject}</span>
                    <span>${t.name}</span>
                    <span style="${style}padding:2px 6px;border-radius:4px;font-size:12px;font-weight:bold;cursor:pointer;" onclick="toggleStatus(${t.id})">${t.status || '未着手'}</span>
                </div>
                <span class="deadline">⌛ 締切: ${t.deadline}${t.time ? ' ' + t.time : ''} ${remainingText}</span>
                <span style="font-size:11px; color:#007bff; cursor:pointer; text-decoration:underline; margin-top:4px; display:inline-block;" onclick="editTask(${t.id})">✏️ 修正する</span>
            </div>
            <button class="check-btn" onclick="deleteTask(${t.id})"></button>
        </li>`;
    }).join('');
}

window.editTask = (id) => {
    let t = tasks.find(x => x.id === id); if (!t) return;
    taskNameInput.value = t.name; taskSubjectInput.value = t.subject;
    
    if (t.deadline && t.deadline.includes('/')) {
        let p = t.deadline.split('/'); 
        taskMonthInput.value = p[0] || ''; 
        taskDayInput.value = p[1] || '';
    }
    
    if (t.time && t.time.includes(':')) { 
        let hm = t.time.split(':'); 
        taskHourInput.value = hm[0] || ''; 
        taskMinuteInput.value = hm[1] || '00'; 
    } else { 
        taskHourInput.value = ''; 
        taskMinuteInput.value = '00'; 
    }
    toggleTimeSelect(taskHourInput, taskMinuteInput, 'task-colon');
    tasks = tasks.filter(x => x.id !== id); saveAndRender();
};

window.deleteTask = (id) => { tasks = tasks.filter(x => x.id !== id); saveAndRender(); };

window.switchTab = (tabName) => {
    document.querySelectorAll('.tab-item-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (event && event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.add('active');
    } else {
        const targetTab = q(`tab-${tabName}`);
        if (targetTab) targetTab.classList.add('active');
    }
    const targetContent = q(`content-${tabName}`);
    if (targetContent) targetContent.classList.add('active');
};

// 🔄 1分ごとに表示を自動リフレッシュするタイマー
setInterval(renderTasks, 60000);

renderTasks();
