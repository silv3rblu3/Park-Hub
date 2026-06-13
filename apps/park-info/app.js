// apps/park-info/app.js

function initParkInfoLogic() {
    let piData = StateManager.getAppData('parkInfo');
    
    // Validate Data Structure
    if (!piData.forms) piData.forms = [];
    if (!piData.docs) piData.docs = []; // Added for general park documents
    if (!piData.links) piData.links = [];
    if (!piData.emergencyLinks) piData.emergencyLinks = []; 
    if (!piData.emergencyDocs) piData.emergencyDocs = []; 
    
    // Clean up old HTML placeholder text if present, replace with simple text
    if (!piData.emergencyInfo || piData.emergencyInfo.includes('<h2>')) { 
        piData.emergencyInfo = "Emergency Procedures\n\nPlease enter your park's emergency protocols here. You can update this at any time by clicking the Edit Text button."; 
    }
    
    const safeSave = () => { StateManager.setAppData('parkInfo', piData); };

    // Set up tabs
    const tabs = document.querySelectorAll('.pi-tab');
    const stage = document.getElementById('pi-stage');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
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

    // Native Forms PDF Preview Wrapper
    function openNativeFormPreview(title, blankHtml) {
        const viewerHtml = `
            <html>
            <head>
                <title>Preview: ${title}</title>
                <style>
                    body { font-family: sans-serif; margin: 20px; color: #333; background: #eaeff2; }
                    .no-print { text-align: right; margin-bottom: 20px; background: white; padding: 15px 20px; border-radius: 8px; border: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                    .no-print h3 { margin: 0; color: #2c3e50; font-size: 1.3rem; }
                    .print-btn { padding: 12px 24px; font-size: 16px; background: #2d5a27; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.2s; }
                    .print-btn:hover { background: #1e3d1a; }
                    @media print { .no-print { display: none !important; } body { background: white; margin: 0; } .form-container { box-shadow: none; padding: 0; } }
                    .form-container { max-width: 850px; margin: 0 auto; background: white; padding: 30px; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
                </style>
            </head>
            <body>
                <div class="no-print">
                    <h3>Document Preview</h3>
                    <button class="print-btn" onclick="window.print()">🖨️ Print Form</button>
                </div>
                <div class="form-container">
                    ${blankHtml}
                </div>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        win.document.write(viewerHtml);
        win.document.close();
    }

    function renderPIView(viewName) {
        stage.innerHTML = '';
        
        if (viewName === 'emergency') {
            const displaySafeText = piData.emergencyInfo.replace(/\n/g, '<br>');

            let html = `
            <div class="info-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin:0;">🚨 Emergency Protocols & Standard Operating Procedures (SOP)</h3>
                    <div>
                        <button id="pi-edit-emerg-btn" class="btn-outline">✏️ Edit Text</button>
                        <button id="pi-save-emerg-btn" class="btn-primary hidden">💾 Save Changes</button>
                    </div>
                </div>
                
                <div id="pi-emerg-display" style="padding: 15px; border: 1px solid transparent; border-radius: var(--radius-md); background: rgba(0,0,0,0.02); min-height: 200px;">
                    ${displaySafeText}
                </div>
                <textarea id="pi-emerg-editor" class="app-input hidden" rows="12" style="width: 100%;">${piData.emergencyInfo}</textarea>
                
                <div style="margin-top: 30px; border-top: 2px solid var(--border-color); padding-top: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: var(--danger-color);">📄 Emergency Documents & Forms</h3>
                        <button id="pi-add-emerg-doc-btn" class="btn-outline" style="border-color: var(--danger-color); color: var(--danger-color);">+ Add Document</button>
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
                                <button class="btn-outline pi-edit-form" data-type="emergency" data-id="${d.id}" style="padding: 4px 10px; font-size: 0.8rem; border-color: var(--danger-color); color: var(--danger-color);">✏️ Edit</button>
                                <a href="${d.url}" target="_blank" class="btn-primary" style="padding: 6px 12px; text-decoration: none; display: inline-block; background-color: var(--danger-color);">📄 View / Download</a>
                            </td>
                        </tr>`;
                });
            }
            html += `</tbody></table></div>`;

            html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: var(--danger-color);">🔗 Important Emergency Links</h3>
                        <button id="pi-add-emerg-link-btn" class="btn-outline" style="border-color: var(--danger-color); color: var(--danger-color);">+ Add Emergency Link</button>
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
                                <button class="btn-outline pi-edit-link" data-type="emergency" data-id="${l.id}" style="padding: 2px 8px; font-size: 0.8rem;">✏️ Edit</button>
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

            editBtn.addEventListener('click', () => {
                displayDiv.classList.add('hidden');
                editorTxt.classList.remove('hidden');
                editBtn.classList.add('hidden');
                saveBtn.classList.remove('hidden');
            });

            saveBtn.addEventListener('click', () => {
                piData.emergencyInfo = editorTxt.value;
                safeSave();
                displayDiv.innerHTML = piData.emergencyInfo.replace(/\n/g, '<br>');
                
                editorTxt.classList.add('hidden');
                displayDiv.classList.remove('hidden');
                saveBtn.classList.add('hidden');
                editBtn.classList.remove('hidden');
                NotificationSystem.show("Protocols Saved", "success");
            });

            // Documents Triggers
            document.getElementById('pi-add-emerg-doc-btn').addEventListener('click', () => openFormEditor(null, 'emergency'));

            // Links Triggers
            document.getElementById('pi-add-emerg-link-btn').addEventListener('click', () => openLinkEditor(null, 'emergency'));
            document.querySelectorAll('.pi-edit-link').forEach(btn => btn.addEventListener('click', (e) => openLinkEditor(e.target.getAttribute('data-id'), e.target.getAttribute('data-type'))));
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
                                    <td style="text-align: right;"><button class="btn-primary pi-print-native" data-form="fleet">📄 View / Print</button></td>
                                </tr>
                                <tr style="background: rgba(52, 152, 219, 0.05);">
                                    <td><strong>System: Fall Winterization Checklist</strong></td>
                                    <td>Standard blank checklist for Fall shutdown procedures.</td>
                                    <td style="text-align: right;"><button class="btn-primary pi-print-native" data-form="fall">📄 View / Print</button></td>
                                </tr>
                                <tr style="background: rgba(241, 196, 15, 0.05);">
                                    <td><strong>System: Spring De-Winterization Checklist</strong></td>
                                    <td>Standard blank checklist for Spring startup procedures.</td>
                                    <td style="text-align: right;"><button class="btn-primary pi-print-native" data-form="spring">📄 View / Print</button></td>
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

            // PARK DOCUMENTS SUB-VIEW
            html += `
                <div id="pi-view-docs-list" class="pi-sub-view hidden">
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

            // Sub-Tab Toggling
            document.querySelectorAll('.pi-form-sub-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    document.querySelectorAll('.pi-form-sub-tab').forEach(t => { t.classList.remove('btn-primary'); t.classList.add('btn-outline'); });
                    e.target.classList.remove('btn-outline'); e.target.classList.add('btn-primary');
                    
                    document.querySelectorAll('.pi-sub-view').forEach(v => v.classList.add('hidden'));
                    document.getElementById('pi-view-' + e.target.getAttribute('data-target')).classList.remove('hidden');
                });
            });

            // Generate Blank Native Forms in PDF Preview Wrapper
            document.querySelectorAll('.pi-print-native').forEach(btn => btn.addEventListener('click', (e) => {
                const formType = e.target.getAttribute('data-form');
                let blankHtml = '';
                let title = '';
                
                if (formType === 'fleet') {
                    title = "Monthly Vehicle Inspection";
                    const fleetData = StateManager.getAppData('fleet');
                    if (!fleetData || !fleetData.settings || !fleetData.settings.checklistItems) return NotificationSystem.show("Fleet module not configured.", "error");
                    
                    blankHtml = `<div style="margin-bottom: 20px; font-family: sans-serif;"><h2 style="text-align:center; border-bottom:2px solid #000; padding-bottom: 10px;">Monthly Vehicle Inspection</h2>
                    <div style="display:grid; grid-template-columns:1fr 1fr; margin-bottom:15px; font-size:12px;"><div><strong>Vehicle:</strong> ________________</div><div><strong>Date:</strong> ________________</div><div><strong>Inspector:</strong> ________________</div><div><strong>Odometer:</strong> ________________</div></div>
                    <table style="width:100%; border-collapse:collapse; font-size:12px;"><thead><tr><th style="border:1px solid #000; background:#eee; padding:5px; text-align: left;">Item</th><th style="border:1px solid #000; background:#eee; padding:5px;">Result</th><th style="border:1px solid #000; background:#eee; padding:5px; text-align: left;">Item</th><th style="border:1px solid #000; background:#eee; padding:5px;">Result</th></tr></thead><tbody>`;
                    
                    const cl = fleetData.settings.checklistItems;
                    for(let i=0; i<cl.length; i+=2) {
                        blankHtml += `<tr><td style="border:1px solid #000; padding:8px;">${cl[i]}</td><td style="border:1px solid #000; padding:8px; text-align: center;">Pass / Fail / NA</td>${cl[i+1] ? `<td style="border:1px solid #000; padding:8px;">${cl[i+1]}</td><td style="border:1px solid #000; padding:8px; text-align: center;">Pass / Fail / NA</td>` : `<td></td><td></td>`}</tr>`;
                    }
                    blankHtml += `</tbody></table></div>`;
                } 
                else if (formType === 'fall' || formType === 'spring') {
                    title = formType === 'fall' ? 'Fall Winterization Checklist' : 'Spring De-Winterization Checklist';
                    const wintData = StateManager.getAppData('winterization');
                    if (!wintData || !wintData[formType]) return NotificationSystem.show("Winterization module not configured.", "error");

                    const yearPrefix = 'Year: _______________ ';
                    
                    Object.keys(wintData[formType]).forEach(area => {
                        const seasonData = wintData[formType][area];
                        let areaHtml = `<div style="page-break-after: always; padding: 0; margin: 0; font-family: sans-serif;">`;
                        areaHtml += `<h2 style="margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid black;">${yearPrefix}${formType.toUpperCase()} - ${area}</h2>`;
                        
                        if (seasonData.tools) {
                            areaHtml += `
                                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50; margin-bottom: 20px;">
                                    <h4 style="margin-bottom: 5px; font-family: sans-serif;">🛠️ Tools & Equipment Needed</h4>
                                    <p style="white-space: pre-wrap; font-size: 0.95rem; margin: 0; font-family: sans-serif;">${seasonData.tools}</p>
                                </div>
                            `;
                        }

                        seasonData.sections.forEach(section => {
                            if (section.category === "WARNING") {
                                areaHtml += `<div style="background-color: ${section.isCritical ? '#ffe6e6' : '#fff3cd'}; color: ${section.isCritical ? '#cc0000' : '#000'}; padding: 15px; font-weight: bold; border-left: 5px solid ${section.isCritical ? '#cc0000' : '#000'}; margin-bottom: 20px; border-radius: 4px; font-family: sans-serif;">${section.warningText}</div>`;
                                return; 
                            }

                            areaHtml += `<div style="margin-bottom: 30px;"><h3 style="background-color: #f0f0f0; padding: 8px; border-radius: 4px; margin-bottom: 15px; font-family: sans-serif;">${section.category}</h3><div style="width: 100%; overflow-x: auto;">`;
                            let columnsToRender = section.columns ? section.columns : ["Action"];
                            let tableHtml = `<table style="width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 10px; background: white; font-family: sans-serif;"><thead><tr><th style="padding:8px; border:1px solid black; background:#eee; font-size:0.9rem; text-align: left;">Item</th>`;
                            
                            columnsToRender.forEach((col) => { 
                                tableHtml += `<th style="padding:8px; border:1px solid black; background:#eee; width: 130px; text-align: center; font-size:0.9rem;">${col} (Date)</th>
                                              <th style="padding:8px; border:1px solid black; background:#eee; width: 130px; text-align: center; font-size:0.9rem;">Initials</th>`; 
                            });
                            tableHtml += `</tr></thead><tbody>`;

                            section.tasks.forEach((task) => {
                                tableHtml += `<tr><td style="padding:8px; border:1px solid black; font-size:0.9rem;"><strong>${task.text}</strong></td>`;
                                columnsToRender.forEach(() => {
                                    tableHtml += `<td style="border:1px solid #000; text-align:center; padding:8px;"><div style="width: 90%; min-height: 20px; margin: auto; border-bottom: 1px solid black;"></div></td><td style="border:1px solid #000; text-align:center; padding:8px;"><div style="width: 90%; min-height: 20px; margin: auto; border-bottom: 1px solid black;"></div></td>`;
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
                
                openNativeFormPreview(title, blankHtml);
            }));

            // Custom Forms & Docs Listeners
            document.getElementById('pi-add-form-btn').addEventListener('click', () => openFormEditor(null, 'forms'));
            document.getElementById('pi-add-doc-btn').addEventListener('click', () => openFormEditor(null, 'docs'));
            
            // Attach global edit listener for all generated forms/docs buttons in this view
            document.querySelectorAll('.pi-edit-form').forEach(btn => btn.addEventListener('click', (e) => openFormEditor(e.target.getAttribute('data-id'), e.target.getAttribute('data-type'))));
        }
        else if (viewName === 'links') {
            let html = `
            <div class="info-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">🔗 Important Park Links</h3>
                    <button id="pi-add-link-btn" class="btn-primary">+ Add New Link</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
            `;

            if (piData.links.length === 0) {
                html += `<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No custom links added yet.</div>`;
            } else {
                piData.links.forEach(l => {
                    let vUrl = l.url || '';
                    if (vUrl && !vUrl.startsWith('http')) vUrl = 'https://' + vUrl;
                    
                    html += `
                        <div class="info-link-item">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <a href="${vUrl}" target="_blank" rel="noopener noreferrer" class="info-link-title">${l.title} ↗</a>
                                <button class="btn-outline pi-edit-link" data-type="general" data-id="${l.id}" style="padding: 2px 8px; font-size: 0.8rem;">✏️ Edit</button>
                            </div>
                            <div class="info-link-desc">${l.description || 'No description provided.'}</div>
                        </div>
                    `;
                });
            }
            html += `</div></div>`;
            stage.innerHTML = html;

            document.getElementById('pi-add-link-btn').addEventListener('click', () => openLinkEditor(null, 'general'));
            document.querySelectorAll('.pi-edit-link').forEach(btn => btn.addEventListener('click', (e) => openLinkEditor(e.target.getAttribute('data-id'), 'general')));
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
        
        if (id) {
            const link = targetArray.find(l => l.id === id);
            document.getElementById('pi-link-title').innerText = type === 'emergency' ? "Edit Emergency Link" : "Edit Link";
            document.getElementById('pi-link-id').value = link.id;
            document.getElementById('pi-link-name').value = link.title;
            document.getElementById('pi-link-url').value = link.url;
            document.getElementById('pi-link-desc').value = link.description || '';
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
            description: document.getElementById('pi-link-desc').value.trim()
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