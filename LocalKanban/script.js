class KanbanBoard {
    constructor() {
        this.projects = this.loadProjectsFromLocalStorage() || [];
        this.currentProjectId = this.loadCurrentProjectId();
        
        // Create default project if none exist
        if (this.projects.length === 0) {
            this.createProject('My First Project');
        }
        
        // Ensure current project exists
        if (!this.projects.find(p => p.id === this.currentProjectId)) {
            this.currentProjectId = this.projects[0].id;
            this.saveCurrentProjectId();
        }
        
        this.init();
    }

    init() {
        this.renderProjects();
        this.renderAllTasks();
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Task management
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Project management
        document.getElementById('addProjectBtn').addEventListener('click', () => this.addProject());
        document.getElementById('newProjectInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addProject();
        });
        document.getElementById('renameProjectBtn').addEventListener('click', () => this.renameProject());
        document.getElementById('deleteProjectBtn').addEventListener('click', () => this.deleteProject());

        // Import/Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', (e) => this.importData(e));
    }

    // ===== Project Management =====
    createProject(name) {
        const project = {
            id: Date.now(),
            name: name,
            tasks: []
        };
        this.projects.push(project);
        this.saveProjectsToLocalStorage();
        return project.id;
    }

    addProject() {
        const input = document.getElementById('newProjectInput');
        const projectName = input.value.trim();

        if (projectName === '') {
            alert('Please enter a project name!');
            return;
        }

        this.createProject(projectName);
        input.value = '';
        this.renderProjects();
    }

    switchProject(projectId) {
        this.currentProjectId = projectId;
        this.saveCurrentProjectId();
        this.renderProjects();
        this.renderAllTasks();
        this.updateHeaderProjectName();
    }

    renameProject() {
        const currentProject = this.getCurrentProject();
        const newName = prompt('Enter new project name:', currentProject.name);

        if (newName && newName.trim() !== '') {
            currentProject.name = newName.trim();
            this.saveProjectsToLocalStorage();
            this.renderProjects();
            this.updateHeaderProjectName();
        }
    }

    deleteProject() {
        if (this.projects.length === 1) {
            alert('You must have at least one project!');
            return;
        }

        const currentProject = this.getCurrentProject();
        if (confirm(`Delete project "${currentProject.name}" and all its tasks?`)) {
            this.projects = this.projects.filter(p => p.id !== this.currentProjectId);
            this.currentProjectId = this.projects[0].id;
            this.saveProjectsToLocalStorage();
            this.saveCurrentProjectId();
            this.renderProjects();
            this.renderAllTasks();
            this.updateHeaderProjectName();
        }
    }

    renderProjects() {
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = '';

        this.projects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = `project-item ${project.id === this.currentProjectId ? 'active' : ''}`;
            projectItem.innerHTML = `
                <span class="project-name" onclick="kanban.switchProject(${project.id})">${this.escapeHtml(project.name)}</span>
                <span class="project-task-count">${project.tasks.length}</span>
            `;
            projectsList.appendChild(projectItem);
        });
    }

    updateHeaderProjectName() {
        const currentProject = this.getCurrentProject();
        document.getElementById('currentProjectName').textContent = currentProject.name;
    }

    getCurrentProject() {
        return this.projects.find(p => p.id === this.currentProjectId);
    }

    // ===== Task Management =====
    addTask() {
        const input = document.getElementById('taskInput');
        const taskText = input.value.trim();

        if (taskText === '') {
            alert('Please enter a task!');
            return;
        }

        const currentProject = this.getCurrentProject();
        const task = {
            id: Date.now(),
            text: taskText,
            status: 'todo',
            order: currentProject.tasks.filter(t => t.status === 'todo').length
        };

        currentProject.tasks.push(task);
        this.saveProjectsToLocalStorage();
        this.renderAllTasks();
        input.value = '';
    }

    deleteTask(id) {
        const currentProject = this.getCurrentProject();
        const task = currentProject.tasks.find(t => t.id === id);
        
        if (confirm(`Delete task: "${task.text}"?`)) {
            currentProject.tasks = currentProject.tasks.filter(t => t.id !== id);
            this.reorderTasks(task.status);
            this.saveProjectsToLocalStorage();
            this.renderAllTasks();
        }
    }

    moveTask(id, direction) {
        const currentProject = this.getCurrentProject();
        const task = currentProject.tasks.find(t => t.id === id);
        const statusOrder = ['todo', 'inprogress', 'done'];
        const currentIndex = statusOrder.indexOf(task.status);

        if (direction === 'next' && currentIndex < 2) {
            task.status = statusOrder[currentIndex + 1];
            task.order = currentProject.tasks.filter(t => t.status === task.status).length;
        } else if (direction === 'prev' && currentIndex > 0) {
            task.status = statusOrder[currentIndex - 1];
            task.order = currentProject.tasks.filter(t => t.status === task.status).length;
        }

        this.saveProjectsToLocalStorage();
        this.renderAllTasks();
    }

    moveTaskOrder(id, direction) {
        const currentProject = this.getCurrentProject();
        const task = currentProject.tasks.find(t => t.id === id);
        const sameTasks = currentProject.tasks.filter(t => t.status === task.status).sort((a, b) => a.order - b.order);
        const currentIndex = sameTasks.findIndex(t => t.id === id);

        if (direction === 'up' && currentIndex > 0) {
            const temp = sameTasks[currentIndex - 1].order;
            sameTasks[currentIndex - 1].order = task.order;
            task.order = temp;
        } else if (direction === 'down' && currentIndex < sameTasks.length - 1) {
            const temp = sameTasks[currentIndex + 1].order;
            sameTasks[currentIndex + 1].order = task.order;
            task.order = temp;
        }

        this.saveProjectsToLocalStorage();
        this.renderAllTasks();
    }

    reorderTasks(status) {
        const currentProject = this.getCurrentProject();
        const tasksInStatus = currentProject.tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
        tasksInStatus.forEach((task, index) => {
            task.order = index;
        });
    }

    renderAllTasks() {
        ['todo', 'inprogress', 'done'].forEach(status => {
            this.renderTasksByStatus(status);
        });
    }

    renderTasksByStatus(status) {
        const currentProject = this.getCurrentProject();
        const listId = status === 'inprogress' ? 'inprogressList' : `${status}List`;
        const list = document.getElementById(listId);
        const tasksInStatus = currentProject.tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);

        list.innerHTML = '';

        tasksInStatus.forEach((task, index) => {
            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';
            taskCard.innerHTML = `
                <div class="task-content">${this.escapeHtml(task.text)}</div>
                <div class="task-actions">
                    <button class="task-btn" onclick="kanban.moveTask(${task.id}, 'prev')" ${status === 'todo' ? 'disabled' : ''}>← Prev</button>
                    <button class="task-btn" onclick="kanban.moveTask(${task.id}, 'next')" ${status === 'done' ? 'disabled' : ''}>Next →</button>
                    <button class="task-btn" onclick="kanban.moveTaskOrder(${task.id}, 'up')" ${index === 0 ? 'disabled' : ''}>↑ Up</button>
                    <button class="task-btn" onclick="kanban.moveTaskOrder(${task.id}, 'down')" ${index === tasksInStatus.length - 1 ? 'disabled' : ''}>↓ Down</button>
                    <button class="task-btn delete" onclick="kanban.deleteTask(${task.id})">🗑 Delete</button>
                </div>
            `;
            list.appendChild(taskCard);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== Storage Management =====
    saveProjectsToLocalStorage() {
        localStorage.setItem('kanbanProjects', JSON.stringify(this.projects));
    }

    loadProjectsFromLocalStorage() {
        const data = localStorage.getItem('kanbanProjects');
        return data ? JSON.parse(data) : null;
    }

    saveCurrentProjectId() {
        localStorage.setItem('kanbanCurrentProjectId', this.currentProjectId);
    }

    loadCurrentProjectId() {
        return parseInt(localStorage.getItem('kanbanCurrentProjectId')) || null;
    }

    // ===== Import/Export =====
    exportData() {
        const currentProject = this.getCurrentProject();
        const dataStr = JSON.stringify(currentProject.tasks, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentProject.name}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTasks = JSON.parse(e.target.result);
                if (Array.isArray(importedTasks)) {
                    const currentProject = this.getCurrentProject();
                    currentProject.tasks = importedTasks;
                    this.saveProjectsToLocalStorage();
                    this.renderAllTasks();
                    alert('Tasks imported successfully to current project!');
                } else {
                    alert('Invalid JSON format!');
                }
            } catch (error) {
                alert('Error reading file: ' + error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
}

// Initialize the Kanban board
const kanban = new KanbanBoard();
