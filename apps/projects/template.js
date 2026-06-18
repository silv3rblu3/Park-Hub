// apps/projects/template.js

function renderProjectsApp() {
    return `
    <style>
        #projects-wrapper { max-width: 1200px; margin: 0 auto; }
        .task-card { 
            background: var(--bg-surface); 
            border: 1px solid var(--border-color); 
            border-radius: var(--radius-md); 
            padding: 15px; 
            margin-bottom: 15px; 
            box-shadow: var(--shadow-sm);
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 15px;
        }
        .task-priority-High { border-left: 4px solid var(--danger-color); }
        .task-priority-Normal { border-left: 4px solid var(--accent-primary); }
        .task-priority-Low { border-left: 4px solid #f39c12; }
        
        .task-meta { font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px; }
        .task-title { margin: 0 0 5px 0; font-size: 1.2rem; color: var(--accent-primary); display: flex; align-items: center; gap: 8px; }
        .task-desc { font-size: 0.95rem; margin-bottom: 10px; white-space: pre-wrap; }
        
        .task-actions { display: flex; gap: 10px; flex-shrink: 0; }
        
        .proj-print-only { display: none !important; }
        .proj-no-print { display: block; }
        
        @media print {
            #global-header, #bento-menu, .proj-no-print, .projects-tab-container, #add-project-btn { display: none !important; }
            #app-container { height: auto !important; overflow: visible !important; padding: 0 !important; }
            .proj-print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
            table.app-table { border-collapse: collapse !important; width: 100% !important; margin-top: 20px; }
            table.app-table th, table.app-table td { border: 1px solid black !important; padding: 8px !important; color: black !important; font-size: 0.9rem !important; text-align: left; }
        }
    </style>

    <div id="projects-wrapper" class="proj-no-print">
        
        <div class="app-toolbar proj-no-print" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 10px;">
                <h2 style="color: var(--accent-primary); margin: 0;">📋 Projects & Tasks</h2>
                <button id="add-project-btn" class="btn-primary">+ New Task</button>
            </div>
            
            <div class="projects-tab-container" style="display: flex; gap: 10px; flex-wrap: wrap; width: 100%;">
                <button class="proj-tab btn-primary" data-target="active" style="flex: 1; min-width: 120px;">🚀 Active Tasks</button>
                <button class="proj-tab btn-outline" data-target="completed" style="flex: 1; min-width: 120px;">✅ Completed Logs</button>
                <button class="proj-tab btn-outline" data-target="sync" style="flex: 1; min-width: 120px;">🔄 Data & Sync</button>
            </div>
        </div>

        <div id="projects-stage"></div>

        <dialog id="project-modal" style="width: 95%; max-width: 500px;">
            <div class="modal-header">
                <h3 id="project-modal-title">New Task</h3>
                <button id="close-project-modal" class="icon-btn">❌</button>
            </div>
            <form id="project-form" class="modal-body">
                <input type="hidden" id="task-id">
                <input type="hidden" id="blueprint-id">
                <input type="hidden" id="task-date-created">
                
                <label>Task / Project Title</label>
                <input type="text" id="task-title" class="app-input" required placeholder="e.g., Rebuild Dock at Ramp 2">
                
                <label>Description & Notes</label>
                <textarea id="task-desc" class="app-input" rows="4" placeholder="Materials needed, specific issues, etc..."></textarea>
                
                <label>Priority Level</label>
                <select id="task-priority" class="app-select" required>
                    <option value="High">🔴 High Priority</option>
                    <option value="Normal" selected>🔵 Normal Priority</option>
                    <option value="Low">🟡 Low Priority</option>
                </select>

                <label style="cursor: pointer; color: var(--accent-primary); display: block; margin-top: 15px; margin-bottom: 5px; font-weight: bold;">
                    <input type="checkbox" id="task-is-recurring" style="margin-right: 5px; transform: scale(1.2);"> 🔁 Make this a Repeating Project
                </label>
                
                <div id="task-recurring-options" style="display: none; background: rgba(0,0,0,0.03); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="font-size: 0.85rem;">Repeats</label>
                            <select id="task-interval" class="app-select" style="margin-bottom: 0;">
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem;">Seasonality</label>
                            <select id="task-season" class="app-select" style="margin-bottom: 0;">
                                <option value="Year-Round">Year-Round</option>
                                <option value="Spring">Spring</option>
                                <option value="Summer">Summer</option>
                                <option value="Fall">Fall</option>
                                <option value="Winter">Winter</option>
                            </select>
                        </div>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 10px; margin-bottom: 0;">Uncompleted repeating tasks will be automatically replaced by the next cycle.</p>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn-primary" style="flex: 2;">💾 Save Task</button>
                    <button type="button" id="task-delete-btn" class="btn-danger" style="display: none; flex: 1;">🗑️ Delete</button>
                </div>
            </form>
        </dialog>

    </div>
    <div id="proj-print-stage" class="proj-print-only"></div>
    `;
}