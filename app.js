// 从外部JSON文件加载数据
let scheduleData = {};

// 数据编辑功能
function enableEditMode() {
    // 为每个任务添加编辑按钮
    document.querySelectorAll('tr').forEach(row => {
        if (!row.querySelector('.edit-btn')) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-sm btn-outline-primary edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.onclick = () => editTask(row);
            row.querySelector('td:last-child').appendChild(editBtn);
        }
    });
}

function editTask(row) {
    // 打开编辑模态框
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// 导出数据为JSON
function exportData() {
    const dataStr = JSON.stringify(scheduleData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = '煤矿监测数据.json';
    link.click();
}

// 导入数据
function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        scheduleData = JSON.parse(e.target.result);
        initApp(); // 重新初始化
    };
    reader.readAsText(file);
}

function loadScheduleData() {
    return new Promise((resolve, reject) => {
        if (typeof window.scheduleData !== 'undefined' && window.scheduleData) {
            scheduleData = window.scheduleData;
            console.log('监测数据加载成功');
            resolve(scheduleData);
        } else {
            console.error('数据未找到');
            document.getElementById('scheduleContent').innerHTML = 
                '<div class="no-data">数据加载失败，请刷新页面重试</div>';
            reject(new Error('数据未找到'));
        }
    });
}

// 统一的日期格式化函数
function getDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化日期显示（中文格式）
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 全局变量
let currentMonth = "1月";
let currentGroupFilter = "all";
let currentSearchTerm = "";

// 初始化函数
function initApp() {
    // 更新当前时间显示
    updateCurrentTime();
    
    // 初始化月份导航
    initMonthNav();
    
    // 初始化最近2天计划
    updateRecentTasks();
    
    // 初始化统计信息
    updateStats();
    
    // 初始化排班表
    renderSchedule(currentMonth, currentGroupFilter, currentSearchTerm);
    
    // 绑定事件
    bindEvents();
}

// 更新当前时间显示
function updateCurrentTime() {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    document.getElementById('currentTime').textContent = formattedDate;
}

// 初始化月份导航
function initMonthNav() {
    const monthNav = document.getElementById("monthNav");
    monthNav.innerHTML = "";
    
    const months = Object.keys(scheduleData);
    
    months.forEach(month => {
        const button = document.createElement("button");
        button.className = month === currentMonth ? "month-btn active" : "month-btn";
        button.textContent = month;
        button.dataset.month = month;
        button.addEventListener("click", () => {
            // 移除所有active类
            document.querySelectorAll(".month-btn").forEach(btn => btn.classList.remove("active"));
            // 设置当前按钮为active
            button.classList.add("active");
            // 更新当前月份
            currentMonth = month;
            // 重新渲染排班表
            renderSchedule(currentMonth, currentGroupFilter, currentSearchTerm);
            // 更新统计信息
            updateStats();
        });
        monthNav.appendChild(button);
    });
}

// 更新最近2天计划
function updateRecentTasks() {
    // 计算最近2天的日期（今天和明天）
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const recentDates = [
        getDateString(today),
        getDateString(tomorrow)
    ];
    
    // 更新日期范围显示
    document.getElementById("recentDatesRange").textContent = 
        `${formatDateForDisplay(recentDates[0])} - ${formatDateForDisplay(recentDates[1])}`;
    
    // 查找最近2天的任务
    const recentTasks = [];
    
    // 检查所有月份的数据
    Object.keys(scheduleData).forEach(month => {
        Object.keys(scheduleData[month]).forEach(group => {
            scheduleData[month][group].forEach(task => {
                if (recentDates.includes(task.date)) {
                    recentTasks.push({
                        ...task,
                        group: group
                    });
                }
            });
        });
    });
    
    // 按日期排序
    recentTasks.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 渲染最近2天计划
    const recentTasksContent = document.getElementById("recentTasksContent");
    recentTasksContent.innerHTML = "";
    
    if (recentTasks.length === 0) {
        recentTasksContent.innerHTML = '<div class="no-data">最近2天没有监测计划</div>';
        return;
    }
    
    recentTasks.forEach(task => {
        const todayStr = getDateString();
        // 检查是否是今天
        const isToday = task.date === todayStr;
        const taskItem = document.createElement("div");
        taskItem.className = isToday ? "recent-task-item today-highlight" : "recent-task-item";
        
        // 确定任务类型
        let taskTypeClass = "task-type-regular";
        if (task.note.includes("元旦") || task.note.includes("春节") || task.note.includes("清明") || 
            task.note.includes("五一") || task.note.includes("端午") || task.note.includes("中秋") || 
            task.note.includes("国庆")) {
            taskTypeClass = "task-type-holiday";
        } else if (task.mine.includes("/") || task.note.includes("综治项目")) {
            taskTypeClass = "task-type-multi";
        }
        
        taskItem.innerHTML = `
            <div class="recent-task-info">
                <div class="recent-task-date">${formatDateForDisplay(task.date)} ${task.day}</div>
                <div class="recent-task-mine">
                    <span class="task-type-indicator ${taskTypeClass}"></span>
                    ${task.mine || "休息"}
                </div>
                ${task.note ? `<div class="text-muted" style="font-size:0.85rem; margin-top:4px;">${task.note}</div>` : ''}
            </div>
            <div class="recent-task-group">${task.group}</div>
        `;
        
        recentTasksContent.appendChild(taskItem);
    });
}

// 更新统计信息
function updateStats() {
    // 计算总任务数
    let totalTasks = 0;
    let uniqueMines = new Set();
    let currentMonthTasks = 0;
    
    Object.keys(scheduleData).forEach(month => {
        Object.keys(scheduleData[month]).forEach(group => {
            const tasks = scheduleData[month][group];
            totalTasks += tasks.length;
            
            if (month === currentMonth) {
                currentMonthTasks += tasks.length;
            }
            
            tasks.forEach(task => {
                // 处理多矿情况
                if (task.mine && task.mine.trim()) {
                    const mines = task.mine.split('/');
                    mines.forEach(mine => {
                        const trimmedMine = mine.trim();
                        if (trimmedMine && !trimmedMine.includes("节假日") && 
                            !trimmedMine.includes("春节") && !trimmedMine.includes("元旦")) {
                            uniqueMines.add(trimmedMine);
                        }
                    });
                }
            });
        });
    });
    
    document.getElementById("totalTasks").textContent = totalTasks;
    document.getElementById("totalMines").textContent = uniqueMines.size;
    document.getElementById("currentMonthTasks").textContent = currentMonthTasks;
}

// 渲染排班表
function renderSchedule(month, groupFilter = "all", searchTerm = "") {
    const scheduleContent = document.getElementById("scheduleContent");
    
    if (!scheduleData[month]) {
        scheduleContent.innerHTML = '<div class="no-data">该月份暂无数据</div>';
        return;
    }
    
    // 获取当前月份的数据
    const monthData = scheduleData[month];
    
    // 根据筛选条件过滤小组
    let groups = Object.keys(monthData);
    if (groupFilter !== "all") {
        groups = groups.filter(group => group === groupFilter);
    }
    
    if (groups.length === 0) {
        scheduleContent.innerHTML = '<div class="no-data">没有找到符合筛选条件的监测计划</div>';
        return;
    }
    
    let html = '';
    
    groups.forEach(group => {
        let groupTasks = monthData[group];
        
        // 应用搜索过滤
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            groupTasks = groupTasks.filter(task => 
                (task.mine && task.mine.toLowerCase().includes(searchLower)) || 
                (task.note && task.note.toLowerCase().includes(searchLower)) ||
                task.date.includes(searchTerm)
            );
        }
        
        if (groupTasks.length === 0) {
            return; // 跳过没有任务的小组
        }
        
        // 按日期排序
        groupTasks.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        html += `
        <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="fas fa-users me-2"></i>${group}</span>
                <span class="badge bg-light text-dark">${groupTasks.length} 个任务</span>
            </div>
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th width="15%">日期</th>
                            <th width="10%">星期</th>
                            <th width="50%">监测煤矿</th>
                            <th width="25%">所属井田</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${groupTasks.map(task => {
                            // 确定任务类型
                            let taskTypeClass = "task-type-regular";
                            let taskTypeText = "常规监测";
                            
                            if (task.note.includes("元旦") || task.note.includes("春节") || 
                                task.note.includes("清明") || task.note.includes("五一") || 
                                task.note.includes("端午") || task.note.includes("中秋") || 
                                task.note.includes("国庆")) {
                                taskTypeClass = "task-type-holiday";
                                taskTypeText = "节假日";
                            } else if (task.mine.includes("/") || task.note.includes("综治项目")) {
                                taskTypeClass = "task-type-multi";
                                taskTypeText = "多矿/项目监测";
                            }
                            
                            // 检查是否是今天
                            const todayStr = getDateString();
                            const isToday = task.date === todayStr;
                            
                            return `
                            <tr class="${isToday ? 'table-warning' : ''}">
                                <td>${task.date}</td>
                                <td>${task.day}</td>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <span class="task-type-indicator ${taskTypeClass}"></span>
                                        ${task.mine || "休息"}
                                    </div>
                                    ${task.mine && task.mine.includes("/") ? 
                                        `<div class="mt-2">
                                            ${task.mine.split("/").map(mine => 
                                                `<span class="badge badge-mine">${mine.trim()}</span>`
                                            ).join("")}
                                        </div>` : ""
                                    }
                                </td>
                                <td>
                                    ${task.note ? 
                                        `<span class="text-info">${task.note}</span>` : 
                                        `<span class="text-muted">-</span>`
                                    }
                                    ${taskTypeText !== "常规监测" ? 
                                        `<div><small class="badge bg-light text-dark">${taskTypeText}</small></div>` : ""
                                    }
                                </td>
                            </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>
        `;
    });
    
    if (html === '') {
        html = '<div class="no-data">没有找到符合筛选条件的监测计划</div>';
    }
    
    scheduleContent.innerHTML = html;
}

// 绑定事件
function bindEvents() {
    // 搜索功能
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", (e) => {
        currentSearchTerm = e.target.value;
        renderSchedule(currentMonth, currentGroupFilter, currentSearchTerm);
    });
    
    // 小组筛选功能
    const filterBadges = document.querySelectorAll(".filter-badge");
    filterBadges.forEach(badge => {
        badge.addEventListener("click", () => {
            // 移除所有active类
            filterBadges.forEach(b => b.classList.remove("active"));
            // 设置当前为active
            badge.classList.add("active");
            // 更新筛选条件
            currentGroupFilter = badge.dataset.group;
            // 重新渲染排班表
            renderSchedule(currentMonth, currentGroupFilter, currentSearchTerm);
        });
    });
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", function() {
    // 先加载数据，然后初始化应用
    loadScheduleData().then(() => {
        initApp();
    }).catch(error => {
        console.error('初始化失败:', error);
    });
});