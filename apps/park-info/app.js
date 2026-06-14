// apps/park-info/app.js

function initParkInfoLogic() {
    let piData = StateManager.getAppData('parkInfo');
    
    // Validate Data Structure
    if (!piData.forms) piData.forms = [];
    if (!piData.docs) piData.docs = []; 
    if (!piData.links) piData.links = [];
    if (!piData.emergencyLinks) piData.emergencyLinks = []; 
    if (!piData.emergencyDocs) piData.emergencyDocs = []; 
    if (!piData.linkCategories) piData.linkCategories = ['General'];
    
    // Clean up old HTML placeholder text if present, replace with simple text
    if (!piData.emergencyInfo || piData.emergencyInfo.includes('<h2>')) { 
        piData.emergencyInfo = "Emergency Procedures\n\nPlease enter your park's emergency protocols here. You can update this at any time by clicking the Edit button."; 
    }
    
    const safeSave = () => { StateManager.setAppData('parkInfo', piData); };

    // State trackers
    let isLinksEditMode = false;
    let activeLinkFilter = 'All';

    // Set up tabs
    const tabs = document.querySelectorAll('.pi-tab');
    const stage = document.getElementById('pi-stage');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            isLinksEditMode = false; 
            activeLinkFilter = 'All'; 
            tabs.forEach(t => { t.classList.remove('btn-primary'); t.classList.add('btn-outline'); });
            e.target.classList.remove('btn-outline'); e.target.classList.add('btn-primary');
            renderPIView(e.target.getAttribute('data-target'));
        });
    });

    // --- Lightbox Listener for Parts Images ---
    document.getElementById('parkinfo-wrapper').addEventListener('click', (e) => {
        if (e.target.classList.contains('part-media-thumb') && e.target.tagName === 'IMG') {
            document.getElementById('pi-lightbox-img').src = e.target.src;
            document.getElementById('pi-lightbox-modal').showModal();
        }
    });
    
    document.getElementById('pi-close-lightbox').addEventListener('click', () => {
        document.getElementById('pi-lightbox-modal').close();
    });

    function renderPIView(viewName) {
        stage.innerHTML = '';
        
        if (viewName === 'emergency') {
            const displaySafeText = piData.emergencyInfo.replace(/\n/g, '<br>');

            let html = `
            <div class="info-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin:0;">🚨 Emergency Protocols & Standard Operating Procedures (SOP)</h3>
                    <div>
                        <button id="pi-edit-emerg-btn" class="btn-outline">✏️ Edit</button>
                        <button id="pi-save-emerg-btn" class="btn-primary" style="display: none;">💾 Save Changes</button>
                    </div>
                </div>
                
                <div id="pi-emerg-display" style="padding: 15px; border: 1px solid transparent; border-radius: var(--radius-md); background: rgba(0,0,0,0.02); min-height: 200px;">
                    ${displaySafeText}
                </div>
                <textarea id="pi-emerg-editor" class="app-input" rows="12" style="width: 100%; display: none;">${piData.emergencyInfo}</textarea>
                
                <div style="margin-top: 30px; border-top: 2px solid var(--border-color); padding-top: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: var(--danger-color);">📄 Emergency Documents & Forms</h3>
                        <button id="pi-add-emerg-doc-btn" class="btn-outline pi-edit-controls" style="display: none; border-color: var(--danger-color); color: var(--danger-color);">+ Add Document</button>
                    </div>
                    <div class="app-table-container" style="margin-bottom: 30px;">
                        <table class="app-table">
                            <thead><tr><th>Document Name</th><th>Description</th><th style="text-align: right;">Action</th></tr></thead>
                            <tbody>`;
            
            if (piData.emergencyDocs.length === 0) {
                html += `<tr><td colspan="3" style="text-align: center; padding: 15px; color: var(--text-secondary);">No emergency documents added yet.</td></tr>`;
            } else {
                piData.emergencyDocs.forEach(d => {
                    html += `
                        <tr>
                            <td><strong style="color: var(--danger-color);">${d.title}</strong></td>
                            <td>${d.description || '--'}</td>
                            <td style="text-align: right;">
                                <button class="btn-outline pi-edit-form pi-edit-controls" data-type="emergency" data-id="${d.id}" style="display: none; padding: 4px 10px; font-size: 0.8rem; border-color: var(--danger-color); color: var(--danger-color);">✏️ Edit</button>
                                <a href="${d.url}" target="_blank" class="btn-primary" style="padding: 6px 12px; text-decoration: none; display: inline-block; background-color: var(--danger-color);">📄 View / Download</a>
                            </td>
                        </tr>`;
                });
            }
            html += `</tbody></table></div>`;

            html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: var(--danger-color);">🔗 Important Emergency Links</h3>
                        <button id="pi-add-emerg-link-btn" class="btn-outline pi-edit-controls" style="display: none; border-color: var(--danger-color); color: var(--danger-color);">+ Add Emergency Link</button>
                    </div>
                    <div id="pi-emerg-links-container" style="display: flex; flex-direction: column; gap: 10px;">`;
            
            if (piData.emergencyLinks.length === 0) {
                html += `<div style="text-align: center; padding: 10px; color: var(--text-secondary);">No emergency links added yet.</div>`;
            } else {
                piData.emergencyLinks.forEach(l => {
                    let vUrl = l.url || '';
                    if (vUrl && !vUrl.startsWith('http')) vUrl = 'https://' + vUrl;
                    html += `
                        <div class="info-link-item" style="border-left: 4px solid var(--danger-color);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <a href="${vUrl}" target="_blank" rel="noopener noreferrer" class="info-link-title" style="color: var(--danger-color);">${l.title} ↗</a>
                                <button class="btn-outline pi-edit-link pi-edit-controls" data-type="emergency" data-id="${l.id}" style="display: none; padding: 2px 8px; font-size: 0.8rem;">✏️ Edit</button>
                            </div>
                            <div class="info-link-desc">${l.description || 'No description provided.'}</div>
                        </div>`;
                });
            }
            
            html += `</div></div></div>`;
            stage.innerHTML = html;

            const editBtn = document.getElementById('pi-edit-emerg-btn');
            const saveBtn = document.getElementById('pi-save-emerg-btn');
            const displayDiv = document.getElementById('pi-emerg-display');
            const editorTxt = document.getElementById('pi-emerg-editor');
            const editControls = document.querySelectorAll('.pi-edit-controls');

            editBtn.addEventListener('click', () => {
                displayDiv.style.display = 'none';
                editorTxt.style.display = 'block';
                editBtn.style.display = 'none';
                saveBtn.style.display = 'inline-block';
                editControls.forEach(el => el.style.display = 'inline-block');
            });

            saveBtn.addEventListener('click', () => {
                piData.emergencyInfo = editorTxt.value;
                safeSave();
                displayDiv.innerHTML = piData.emergencyInfo.replace(/\n/g, '<br>');
                
                editorTxt.style.display = 'none';
                displayDiv.style.display = 'block';
                saveBtn.style.display = 'none';
                editBtn.style.display = 'inline-block';
                editControls.forEach(el => el.style.display = 'none');
                NotificationSystem.show("Protocols Saved", "success");
            });

            document.getElementById('pi-add-emerg-doc-btn').addEventListener('click', () => openFormEditor(null, 'emergency'));
            document.getElementById('pi-add-emerg-link-btn').addEventListener('click', () => openLinkEditor(null, 'emergency'));
            document.querySelectorAll('.pi-edit-link').forEach(btn => btn.addEventListener('click', (e) => openLinkEditor(e.target.getAttribute('data-id'), e.target.getAttribute('data-type'))));
            document.querySelectorAll('.pi-edit-form').forEach(btn => btn.addEventListener('click', (e) => openFormEditor(e.target.getAttribute('data-id'), 'emergency')));
        } 
        else if (viewName === 'forms') {
            let html = `
            <div class="info-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">📄 Forms & Documents</h3>
                </div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid var(--accent-primary); padding-bottom: 10px;">
                    <button class="pi-form-sub-tab btn-primary" data-target="forms-list" style="flex:1;">Blank Forms</button>
                    <button class="pi-form-sub-tab btn-outline" data-target="docs-list" style="flex:1;">Park Documents</button>
                </div>

                <div id="pi-view-forms-list" class="pi-sub-view">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <p style="color: var(--text-secondary); margin: 0;">System-generated checklists and custom blank forms.</p>
                        <button id="pi-add-form-btn" class="btn-primary">+ Add Custom Form</button>
                    </div>
                    
                    <div class="app-table-container">
                        <table class="app-table">
                            <thead><tr><th>Form Name</th><th>Description</th><th style="text-align: right;">Action</th></tr></thead>
                            <tbody>
                                <tr style="background: rgba(46, 204, 113, 0.05);">
                                    <td><strong>System: Fleet Monthly Inspection</strong></td>
                                    <td>Blank checklist pulled directly from the Fleet Module configuration.</td>
                                    <td style="text-align: right;"><button class="btn-primary pi-print-native" data-form="fleet">🖨️ Print Form</button></td>
                                </tr>
                                <tr style="background: rgba(52, 152, 219, 0.05);">
                                    <td><strong>System: Fall Winterization Checklist</strong></td>
                                    <td>Standard blank checklist for Fall shutdown procedures.</td>
                                    <td style="text-align: right;"><button class="btn-primary pi-print-native" data-form="fall">🖨️ Print Form</button></td>
                                </tr>
                                <tr style="background: rgba(241, 196, 15, 0.05);">
                                    <td><strong>System: Spring De-Winterization Checklist</strong></td>
                                    <td>Standard blank checklist for Spring startup procedures.</td>
                                    <td style="text-align: right;"><button class="btn-primary pi-print-native" data-form="spring">🖨️ Print Form</button></td>
                                </tr>
            `;

            piData.forms.forEach(f => {
                html += `
                    <tr>
                        <td><strong>${f.title}</strong></td>
                        <td>${f.description || '--'}</td>
                        <td style="text-align: right;">
                            <button class="btn-outline pi-edit-form" data-type="forms" data-id="${f.id}" style="padding: 4px 10px; font-size: 0.8rem;">✏️ Edit</button>
                            <a href="${f.url}" target="_blank" class="btn-primary" style="padding: 6px 12px; text-decoration: none; display: inline-block;">📄 View / Print</a>
                        </td>
                    </tr>`;
            });

            html += `</tbody></table></div></div>`;

            html += `
                <div id="pi-view-docs-list" class="pi-sub-view" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <p style="color: var(--text-secondary); margin: 0;">General park documents, manuals, and reference files.</p>
                        <button id="pi-add-doc-btn" class="btn-primary">+ Add Document</button>
                    </div>
                    <div class="app-table-container">
                        <table class="app-table">
                            <thead><tr><th>Document Name</th><th>Description</th><th style="text-align: right;">Action</th></tr></thead>
                            <tbody>
            `;

            if (piData.docs.length === 0) {
                html += `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-secondary);">No documents added yet.</td></tr>`;
            } else {
                piData.docs.forEach(d => {
                    html += `
                        <tr>
                            <td><strong>${d.title}</strong></td>
                            <td>${d.description || '--'}</td>
                            <td style="text-align: right;">
                                <button class="btn-outline pi-edit-form" data-type="docs" data-id="${d.id}" style="padding: 4px 10px; font-size: 0.8rem;">✏️ Edit</button>
                                <a href="${d.url}" target="_blank" class="btn-primary" style="padding: 6px 12px; text-decoration: none; display: inline-block;">📄 View Document</a>
                            </td>
                        </tr>`;
                });
            }

            html += `</tbody></table></div></div></div>`;
            stage.innerHTML = html;

            document.querySelectorAll('.pi-form-sub-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    document.querySelectorAll('.pi-form-sub-tab').forEach(t => { t.classList.remove('btn-primary'); t.classList.add('btn-outline'); });
                    e.target.classList.remove('btn-outline'); e.target.classList.add('btn-primary');
                    
                    document.querySelectorAll('.pi-sub-view').forEach(v => v.style.display = 'none');
                    document.getElementById('pi-view-' + e.target.getAttribute('data-target')).style.display = 'block';
                });
            });

            // --- NATIVE IN-DOM PRINTING MATCHING SOURCE EXACTLY ---
            document.querySelectorAll('.pi-print-native').forEach(btn => btn.addEventListener('click', (e) => {
                const formType = e.target.getAttribute('data-form');
                let blankHtml = '';
                
                // Inject the exact CSS from the native modules into the print stage
                const printCss = `
                    <style>
                        @media print {
                            .print-area-block { page-break-after: always; padding: 0 !important; margin: 0 !important; }
                            .wint-task-table { border-collapse: collapse !important; width: 100% !important; margin-bottom: 10px !important; border: 2px solid black !important; background: white !important; }
                            .wint-task-table th, .wint-task-table td { border: 1px solid black !important; padding: 4px !important; font-size: 0.9rem !important; }
                            .print-blank-line { width: 90%; min-height: 20px; margin: auto; border-bottom: 1px solid black; }
                        }
                    </style>
                `;

                if (formType === 'fleet') {
                    const fleetData = StateManager.getAppData('fleet');
                    if (!fleetData || !fleetData.settings || !fleetData.settings.checklistItems) return NotificationSystem.show("Fleet module not configured.", "error");
                    
                    blankHtml = `<div style="page-break-after:always; margin-bottom: 20px;"><h2 style="text-align:center; border-bottom:2px solid #000; padding-bottom: 10px;">Monthly Vehicle Inspection</h2>
                    <div style="display:grid; grid-template-columns:1fr 1fr; margin-bottom:15px; font-size:12px;"><div><strong>Vehicle:</strong> ________________</div><div><strong>Date:</strong> ________________</div><div><strong>Inspector:</strong> ________________</div><div><strong>Odometer:</strong> ________________</div></div>
                    <table style="width:100%; border-collapse:collapse; font-size:12px;"><thead><tr><th style="border:1px solid #000; background:#eee; padding:5px;">Item</th><th style="border:1px solid #000; background:#eee; padding:5px;">Result</th><th style="border:1px solid #000; background:#eee; padding:5px;">Item</th><th style="border:1px solid #000; background:#eee; padding:5px;">Result</th></tr></thead><tbody>`;
                    
                    const cl = fleetData.settings.checklistItems;
                    for(let i=0; i<cl.length; i+=2) {
                        blankHtml += `<tr><td style="border:1px solid #000; padding:8px;">${cl[i]}</td><td style="border:1px solid #000; padding:8px;">Pass / Fail / NA</td>${cl[i+1] ? `<td style="border:1px solid #000; padding:8px;">${cl[i+1]}</td><td style="border:1px solid #000; padding:8px;">Pass / Fail / NA</td>` : `<td></td><td></td>`}</tr>`;
                    }
                    blankHtml += `</tbody></table></div>`;
                } 
                else if (formType === 'fall' || formType === 'spring') {
                    const wintData = StateManager.getAppData('winterization');
                    if (!wintData || !wintData[formType]) return NotificationSystem.show("Winterization module not configured.", "error");

                    const yearPrefix = 'Year: _______________ ';
                    
                    Object.keys(wintData[formType]).forEach(area => {
                        const seasonData = wintData[formType][area];
                        
                        let areaHtml = `<div class="print-area-block">`;
                        areaHtml += `<h2 style="margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid black;">${yearPrefix}${formType.toUpperCase()} - ${area}</h2>`;
                        
                        if (seasonData.tools) {
                            areaHtml += `
                                <div style="background-color: rgba(0,0,0,0.03); padding: 15px; border-radius: var(--radius-md); border-left: 4px solid var(--accent-primary); margin-bottom: 20px;">
                                    <h4 style="margin-bottom: 5px;">🛠️ Tools & Equipment Needed</h4>
                                    <p style="white-space: pre-wrap; font-size: 0.95rem; margin: 0;">${seasonData.tools}</p>
                                </div>
                            `;
                        }

                        seasonData.sections.forEach(section => {
                            if (section.category === "WARNING") {
                                areaHtml += `<div style="background-color: ${section.isCritical ? '#ffe6e6' : 'var(--warning-color)'}; color: ${section.isCritical ? '#cc0000' : '#000'}; padding: 15px; font-weight: bold; border-left: 5px solid ${section.isCritical ? '#cc0000' : '#000'}; margin-bottom: 20px; border-radius: 4px;">${section.warningText}</div>`;
                                return; 
                            }

                            areaHtml += `<div style="margin-bottom: 30px;"><h3 style="background-color: rgba(0,0,0,0.04); padding: 8px; border-radius: 4px; margin-bottom: 15px;">${section.category}</h3><div style="width: 100%; overflow-x: auto;">`;
                            
                            let columnsToRender = section.columns ? section.columns : ["Action"];
                            let tableHtml = `<table class="wint-task-table" style="width: 100%; border-collapse: collapse;"><thead><tr><th style="padding:10px; border:1px solid var(--border-color); background:rgba(0,0,0,0.03);">Item</th>`;
                            
                            columnsToRender.forEach((col) => { 
                                tableHtml += `<th style="padding:10px; border:1px solid var(--border-color); background:rgba(0,0,0,0.03); width: 130px; text-align: center;">${col} (Date)</th>
                                              <th style="padding:10px; border:1px solid var(--border-color); background:rgba(0,0,0,0.03); width: 130px; text-align: center;">Initials</th>`; 
                            });
                            tableHtml += `</tr></thead><tbody>`;

                            section.tasks.forEach((task) => {
                                tableHtml += `<tr><td style="padding:10px; border:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center;"><strong>${task.text}</strong></div></td>`;
                                columnsToRender.forEach(() => {
                                    tableHtml += `<td style="border:1px solid #000; text-align:center;"><div class="print-blank-line"></div></td>
                                                  <td style="border:1px solid #000; text-align:center;"><div class="print-blank-line"></div></td>`;
                                });
                                tableHtml += `</tr>`;
                            });
                            tableHtml += `</tbody></table></div></div>`;
                            areaHtml += tableHtml;
                        });
                        areaHtml += `</div>`;
                        blankHtml += areaHtml;
                    });
                }
                
                const printStage = document.getElementById('pi-print-stage');
                printStage.innerHTML = printCss + blankHtml;
                setTimeout(() => { window.print(); }, 150);
            }));

            document.getElementById('pi-add-form-btn').addEventListener('click', () => openFormEditor(null, 'forms'));
            document.getElementById('pi-add-doc-btn').addEventListener('click', () => openFormEditor(null, 'docs'));
            document.querySelectorAll('.pi-edit-form').forEach(btn => btn.addEventListener('click', (e) => openFormEditor(e.target.getAttribute('data-id'), e.target.getAttribute('data-type'))));
        }
        else if (viewName === 'links') {
            
            let filterOptions = `<option value="All" ${activeLinkFilter === 'All' ? 'selected' : ''}>All Categories</option>`;
            piData.linkCategories.forEach(c => {
                filterOptions += `<option value="${c}" ${activeLinkFilter === c ? 'selected' : ''}>${c}</option>`;
            });

            let html = `
            <div class="info-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                        <h3 style="margin: 0;">🔗 Important Park Links</h3>
                        <select id="pi-link-filter" class="app-select" style="margin: 0; min-width: 150px; padding: 6px; font-size: 0.9rem;">
                            ${filterOptions}
                        </select>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${isLinksEditMode ? `
                        <button id="pi-add-link-cat-btn" class="btn-outline">+ Category</button>
                        <button id="pi-add-link-btn" class="btn-primary">+ Add Link</button>
                        ` : ''}
                        <button id="pi-toggle-link-edit" class="${isLinksEditMode ? 'btn-primary' : 'btn-outline'}">${isLinksEditMode ? 'Done Editing' : '✏️ Edit Mode'}</button>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 20px;">
            `;

            piData.linkCategories.forEach(cat => {
                if (activeLinkFilter !== 'All' && activeLinkFilter !== cat) return;

                const catLinks = piData.links.filter(l => (l.category || 'General') === cat);
                if (catLinks.length === 0 && !isLinksEditMode) return; 

                html += `
                <div class="link-category-block">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border-color); padding-bottom: 5px; margin-bottom: 10px;">
                        <h4 style="margin:0; color: var(--accent-primary); font-size: 1.1rem;">${cat}</h4>
                        ${(isLinksEditMode && cat !== 'General') ? `
                        <div>
                            <button class="btn-outline pi-rename-cat" data-cat="${cat}" style="padding: 2px 8px; font-size: 0.8rem; margin-right: 5px;">✏️ Rename</button> 
                            <button class="btn-danger pi-del-cat" data-cat="${cat}" style="padding: 2px 8px; font-size: 0.8rem;">X</button>
                        </div>` : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                `;
                
                if (catLinks.length === 0) {
                    html += `<div style="text-align: center; padding: 10px; color: var(--text-secondary); font-size: 0.9rem;">No links in this category.</div>`;
                } else {
                    catLinks.forEach(l => {
                        let vUrl = l.url || '';
                        if (vUrl && !vUrl.startsWith('http')) vUrl = 'https://' + vUrl;
                        
                        html += `
                            <div class="info-link-item">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <a href="${vUrl}" target="_blank" rel="noopener noreferrer" class="info-link-title">${l.title} ↗</a>
                                    ${isLinksEditMode ? `<button class="btn-outline pi-edit-link" data-type="general" data-id="${l.id}" style="padding: 2px 8px; font-size: 0.8rem;">✏️ Edit</button>` : ''}
                                </div>
                                <div class="info-link-desc">${l.description || 'No description provided.'}</div>
                            </div>
                        `;
                    });
                }
                
                html += `</div></div>`;
            });
            
            html += `</div></div>`;
            stage.innerHTML = html;

            document.getElementById('pi-link-filter').addEventListener('change', (e) => {
                activeLinkFilter = e.target.value;
                renderPIView('links');
            });

            document.getElementById('pi-toggle-link-edit').addEventListener('click', () => {
                isLinksEditMode = !isLinksEditMode;
                renderPIView('links');
            });

            if (isLinksEditMode) {
                document.getElementById('pi-add-link-btn').addEventListener('click', () => openLinkEditor(null, 'general'));
                document.getElementById('pi-add-link-cat-btn').addEventListener('click', async () => {
                    const newCat = await DialogSystem.prompt("Add Category", "Category Name:");
                    if (newCat && newCat.trim() !== '' && !piData.linkCategories.includes(newCat.trim())) {
                        piData.linkCategories.push(newCat.trim());
                        safeSave();
                        renderPIView('links');
                    }
                });

                document.querySelectorAll('.pi-rename-cat').forEach(btn => btn.addEventListener('click', async (e) => {
                    const oldCat = e.target.getAttribute('data-cat');
                    const newCat = await DialogSystem.prompt("Rename Category", "Enter new name:", oldCat);
                    if (newCat && newCat.trim() !== '' && newCat !== oldCat) {
                        const idx = piData.linkCategories.indexOf(oldCat);
                        if(idx > -1) piData.linkCategories[idx] = newCat.trim();
                        // Bulk update all links in this category
                        piData.links.forEach(l => { if((l.category || 'General') === oldCat) l.category = newCat.trim(); });
                        
                        // Update active filter if they renamed the one they are currently looking at
                        if (activeLinkFilter === oldCat) activeLinkFilter = newCat.trim();

                        safeSave();
                        renderPIView('links');
                    }
                }));

                document.querySelectorAll('.pi-del-cat').forEach(btn => btn.addEventListener('click', async (e) => {
                    const cat = e.target.getAttribute('data-cat');
                    const confirm = await DialogSystem.confirm("Delete Category", `Delete '${cat}'? All links inside will be moved to 'General'.`);
                    if (confirm) {
                        piData.linkCategories = piData.linkCategories.filter(c => c !== cat);
                        piData.links.forEach(l => { if((l.category || 'General') === cat) l.category = 'General'; });
                        
                        // Reset filter to All if they delete the currently viewed category
                        if (activeLinkFilter === cat) activeLinkFilter = 'All';

                        safeSave();
                        renderPIView('links');
                    }
                }));

                document.querySelectorAll('.pi-edit-link').forEach(btn => btn.addEventListener('click', (e) => openLinkEditor(e.target.getAttribute('data-id'), 'general')));
            }
        }
        else if (viewName === 'parts') {
            const partsData = StateManager.getAppData('parts');
            const catalog = partsData.partsCatalog || [];

            let html = `
            <div class="info-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">⚙️ Master Parts List (Read-Only)</h3>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">Click to view details without leaving the wiki.</p>
                </div>
                <div class="app-table-container" style="max-height: 60vh; overflow-y: auto;">
                    <table class="app-table">
                        <thead><tr><th style="width: 70px;">Img</th><th>SKU / ID</th><th>Part Name</th><th>Location</th><th style="text-align: center;">Stock</th><th style="text-align: center;">Action</th></tr></thead>
                        <tbody>
            `;

            if (catalog.length === 0) {
                html += `<tr><td colspan="6" style="text-align: center; padding: 20px;">No parts in database.</td></tr>`;
            } else {
                catalog.forEach(part => {
                    const imgHtml = (part.media && part.media[0] && part.media[0].url) 
                        ? `<img src="${part.media[0].url}" class="part-media-thumb">` 
                        : `<div class="part-media-thumb" style="display:flex; align-items:center; justify-content:center; background:#eee; color:#999; font-size:0.8rem;">No Img</div>`;

                    html += `<tr>
                        <td>${imgHtml}</td>
                        <td><strong>${part.sku || part.id}</strong></td>
                        <td>${part.name}</td>
                        <td>${part.location || '--'}</td>
                        <td style="text-align: center; font-weight: bold; font-size: 1.1rem;">${part.qty}</td>
                        <td style="text-align: center;">
                            <button class="btn-outline pi-view-part" data-id="${part.id}" style="padding: 4px 10px; font-size: 0.85rem;">📄 Info</button>
                        </td>
                    </tr>`;
                });
            }
            html += `</tbody></table></div></div>`;
            stage.innerHTML = html;

            document.querySelectorAll('.pi-view-part').forEach(btn => btn.addEventListener('click', (e) => {
                const partId = e.target.getAttribute('data-id');
                const part = partsData.partsCatalog.find(p => p.id === partId);
                
                if(part) {
                    const imgContainer = document.getElementById('pi-pd-img-container');
                    if (part.media && part.media[0] && part.media[0].url) {
                        imgContainer.innerHTML = `<img src="${part.media[0].url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    } else {
                        imgContainer.innerHTML = `<span style="color:#999; font-size:0.8rem;">No Img</span>`;
                    }

                    document.getElementById('pi-pd-name').innerText = part.name;
                    document.getElementById('pi-pd-sku').innerText = part.sku || '--';
                    document.getElementById('pi-pd-loc').innerText = part.location || '--';
                    document.getElementById('pi-pd-qty').innerText = part.qty;
                    
                    document.getElementById('pi-part-detail-modal').showModal();
                }
            }));
        }
        else if (viewName === 'fleet') {
            const fleetData = StateManager.getAppData('fleet');
            const vehicles = fleetData.vehicles || [];

            let html = `
            <div class="info-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">🛻 Park Fleet (Read-Only)</h3>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">Click to view operational status without leaving the wiki.</p>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
            `;

            if (vehicles.length === 0) {
                html += `<div style="text-align: center; width: 100%; color: var(--text-secondary);">No vehicles in database.</div>`;
            } else {
                vehicles.forEach(v => {
                    html += `
                    <div style="background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 15px; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h4 style="margin: 0; color: var(--accent-primary); font-size: 1.2rem;">${v.id}</h4>
                            <p style="font-weight: bold; margin-bottom: 10px;">${v.desc}</p>
                            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">Active Scheduled Tasks: ${v.schedule ? v.schedule.length : 0}</p>
                        </div>
                        <button class="btn-outline pi-view-fleet" data-id="${v.id}" style="width: 100%;">📄 View Details</button>
                    </div>`;
                });
            }
            html += `</div></div>`;
            stage.innerHTML = html;

            document.querySelectorAll('.pi-view-fleet').forEach(btn => btn.addEventListener('click', (e) => {
                const vId = e.target.getAttribute('data-id');
                const vehicle = fleetData.vehicles.find(v => v.id === vId);
                
                if(vehicle) {
                    let currentOdo = 0;
                    const vSrv = (fleetData.services || []).filter(s => s.vehicleId === vId).sort((a,b) => new Date(b.date) - new Date(a.date));
                    const vInsp = (fleetData.inspections || []).filter(i => i.vehicleId === vId).sort((a,b) => new Date(b.date) - new Date(a.date));

                    vSrv.forEach(s => { if (Number(s.odo) > currentOdo) currentOdo = Number(s.odo); });
                    vInsp.forEach(i => { if (Number(i.odo) > currentOdo) currentOdo = Number(i.odo); });

                    const lastInsp = vInsp.length > 0 ? vInsp[0] : null;
                    const lastSrv = vSrv.length > 0 ? vSrv[0] : null;

                    let inspRes = 'N/A';
                    if(lastInsp) {
                        inspRes = lastInsp.needsWork ? '<span style="color:var(--danger-color); font-weight: bold;">Failed Items ⚠️</span>' : '<span style="color:var(--accent-primary); font-weight: bold;">Passed ✅</span>';
                    }

                    document.getElementById('pi-vd-id').innerText = vehicle.id;
                    document.getElementById('pi-vd-desc').innerText = vehicle.desc;
                    document.getElementById('pi-vd-odo').innerText = currentOdo;
                    
                    document.getElementById('pi-vd-insp-date').innerText = lastInsp ? lastInsp.date : 'None';
                    document.getElementById('pi-vd-insp-res').innerHTML = inspRes;
                    
                    document.getElementById('pi-vd-srv-date').innerText = lastSrv ? lastSrv.date : 'None';
                    document.getElementById('pi-vd-srv-task').innerText = lastSrv ? lastSrv.task : '--';

                    document.getElementById('pi-vehicle-detail-modal').showModal();
                }
            }));
        }
    }

    // --- Modal Closing Listeners ---
    document.getElementById('close-pi-part-detail').addEventListener('click', () => document.getElementById('pi-part-detail-modal').close());
    document.getElementById('close-pi-vehicle-detail').addEventListener('click', () => document.getElementById('pi-vehicle-detail-modal').close());


    // --- FORM/DOCS MODAL LOGIC ---
    const formModal = document.getElementById('pi-form-modal');
    document.getElementById('close-pi-form').addEventListener('click', () => formModal.close());
    
    function openFormEditor(id, type = 'forms') {
        const delBtn = document.getElementById('pi-form-del');
        document.getElementById('pi-form-type').value = type;

        const targetArray = type === 'emergency' ? piData.emergencyDocs : (type === 'docs' ? piData.docs : piData.forms);

        if (id) {
            const form = targetArray.find(f => f.id === id);
            
            let titleText = "Edit Form Link";
            if (type === 'emergency') titleText = "Edit Emergency Document";
            if (type === 'docs') titleText = "Edit Park Document";
            
            document.getElementById('pi-form-title').innerText = titleText;
            document.getElementById('pi-form-id').value = form.id;
            document.getElementById('pi-form-name').value = form.title;
            document.getElementById('pi-form-desc').value = form.description || '';
            document.getElementById('pi-form-url').value = form.url;
            delBtn.classList.remove('hidden');
        } else {
            let titleText = "Add Blank Form";
            if (type === 'emergency') titleText = "Add Emergency Document";
            if (type === 'docs') titleText = "Add Park Document";

            document.getElementById('pi-form-title').innerText = titleText;
            document.getElementById('pi-form-id').value = 'form_' + Date.now() + Math.random().toString(36).substr(2, 9);
            document.getElementById('pi-form-name').value = '';
            document.getElementById('pi-form-desc').value = '';
            document.getElementById('pi-form-url').value = '';
            delBtn.classList.add('hidden');
        }
        formModal.showModal();
    }

    document.getElementById('pi-form-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('pi-form-type').value;
        const targetArray = type === 'emergency' ? piData.emergencyDocs : (type === 'docs' ? piData.docs : piData.forms);
        const id = document.getElementById('pi-form-id').value;
        
        const newForm = {
            id: id,
            title: document.getElementById('pi-form-name').value.trim(),
            description: document.getElementById('pi-form-desc').value.trim(),
            url: document.getElementById('pi-form-url').value.trim()
        };

        const existingIdx = targetArray.findIndex(f => f.id === id);
        if (existingIdx > -1) targetArray[existingIdx] = newForm;
        else targetArray.push(newForm);

        safeSave(); 
        formModal.close(); 
        
        // Re-render appropriate view
        if (type === 'emergency') renderPIView('emergency');
        else {
            renderPIView('forms');
            // Auto-switch to the tab we were just editing
            if (type === 'docs') {
                document.querySelector('.pi-form-sub-tab[data-target="docs-list"]').click();
            }
        }
        
        NotificationSystem.show("Saved Successfully", "success");
    });

    document.getElementById('pi-form-del').addEventListener('click', async () => {
        const type = document.getElementById('pi-form-type').value;
        const targetArray = type === 'emergency' ? piData.emergencyDocs : (type === 'docs' ? piData.docs : piData.forms);
        const id = document.getElementById('pi-form-id').value;
        
        if (await DialogSystem.confirm("Delete Record", "Remove this link from the database?")) {
            if (type === 'emergency') piData.emergencyDocs = piData.emergencyDocs.filter(f => f.id !== id);
            else if (type === 'docs') piData.docs = piData.docs.filter(f => f.id !== id);
            else piData.forms = piData.forms.filter(f => f.id !== id);
            
            safeSave(); 
            formModal.close(); 
            
            if (type === 'emergency') renderPIView('emergency');
            else {
                renderPIView('forms');
                if (type === 'docs') {
                    document.querySelector('.pi-form-sub-tab[data-target="docs-list"]').click();
                }
            }
            NotificationSystem.show("Deleted Successfully", "success");
        }
    });

    // --- LINK MODAL LOGIC (Dual-Use for General & Emergency) ---
    const linkModal = document.getElementById('pi-link-modal');
    document.getElementById('close-pi-link').addEventListener('click', () => linkModal.close());

    function openLinkEditor(id, type = 'general') {
        const delBtn = document.getElementById('pi-link-del');
        document.getElementById('pi-link-type').value = type;
        
        const targetArray = type === 'emergency' ? piData.emergencyLinks : piData.links;
        
        if (type === 'emergency') {
            document.getElementById('pi-link-cat-label').classList.add('hidden');
            document.getElementById('pi-link-category').classList.add('hidden');
        } else {
            document.getElementById('pi-link-cat-label').classList.remove('hidden');
            document.getElementById('pi-link-category').classList.remove('hidden');
            let catSelect = document.getElementById('pi-link-category');
            catSelect.innerHTML = '';
            piData.linkCategories.forEach(cat => {
                catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
        }

        if (id) {
            const link = targetArray.find(l => l.id === id);
            document.getElementById('pi-link-title').innerText = type === 'emergency' ? "Edit Emergency Link" : "Edit Link";
            document.getElementById('pi-link-id').value = link.id;
            document.getElementById('pi-link-name').value = link.title;
            document.getElementById('pi-link-url').value = link.url;
            document.getElementById('pi-link-desc').value = link.description || '';
            if (type === 'general') document.getElementById('pi-link-category').value = link.category || 'General';
            delBtn.classList.remove('hidden');
        } else {
            document.getElementById('pi-link-title').innerText = type === 'emergency' ? "Add Emergency Link" : "Add Web Link";
            document.getElementById('pi-link-id').value = 'link_' + Date.now() + Math.random().toString(36).substr(2, 9);
            document.getElementById('pi-link-name').value = '';
            document.getElementById('pi-link-url').value = '';
            document.getElementById('pi-link-desc').value = '';
            delBtn.classList.add('hidden');
        }
        linkModal.showModal();
    }

    document.getElementById('pi-link-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('pi-link-type').value;
        const targetArray = type === 'emergency' ? piData.emergencyLinks : piData.links;
        const id = document.getElementById('pi-link-id').value;
        
        const newLink = {
            id: id,
            title: document.getElementById('pi-link-name').value.trim(),
            url: document.getElementById('pi-link-url').value.trim(),
            description: document.getElementById('pi-link-desc').value.trim(),
            category: type === 'emergency' ? null : document.getElementById('pi-link-category').value
        };

        const existingIdx = targetArray.findIndex(l => l.id === id);
        if (existingIdx > -1) targetArray[existingIdx] = newLink;
        else targetArray.push(newLink);

        safeSave(); linkModal.close(); 
        renderPIView(type === 'emergency' ? 'emergency' : 'links'); 
        NotificationSystem.show("Link Saved", "success");
    });

    document.getElementById('pi-link-del').addEventListener('click', async () => {
        const type = document.getElementById('pi-link-type').value;
        const id = document.getElementById('pi-link-id').value;
        
        if (await DialogSystem.confirm("Delete Link", "Remove this link?")) {
            if (type === 'emergency') piData.emergencyLinks = piData.emergencyLinks.filter(l => l.id !== id);
            else piData.links = piData.links.filter(l => l.id !== id);
            
            safeSave(); linkModal.close(); 
            renderPIView(type === 'emergency' ? 'emergency' : 'links'); 
            NotificationSystem.show("Link Deleted", "success");
        }
    });

    // Boot
    renderPIView('emergency');
}