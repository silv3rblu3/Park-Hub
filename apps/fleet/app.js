// apps/fleet/app.js

function initFleetLogic() {
    let fleetData = StateManager.getAppData('fleet');
    
    if (!fleetData.vehicles || fleetData.vehicles.length === 0 || !fleetData.settings) {
        fleetData = JSON.parse(JSON.stringify(StateManager.defaultState.apps.fleet));
        StateManager.setAppData('fleet', fleetData);
    }
    
    const safeSave = () => { StateManager.setAppData('fleet', fleetData); };

    const getToday = () => {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    // --- TARGETED DATA SYNC LISTENERS ---
    const inspFileInput = document.getElementById('fleet-import-insp-file');
    if (inspFileInput) {
        const newInspFile = inspFileInput.cloneNode(true);
        inspFileInput.parentNode.replaceChild(newInspFile, inspFileInput);
        newInspFile.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                const reader = new FileReader();
                reader.onload = async function(evt) {
                    try {
                        const imported = JSON.parse(evt.target.result);
                        if(!Array.isArray(imported)) throw new Error("Invalid format");
                        let newCount = 0;
                        imported.forEach(impLog => {
                            if(!fleetData.inspections.find(i => i.id === impLog.id)) {
                                fleetData.inspections.push(impLog);
                                newCount++;
                            }
                        });
                        safeSave();
                        await DialogSystem.alert("Sync Complete", `Successfully merged ${newCount} new inspection logs.`);
                        if (document.querySelector('.fleet-tab.btn-primary').getAttribute('data-target') === 'inspections') {
                            renderFleetView('inspections');
                        }
                    } catch(err) { NotificationSystem.show("Failed to import. Invalid JSON.", "error"); }
                    e.target.value = '';
                };
                reader.readAsText(e.target.files[0]);
            }
        });
    }

    const srvFileInput = document.getElementById('fleet-import-srv-file');
    if (srvFileInput) {
        const newSrvFile = srvFileInput.cloneNode(true);
        srvFileInput.parentNode.replaceChild(newSrvFile, srvFileInput);
        newSrvFile.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                const reader = new FileReader();
                reader.onload = async function(evt) {
                    try {
                        const imported = JSON.parse(evt.target.result);
                        if(!Array.isArray(imported)) throw new Error("Invalid format");
                        let newCount = 0;
                        imported.forEach(impLog => {
                            if(!fleetData.services.find(s => s.id === impLog.id)) {
                                fleetData.services.push(impLog);
                                newCount++;
                            }
                        });
                        safeSave();
                        await DialogSystem.alert("Sync Complete", `Successfully merged ${newCount} new service logs.`);
                        if (document.querySelector('.fleet-tab.btn-primary').getAttribute('data-target') === 'services') {
                            renderFleetView('services');
                        }
                    } catch(err) { NotificationSystem.show("Failed to import. Invalid JSON.", "error"); }
                    e.target.value = '';
                };
                reader.readAsText(e.target.files[0]);
            }
        });
    }

    const vehFileInput = document.getElementById('fleet-import-veh-file');
    if (vehFileInput) {
        const newVehFile = vehFileInput.cloneNode(true);
        vehFileInput.parentNode.replaceChild(newVehFile, vehFileInput);
        newVehFile.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                const reader = new FileReader();
                reader.onload = async function(evt) {
                    try {
                        const imported = JSON.parse(evt.target.result);
                        if(!Array.isArray(imported)) throw new Error("Invalid format");
                        let added = 0;
                        let updated = 0;
                        imported.forEach(impVeh => {
                            const existingIdx = fleetData.vehicles.findIndex(v => v.id === impVeh.id);
                            if(existingIdx >= 0) {
                                fleetData.vehicles[existingIdx] = impVeh;
                                updated++;
                            } else {
                                fleetData.vehicles.push(impVeh);
                                added++;
                            }
                        });
                        safeSave();
                        await DialogSystem.alert("Sync Complete", `Vehicles updated: ${updated}. New vehicles added: ${added}.`);
                        if (document.querySelector('.fleet-tab.btn-primary').getAttribute('data-target') === 'vehicle-info') {
                            renderFleetView('vehicle-info');
                        }
                    } catch(err) { NotificationSystem.show("Failed to import. Invalid JSON.", "error"); }
                    e.target.value = '';
                };
                reader.readAsText(e.target.files[0]);
            }
        });
    }

    const tabs = document.querySelectorAll('.fleet-tab');
    const stage = document.getElementById('fleet-stage');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => { t.classList.remove('btn-primary'); t.classList.add('btn-outline'); });
            e.target.classList.remove('btn-outline'); e.target.classList.add('btn-primary');
            renderFleetView(e.target.getAttribute('data-target'));
        });
    });

    function updateServiceDatalist(vId) {
        let options = new Set(fleetData.settings.checklistItems);
        if (vId) {
            const v = fleetData.vehicles.find(x => x.id === vId);
            if (v && v.schedule) v.schedule.forEach(t => options.add(t.task));
        }
        const fsList = document.getElementById('fs-list');
        if (fsList) fsList.innerHTML = Array.from(options).map(t => `<option value="${t}">`).join('');
    }

    function renderFleetView(viewName) {
        stage.innerHTML = '';
        
        if (viewName === 'overview') {
            let html = `<h3>Fleet Overview</h3>
                        <div class="app-table-container" style="margin-top: 15px;">
                            <table class="app-table">
                                <thead><tr><th>Vehicle</th><th>Status</th><th>Odo/Hrs</th><th>Last Service</th><th>Next Due</th><th>Days Till Insp.</th><th>Life Cost</th></tr></thead>
                                <tbody>`;
            fleetData.vehicles.forEach(v => {
                let currentOdo = 0; let totalCost = 0;
                const vSrv = fleetData.services.filter(s => s.vehicleId === v.id);
                vSrv.forEach(s => { if (Number(s.odo) > currentOdo) currentOdo = Number(s.odo); totalCost += Number(s.cost); });
                const vInsp = fleetData.inspections.filter(i => i.vehicleId === v.id);
                vInsp.forEach(i => { if (Number(i.odo) > currentOdo) currentOdo = Number(i.odo); });
                vSrv.sort((a,b) => new Date(b.date) - new Date(a.date));
                const lastSrvTxt = vSrv.length > 0 ? `${vSrv[0].task} (${vSrv[0].date})` : "None";

                let nextTask = "N/A"; let lowestRem = Infinity;
                v.schedule.forEach(t => {
                    const intNum = Number(t.interval.toString().replace(/,/g, ''));
                    if (!t.interval || isNaN(intNum) || intNum === 0) return;
                    const past = vSrv.filter(s => s.task === t.task).sort((a,b) => new Date(b.date) - new Date(a.date));
                    let rem = past.length > 0 ? (Number(past[0].odo) + intNum) - currentOdo : intNum - currentOdo;
                    if (rem < lowestRem) { lowestRem = rem; const u = t.unit.toLowerCase() === 'hours' ? 'hrs' : 'mi'; nextTask = `${t.task} (${rem < 0 ? 'OVERDUE' : 'in '+rem} ${u})`; }
                });

                let dTill = "No Data"; let stat = '<span style="color:var(--accent-primary); font-weight:bold;">Operational</span>';
                if(vInsp.length > 0) {
                    vInsp.sort((a,b) => new Date(b.date) - new Date(a.date)); const lastI = vInsp[0];
                    let fails = false;
                    if (lastI.needsWork && lastI.results) {
                        for (const [item, res] of Object.entries(lastI.results)) {
                            if (res === 'Fail' && !vSrv.some(s => s.task === item && new Date(s.date) >= new Date(lastI.date))) fails = true;
                        }
                    }
                    if(fails) stat = `<button class="btn-danger rep-trig" data-v="${v.id}" style="padding:2px 5px; font-size:0.8rem;">Needs Repair</button>`;
                    
                    const dDiff = Math.ceil((new Date(lastI.date).getTime() + 30*24*60*60*1000 - new Date()) / (1000*60*60*24));
                    dTill = dDiff < 0 ? `<span style="color:var(--danger-color); font-weight:bold;">Overdue (${Math.abs(dDiff)})</span>` : dDiff;
                    if (dDiff < 0 && !fails) stat = `<button class="btn-outline insp-trig" data-v="${v.id}" style="padding:2px 5px; font-size:0.8rem;">Needs Insp.</button>`;
                } else stat = `<button class="btn-outline insp-trig" data-v="${v.id}" style="padding:2px 5px; font-size:0.8rem;">Needs Insp.</button>`;

                if (lowestRem < 0 && stat.includes("Operational")) stat = '<span style="color:#f39c12; font-weight:bold;">Service Due</span>';
                html += `<tr><td><strong>${v.id}</strong><br><small style="color:var(--text-secondary);">${v.desc}</small></td><td>${stat}</td><td>${currentOdo}</td><td>${lastSrvTxt}</td><td>${nextTask}</td><td>${dTill}</td><td>$${totalCost.toFixed(2)}</td></tr>`;
            });
            html += `</tbody></table></div>`;
            stage.innerHTML = html;

            document.querySelectorAll('.rep-trig').forEach(b => b.addEventListener('click', (e) => showRepairs(e.target.getAttribute('data-v'))));
            document.querySelectorAll('.insp-trig').forEach(b => b.addEventListener('click', (e) => triggerFormTab('inspections', e.target.getAttribute('data-v'))));
        }
        else if (viewName === 'inspections') {
            let html = `
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; flex-wrap: wrap; gap: 10px;">
                    <h3>Monthly Inspections</h3>
                    <div style="display: flex; gap: 10px;">
                        <button id="flt-sync-insp-exp" class="btn-outline" title="Export Logs to JSON">⬇️ Sync Out</button>
                        <button id="flt-sync-insp-imp" class="btn-outline" title="Merge Logs from JSON">⬆️ Sync In</button>
                        <button id="flt-new-insp" class="btn-primary">+ New Inspection</button>
                        <button id="flt-print-rep" class="btn-outline">🖨️ Print Reports</button>
                    </div>
                </div>
                <div id="flt-insp-form-cont" class="app-card hidden" style="border:1px solid var(--accent-primary);">
                    <form id="flt-insp-form">
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:10px; margin-bottom:15px;">
                            <select id="fi-v" class="app-select" required><option value="">Select Vehicle</option>${fleetData.vehicles.map(v=>`<option value="${v.id}">${v.id}</option>`).join('')}</select>
                            <input type="date" id="fi-d" class="app-input" required>
                            <input type="text" id="fi-i" class="app-input" placeholder="Inspector" required>
                            <input type="number" id="fi-o" class="app-input" placeholder="Odometer" required>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:10px;" id="fi-grid">
                            ${fleetData.settings.checklistItems.map((item, idx) => `
                                <div style="background:rgba(0,0,0,0.03); padding:8px; border-radius:4px; border:1px solid var(--border-color);">
                                    <strong style="display:block; margin-bottom:5px; font-size:0.9rem;">${item}</strong>
                                    <label style="cursor:pointer; margin-right: 5px;"><input type="radio" name="f_chk_${idx}" value="Pass" checked> Pass</label>
                                    <label style="cursor:pointer; margin-right: 5px;"><input type="radio" name="f_chk_${idx}" value="Fail"> Fail</label>
                                    <label style="cursor:pointer;"><input type="radio" name="f_chk_${idx}" value="N/A"> N/A</label>
                                </div>
                            `).join('')}
                        </div>
                        <button type="submit" class="btn-primary" style="margin-top:15px; width:100%;">Save Inspection</button>
                    </form>
                </div>
                <div class="app-table-container">
                    <table class="app-table">
                        <thead><tr><th>Date</th><th>Vehicle</th><th>Inspector</th><th>Odo</th><th>Result</th><th>Action</th></tr></thead>
                        <tbody>
                            ${[...fleetData.inspections].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(i => `
                                <tr><td>${i.date}</td><td>${i.vehicleId}</td><td>${i.inspector}</td><td>${i.odo}</td>
                                <td>${i.needsWork ? '<strong style="color:var(--danger-color);">Failed Items</strong>' : '<strong style="color:var(--accent-primary);">Passed</strong>'}</td>
                                <td><button class="btn-danger del-i" data-id="${i.id}" style="padding:2px 6px;">X</button></td></tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
            stage.innerHTML = html;

            document.getElementById('flt-new-insp').addEventListener('click', () => { 
                document.getElementById('flt-insp-form-cont').classList.toggle('hidden');
                document.getElementById('fi-d').value = getToday();
            });
            document.getElementById('flt-print-rep').addEventListener('click', () => { populatePrintModal(); document.getElementById('fleet-print-modal').showModal(); });
            
            document.getElementById('flt-sync-insp-exp').addEventListener('click', () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fleetData.inspections, null, 2));
                const anchor = document.createElement('a'); anchor.setAttribute("href", dataStr);
                anchor.setAttribute("download", `Fleet_Inspections_Sync_${getToday()}.json`);
                document.body.appendChild(anchor); anchor.click(); anchor.remove();
                NotificationSystem.show("Inspection Logs Exported", "success");
            });
            document.getElementById('flt-sync-insp-imp').addEventListener('click', () => {
                document.getElementById('fleet-import-insp-file').click();
            });

            document.getElementById('flt-insp-form').addEventListener('submit', (e) => {
                e.preventDefault();
                let res = {}; let fails = false;
                fleetData.settings.checklistItems.forEach((item, idx) => {
                    let val = document.querySelector(`input[name="f_chk_${idx}"]:checked`).value;
                    res[item] = val; if(val === 'Fail') fails = true;
                });
                fleetData.inspections.push({ id: crypto.randomUUID(), vehicleId: document.getElementById('fi-v').value, date: document.getElementById('fi-d').value, inspector: document.getElementById('fi-i').value, odo: document.getElementById('fi-o').value, needsWork: fails, results: res });
                safeSave(); NotificationSystem.show('Inspection Saved', 'success'); renderFleetView('inspections');
            });
            document.querySelectorAll('.del-i').forEach(b => b.addEventListener('click', async (e) => { 
                if (await DialogSystem.confirm("Delete Record", "Delete this inspection record permanently?")) {
                    fleetData.inspections = fleetData.inspections.filter(x => x.id !== e.target.getAttribute('data-id')); safeSave(); renderFleetView('inspections'); 
                }
            }));
        }
        else if (viewName === 'services') {
            let html = `
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; flex-wrap: wrap; gap: 10px;">
                    <h3>Services Done</h3>
                    <div style="display: flex; gap: 10px;">
                        <button id="flt-sync-srv-exp" class="btn-outline" title="Export Logs to JSON">⬇️ Sync Out</button>
                        <button id="flt-sync-srv-imp" class="btn-outline" title="Merge Logs from JSON">⬆️ Sync In</button>
                        <button id="flt-new-srv" class="btn-primary">+ Log Service</button>
                    </div>
                </div>
                <div id="flt-srv-form-cont" class="app-card hidden" style="border:1px solid var(--accent-primary);">
                    <form id="flt-srv-form">
                        <select id="fs-v" class="app-select" required><option value="">Select Vehicle</option>${fleetData.vehicles.map(v=>`<option value="${v.id}">${v.id}</option>`).join('')}</select>
                        <input type="date" id="fs-d" class="app-input" required>
                        <input type="text" id="fs-t" class="app-input" placeholder="Task Performed (Type or select...)" required list="fs-list" autocomplete="off">
                        <datalist id="fs-list"></datalist>
                        <input type="number" id="fs-o" class="app-input" placeholder="Odometer" required>
                        <input type="number" step="0.01" id="fs-c" class="app-input" placeholder="Cost $" required>
                        <button type="submit" class="btn-primary" style="margin-top:10px; width:100%;">Save Service</button>
                    </form>
                </div>
                <div class="app-table-container">
                    <table class="app-table">
                        <thead><tr><th>Date</th><th>Vehicle</th><th>Task</th><th>Odo</th><th>Cost</th><th>Action</th></tr></thead>
                        <tbody>${[...fleetData.services].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s => `<tr><td>${s.date}</td><td>${s.vehicleId}</td><td>${s.task}</td><td>${s.odo}</td><td>$${parseFloat(s.cost).toFixed(2)}</td><td><button class="btn-danger del-s" data-id="${s.id}" style="padding:2px 6px;">X</button></td></tr>`).join('')}</tbody>
                    </table>
                </div>`;
            stage.innerHTML = html;
            
            updateServiceDatalist(''); 

            document.getElementById('flt-new-srv').addEventListener('click', () => {
                document.getElementById('flt-srv-form-cont').classList.toggle('hidden');
                document.getElementById('fs-d').value = getToday();
                updateServiceDatalist(document.getElementById('fs-v').value);
            });
            
            document.getElementById('flt-sync-srv-exp').addEventListener('click', () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fleetData.services, null, 2));
                const anchor = document.createElement('a'); anchor.setAttribute("href", dataStr);
                anchor.setAttribute("download", `Fleet_Services_Sync_${getToday()}.json`);
                document.body.appendChild(anchor); anchor.click(); anchor.remove();
                NotificationSystem.show("Service Logs Exported", "success");
            });
            document.getElementById('flt-sync-srv-imp').addEventListener('click', () => {
                document.getElementById('fleet-import-srv-file').click();
            });

            document.getElementById('fs-v').addEventListener('change', (e) => {
                updateServiceDatalist(e.target.value);
            });
            document.getElementById('flt-srv-form').addEventListener('submit', (e) => {
                e.preventDefault();
                fleetData.services.push({ id: crypto.randomUUID(), vehicleId: document.getElementById('fs-v').value, date: document.getElementById('fs-d').value, task: document.getElementById('fs-t').value, odo: document.getElementById('fs-o').value, cost: document.getElementById('fs-c').value });
                safeSave(); NotificationSystem.show('Service Logged', 'success'); renderFleetView('services');
            });
            document.querySelectorAll('.del-s').forEach(b => b.addEventListener('click', async (e) => { 
                if(await DialogSystem.confirm("Delete Service", "Delete this service record?")) {
                    fleetData.services = fleetData.services.filter(x => x.id !== e.target.getAttribute('data-id')); safeSave(); renderFleetView('services'); 
                }
            }));
        }
        else if (viewName === 'vehicle-info') {
            let html = `
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; flex-wrap: wrap; gap: 10px;">
                    <h3>Vehicle Information</h3>
                    <div style="display: flex; gap: 10px;">
                        <button id="flt-sync-veh-exp" class="btn-outline" title="Export Vehicles to JSON">⬇️ Sync Out</button>
                        <button id="flt-sync-veh-imp" class="btn-outline" title="Merge Vehicles from JSON">⬆️ Sync In</button>
                        <button id="add-new-veh-btn" class="btn-primary">+ Add Vehicle</button>
                    </div>
                </div>`;
            fleetData.vehicles.forEach(v => {
                html += `<div class="app-table-container" style="margin-top:15px;"><div style="padding:10px; background:var(--accent-primary); color:white; display:flex; justify-content:space-between; align-items: center;"><strong>${v.id} | ${v.desc}</strong> <button class="btn-outline edit-veh-trigger" data-v="${v.id}" style="color: white; border-color: white; padding: 4px 10px; font-size: 0.8rem;">Edit Vehicle</button></div>
                <table class="app-table"><thead><tr><th>Task</th><th>Interval</th><th>Time</th><th>Info</th></tr></thead><tbody>${v.schedule.map(t => `<tr><td>${t.task}</td><td>${t.interval} ${t.unit}</td><td>${t.timeInterval}</td><td>${t.info || ''}</td></tr>`).join('')}</tbody></table></div>`;
            });
            stage.innerHTML = html;

            document.getElementById('add-new-veh-btn').addEventListener('click', () => openVehicleEditor(null));
            document.querySelectorAll('.edit-veh-trigger').forEach(b => b.addEventListener('click', (e) => openVehicleEditor(e.target.getAttribute('data-v'))));
            
            // Sync Event Listeners
            document.getElementById('flt-sync-veh-exp').addEventListener('click', () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fleetData.vehicles, null, 2));
                const anchor = document.createElement('a'); anchor.setAttribute("href", dataStr);
                anchor.setAttribute("download", `Fleet_Vehicles_Sync_${getToday()}.json`);
                document.body.appendChild(anchor); anchor.click(); anchor.remove();
                NotificationSystem.show("Vehicles Exported", "success");
            });
            document.getElementById('flt-sync-veh-imp').addEventListener('click', () => {
                document.getElementById('fleet-import-veh-file').click();
            });
        }
        else if (viewName === 'settings') {
            stage.innerHTML = `<h3>Checklist Config</h3><p>Edit items appearing on the Monthly Inspection Form.</p>
            <textarea id="flt-check-edit" class="app-input" rows="15">${fleetData.settings.checklistItems.join('\n')}</textarea>
            <button id="flt-save-check" class="btn-primary">Save Config</button>`;
            document.getElementById('flt-save-check').addEventListener('click', () => {
                fleetData.settings.checklistItems = document.getElementById('flt-check-edit').value.split('\n').map(s=>s.trim()).filter(s=>s!=='');
                safeSave(); NotificationSystem.show('Checklist Updated', 'success');
            });
        }
    }

    // --- Vehicle Editor Modal Logic ---
    const editVehModal = document.getElementById('fleet-edit-veh-modal');
    let tempSchedule = [];

    function renderScheduleEditor() {
        const cont = document.getElementById('edit-v-schedule-container');
        cont.innerHTML = tempSchedule.map((t, idx) => `
            <div style="display:flex; gap:5px; margin-bottom:5px; background: rgba(0,0,0,0.03); padding: 5px; border-radius: 4px; align-items: center;">
                <input type="text" class="app-input s-task" value="${t.task}" placeholder="Task Name" data-idx="${idx}" style="margin:0; flex: 2;">
                <input type="number" class="app-input s-int" value="${t.interval}" placeholder="e.g. 5000" data-idx="${idx}" style="margin:0; flex: 1;">
                <select class="app-select s-unit" data-idx="${idx}" style="margin:0; flex: 1; padding: 10px;">
                    <option value="Miles" ${t.unit === 'Miles' ? 'selected' : ''}>Miles</option>
                    <option value="Hours" ${t.unit === 'Hours' ? 'selected' : ''}>Hours</option>
                </select>
                <input type="text" class="app-input s-time" value="${t.timeInterval}" placeholder="Time limit" data-idx="${idx}" style="margin:0; flex: 1;">
                <input type="text" class="app-input s-info" value="${t.info || ''}" placeholder="Info/Notes" data-idx="${idx}" style="margin:0; flex: 1.5;">
                <button type="button" class="btn-danger rem-task-btn" data-idx="${idx}" style="padding: 10px;">X</button>
            </div>
        `).join('');

        document.querySelectorAll('.s-task').forEach(inp => inp.addEventListener('input', (e) => tempSchedule[e.target.getAttribute('data-idx')].task = e.target.value));
        document.querySelectorAll('.s-int').forEach(inp => inp.addEventListener('input', (e) => tempSchedule[e.target.getAttribute('data-idx')].interval = e.target.value));
        document.querySelectorAll('.s-unit').forEach(sel => sel.addEventListener('change', (e) => tempSchedule[e.target.getAttribute('data-idx')].unit = e.target.value));
        document.querySelectorAll('.s-time').forEach(inp => inp.addEventListener('input', (e) => tempSchedule[e.target.getAttribute('data-idx')].timeInterval = e.target.value));
        document.querySelectorAll('.s-info').forEach(inp => inp.addEventListener('input', (e) => tempSchedule[e.target.getAttribute('data-idx')].info = e.target.value));
        document.querySelectorAll('.rem-task-btn').forEach(b => b.addEventListener('click', (e) => { tempSchedule.splice(e.target.getAttribute('data-idx'), 1); renderScheduleEditor(); }));
    }

    function openVehicleEditor(vId) {
        document.getElementById('edit-v-original-id').value = vId || '';
        document.getElementById('edit-v-delete-btn').classList.toggle('hidden', !vId);
        if (vId) {
            const v = fleetData.vehicles.find(x => x.id === vId);
            document.getElementById('edit-v-id').value = v.id;
            document.getElementById('edit-v-desc').value = v.desc;
            tempSchedule = JSON.parse(JSON.stringify(v.schedule || []));
        } else {
            document.getElementById('edit-v-id').value = '';
            document.getElementById('edit-v-desc').value = '';
            tempSchedule = [];
        }
        renderScheduleEditor();
        editVehModal.showModal();
    }

    document.getElementById('close-edit-veh-modal').addEventListener('click', () => editVehModal.close());
    document.getElementById('edit-v-add-task-btn').addEventListener('click', () => { tempSchedule.push({task: '', interval: '', unit: 'Miles', timeInterval: '', info: ''}); renderScheduleEditor(); });
    
    document.getElementById('fleet-edit-veh-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const origId = document.getElementById('edit-v-original-id').value;
        const newId = document.getElementById('edit-v-id').value.toUpperCase();
        const newDesc = document.getElementById('edit-v-desc').value;

        if(origId && origId !== newId) {
            const v = fleetData.vehicles.find(x => x.id === origId);
            v.id = newId; v.desc = newDesc; v.schedule = tempSchedule;
            fleetData.inspections.forEach(i => { if(i.vehicleId === origId) i.vehicleId = newId; });
            fleetData.services.forEach(s => { if(s.vehicleId === origId) s.vehicleId = newId; });
        } else if (origId) {
            const v = fleetData.vehicles.find(x => x.id === origId);
            v.desc = newDesc; v.schedule = tempSchedule;
        } else {
            if(fleetData.vehicles.find(x => x.id === newId)) return NotificationSystem.show("ID already exists", "error");
            fleetData.vehicles.push({ id: newId, desc: newDesc, schedule: tempSchedule });
        }
        safeSave(); editVehModal.close(); NotificationSystem.show("Vehicle Saved", "success"); renderFleetView('vehicle-info');
    });

    document.getElementById('edit-v-delete-btn').addEventListener('click', async () => {
        if(await DialogSystem.confirm("Delete Vehicle", "Delete this vehicle? Historical service logs will remain but orphaned.")) {
            const origId = document.getElementById('edit-v-original-id').value;
            fleetData.vehicles = fleetData.vehicles.filter(x => x.id !== origId);
            safeSave(); editVehModal.close(); NotificationSystem.show("Vehicle Deleted", "success"); renderFleetView('vehicle-info');
        }
    });

    // --- Repair Modal & Form Triggers ---
    const repModal = document.getElementById('fleet-repair-modal');
    document.getElementById('close-repair-modal').addEventListener('click', () => repModal.close());

    function showRepairs(vId) {
        const vInsp = fleetData.inspections.filter(i => i.vehicleId === vId).sort((a,b) => new Date(b.date) - new Date(a.date));
        if (vInsp.length === 0) return;
        const lastI = vInsp[0]; const fails = [];
        if(lastI.results) { for (const [item, res] of Object.entries(lastI.results)) { if (res === 'Fail' && !fleetData.services.some(s => s.vehicleId === vId && s.task === item && new Date(s.date) >= new Date(lastI.date))) fails.push(item); } }
        
        const list = document.getElementById('fleet-repair-list');
        list.innerHTML = fails.length === 0 ? '<p>All fixed!</p>' : fails.map(f => `<div class="btn-danger log-rep" data-v="${vId}" data-t="${f}" style="text-align:left; padding: 10px; cursor: pointer; border-radius: 4px; margin-bottom: 5px;">⚠️ ${f} - Log Repair ➔</div>`).join('');
        repModal.showModal();

        document.querySelectorAll('.log-rep').forEach(b => b.addEventListener('click', (e) => {
            repModal.close(); triggerFormTab('services', e.target.getAttribute('data-v'), e.target.getAttribute('data-t'));
        }));
    }

    function triggerFormTab(tab, vId, task = '') {
        document.querySelector(`.fleet-tab[data-target="${tab}"]`).click();
        setTimeout(() => {
            if(tab === 'inspections') { 
                document.getElementById('flt-insp-form-cont').classList.remove('hidden'); 
                document.getElementById('fi-v').value = vId; 
                document.getElementById('fi-d').value = getToday();
            }
            if(tab === 'services') { 
                document.getElementById('flt-srv-form-cont').classList.remove('hidden'); 
                document.getElementById('fs-v').value = vId; 
                updateServiceDatalist(vId);
                document.getElementById('fs-t').value = task; 
                document.getElementById('fs-d').value = getToday();
            }
        }, 50);
    }

    // --- Print Logic ---
    const printModal = document.getElementById('fleet-print-modal');
    document.getElementById('close-print-modal').addEventListener('click', () => printModal.close());
    
    document.getElementById('fleet-print-mode').addEventListener('change', (e) => {
        document.getElementById('fleet-print-single-wrapper').classList.add('hidden'); 
        document.getElementById('fleet-print-custom-wrapper').classList.add('hidden');
        if(e.target.value === 'single') document.getElementById('fleet-print-single-wrapper').classList.remove('hidden');
        if(e.target.value === 'custom') document.getElementById('fleet-print-custom-wrapper').classList.remove('hidden');
    });

    // Disables the dropdown menu when "Blank Form" is checked
    document.getElementById('fleet-print-blank').addEventListener('change', (e) => {
        const modeSelect = document.getElementById('fleet-print-mode');
        if (e.target.checked) {
            modeSelect.disabled = true;
            document.getElementById('fleet-print-single-wrapper').classList.add('hidden');
            document.getElementById('fleet-print-custom-wrapper').classList.add('hidden');
        } else {
            modeSelect.disabled = false;
            modeSelect.dispatchEvent(new Event('change'));
        }
    });

    function populatePrintModal() {
        document.getElementById('fleet-print-single-select').innerHTML = fleetData.vehicles.map(v => `<option value="${v.id}">${v.id}</option>`).join('');
        document.getElementById('fleet-print-custom-wrapper').innerHTML = fleetData.vehicles.map(v => `<label style="display:block;"><input type="checkbox" class="pc-chk" value="${v.id}"> ${v.id}</label>`).join('');
        document.getElementById('fleet-print-blank').checked = false;
        document.getElementById('fleet-print-mode').disabled = false;
        document.getElementById('fleet-print-mode').value = 'all';
        document.getElementById('fleet-print-mode').dispatchEvent(new Event('change'));
    }

    document.getElementById('fleet-execute-print').addEventListener('click', () => {
        const mode = document.getElementById('fleet-print-mode').value;
        const printBlank = document.getElementById('fleet-print-blank').checked;
        let printHtml = '';

        if (printBlank) {
            // Generate EXACTLY ONE truly blank form
            let blankHtml = `<div style="page-break-after:always; margin-bottom: 20px;"><h2 style="text-align:center; border-bottom:2px solid #000; padding-bottom: 10px;">Monthly Vehicle Inspection</h2>
            <div style="display:grid; grid-template-columns:1fr 1fr; margin-bottom:15px; font-size:12px;"><div><strong>Vehicle:</strong> ________________</div><div><strong>Date:</strong> ________________</div><div><strong>Inspector:</strong> ________________</div><div><strong>Odometer:</strong> ________________</div></div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;"><thead><tr><th style="border:1px solid #000; background:#eee; padding:5px;">Item</th><th style="border:1px solid #000; background:#eee; padding:5px;">Result</th><th style="border:1px solid #000; background:#eee; padding:5px;">Item</th><th style="border:1px solid #000; background:#eee; padding:5px;">Result</th></tr></thead><tbody>`;
            
            const cl = fleetData.settings.checklistItems;
            for(let i=0; i<cl.length; i+=2) {
                blankHtml += `<tr><td style="border:1px solid #000; padding:8px;">${cl[i]}</td><td style="border:1px solid #000; padding:8px;">Pass / Fail / NA</td>${cl[i+1] ? `<td style="border:1px solid #000; padding:8px;">${cl[i+1]}</td><td style="border:1px solid #000; padding:8px;">Pass / Fail / NA</td>` : `<td></td><td></td>`}</tr>`;
            }
            blankHtml += `</tbody></table></div>`;
            printHtml += blankHtml;
        } else {
            let sels = [];
            if(mode === 'all') sels = fleetData.vehicles.map(v=>v.id);
            else if(mode === 'single') sels = [document.getElementById('fleet-print-single-select').value];
            else document.querySelectorAll('.pc-chk:checked').forEach(c => sels.push(c.value));

            if(sels.length === 0) return NotificationSystem.show("No vehicles selected", "error");

            sels.forEach(vId => {
                const vData = fleetData.vehicles.find(v => v.id === vId);
                const insp = fleetData.inspections.filter(i => i.vehicleId === vId).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
                if(!insp) return;
                
                let rowHtml = '';
                if(insp.results) {
                    const arr = Object.entries(insp.results);
                    for(let i=0; i<arr.length; i+=2) {
                        const i1 = arr[i]; const i2 = arr[i+1];
                        rowHtml += `<tr><td style="border:1px solid #000; padding:5px;">${i1[0]}</td><td style="border:1px solid #000; padding:5px; font-weight:bold;">${i1[1]}</td>${i2 ? `<td style="border:1px solid #000; padding:5px;">${i2[0]}</td><td style="border:1px solid #000; padding:5px; font-weight:bold;">${i2[1]}</td>` : `<td></td><td></td>`}</tr>`;
                    }
                }

                printHtml += `<div style="page-break-after:always; margin-bottom: 20px;"><h2 style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px;">Monthly Vehicle Inspection</h2>
                <div style="display:grid; grid-template-columns:1fr 1fr; margin-bottom:15px; font-size:12px;"><div><strong>Vehicle:</strong> ${vId} (${vData?vData.desc:''})</div><div><strong>Date:</strong> ${insp.date}</div><div><strong>Inspector:</strong> ${insp.inspector}</div><div><strong>Odometer:</strong> ${insp.odo}</div></div>
                <table style="width:100%; border-collapse:collapse; font-size:12px;"><thead><tr><th style="border:1px solid #000; background:#eee; padding:5px;">Item</th><th style="border:1px solid #000; background:#eee; padding:5px;">Result</th><th style="border:1px solid #000; background:#eee; padding:5px;">Item</th><th style="border:1px solid #000; background:#eee; padding:5px;">Result</th></tr></thead><tbody>${rowHtml}</tbody></table></div>`;
            });
        }

        if(!printHtml) return NotificationSystem.show("No records found to print", "error");
        
        const win = window.open('', '', 'width=800,height=600');
        win.document.write(`<html><head><title>Print Report</title></head><body>${printHtml}</body></html>`);
        win.document.close(); win.print(); printModal.close();
    });

    renderFleetView('overview');
}