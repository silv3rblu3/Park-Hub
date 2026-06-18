// apps/projects/app.js

function initProjectsLogic() {
    let projData = StateManager.getAppData('projects');
    
    // Validate schema
    if (!projData.tasks) projData.tasks = [];
    if (!projData.recurring) projData.recurring = []; // Holds the master repeating blueprints
    
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

    // --- TIME-CHECK ENGINE: Processes repeating tasks on view load ---
    function processRecurringTasks() {
        if (!projData.recurring) projData.recurring = [];
        let needsSave = false;
        
        const now = new Date();
        const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dec
        
        let currentSeason = 'Year-Round';
        if (currentMonth >= 2 && currentMonth <= 4) currentSeason = 'Spring'; // March - May
        else if (currentMonth >= 5 && currentMonth <= 7) currentSeason = 'Summer'; // June - Aug
        else if (currentMonth >= 8 && currentMonth <= 10) currentSeason = 'Fall'; // Sept - Nov
        else currentSeason = 'Winter'; // Dec - Feb

        projData.recurring.forEach(bp => {
            const nextSpawn = new Date(bp.nextSpawn);
            
            // Has the interval passed?
            if (now >= nextSpawn) {
                // 1. Advance the clock for the NEXT cycle regardless of season
                if (bp.interval === 'Weekly') nextSpawn.setDate(nextSpawn.getDate() + 7);
                else if (bp.interval === 'Monthly') nextSpawn.setMonth(nextSpawn.getMonth() + 1);
                bp.nextSpawn = nextSpawn.toISOString();
                needsSave = true;

                // 2. Are we in the correct season?
                if (bp.season === 'Year-Round' || bp.season === currentSeason) {
                    
                    // 3. Delete old active instance if the user missed it
                    const existingIdx = projData.tasks.findIndex(t => t.status === 'Active' && t.blueprintId === bp.id);
                    if (existingIdx > -1) {
                        projData.tasks.splice(existingIdx, 1);
                    }
                    
                    // 4. Spawn the new active instance
                    projData.tasks.push({
                        id: 'task_' + Date.now() + Math.random().toString(36).substr(2, 9),
                        blueprintId: bp.id,
                        title: bp.title,
                        description: bp.description,
                        priority: bp.priority,
                        status: 'Active',
                        dateCreated: now.toISOString(),
                        dateCompleted: null
                    });
                }
            }
        });
        
        if (needsSave) safeSave();
    }

    function renderProjView(viewName) {
        stage.innerHTML = '';
        
        if (viewName === 'active') {
            // Trigger Time-Check Engine before building the visual list
            processRecurringTasks();

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
                    
                    // Look up if it's tied to a repeating blueprint
                    let repeatMeta = '';
                    let titleIcon = '';
                    if (task.blueprintId) {
                        const bp = projData.recurring.find(r => r.id === task.blueprintId);
                        if (bp) {
                            titleIcon = `<span style="font-size: 0.9rem;" title="Repeating Task">🔁</span>`;
                            repeatMeta = `| <strong>Repeats:</strong> ${bp.interval} (${bp.season})`;
                        }
                    }

                    html += `
                        <div class="task-card task-priority-${task.priority}">
                            <div style="flex: 1; min-width: 250px;">
                                <h4 class="task-title">${task.title} ${titleIcon}</h4>
                                <div class="task-desc">${task.description || 'No description provided.'}</div>
                                <div class="task-meta">
                                    <strong>Priority:</strong> ${task.priority} | <strong>Created:</strong> ${createdFmt} ${repeatMeta}
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
                    
                    const titlePrefix = task.blueprintId ? '🔁 ' : '';

                    html += `<tr>
                                <td><strong>${titlePrefix}${task.title}</strong></td>
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
                <p style="color: var(--text-secondary); margin-bottom: 10px; font-size: 0.85rem;">Export or merge complete project states (including repeating logic) to safely sync across devices.</p>
                
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
                                    if (existingIndex > -1) projData.tasks[existingIndex] = { ...projData.tasks[existingIndex], ...impTask };
                                    else projData.tasks.push(impTask);
                                });

                                if (importedData.recurring) {
                                    importedData.recurring.forEach(impBp => {
                                        const existingIndex = projData.recurring.findIndex(r => r.id === impBp.id);
                                        if (existingIndex > -1) projData.recurring[existingIndex] = { ...projData.recurring[existingIndex], ...impBp };
                                        else projData.recurring.push(impBp);
                                    });
                                }

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
                                dateCompleted: row['Date Completed'] || null,
                                blueprintId: null // Strip blueprint IDs on CSV imports to prevent sync errors
                            };
                        });
                        
                        newTasks.forEach(nt => {
                            const existingIndex = projData.tasks.findIndex(t => t.id === nt.id);
                            if (existingIndex > -1) projData.tasks[existingIndex] = { ...projData.tasks[existingIndex], ...nt };
                            else projData.tasks.push(nt);
                        });
                        
                        safeSave();
                        NotificationSystem.show('Tasks Imported!', 'success'); 
                    }});
                    e.target.value = ''; 
                }
            });
        }
    }

    // --- FORM MODAL UI TOGGLES ---
    document.getElementById('task-is-recurring').addEventListener('change', (e) => {
        const opts = document.getElementById('task-recurring-options');
        if (e.target.checked) opts.style.display = 'block';
        else opts.style.display = 'none';
    });

    const taskModal = document.getElementById('project-modal');
    document.getElementById('add-project-btn').addEventListener('click', () => openTaskEditor(null));
    document.getElementById('close-project-modal').addEventListener('click', () => taskModal.close());

    function openTaskEditor(taskId) {
        const deleteBtn = document.getElementById('task-delete-btn');
        const recurCheckbox = document.getElementById('task-is-recurring');
        const recurOptions = document.getElementById('task-recurring-options');

        if (taskId) {
            const task = projData.tasks.find(t => t.id === taskId);
            if (!task) return;
            
            document.getElementById('project-modal-title').innerText = "Edit Task";
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-date-created').value = task.dateCreated;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-desc').value = task.description || '';
            document.getElementById('task-priority').value = task.priority;
            
            if (task.blueprintId) {
                const bp = projData.recurring.find(r => r.id === task.blueprintId);
                if (bp) {
                    document.getElementById('blueprint-id').value = bp.id;
                    recurCheckbox.checked = true;
                    recurOptions.style.display = 'block';
                    document.getElementById('task-interval').value = bp.interval;
                    document.getElementById('task-season').value = bp.season;
                }
            } else {
                document.getElementById('blueprint-id').value = '';
                recurCheckbox.checked = false;
                recurOptions.style.display = 'none';
                document.getElementById('task-interval').value = 'Weekly';
                document.getElementById('task-season').value = 'Year-Round';
            }
            
            deleteBtn.style.display = 'block';
        } else {
            document.getElementById('project-modal-title').innerText = "New Task";
            document.getElementById('task-id').value = 'task_' + Date.now() + Math.random().toString(36).substr(2, 9);
            document.getElementById('blueprint-id').value = '';
            document.getElementById('task-date-created').value = new Date().toISOString();
            document.getElementById('task-title').value = '';
            document.getElementById('task-desc').value = '';
            document.getElementById('task-priority').value = 'Normal';
            
            recurCheckbox.checked = false;
            recurOptions.style.display = 'none';
            document.getElementById('task-interval').value = 'Weekly';
            document.getElementById('task-season').value = 'Year-Round';

            deleteBtn.style.display = 'none';
        }
        taskModal.showModal();
    }

    // --- FORM SUBMISSION & RECURRING LOGIC ---
    document.getElementById('project-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('task-id').value;
        const isRec = document.getElementById('task-is-recurring').checked;
        let bpId = document.getElementById('blueprint-id').value;

        const title = document.getElementById('task-title').value.trim();
        const desc = document.getElementById('task-desc').value.trim();
        const priority = document.getElementById('task-priority').value;

        if (isRec) {
            const interval = document.getElementById('task-interval').value;
            const season = document.getElementById('task-season').value;
            
            if (!projData.recurring) projData.recurring = [];
            
            if (bpId) {
                // Update existing blueprint
                const bpIdx = projData.recurring.findIndex(r => r.id === bpId);
                if (bpIdx > -1) {
                    projData.recurring[bpIdx].title = title;
                    projData.recurring[bpIdx].description = desc;
                    projData.recurring[bpIdx].priority = priority;
                    projData.recurring[bpIdx].interval = interval;
                    projData.recurring[bpIdx].season = season;
                }
            } else {
                // Create new blueprint
                bpId = 'bp_' + Date.now();
                const next = new Date();
                if (interval === 'Weekly') next.setDate(next.getDate() + 7);
                else next.setMonth(next.getMonth() + 1);

                projData.recurring.push({
                    id: bpId,
                    title: title,
                    description: desc,
                    priority: priority,
                    interval: interval,
                    season: season,
                    nextSpawn: next.toISOString() // Won't spawn again until the interval passes
                });
            }
        } else {
            // Un-checked. If it used to be a blueprint, remove it so it stops repeating
            if (bpId && projData.recurring) {
                projData.recurring = projData.recurring.filter(r => r.id !== bpId);
            }
            bpId = null;
        }

        // Build/Update the Active Task
        const existingIdx = projData.tasks.findIndex(t => t.id === id);
        if (existingIdx > -1) {
            projData.tasks[existingIdx].title = title;
            projData.tasks[existingIdx].description = desc;
            projData.tasks[existingIdx].priority = priority;
            projData.tasks[existingIdx].blueprintId = bpId;
        } else {
            projData.tasks.push({
                id: id,
                blueprintId: bpId,
                title: title,
                description: desc,
                priority: priority,
                status: 'Active',
                dateCreated: document.getElementById('task-date-created').value,
                dateCompleted: null
            });
        }

        safeSave();
        taskModal.close();
        NotificationSystem.show("Task Saved", "success");
        renderProjView('active');
    });

    // --- DELETION LOGIC ---
    document.getElementById('task-delete-btn').addEventListener('click', async () => {
        const id = document.getElementById('task-id').value;
        const bpId = document.getElementById('blueprint-id').value;
        
        const msg = bpId ? "Delete this repeating task? This will permanently cancel all future repetitions." : "Are you sure you want to permanently delete this task?";
        const confirmed = await DialogSystem.confirm("Delete Task", msg);
        
        if (confirmed) {
            projData.tasks = projData.tasks.filter(t => t.id !== id);
            if (bpId && projData.recurring) {
                projData.recurring = projData.recurring.filter(r => r.id !== bpId);
            }
            
            safeSave();
            taskModal.close();
            renderProjView('active');
            NotificationSystem.show("Task Deleted", "success");
        }
    });

    // Boot
    renderProjView('active');
}