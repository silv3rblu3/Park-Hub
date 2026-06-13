// apps/projects/app.js

function initProjectsLogic() {
    let projData = StateManager.getAppData('projects');
    
    if (!projData.tasks) {
        projData = { tasks: [] };
        StateManager.setAppData('projects', projData);
    }
    
    const safeSave = () => { StateManager.setAppData('projects', projData); };

    const tabs = document.querySelectorAll('.proj-tab');
    const stage = document.getElementById('projects-stage');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => { t.classList.remove('btn-primary'); t.classList.add('btn-outline'); });
            e.target.classList.remove('btn-outline'); e.target.classList.add('btn-primary');
            renderProjView(e.target.getAttribute('data-target'));
        });
    });

    function calculateTimeTaken(createdStr, completedStr) {
        if (!createdStr || !completedStr) return 'Unknown';
        const start = new Date(createdStr);
        const end = new Date(completedStr);
        const diffMs = end - start;
        
        if (diffMs < 0) return '0 Hours';

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (diffDays === 0) {
            return diffHours === 1 ? '1 Hour' : `${diffHours} Hours`;
        } else if (diffDays === 1) {
            return `1 Day, ${diffHours} Hours`;
        } else {
            return `${diffDays} Days`;
        }
    }

    function renderProjView(viewName) {
        stage.innerHTML = '';
        
        if (viewName === 'active') {
            let activeTasks = projData.tasks.filter(t => t.status !== 'Completed');
            
            // Sort: High Priority first, then oldest created
            activeTasks.sort((a, b) => {
                const pVals = { 'High': 3, 'Normal': 2, 'Low': 1 };
                if (pVals[b.priority] !== pVals[a.priority]) return pVals[b.priority] - pVals[a.priority];
                return new Date(a.dateCreated) - new Date(b.dateCreated);
            });

            let html = `<div style="display:flex; justify-content:space-between; margin-bottom: 15px;">
                            <h3 style="margin: 0;">Active Tasks (${activeTasks.length})</h3>
                        </div>`;
            
            if (activeTasks.length === 0) {
                html += `<div class="app-card" style="text-align: center; color: var(--text-secondary);">No active tasks! Click '+ New Task' to begin.</div>`;
            } else {
                activeTasks.forEach(task => {
                    const createdFmt = new Date(task.dateCreated).toLocaleDateString();
                    html += `
                        <div class="task-card task-priority-${task.priority}">
                            <div style="flex: 1; min-width: 250px;">
                                <h4 class="task-title">${task.title}</h4>
                                <div class="task-desc">${task.description || 'No description provided.'}</div>
                                <div class="task-meta">
                                    <strong>Priority:</strong> ${task.priority} | <strong>Created:</strong> ${createdFmt}
                                </div>
                            </div>
                            <div class="task-actions">
                                <button class="btn-outline edit-task-btn" data-id="${task.id}">✏️ Edit</button>
                                <button class="btn-primary complete-task-btn" data-id="${task.id}">✅ Complete</button>
                            </div>
                        </div>
                    `;
                });
            }
            stage.innerHTML = html;

            document.querySelectorAll('.edit-task-btn').forEach(btn => btn.addEventListener('click', (e) => openTaskEditor(e.target.getAttribute('data-id'))));
            
            document.querySelectorAll('.complete-task-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const task = projData.tasks.find(t => t.id === id);
                    if(task) {
                        task.status = 'Completed';
                        task.dateCompleted = new Date().toISOString();
                        safeSave();
                        NotificationSystem.show("Task Marked Completed", "success");
                        renderProjView('active');
                    }
                });
            });
        } 
        else if (viewName === 'completed') {
            let completedTasks = projData.tasks.filter(t => t.status === 'Completed');
            completedTasks.sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted));

            let html = `
            <div class="app-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0;">Completion Log</h3>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="proj-search" class="app-input" placeholder="Search logs..." style="max-width: 250px; margin: 0;">
                        <button id="proj-print-logs-btn" class="btn-outline">🖨️ Print Logs</button>
                    </div>
                </div>
                <div class="app-table-container">
                    <table class="app-table" id="proj-log-table">
                        <thead><tr><th>Task Name</th><th>Description</th><th>Priority</th><th>Date Created</th><th>Date Completed</th><th>Time Taken</th><th style="text-align: center;">Action</th></tr></thead>
                        <tbody id="proj-log-body">`;
            
            if (completedTasks.length === 0) {
                html += `<tr><td colspan="7" style="text-align: center;">No completed tasks yet.</td></tr>`;
            } else {
                completedTasks.forEach(task => {
                    const createdFmt = new Date(task.dateCreated).toLocaleDateString();
                    const compFmt = new Date(task.dateCompleted).toLocaleDateString();
                    const timeTaken = calculateTimeTaken(task.dateCreated, task.dateCompleted);

                    html += `<tr>
                                <td><strong>${task.title}</strong></td>
                                <td><div style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${task.description}">${task.description || '--'}</div></td>
                                <td>${task.priority}</td>
                                <td>${createdFmt}</td>
                                <td>${compFmt}</td>
                                <td><strong>${timeTaken}</strong></td>
                                <td style="text-align: center;">
                                    <button class="btn-outline revert-task-btn" data-id="${task.id}" style="padding: 4px 8px; font-size: 0.8rem; margin-right: 5px;">⏪ Revert</button>
                                    <button class="btn-danger delete-task-btn" data-id="${task.id}" style="padding: 4px 8px; font-size: 0.8rem;">X</button>
                                </td>
                             </tr>`;
                });
            }
            html += `</tbody></table></div></div>`;
            stage.innerHTML = html;

            document.getElementById('proj-search').addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#proj-log-body tr');
                rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; });
            });

            document.getElementById('proj-print-logs-btn').addEventListener('click', () => {
                const printStage = document.getElementById('proj-print-stage');
                let tableHtml = document.getElementById('proj-log-table').outerHTML;
                // Strip the actions column
                tableHtml = tableHtml.replace(/<th style="text-align: center;">Action<\/th>/g, '');
                tableHtml = tableHtml.replace(/<td style="text-align: center;">.*?<\/td>/g, '');
                
                printStage.innerHTML = `
                    <div style="margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
                        <h2 style="margin-bottom: 5px;">Completed Projects Log</h2>
                        <p style="font-size: 1.1rem;"><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                    ${tableHtml}
                `;
                window.print();
            });

            document.querySelectorAll('.revert-task-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const task = projData.tasks.find(t => t.id === id);
                    if(task) {
                        task.status = 'Active';
                        task.dateCompleted = null;
                        safeSave();
                        NotificationSystem.show("Task reverted to Active", "success");
                        renderProjView('completed');
                    }
                });
            });

            document.querySelectorAll('.delete-task-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const confirmed = await DialogSystem.confirm("Delete Log", "Permanently delete this task history?");
                    if (confirmed) {
                        projData.tasks = projData.tasks.filter(t => t.id !== id);
                        safeSave();
                        renderProjView('completed');
                        NotificationSystem.show("Log Deleted", "success");
                    }
                });
            });
        }
        else if (viewName === 'sync') {
            stage.innerHTML = `
            <div class="app-card">
                <h3 style="margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">Database Sync & Backup</h3>
                
                <h4 style="margin-top: 20px; margin-bottom: 10px;">Import / Export CSV</h4>
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    <button id="export-proj-csv-btn" class="btn-outline" style="flex: 1; min-width: 200px;">⬆️ Export Tasks (CSV)</button>
                    <input type="file" id="import-proj-csv-file" accept=".csv" class="hidden">
                    <button class="btn-outline" style="flex: 1; min-width: 200px;" onclick="document.getElementById('import-proj-csv-file').click()">📥 Import Tasks (CSV)</button>
                </div>

                <h4 style="margin-top: 20px; margin-bottom: 10px;">Full Module Sync (JSON)</h4>
                <p style="color: var(--text-secondary); margin-bottom: 10px; font-size: 0.85rem;">Export or merge complete project states to safely sync across devices.</p>
                
                <button id="export-proj-json-btn" class="btn-primary" style="width: 100%; margin-bottom: 10px;">⬇️ Export Project Sync File (.json)</button>
                
                <input type="file" id="import-proj-json-file" accept=".json" class="hidden">
                <button class="btn-outline" style="width: 100%; margin-bottom: 10px; border-color: var(--accent-primary); color: var(--accent-primary);" onclick="document.getElementById('import-proj-json-file').click()">🔄 Merge Sync File (.json)</button>
            </div>
            `;

            // JSON Export
            document.getElementById('export-proj-json-btn').addEventListener('click', () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projData, null, 2));
                const anchor = document.createElement('a');
                anchor.setAttribute("href", dataStr); 
                anchor.setAttribute("download", `PMH_Projects_Sync_${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(anchor); 
                anchor.click(); 
                anchor.remove();
                NotificationSystem.show('Project Sync File Exported', 'success');
            });

            // JSON Import
            document.getElementById('import-proj-json-file').addEventListener('change', async (e) => {
                if(e.target.files.length > 0) {
                    const file = e.target.files[0];
                    const confirm = await DialogSystem.confirm("Merge Project Data?", "This will sync the uploaded file with your current data. It updates existing tasks and adds new ones. Proceed?");
                    
                    if (confirm) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const importedData = JSON.parse(event.target.result);
                                if (!importedData.tasks) throw new Error("Invalid format");

                                importedData.tasks.forEach(impTask => {
                                    const existingIndex = projData.tasks.findIndex(t => t.id === impTask.id);
                                    if (existingIndex > -1) {
                                        projData.tasks[existingIndex] = { ...projData.tasks[existingIndex], ...impTask };
                                    } else {
                                        projData.tasks.push(impTask);
                                    }
                                });

                                safeSave();
                                NotificationSystem.show('Project Data Merged Successfully', 'success');
                            } catch (err) { 
                                NotificationSystem.show('Import Failed: Invalid JSON file', 'error'); 
                            }
                        }; 
                        reader.readAsText(file);
                    }
                    e.target.value = ''; 
                }
            });

            // CSV Export
            document.getElementById('export-proj-csv-btn').addEventListener('click', () => {
                const csvRows = [["ID", "Title", "Description", "Priority", "Status", "Date Created", "Date Completed"]];
                projData.tasks.forEach(t => {
                    csvRows.push([
                        t.id, 
                        `"${(t.title || '').replace(/"/g, '""')}"`, 
                        `"${(t.description || '').replace(/"/g, '""')}"`, 
                        t.priority, 
                        t.status, 
                        t.dateCreated || '', 
                        t.dateCompleted || ''
                    ]);
                });
                let csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                const anchor = document.createElement('a');
                anchor.setAttribute("href", encodeURI(csvContent));
                anchor.setAttribute("download", `PMH_Projects_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
            });

            // CSV Import
            document.getElementById('import-proj-csv-file').addEventListener('change', (e) => {
                if(e.target.files.length > 0) {
                    Papa.parse(e.target.files[0], { header: true, skipEmptyLines: true, complete: function(results) {
                        const newTasks = results.data.map(row => { 
                            return {
                                id: row['ID'] || 'task_' + Date.now() + Math.random().toString(36).substr(2, 9),
                                title: row['Title'] || 'Untitled Task',
                                description: row['Description'] || '',
                                priority: row['Priority'] || 'Normal',
                                status: row['Status'] || 'Active',
                                dateCreated: row['Date Created'] || new Date().toISOString(),
                                dateCompleted: row['Date Completed'] || null
                            };
                        });
                        
                        newTasks.forEach(nt => {
                            const existingIndex = projData.tasks.findIndex(t => t.id === nt.id);
                            if (existingIndex > -1) {
                                projData.tasks[existingIndex] = { ...projData.tasks[existingIndex], ...nt };
                            } else {
                                projData.tasks.push(nt);
                            }
                        });
                        
                        safeSave();
                        NotificationSystem.show('Tasks Imported!', 'success'); 
                    }});
                    e.target.value = ''; 
                }
            });
        }
    }

    // --- Modal Logic ---
    const taskModal = document.getElementById('project-modal');
    
    document.getElementById('add-project-btn').addEventListener('click', () => openTaskEditor(null));
    document.getElementById('close-project-modal').addEventListener('click', () => taskModal.close());

    function openTaskEditor(taskId) {
        const deleteBtn = document.getElementById('task-delete-btn');
        if (taskId) {
            const task = projData.tasks.find(t => t.id === taskId);
            if (!task) return;
            document.getElementById('project-modal-title').innerText = "Edit Task";
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-date-created').value = task.dateCreated;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-desc').value = task.description || '';
            document.getElementById('task-priority').value = task.priority;
            
            deleteBtn.classList.remove('hidden');
        } else {
            document.getElementById('project-modal-title').innerText = "New Task";
            document.getElementById('task-id').value = 'task_' + Date.now() + Math.random().toString(36).substr(2, 9);
            document.getElementById('task-date-created').value = new Date().toISOString();
            document.getElementById('task-title').value = '';
            document.getElementById('task-desc').value = '';
            document.getElementById('task-priority').value = 'Normal';
            
            deleteBtn.classList.add('hidden');
        }
        taskModal.showModal();
    }

    document.getElementById('project-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('task-id').value;
        const newTask = {
            id: id,
            title: document.getElementById('task-title').value.trim(),
            description: document.getElementById('task-desc').value.trim(),
            priority: document.getElementById('task-priority').value,
            status: 'Active',
            dateCreated: document.getElementById('task-date-created').value,
            dateCompleted: null
        };

        const existingIdx = projData.tasks.findIndex(t => t.id === id);
        if (existingIdx > -1) {
            newTask.status = projData.tasks[existingIdx].status;
            newTask.dateCompleted = projData.tasks[existingIdx].dateCompleted;
            projData.tasks[existingIdx] = newTask;
        } else {
            projData.tasks.push(newTask);
        }

        safeSave();
        taskModal.close();
        NotificationSystem.show("Task Saved", "success");
        renderProjView('active');
    });

    document.getElementById('task-delete-btn').addEventListener('click', async () => {
        const id = document.getElementById('task-id').value;
        const confirmed = await DialogSystem.confirm("Delete Task", "Are you sure you want to permanently delete this task?");
        if (confirmed) {
            projData.tasks = projData.tasks.filter(t => t.id !== id);
            safeSave();
            taskModal.close();
            renderProjView('active');
            NotificationSystem.show("Task Deleted", "success");
        }
    });

    // Boot
    renderProjView('active');
}