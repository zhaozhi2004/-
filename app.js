/**
 * 公司内部任务系统 - 前端应用 v2.0
 * 
 * 功能：
 * - 员工账号注册/登录系统
 * - 老板专属界面：成员管理、任务概览、实时监听
 * - 员工专属界面：只看自己的任务、完成按钮
 * - 状态颜色：完成=绿、未完成=红、逾期=紫
 * - 实时同步（1秒轮询）
 */

class TaskSystem {
    constructor() {
        // 当前用户
        this.currentUser = null;

        // 数据
        this.employees = [];
        this.tasks = [];

        // 配置
        this.apiBase = '/api';
        this.pollInterval = 1000; // 1秒轮询，实现实时效果
        this.pollTimer = null;

        // 管理员密码（实际部署应改为后端验证）
        this.bossPassword = 'admin123';

        this.init();
    }

    // ==================== 初始化 ====================
    init() {
        this.loadLocalData();
        this.setupAuthListeners();
        this.checkSession();
    }

    loadLocalData() {
        // 从 localStorage 加载数据
        const employees = localStorage.getItem('task-system-employees');
        const tasks = localStorage.getItem('task-system-tasks');

        if (employees) this.employees = JSON.parse(employees);
        if (tasks) this.tasks = JSON.parse(tasks);

        // 初始化默认管理员密码（可修改）
        const savedPassword = localStorage.getItem('task-system-boss-password');
        if (savedPassword) this.bossPassword = savedPassword;
    }

    saveLocalData() {
        localStorage.setItem('task-system-employees', JSON.stringify(this.employees));
        localStorage.setItem('task-system-tasks', JSON.stringify(this.tasks));
    }

    checkSession() {
        const saved = localStorage.getItem('task-system-session');
        if (saved) {
            try {
                this.currentUser = JSON.parse(saved);
                this.enterApp();
            } catch (e) {
                localStorage.removeItem('task-system-session');
            }
        }
    }

    // ==================== 登录/注册事件 ====================
    setupAuthListeners() {
        // 角色选择
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const role = btn.dataset.role;
                document.getElementById('role-select').style.display = 'none';

                if (role === 'boss') {
                    document.getElementById('boss-login-form').style.display = 'block';
                } else {
                    document.getElementById('employee-auth-form').style.display = 'block';
                }
            });
        });

        // 返回角色选择
        document.getElementById('back-to-role')?.addEventListener('click', () => this.backToRoleSelect());
        document.getElementById('back-to-role-2')?.addEventListener('click', () => this.backToRoleSelect());

        // 老板登录
        document.getElementById('boss-login-btn')?.addEventListener('click', () => this.bossLogin());

        // 员工登录/注册切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const tab = btn.dataset.tab;
                document.getElementById('login-tab').style.display = tab === 'login' ? 'block' : 'none';
                document.getElementById('register-tab').style.display = tab === 'register' ? 'block' : 'none';
            });
        });

        // 员工登录
        document.getElementById('employee-login-btn')?.addEventListener('click', () => this.employeeLogin());

        // 员工注册
        document.getElementById('employee-register-btn')?.addEventListener('click', () => this.employeeRegister());
    }

    backToRoleSelect() {
        document.getElementById('boss-login-form').style.display = 'none';
        document.getElementById('employee-auth-form').style.display = 'none';
        document.getElementById('role-select').style.display = 'block';
    }

    // ==================== 老板登录 ====================
    bossLogin() {
        const password = document.getElementById('boss-password').value;

        if (password === this.bossPassword) {
            this.currentUser = {
                role: 'boss',
                name: '管理员'
            };
            localStorage.setItem('task-system-session', JSON.stringify(this.currentUser));
            this.enterApp();
        } else {
            this.showNotification('密码错误', 'error');
        }
    }

    // ==================== 员工登录 ====================
    employeeLogin() {
        const username = document.getElementById('employee-username').value.trim();
        const password = document.getElementById('employee-password').value;

        if (!username || !password) {
            this.showNotification('请输入账号和密码', 'error');
            return;
        }

        const employee = this.employees.find(e => e.username === username && e.password === password);

        if (employee) {
            this.currentUser = {
                role: 'employee',
                id: employee.id,
                name: employee.name,
                username: employee.username
            };
            localStorage.setItem('task-system-session', JSON.stringify(this.currentUser));
            this.enterApp();
        } else {
            this.showNotification('账号或密码错误', 'error');
        }
    }

    // ==================== 员工注册 ====================
    employeeRegister() {
        const name = document.getElementById('register-name').value.trim();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;

        // 验证
        if (!name || !username || !password) {
            this.showNotification('请填写完整信息', 'error');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showNotification('账号只能包含字母、数字和下划线', 'error');
            return;
        }

        if (password.length < 4) {
            this.showNotification('密码至少4位', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            this.showNotification('两次密码不一致', 'error');
            return;
        }

        if (this.employees.find(e => e.username === username)) {
            this.showNotification('账号已存在', 'error');
            return;
        }

        // 创建员工
        const employee = {
            id: Date.now().toString(),
            name,
            username,
            password,
            createdAt: new Date().toISOString()
        };

        this.employees.push(employee);
        this.saveLocalData();

        this.showNotification('注册成功，请登录', 'success');

        // 切换到登录 tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="login"]').classList.add('active');
        document.getElementById('login-tab').style.display = 'block';
        document.getElementById('register-tab').style.display = 'none';

        // 填入账号
        document.getElementById('employee-username').value = username;
        document.getElementById('employee-password').focus();
    }

    // ==================== 进入应用 ====================
    enterApp() {
        document.getElementById('auth-page').style.display = 'none';

        if (this.currentUser.role === 'boss') {
            this.enterBossApp();
        } else {
            this.enterEmployeeApp();
        }

        this.startPolling();
    }

    // ==================== 老板界面 ====================
    enterBossApp() {
        document.getElementById('boss-app').style.display = 'block';

        // 事件绑定
        document.getElementById('boss-logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('boss-add-task-btn').addEventListener('click', () => this.openCreateTaskModal());
        document.getElementById('boss-filter-employee').addEventListener('change', () => this.renderBossTasks());
        document.getElementById('boss-filter-status').addEventListener('change', () => this.renderBossTasks());

        // 模态框事件
        this.setupModalEvents();

        // 渲染
        this.renderBossApp();
    }

    renderBossApp() {
        this.renderStats();
        this.renderEmployeeList();
        this.renderBossTasks();
    }

    renderStats() {
        const now = new Date();

        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const pending = this.tasks.filter(t => t.status !== 'completed').length;
        const overdue = this.tasks.filter(t => {
            return t.status !== 'completed' && new Date(t.deadline) < now;
        }).length;

        document.getElementById('stat-employees').textContent = this.employees.length;
        document.getElementById('stat-total').textContent = this.tasks.length;
        document.getElementById('stat-completed').textContent = completed;
        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-overdue').textContent = overdue;
    }

    renderEmployeeList() {
        const container = document.getElementById('employee-list');
        document.getElementById('employee-count').textContent = `${this.employees.length} 人`;

        // 更新筛选下拉框
        const filterSelect = document.getElementById('boss-filter-employee');
        filterSelect.innerHTML = '<option value="all">全部员工</option>' +
            this.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');

        // 更新任务指派下拉框
        const assigneeSelect = document.getElementById('task-assignee');
        assigneeSelect.innerHTML = '<option value="">请选择员工</option>' +
            this.employees.map(e => `<option value="${e.id}">${e.name} (${e.username})</option>`).join('');

        if (this.employees.length === 0) {
            container.innerHTML = '<div class="empty-state" style="padding: 40px;"><p>暂无员工注册</p></div>';
            return;
        }

        container.innerHTML = this.employees.map(emp => {
            const empTasks = this.tasks.filter(t => t.assigneeId === emp.id);
            const completed = empTasks.filter(t => t.status === 'completed').length;
            const pending = empTasks.filter(t => t.status !== 'completed').length;

            return `
                <div class="employee-item" data-id="${emp.id}">
                    <div class="employee-info">
                        <div class="employee-avatar">${emp.name.charAt(0)}</div>
                        <div>
                            <div class="employee-name">${this.escapeHtml(emp.name)}</div>
                            <div class="employee-username">@${this.escapeHtml(emp.username)}</div>
                        </div>
                    </div>
                    <div class="employee-stats">
                        <span><span class="material-icons" style="font-size:14px;">assignment</span> ${empTasks.length}</span>
                        <span style="color: #4caf50;"><span class="material-icons" style="font-size:14px;">check</span> ${completed}</span>
                        <span style="color: #f44336;"><span class="material-icons" style="font-size:14px;">pending</span> ${pending}</span>
                    </div>
                </div>
            `;
        }).join('');

        // 点击员工筛选
        container.querySelectorAll('.employee-item').forEach(item => {
            item.addEventListener('click', () => {
                container.querySelectorAll('.employee-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.getElementById('boss-filter-employee').value = item.dataset.id;
                this.renderBossTasks();
            });
        });
    }

    renderBossTasks() {
        const container = document.getElementById('boss-task-list');
        const emptyState = document.getElementById('boss-empty-state');

        const employeeFilter = document.getElementById('boss-filter-employee').value;
        const statusFilter = document.getElementById('boss-filter-status').value;

        let filtered = [...this.tasks];

        // 筛选
        if (employeeFilter !== 'all') {
            filtered = filtered.filter(t => t.assigneeId === employeeFilter);
        }

        const now = new Date();
        if (statusFilter === 'completed') {
            filtered = filtered.filter(t => t.status === 'completed');
        } else if (statusFilter === 'pending') {
            filtered = filtered.filter(t => t.status !== 'completed' && new Date(t.deadline) >= now);
        } else if (statusFilter === 'overdue') {
            filtered = filtered.filter(t => t.status !== 'completed' && new Date(t.deadline) < now);
        }

        // 排序
        filtered.sort((a, b) => {
            // 优先级
            const pw = { high: 3, medium: 2, low: 1 };
            const pd = (pw[b.priority] || 1) - (pw[a.priority] || 1);
            if (pd !== 0) return pd;
            // 截止时间
            return new Date(a.deadline) - new Date(b.deadline);
        });

        if (filtered.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        emptyState.style.display = 'none';

        container.innerHTML = filtered.map(task => this.renderBossTaskCard(task)).join('');

        // 绑定事件
        container.querySelectorAll('.task-card').forEach(card => {
            const taskId = card.dataset.id;

            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn')) {
                    this.openTaskDetail(taskId);
                }
            });

            const cancelBtn = card.querySelector('.btn-cancel');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('确定取消此任务？')) {
                        this.cancelTask(taskId);
                    }
                });
            }
        });
    }

    renderBossTaskCard(task) {
        const now = new Date();
        const deadline = new Date(task.deadline);
        const isCompleted = task.status === 'completed';
        const isOverdue = !isCompleted && deadline < now;

        const statusClass = isCompleted ? 'status-completed' : (isOverdue ? 'status-overdue' : 'status-pending');
        const statusBadge = isCompleted 
            ? '<span class="badge badge-status-completed">已完成</span>'
            : (isOverdue 
                ? '<span class="badge badge-status-overdue">已逾期</span>'
                : '<span class="badge badge-status-pending">未完成</span>');

        const priorityLabels = { high: '紧急', medium: '重要', low: '普通' };
        const employee = this.employees.find(e => e.id === task.assigneeId);

        return `
            <div class="task-card ${statusClass}" data-id="${task.id}">
                <div class="task-header">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    <div class="task-badges">
                        <span class="badge badge-priority-${task.priority}">${priorityLabels[task.priority]}</span>
                        ${statusBadge}
                    </div>
                </div>
                <div class="task-meta">
                    <div class="task-meta-item">
                        <span class="material-icons">person</span>
                        <span>${employee ? employee.name : '未指派'}</span>
                    </div>
                    <div class="task-meta-item">
                        <span class="material-icons">schedule</span>
                        <span>${this.formatDateTime(task.deadline)}</span>
                    </div>
                </div>
                <div class="task-footer">
                    <div class="task-assignee">
                        ${employee ? `
                            <div class="employee-avatar" style="width:24px;height:24px;font-size:12px;">${employee.name.charAt(0)}</div>
                            <span>${employee.name}</span>
                        ` : '<span style="color:#757575">未指派</span>'}
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-danger btn-cancel">
                            <span class="material-icons">cancel</span>
                            取消任务
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== 员工界面 ====================
    enterEmployeeApp() {
        document.getElementById('employee-app').style.display = 'block';

        document.getElementById('employee-welcome').textContent = `${this.currentUser.name} 的工作台`;
        document.getElementById('employee-logout-btn').addEventListener('click', () => this.logout());

        this.renderEmployeeTasks();
    }

    renderEmployeeTasks() {
        const container = document.getElementById('employee-task-list');
        const emptyState = document.getElementById('employee-empty-state');

        // 只显示指派给当前员工的任务
        const myTasks = this.tasks.filter(t => t.assigneeId === this.currentUser.id);

        document.getElementById('employee-task-count').textContent = `${myTasks.length} 个任务`;

        if (myTasks.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        emptyState.style.display = 'none';

        // 排序：未完成优先，然后按截止时间
        myTasks.sort((a, b) => {
            if (a.status !== b.status) {
                return a.status === 'completed' ? 1 : -1;
            }
            return new Date(a.deadline) - new Date(b.deadline);
        });

        container.innerHTML = myTasks.map(task => this.renderEmployeeTaskCard(task)).join('');

        // 绑定完成按钮
        container.querySelectorAll('.btn-complete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.closest('.employee-task-card').dataset.id;
                this.completeTask(taskId);
            });
        });

        // 点击查看详情
        container.querySelectorAll('.employee-task-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn')) {
                    this.openTaskDetail(card.dataset.id);
                }
            });
        });
    }

    renderEmployeeTaskCard(task) {
        const now = new Date();
        const deadline = new Date(task.deadline);
        const isCompleted = task.status === 'completed';
        const isOverdue = !isCompleted && deadline < now;

        const statusClass = isCompleted ? 'status-completed' : (isOverdue ? 'status-overdue' : '');
        const priorityLabels = { high: '紧急', medium: '重要', low: '普通' };

        return `
            <div class="employee-task-card ${statusClass}" data-id="${task.id}">
                <div class="task-header">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    <div class="task-badges">
                        <span class="badge badge-priority-${task.priority}">${priorityLabels[task.priority]}</span>
                        ${isCompleted 
                            ? '<span class="badge badge-status-completed">已完成</span>'
                            : (isOverdue 
                                ? '<span class="badge badge-status-overdue">已逾期</span>'
                                : '<span class="badge badge-status-pending">未完成</span>')}
                    </div>
                </div>
                ${task.description ? `<p style="color:#757575; margin: 8px 0;">${this.escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <div class="task-meta-item ${isOverdue ? 'overdue' : ''}">
                        <span class="material-icons">schedule</span>
                        <span>截止: ${this.formatDateTime(task.deadline)}</span>
                        ${isOverdue && !isCompleted ? '<span style="color:#9c27b0; font-weight:500;"> (已逾期)</span>' : ''}
                    </div>
                </div>
                <div class="task-footer">
                    <span style="font-size:12px; color:#757575;">
                        发布于 ${this.formatDateTime(task.createdAt)}
                    </span>
                    ${!isCompleted ? `
                        <button class="btn btn-success btn-complete">
                            <span class="material-icons">check_circle</span>
                            标记完成
                        </button>
                    ` : `
                        <span style="color:#4caf50; font-weight:500;">
                            <span class="material-icons" style="vertical-align:middle;">check</span>
                            已完成
                        </span>
                    `}
                </div>
            </div>
        `;
    }

    // ==================== 任务操作 ====================
    completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        task.updatedAt = new Date().toISOString();

        // 添加更新记录
        if (!task.updates) task.updates = [];
        task.updates.push({
            author: this.currentUser.name,
            content: '任务已完成',
            time: new Date().toISOString()
        });

        this.saveLocalData();
        this.renderEmployeeTasks();
        this.showNotification('任务已标记完成', 'success');
    }

    cancelTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveLocalData();
        this.renderBossApp();
        this.showNotification('任务已取消', 'info');
    }

    // ==================== 模态框 ====================
    setupModalEvents() {
        // 发布任务模态框
        document.getElementById('create-modal-close')?.addEventListener('click', () => this.closeCreateTaskModal());
        document.getElementById('create-cancel-btn')?.addEventListener('click', () => this.closeCreateTaskModal());
        document.getElementById('create-task-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'create-task-modal') this.closeCreateTaskModal();
        });

        document.getElementById('task-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTask();
        });

        // 详情模态框
        document.getElementById('detail-modal-close')?.addEventListener('click', () => this.closeTaskDetail());
        document.getElementById('task-detail-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'task-detail-modal') this.closeTaskDetail();
        });
    }

    openCreateTaskModal() {
        if (this.employees.length === 0) {
            this.showNotification('暂无员工，请等待员工注册', 'warning');
            return;
        }

        const modal = document.getElementById('create-task-modal');
        document.getElementById('task-form').reset();

        // 默认截止时间：明天18:00
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(18, 0, 0, 0);
        document.getElementById('task-deadline').value = this.toDateTimeLocal(tomorrow);

        modal.style.display = 'flex';
        document.getElementById('task-title').focus();
    }

    closeCreateTaskModal() {
        document.getElementById('create-task-modal').style.display = 'none';
    }

    createTask() {
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const priority = document.getElementById('task-priority').value;
        const deadline = document.getElementById('task-deadline').value;
        const assigneeId = document.getElementById('task-assignee').value;

        if (!title || !deadline || !assigneeId) {
            this.showNotification('请填写完整信息', 'error');
            return;
        }

        const employee = this.employees.find(e => e.id === assigneeId);

        const task = {
            id: Date.now().toString(),
            title,
            description,
            priority,
            deadline,
            assigneeId,
            assigneeName: employee ? employee.name : '',
            status: 'pending',
            updates: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveLocalData();
        this.closeCreateTaskModal();
        this.renderBossApp();
        this.showNotification('任务发布成功', 'success');
    }

    openTaskDetail(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const modal = document.getElementById('task-detail-modal');
        const body = document.getElementById('detail-modal-body');

        const employee = this.employees.find(e => e.id === task.assigneeId);
        const now = new Date();
        const isCompleted = task.status === 'completed';
        const isOverdue = !isCompleted && new Date(task.deadline) < now;
        const priorityLabels = { high: '紧急', medium: '重要', low: '普通' };

        document.getElementById('detail-modal-title').textContent = task.title;

        body.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
                <div>
                    <label style="font-size:12px; color:#757575;">状态</label>
                    <p style="font-weight:500; margin-top:4px;">
                        ${isCompleted 
                            ? '<span style="color:#4caf50;">✓ 已完成</span>'
                            : (isOverdue 
                                ? '<span style="color:#9c27b0;">⚠ 已逾期</span>'
                                : '<span style="color:#f44336;">● 未完成</span>')}
                    </p>
                </div>
                <div>
                    <label style="font-size:12px; color:#757575;">优先级</label>
                    <p style="margin-top:4px;">${priorityLabels[task.priority]}</p>
                </div>
                <div>
                    <label style="font-size:12px; color:#757575;">指派给</label>
                    <p style="margin-top:4px;">${employee ? employee.name : '未指派'}</p>
                </div>
                <div>
                    <label style="font-size:12px; color:#757575;">截止时间</label>
                    <p style="margin-top:4px;">${this.formatDateTime(task.deadline)}</p>
                </div>
            </div>

            ${task.description ? `
                <div style="margin-bottom: 24px;">
                    <label style="font-size:12px; color:#757575;">任务描述</label>
                    <p style="margin-top:8px; padding: 12px; background:#f5f5f5; border-radius:8px;">${this.escapeHtml(task.description)}</p>
                </div>
            ` : ''}

            <div>
                <label style="font-size:12px; color:#757575;">更新记录</label>
                <div style="margin-top:8px; max-height:200px; overflow-y:auto;">
                    ${task.updates && task.updates.length > 0
                        ? task.updates.map(u => `
                            <div style="padding: 8px 12px; background:#f5f5f5; border-radius:6px; margin-bottom:8px; border-left:3px solid #1976d2;">
                                <div style="font-size:12px; color:#757575; margin-bottom:4px;">
                                    ${u.author} · ${this.formatDateTime(u.time)}
                                </div>
                                <div>${this.escapeHtml(u.content)}</div>
                            </div>
                        `).join('')
                        : '<p style="color:#757575; text-align:center; padding:20px;">暂无记录</p>'
                    }
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    closeTaskDetail() {
        document.getElementById('task-detail-modal').style.display = 'none';
    }

    // ==================== 轮询（实时同步） ====================
    startPolling() {
        this.pollTimer = setInterval(() => {
            this.loadLocalData();
            if (this.currentUser.role === 'boss') {
                this.renderBossApp();
            } else {
                this.renderEmployeeTasks();
            }
        }, this.pollInterval);
    }

    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    // ==================== 退出登录 ====================
    logout() {
        localStorage.removeItem('task-system-session');
        this.currentUser = null;
        this.stopPolling();

        document.getElementById('boss-app').style.display = 'none';
        document.getElementById('employee-app').style.display = 'none';
        document.getElementById('auth-page').style.display = 'flex';

        // 重置表单
        document.getElementById('boss-password').value = '';
        document.getElementById('employee-username').value = '';
        document.getElementById('employee-password').value = '';
        this.backToRoleSelect();
    }

    // ==================== 工具函数 ====================
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    formatDateTime(isoStr) {
        if (!isoStr) return '-';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    toDateTimeLocal(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TaskSystem();
});
