// apps/roster/app.js

window.rosterViewStart = new Date();
window.rosterViewStart.setHours(0, 0, 0, 0);
window.rosterViewStart.setDate(window.rosterViewStart.getDate() - 1); 

window.rosterViewEnd = new Date(window.rosterViewStart);
window.rosterViewEnd.setDate(window.rosterViewEnd.getDate() + 6); 

window.dpViewMonth = new Date();
window.dpViewMonth.setDate(1); 
window.dpTempStart = null;
window.dpTempEnd = null;

function initRosterLogic() {
    let state = StateManager.loadGlobalState();
    
    if (!state.apps.roster || typeof state.apps.roster !== 'object' || Array.isArray(state.apps.roster)) {
        state.apps.roster = {};
    }

    if (!state.apps.roster.active) {
        state.apps.roster.active = [];
    }

    if (!state.apps.roster.history) {
        state.apps.roster.history = [];
    }

    if (!state.apps.roster.archive) {
        state.apps.roster.archive = [];
    }

    if (!state.apps.roster.siteConfig) {
        state.apps.roster.siteConfig = {};
    }

    if (!state.apps.roster.lastPurge) {
        state.apps.roster.lastPurge = Date.now();
    }

    const patchUID = (arr) => {
        arr.forEach(c => {
            const cleanSite = c.site ? c.site.replace(/\s/g, '') : 'UnknownSite';
            const cleanDates = c.dates ? c.dates.replace(/\s/g, '') : 'UnknownDates';
            
            if (!c.uid || !c.uid.includes(cleanSite)) {
                c.uid = c.id + '-' + cleanSite + '-' + cleanDates;
            }

            if (c.extraVehicles === undefined) {
                c.extraVehicles = 0;
            }

            if (c.atvCount === undefined) {
                c.atvCount = 0;
            }
        });
    };

    patchUID(state.apps.roster.active);
    patchUID(state.apps.roster.history);
    patchUID(state.apps.roster.archive);

    StateManager.saveGlobalState(state);

    runLifecycleManager();
    processSyncManifest();
    populateLoopFilter();
    bindRosterEvents();
    renderRosterCalendar();
}

function runLifecycleManager() {
    let state = StateManager.loadGlobalState();
    let roster = state.apps.roster;
    const now = new Date();
    now.setHours(0,0,0,0);

    for (let i = roster.active.length - 1; i >= 0; i--) {
        const camper = roster.active[i];
        
        if (camper.status === 'Departed' || camper.status === 'Closed') {
            
            if (camper.status === 'Closed') {
                const parsed = parseRosterDates(camper.dates);
                if (now.getTime() <= parsed.end.getTime()) {
                    continue; 
                }
            }

            if (camper.isArchived) {
                roster.archive.push(camper);
            } else {
                camper.historyDate = new Date().getTime();
                roster.history.push(camper);
            }

            roster.active.splice(i, 1);
        }
    }

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const purgeThreshold = new Date().getTime() - thirtyDaysMs;
    
    roster.history = roster.history.filter(c => {
        return c.historyDate > purgeThreshold;
    });

    StateManager.saveGlobalState(state);
}

function processSyncManifest() {
    let state = StateManager.loadGlobalState();
    
    if (!state.apps.roster.manifest) {
        return; 
    }

    const incomingData = state.apps.roster.manifest;
    let roster = state.apps.roster;

    // --- META SITE IMPORTER ---
    if (state.apps.roster.manifestMeta && state.apps.roster.manifestMeta.sites) {
        state.apps.roster.manifestMeta.sites.forEach(s => {
            if (!roster.siteConfig[s.site]) {
                roster.siteConfig[s.site] = { 
                    loop: 'Unassigned', length: '', amps: 'None', water: false, sewer: false, 
                    isADA: s.isADA, isHost: s.isHost 
                };
            } else {
                if (s.isADA) roster.siteConfig[s.site].isADA = true;
                if (s.isHost) roster.siteConfig[s.site].isHost = true;
            }
        });
    }

    // --- BULLETPROOF AUTO-PURGE RECONCILIATION ENGINE ---
    let syncMinTime = null;
    let syncMaxTime = null;

    if (state.apps.roster.manifestMeta) {
        const meta = state.apps.roster.manifestMeta;
        
        if (meta.viewStart && meta.viewEnd) {
            const parsedStart = parseRosterDates(meta.viewStart);
            const parsedEnd = parseRosterDates(meta.viewEnd);
            
            if (parsedStart.start.getTime() > 0 && parsedEnd.start.getTime() > 0) {
                syncMinTime = parsedStart.start.getTime();
                syncMaxTime = parsedEnd.start.getTime() + (24 * 60 * 60 * 1000);
            }
        }
    }

    const updateCamperDates = (camper, startObj, endObj) => {
        const formatStr = (d) => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
        let newEnd = new Date(endObj);
        newEnd.setDate(newEnd.getDate() - 1); 
        
        let dateStr = startObj.getTime() === newEnd.getTime() ? formatStr(startObj) : `${formatStr(startObj)} - ${formatStr(newEnd)}`;
        
        camper.dates = dateStr;
        camper.uid = camper.id + '-' + camper.site.replace(/\s/g, '') + '-' + dateStr.replace(/\s/g, '');
    };

    if (syncMinTime !== null && syncMaxTime !== null) {
        for (let i = roster.active.length - 1; i >= 0; i--) {
            let localCamper = roster.active[i];
            
            if (localCamper.id.startsWith('WALKIN-')) {
                continue;
            }

            const localParsed = parseRosterDates(localCamper.dates);
            const L_s = localParsed.start.getTime();
            const L_e = localParsed.end.getTime();

            if (L_s === 0) continue; 

            if (L_s < syncMaxTime && L_e > syncMinTime) {
                
                const exactMatch = incomingData.find(inc => {
                    let incUID = inc.id + '-' + inc.site.replace(/\s/g, '') + '-' + inc.dates.replace(/\s/g, '');
                    return incUID === localCamper.uid;
                });

                if (!exactMatch) {
                    const stillHasBookingHere = incomingData.find(inc => inc.id === localCamper.id && inc.site === localCamper.site);

                    if (!stillHasBookingHere) {
                        if (L_s >= syncMinTime && L_e <= syncMaxTime) {
                            roster.active.splice(i, 1);
                        } else if (L_s < syncMinTime && L_e <= syncMaxTime) {
                            updateCamperDates(localCamper, localParsed.start, new Date(syncMinTime));
                        } else if (L_s >= syncMinTime && L_e > syncMaxTime) {
                            updateCamperDates(localCamper, new Date(syncMaxTime), localParsed.end);
                        } else {
                            updateCamperDates(localCamper, localParsed.start, new Date(syncMinTime));
                        }
                    } else {
                        roster.active.splice(i, 1);
                    }
                } else {
                    roster.active.splice(i, 1);
                }
            }
        }
    }

    // --- IMPORT NEW / UPDATED DATA ---
    incomingData.forEach(incoming => {
        
        if (!incoming.site || !incoming.dates || !incoming.id) {
            return;
        }

        if (!roster.siteConfig[incoming.site]) {
            roster.siteConfig[incoming.site] = { 
                loop: 'Unassigned', 
                length: '', 
                amps: 'None', 
                water: false, 
                sewer: false, 
                isADA: incoming.isADA || false, 
                isHost: incoming.isHost || false 
            };
        } else {
            if (incoming.isADA) {
                roster.siteConfig[incoming.site].isADA = true;
            }
            if (incoming.isHost) {
                roster.siteConfig[incoming.site].isHost = true;
            }
        }

        let incomingUID = incoming.id + '-' + incoming.site.replace(/\s/g, '') + '-' + incoming.dates.replace(/\s/g, '');

        const existsActive = roster.active.find(c => c.uid === incomingUID);
        const existsHistory = roster.history.find(c => c.uid === incomingUID);
        const existsArchive = roster.archive.find(c => c.uid === incomingUID);

        if (existsActive || existsHistory || existsArchive) {
            return; 
        }

        let initStatus = 'Pending';
        
        const isIncomingBlock = incoming.id.startsWith('BLOCKED-');

        if (isIncomingBlock) {
            initStatus = 'Closed';
            incoming.name = 'Maintenance / Closed';
        }

        roster.active.push({
            uid: incomingUID,
            id: incoming.id,
            name: incoming.name,
            site: incoming.site,
            dates: incoming.dates,
            status: initStatus,
            extraVehicles: 0,
            atvCount: 0,
            isTrouble: false,
            isArchived: false,
            notes: ''
        });
    });

    delete roster.manifest;
    delete roster.manifestMeta;
    StateManager.saveGlobalState(state);
}

function populateLoopFilter() {
    const state = StateManager.loadGlobalState();
    const roster = state.apps.roster;
    const select = document.getElementById('filter-loop');
    const currentVal = select.value;

    let loops = new Set();
    
    Object.values(roster.siteConfig).forEach(config => {
        if (config.loop && config.loop !== "Unassigned") {
            loops.add(config.loop);
        }
    });

    select.innerHTML = '<option value="All">All Loops</option>';
    
    Array.from(loops).sort().forEach(loop => {
        select.innerHTML += `<option value="${loop}">${loop}</option>`;
    });
    
    select.innerHTML += '<option value="Unassigned">Unassigned</option>';

    if (Array.from(loops).includes(currentVal) || currentVal === 'Unassigned') {
        select.value = currentVal;
    }
}

function parseRosterDates(dateStr) {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim() || dateStr === "Unknown Dates") {
        return { start: new Date(0), end: new Date(0) };
    }

    const currentYear = new Date().getFullYear();
    const parts = dateStr.split('-');
    const startStr = parts[0].trim();
    let endStr = parts.length > 1 ? parts[1].trim() : startStr;

    const parseFullPart = (p, defaultMonth = null) => {
        let clean = p.trim();
        
        if (clean.includes('/')) {
            const dParts = clean.split('/');
            if (dParts.length === 3) {
                let y = dParts[2].length === 2 ? "20" + dParts[2] : dParts[2];
                return new Date(`${dParts[0]}/${dParts[1]}/${y}`);
            }
            if (dParts.length === 2) {
                return new Date(`${dParts[0]}/${dParts[1]}/${currentYear}`);
            }
        }

        clean = clean.replace(/^[a-zA-Z]{3}\s/, '').trim(); 
        
        if (clean !== '' && /^\d+$/.test(clean)) {
            let d = new Date(window.rosterViewStart);
            d.setHours(0, 0, 0, 0);
            if (defaultMonth !== null) {
                d.setMonth(defaultMonth);
            }
            d.setDate(parseInt(clean));
            return d;
        }

        let d = new Date(`${clean} ${currentYear}`);
        if (!isNaN(d.getTime())) {
            return d;
        }

        return new Date(0);
    };

    let start = parseFullPart(startStr);
    let defaultMonth = start.getTime() > 0 ? start.getMonth() : null;
    let end = parseFullPart(endStr, defaultMonth);

    if (end.getTime() === 0 && start.getTime() > 0) {
        end = new Date(start);
    }
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start.getTime() > 0) {
        end.setDate(end.getDate() + 1);
    }

    return { start, end };
}

function renderRosterCalendar() {
    const state = StateManager.loadGlobalState();
    const roster = state.apps.roster;
    const thead = document.getElementById('roster-thead');
    const tbody = document.getElementById('roster-tbody');
    const filterLoop = document.getElementById('filter-loop').value;

    thead.innerHTML = '';
    tbody.innerHTML = '';

    let viewDates = [];
    let currentDate = new Date(window.rosterViewStart);
    let daysToRender = Math.round((window.rosterViewEnd - window.rosterViewStart) / (1000 * 60 * 60 * 24)) + 1;
    
    if (daysToRender < 1) {
        daysToRender = 1;
    }
    
    if (daysToRender > 60) {
        daysToRender = 60; 
    }

    for (let i = 0; i < daysToRender; i++) {
        let d = new Date(currentDate);
        d.setDate(d.getDate() + i);
        viewDates.push(d);
    }

    const formatDateShort = (d) => `${d.toLocaleString('default', { weekday: 'short' })} ${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
    
    document.getElementById('cal-date-range').innerText = `${formatDateShort(viewDates[0])}  —  ${formatDateShort(viewDates[viewDates.length - 1])}`;

    let trHead = document.createElement('tr');
    trHead.innerHTML = `<th class="gantt-site-col">Sites</th>`;
    
    viewDates.forEach(d => {
        let isToday = d.getTime() === new Date().setHours(0,0,0,0) ? 'background-color: #3498db;' : '';
        trHead.innerHTML += `<th style="width: 120px; ${isToday}">${formatDateShort(d)}</th>`;
    });
    
    thead.appendChild(trHead);

    let allSites = new Set();
    
    Object.keys(roster.siteConfig).forEach(s => {
        allSites.add(s);
    });
    
    roster.active.forEach(c => {
        allSites.add(c.site);
    });
    
    let siteArray = Array.from(allSites).map(site => {
        const config = roster.siteConfig[site] || { loop: 'Unassigned', length: '', amps: 'None', water: false, sewer: false, isADA: false, isHost: false };
        return { site: site, ...config };
    });

    siteArray.sort((a, b) => {
        if (a.loop !== b.loop) {
            return a.loop.localeCompare(b.loop);
        }
        return a.site.localeCompare(b.site, undefined, { numeric: true, sensitivity: 'base' });
    });

    let currentLoopGroup = '';

    siteArray.forEach(siteData => {
        
        if (filterLoop !== 'All' && siteData.loop !== filterLoop) {
            return;
        }

        if (siteData.loop !== currentLoopGroup) {
            currentLoopGroup = siteData.loop;
            const groupTr = document.createElement('tr');
            groupTr.style.backgroundColor = 'var(--accent-primary)';
            groupTr.innerHTML = `<td colspan="${viewDates.length + 1}" style="font-weight: bold; padding: 5px 15px; font-size: 1.1rem; color: white; position: sticky; left: 0; z-index: 15;">${currentLoopGroup}</td>`;
            tbody.appendChild(groupTr);
        }

        const tr = document.createElement('tr');
        let siteDisplay = `<div style="font-size: 1.1rem;"><strong>${siteData.site}</strong>`;
        
        if (siteData.isADA) {
            siteDisplay += ` <span style="color: #3498db;" title="ADA Accessible">♿</span>`;
        }
        
        if (siteData.isHost) {
            siteDisplay += ` <span style="color: #2ecc71;" title="Camp Host">🏕️</span>`;
        }
        
        siteDisplay += `</div>`;

        let badges = [];
        
        if (siteData.length) {
            badges.push(`<span style="font-size: 0.75rem; background: rgba(0,0,0,0.1); padding: 1px 3px; border-radius: 3px;">${siteData.length}ft</span>`);
        }
        
        if (siteData.amps && siteData.amps !== 'None') {
            badges.push(`<span style="font-size: 0.75rem; background: rgba(241, 196, 15, 0.2); border: 1px solid #f1c40f; padding: 1px 3px; border-radius: 3px; color: #d35400;">⚡ ${siteData.amps}</span>`);
        }
        
        if (siteData.water) {
            badges.push(`<span style="font-size: 0.75rem; background: rgba(52, 152, 219, 0.2); border: 1px solid #3498db; padding: 1px 3px; border-radius: 3px; color: #2980b9;">💧</span>`);
        }
        
        if (siteData.sewer) {
            badges.push(`<span style="font-size: 0.75rem; background: rgba(142, 68, 173, 0.2); border: 1px solid #8e44ad; padding: 1px 3px; border-radius: 3px; color: #8e44ad;">🕳️</span>`);
        }
        
        if (badges.length > 0) {
            siteDisplay += `<div style="display: flex; gap: 4px; margin-top: 5px;">${badges.join('')}</div>`;
        }

        tr.innerHTML = `<td class="gantt-site-col">${siteDisplay}</td>`;

        let renderedCampers = new Set();
        let i = 0;
        
        const hostWatermark = siteData.isHost ? `<div class="host-watermark" title="Camp Host">🏕️</div>` : '';

        while (i < viewDates.length) {
            const currentDay = viewDates[i];
            
            const camper = roster.active.find(c => {
                if (c.site !== siteData.site) {
                    return false;
                }
                
                const parsed = parseRosterDates(c.dates);
                return currentDay.getTime() >= parsed.start.getTime() && currentDay.getTime() < parsed.end.getTime();
            });

            if (camper && !renderedCampers.has(camper.uid)) {
                renderedCampers.add(camper.uid);
                
                const parsed = parseRosterDates(camper.dates);
                let span = 0;
                
                while ((i + span) < viewDates.length && viewDates[i + span].getTime() < parsed.end.getTime()) {
                    span++;
                }

                let blockClass = 'camper-block';
                
                if (camper.status === 'Checked-In') {
                    blockClass += ' checked-in';
                }
                if (camper.status === 'Departed') {
                    blockClass += ' departed';
                }
                if (camper.isTrouble) {
                    blockClass += ' trouble';
                }
                if (camper.status === 'Closed') {
                    blockClass += ' closed';
                }

                let hasNote = false;
                if (camper.notes && camper.notes.trim() !== '') {
                    hasNote = true;
                }
                
                let noteClass = hasNote ? 'note-telltale has-note' : 'note-telltale no-note';

                let statusIcon = '⏳';
                if (camper.status === 'Checked-In') {
                    statusIcon = '✅';
                }
                if (camper.status === 'Departed') {
                    statusIcon = '👋';
                }

                let extras = [];
                
                if (camper.extraVehicles && camper.extraVehicles > 0) {
                    extras.push(`🚗 ${camper.extraVehicles}`);
                }
                if (camper.atvCount && camper.atvCount > 0) {
                    extras.push(`🏍️ ${camper.atvCount}`);
                }
                
                let extrasHtml = '';
                if (extras.length > 0) {
                    extrasHtml = `<span style="font-size: 0.75rem; background: rgba(0,0,0,0.2); padding: 2px 4px; border-radius: 3px; margin-left: 5px;">${extras.join(' | ')}</span>`;
                }

                const td = document.createElement('td');
                td.colSpan = span;
                
                if (camper.status === 'Closed') {
                    td.innerHTML = `
                        <div class="${blockClass}" data-id="${camper.uid}">
                            ${hostWatermark}
                            <strong>${camper.name}</strong>
                            <div style="font-size: 0.8rem; margin-top: 5px;">${camper.dates}</div>
                        </div>
                    `;
                } else {
                    td.innerHTML = `
                        <div class="${blockClass}" data-id="${camper.uid}">
                            ${hostWatermark}
                            <div class="block-header">
                                <span class="block-name">${camper.name}</span>
                                <span class="${noteClass}" data-note-id="${camper.uid}" title="Notes">📝</span>
                            </div>
                            <div class="block-actions">
                                <button class="status-toggle-btn" data-toggle-id="${camper.uid}" title="Change Status">${statusIcon}</button>
                                <span style="font-size: 0.8rem; opacity: 0.8;">${camper.dates}</span>
                                ${extrasHtml}
                            </div>
                        </div>
                    `;
                }
                
                tr.appendChild(td);
                i += span; 
            } else {
                const td = document.createElement('td');
                td.innerHTML = `<div class="empty-cell" data-site="${siteData.site}" data-date="${currentDay.toISOString()}">${hostWatermark}${currentDay.getDate()}</div>`;
                tr.appendChild(td);
                i++;
            }
        }
        
        tbody.appendChild(tr);
    });

    attachGridInteractions();
}

function attachGridInteractions() {
    document.querySelectorAll('.camper-block').forEach(block => {
        block.addEventListener('click', (e) => {
            if (e.target.classList.contains('status-toggle-btn') || e.target.classList.contains('note-telltale')) {
                return;
            }
            openCamperModal(block.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.status-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            
            const uid = e.target.getAttribute('data-toggle-id');
            let state = StateManager.loadGlobalState();
            let camper = state.apps.roster.active.find(c => c.uid === uid);
            
            if (camper) {
                if (camper.status === 'Pending') {
                    camper.status = 'Checked-In';
                } else if (camper.status === 'Checked-In') {
                    camper.status = 'Departed';
                } else {
                    camper.status = 'Pending';
                }
                
                StateManager.saveGlobalState(state);
                renderRosterCalendar();
            }
        });
    });

    document.querySelectorAll('.note-telltale').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation(); 
            
            const uid = e.target.getAttribute('data-note-id');
            const state = StateManager.loadGlobalState();
            const camper = state.apps.roster.active.find(c => c.uid === uid);
            
            if (camper) {
                document.getElementById('qn-id').value = camper.uid;
                document.getElementById('qn-name').innerText = `Notes for: ${camper.name}`;
                document.getElementById('qn-notes').value = camper.notes || '';
                document.getElementById('quick-note-modal').showModal();
            }
        });
    });

    document.querySelectorAll('.empty-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
            const site = e.target.getAttribute('data-site');
            const dateObj = new Date(e.target.getAttribute('data-date'));
            const dateStr = `${String(dateObj.getMonth()+1).padStart(2,'0')}/${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getFullYear()).slice(-2)}`;
            
            document.getElementById('es-site-name').innerText = site;
            document.getElementById('es-date-str').innerText = dateStr;
            document.getElementById('es-site-val').value = site;
            document.getElementById('es-date-val').value = dateObj.toISOString(); 
            
            document.getElementById('empty-site-modal').showModal();
        });
    });
}

function renderDualDatePicker() {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    let m1Date = new Date(window.dpViewMonth);
    m1Date.setDate(1);
    
    let m2Date = new Date(m1Date);
    m2Date.setMonth(m2Date.getMonth() + 1);

    document.getElementById('dr-month-1-label').innerText = `${monthNames[m1Date.getMonth()]} ${m1Date.getFullYear()}`;
    document.getElementById('dr-month-2-label').innerText = `${monthNames[m2Date.getMonth()]} ${m2Date.getFullYear()}`;

    const renderGrid = (gridId, monthDate) => {
        const grid = document.getElementById(gridId);
        grid.innerHTML = '';
        
        let startDay = monthDate.getDay(); 
        let daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

        for (let i = 0; i < startDay; i++) {
            grid.innerHTML += `<div class="dr-day empty"></div>`;
        }

        for (let i = 1; i <= daysInMonth; i++) {
            let currentCellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
            currentCellDate.setHours(0,0,0,0);
            
            let classes = "dr-day";
            
            if (window.dpTempStart && currentCellDate.getTime() === window.dpTempStart.getTime()) {
                classes += " selected range-start";
            }
            if (window.dpTempEnd && currentCellDate.getTime() === window.dpTempEnd.getTime()) {
                classes += " selected range-end";
            }
            if (window.dpTempStart && window.dpTempEnd && currentCellDate.getTime() > window.dpTempStart.getTime() && currentCellDate.getTime() < window.dpTempEnd.getTime()) {
                classes += " in-range";
            }

            grid.innerHTML += `<div class="${classes}" data-date="${currentCellDate.toISOString()}">${i}</div>`;
        }
    };

    renderGrid('dr-grid-1', m1Date);
    renderGrid('dr-grid-2', m2Date);

    document.querySelectorAll('.dr-day:not(.empty)').forEach(day => {
        day.addEventListener('click', (e) => {
            const clickedDate = new Date(e.target.getAttribute('data-date'));
            
            if (!window.dpTempStart || (window.dpTempStart && window.dpTempEnd)) {
                window.dpTempStart = clickedDate;
                window.dpTempEnd = null;
            } else if (clickedDate.getTime() < window.dpTempStart.getTime()) {
                window.dpTempEnd = window.dpTempStart;
                window.dpTempStart = clickedDate;
            } else {
                window.dpTempEnd = clickedDate;
            }

            document.querySelectorAll('.dr-quick-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.querySelector('.dr-quick-btn[data-range="custom"]').classList.add('active');

            renderDualDatePicker();
        });
    });
}

function bindRosterEvents() {
    const dateModal = document.getElementById('date-range-modal');
    
    document.getElementById('btn-open-date-picker').addEventListener('click', () => {
        window.dpTempStart = new Date(window.rosterViewStart);
        window.dpTempEnd = new Date(window.rosterViewEnd);
        
        window.dpViewMonth = new Date(window.rosterViewStart);
        window.dpViewMonth.setDate(1);
        window.dpViewMonth.setHours(0,0,0,0);
        
        renderDualDatePicker();
        dateModal.showModal();
    });

    document.getElementById('btn-dr-close').addEventListener('click', () => {
        dateModal.close();
    });
    
    document.getElementById('btn-dr-cancel').addEventListener('click', () => {
        dateModal.close();
    });

    document.getElementById('dr-prev-month').addEventListener('click', () => {
        window.dpViewMonth.setMonth(window.dpViewMonth.getMonth() - 1);
        renderDualDatePicker();
    });

    document.getElementById('dr-next-month').addEventListener('click', () => {
        window.dpViewMonth.setMonth(window.dpViewMonth.getMonth() + 1);
        renderDualDatePicker();
    });

    document.querySelectorAll('.dr-quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const range = e.target.getAttribute('data-range');
            
            document.querySelectorAll('.dr-quick-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            e.target.classList.add('active');

            if (range === 'custom') {
                return; 
            }

            let start = new Date();
            let end = new Date();
            start.setHours(0,0,0,0);
            
            if (range === 'this-week') {
                end.setDate(start.getDate() + 6);
            } else if (range === 'next-week') {
                start.setDate(start.getDate() + 7);
                end.setDate(start.getDate() + 6);
            } else if (range === 'this-month') {
                start.setDate(1);
                end = new Date(start.getFullYear(), start.getMonth() + 1, 0); 
            } else if (range === 'next-month') {
                start = new Date(start.getFullYear(), start.getMonth() + 1, 1);
                end = new Date(start.getFullYear(), start.getMonth() + 2, 0);
            }

            window.dpTempStart = start;
            window.dpTempEnd = end;
            
            window.dpViewMonth = new Date(start);
            window.dpViewMonth.setDate(1);

            renderDualDatePicker();
        });
    });

    document.getElementById('btn-dr-apply').addEventListener('click', () => {
        if (window.dpTempStart && window.dpTempEnd) {
            window.rosterViewStart = new Date(window.dpTempStart);
            window.rosterViewEnd = new Date(window.dpTempEnd);
            renderRosterCalendar();
            dateModal.close();
        } else if (window.dpTempStart && !window.dpTempEnd) {
            NotificationSystem.show("Please select an end date to complete the range.", "error");
        }
    });

    document.getElementById('filter-loop').addEventListener('change', () => {
        renderRosterCalendar();
    });

    const emptyModal = document.getElementById('empty-site-modal');
    
    document.getElementById('btn-es-close').addEventListener('click', () => {
        emptyModal.close();
    });
    
    document.getElementById('btn-es-walkin').addEventListener('click', async () => {
        emptyModal.close();
        
        const site = document.getElementById('es-site-val').value;
        const arrivalDate = new Date(document.getElementById('es-date-val').value);
        
        const nightsStr = await DialogSystem.prompt("Add Walk-In", `How many nights are they staying at site ${site}?`, "1");
        
        if (!nightsStr) {
            return;
        }
        
        const nights = parseInt(nightsStr);
        if (isNaN(nights) || nights < 1) {
            NotificationSystem.show("Invalid number of nights", "error");
            return;
        }

        let departureDate = new Date(arrivalDate);
        departureDate.setDate(departureDate.getDate() + nights);

        const arrStr = `${String(arrivalDate.getMonth()+1).padStart(2,'0')}/${String(arrivalDate.getDate()).padStart(2,'0')}/${String(arrivalDate.getFullYear()).slice(-2)}`;
        const depStr = `${String(departureDate.getMonth()+1).padStart(2,'0')}/${String(departureDate.getDate()).padStart(2,'0')}/${String(departureDate.getFullYear()).slice(-2)}`;
        
        let dateStringForApp = `${arrStr} - ${depStr}`;

        let state = StateManager.loadGlobalState();
        let loop = "Unassigned";
        
        if (state.apps.roster.siteConfig[site]) {
            loop = state.apps.roster.siteConfig[site].loop;
        }

        let uid = `WALKIN-${site.replace(/\s/g, '')}-${new Date().getTime()}`;

        state.apps.roster.active.push({
            uid: uid,
            id: uid,
            name: 'Walk-In', 
            site: site,
            dates: dateStringForApp,
            status: 'Checked-In', 
            extraVehicles: 0,
            atvCount: 0,
            isTrouble: false,
            isArchived: false,
            notes: `Walk-in registration for ${nights} night(s).`
        });

        StateManager.saveGlobalState(state);
        populateLoopFilter();
        renderRosterCalendar();
        NotificationSystem.show("Walk-In Added", "success");
    });

    document.getElementById('btn-es-close-site').addEventListener('click', () => {
        const site = document.getElementById('es-site-val').value;
        const targetDate = new Date(document.getElementById('es-date-val').value);
        
        const arrStr = `${String(targetDate.getMonth()+1).padStart(2,'0')}/${String(targetDate.getDate()).padStart(2,'0')}/${String(targetDate.getFullYear()).slice(-2)}`;
        
        targetDate.setDate(targetDate.getDate() + 1);
        const depStr = `${String(targetDate.getMonth()+1).padStart(2,'0')}/${String(targetDate.getDate()).padStart(2,'0')}/${String(targetDate.getFullYear()).slice(-2)}`;

        let state = StateManager.loadGlobalState();
        let uid = `CLOSED-${site.replace(/\s/g, '')}-${new Date().getTime()}`;
        
        let loopAssigned = 'Unassigned';
        if (state.apps.roster.siteConfig[site]) {
            loopAssigned = state.apps.roster.siteConfig[site].loop;
        }
        
        state.apps.roster.active.push({
            uid: uid,
            id: uid,
            name: 'Maintenance / Closed',
            site: site,
            dates: `${arrStr} - ${depStr}`, 
            status: 'Closed',
            extraVehicles: 0,
            atvCount: 0,
            isTrouble: false,
            isArchived: false,
            notes: ''
        });

        StateManager.saveGlobalState(state);
        emptyModal.close();
        renderRosterCalendar();
        NotificationSystem.show("Site Closed for Date", "success");
    });

    const noteModal = document.getElementById('quick-note-modal');
    
    document.getElementById('btn-qn-close').addEventListener('click', () => {
        noteModal.close();
    });
    
    document.getElementById('btn-qn-save').addEventListener('click', () => {
        const uid = document.getElementById('qn-id').value;
        const notes = document.getElementById('qn-notes').value;
        
        let state = StateManager.loadGlobalState();
        let camper = state.apps.roster.active.find(c => c.uid === uid);
        
        if (camper) {
            camper.notes = notes;
            StateManager.saveGlobalState(state);
            renderRosterCalendar(); 
            noteModal.close();
            NotificationSystem.show("Notes Saved", "success");
        }
    });

    document.getElementById('btn-roster-print').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('btn-roster-scan').addEventListener('click', () => {
        if (typeof Html5Qrcode === 'undefined') { 
            alert("ERROR: Scanner library missing."); 
            return; 
        }

        const overlay = document.createElement('dialog');
        overlay.style.width = '90%';
        overlay.style.maxWidth = '400px';
        overlay.style.padding = '0';
        overlay.style.borderRadius = 'var(--radius-md)';
        overlay.style.border = 'none';
        overlay.style.backgroundColor = 'var(--bg-surface)';
        overlay.style.color = 'var(--text-primary)';

        overlay.innerHTML = `
            <div class="modal-header" style="padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                <h3 style="margin: 0;">Sync Roster</h3>
                <button id="close-roster-scan" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">❌</button>
            </div>
            <div class="modal-body" style="padding: 20px; text-align: center;">
                <div id="roster-reader-canvas" style="width: 100%; min-height: 250px; background: #000; border-radius: var(--radius-md); border: 2px solid var(--accent-primary);"></div>
                <div style="margin-top: 15px;">
                    <span style="font-weight: bold;">Captured: </span><span id="roster-scan-status" style="color: var(--accent-primary);">0%</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        overlay.showModal();

        let scanner = new Html5Qrcode("roster-reader-canvas");
        let buffer = [];
        let expected = 0;
        let scanned = new Set();

        const cleanup = () => {
            scanner.stop().then(() => { 
                scanner.clear(); 
                overlay.close(); 
                overlay.remove(); 
            }).catch(() => { 
                overlay.close(); 
                overlay.remove(); 
            });
        };

        document.getElementById('close-roster-scan').addEventListener('click', cleanup);

        scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => {
            if (decodedText.startsWith("PMH|roster|")) {
                const parts = decodedText.split('|');
                const idx = parseInt(parts[2]);
                expected = parseInt(parts[3]);
                const data = parts.slice(4).join('|');

                if (!scanned.has(idx)) {
                    scanned.add(idx);
                    buffer[idx - 1] = data;
                    document.getElementById('roster-scan-status').innerText = Math.round((scanned.size / expected) * 100) + '%';
                }

                if (scanned.size === expected) {
                    cleanup();
                    const jsonStr = buffer.join('');
                    
                    try {
                        const importedData = JSON.parse(jsonStr);
                        let state = StateManager.loadGlobalState();
                        
                        state.apps.roster.manifest = importedData.manifest;
                        
                        if (importedData.meta) {
                            state.apps.roster.manifestMeta = importedData.meta;
                        }

                        StateManager.saveGlobalState(state);

                        NotificationSystem.show("Roster Sync Complete!", "success");
                        processSyncManifest();
                        populateLoopFilter();
                        renderRosterCalendar();
                    } catch (e) {
                        NotificationSystem.show("Sync Failed: Corrupt Data", "error");
                    }
                }
            }
        }, undefined).catch(err => {
            alert("Camera Error: " + err);
            cleanup();
        });
    });

    document.getElementById('btn-roster-import-file').addEventListener('click', () => {
        document.getElementById('file-roster-import').click();
    });

    document.getElementById('file-roster-import').addEventListener('change', async (e) => {
        if (e.target.files.length === 0) {
            return;
        }
        
        const file = e.target.files[0];
        
        const confirmed = await DialogSystem.confirm(`Merge File?`, `This will parse and merge the selected JSON roster file. Proceed?`);
        if (!confirmed) {
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (!importedData.manifest) {
                    throw new Error("Invalid PMH Roster Format");
                }
                
                let state = StateManager.loadGlobalState();
                state.apps.roster.manifest = importedData.manifest;
                
                if (importedData.meta) {
                    state.apps.roster.manifestMeta = importedData.meta;
                }

                StateManager.saveGlobalState(state);

                NotificationSystem.show("File Merged Successfully", "success");
                processSyncManifest();
                populateLoopFilter();
                renderRosterCalendar();
            } catch (err) {
                NotificationSystem.show("Import Failed: Invalid Roster File", "error");
            }
            e.target.value = ''; 
        };
        reader.readAsText(file);
    });

    const evInput = document.getElementById('cm-extra-veh');
    const evDisplay = document.getElementById('cm-extra-veh-display');
    
    document.getElementById('btn-ev-minus').addEventListener('click', () => {
        let val = parseInt(evInput.value) || 0;
        if (val > 0) {
            val--;
        }
        evInput.value = val;
        evDisplay.innerText = val;
    });
    
    document.getElementById('btn-ev-plus').addEventListener('click', () => {
        let val = parseInt(evInput.value) || 0;
        val++;
        evInput.value = val;
        evDisplay.innerText = val;
    });

    const atvInput = document.getElementById('cm-atv');
    const atvDisplay = document.getElementById('cm-atv-display');
    
    document.getElementById('btn-atv-minus').addEventListener('click', () => {
        let val = parseInt(atvInput.value) || 0;
        if (val > 0) {
            val--;
        }
        atvInput.value = val;
        atvDisplay.innerText = val;
    });
    
    document.getElementById('btn-atv-plus').addEventListener('click', () => {
        let val = parseInt(atvInput.value) || 0;
        val++;
        atvInput.value = val;
        atvDisplay.innerText = val;
    });

    const camperModal = document.getElementById('camper-modal');
    
    document.getElementById('btn-cm-close').addEventListener('click', () => {
        camperModal.close();
    });

    document.getElementById('btn-cm-save').addEventListener('click', () => {
        const uid = document.getElementById('cm-id').value;
        let state = StateManager.loadGlobalState();
        let roster = state.apps.roster;

        let camper = roster.active.find(c => c.uid === uid) || roster.archive.find(c => c.uid === uid) || roster.history.find(c => c.uid === uid);
        
        if (camper) {
            camper.status = document.getElementById('cm-status').value;
            camper.extraVehicles = parseInt(document.getElementById('cm-extra-veh').value) || 0;
            camper.atvCount = parseInt(document.getElementById('cm-atv').value) || 0;
            camper.isTrouble = document.getElementById('cm-trouble').checked;
            camper.notes = document.getElementById('cm-notes').value;
            camper.isArchived = document.getElementById('cm-archive').checked;
            
            StateManager.saveGlobalState(state);
            runLifecycleManager(); 
            renderRosterCalendar();
            camperModal.close();
            NotificationSystem.show("Record Updated", "success");
        }
    });

    const siteModal = document.getElementById('site-config-modal');
    const siteSelect = document.getElementById('sc-site-select');
    
    const populateSiteDropdown = () => {
        const state = StateManager.loadGlobalState();
        const roster = state.apps.roster;
        let allSites = new Set();
        
        Object.keys(roster.siteConfig).forEach(s => {
            allSites.add(s);
        });
        
        roster.active.forEach(c => {
            allSites.add(c.site);
        });
        
        siteSelect.innerHTML = '';
        
        const bulkList = document.getElementById('sc-bulk-site-list');
        bulkList.innerHTML = '';
        
        const sortedSites = Array.from(allSites).sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        
        sortedSites.forEach(site => {
            siteSelect.innerHTML += `<option value="${site}">${site}</option>`;
            
            bulkList.innerHTML += `
                <label class="bulk-site-item">
                    <input type="checkbox" class="bulk-site-cb" value="${site}">
                    ${site}
                </label>
            `;
        });
        
        if (sortedSites.length > 0) {
            siteSelect.dispatchEvent(new Event('change'));
        }
    };

    document.getElementById('btn-manage-sites').addEventListener('click', () => {
        populateSiteDropdown();
        siteModal.showModal();
    });

    document.getElementById('btn-sc-add-new').addEventListener('click', async () => {
        const newSite = await DialogSystem.prompt("Add New Site", "Enter the exact physical Site Number/Name:");
        
        if (!newSite) {
            return;
        }

        let state = StateManager.loadGlobalState();
        
        if (!state.apps.roster.siteConfig[newSite]) {
            state.apps.roster.siteConfig[newSite] = { 
                loop: 'Unassigned', 
                length: '', 
                amps: 'None', 
                water: false, 
                sewer: false, 
                isADA: false, 
                isHost: false 
            };
            
            StateManager.saveGlobalState(state);
            populateSiteDropdown();
            siteSelect.value = newSite;
            siteSelect.dispatchEvent(new Event('change'));
            NotificationSystem.show("New Site Created", "success");
        } else {
            DialogSystem.alert("Error", "That site already exists in the configuration.");
        }
    });

    siteSelect.addEventListener('change', (e) => {
        const state = StateManager.loadGlobalState();
        const config = state.apps.roster.siteConfig[e.target.value] || { 
            loop: 'Unassigned', 
            length: '', 
            amps: 'None', 
            water: false, 
            sewer: false, 
            isADA: false, 
            isHost: false 
        };
        
        document.getElementById('sc-loop').value = config.loop || 'Unassigned';
        document.getElementById('sc-length').value = config.length || '';
        document.getElementById('sc-amps').value = config.amps || 'None';
        document.getElementById('sc-water').checked = config.water || false;
        document.getElementById('sc-sewer').checked = config.sewer || false;
        document.getElementById('sc-ada').checked = config.isADA || false;
        document.getElementById('sc-host').checked = config.isHost || false;
    });

    document.getElementById('btn-sc-close').addEventListener('click', () => {
        siteModal.close();
    });

    document.getElementById('btn-sc-save').addEventListener('click', () => {
        const site = siteSelect.value;
        
        if (!site) {
            return;
        }

        let state = StateManager.loadGlobalState();
        
        if (!state.apps.roster.siteConfig[site]) {
            state.apps.roster.siteConfig[site] = {};
        }
        
        state.apps.roster.siteConfig[site].loop = document.getElementById('sc-loop').value;
        state.apps.roster.siteConfig[site].length = document.getElementById('sc-length').value;
        state.apps.roster.siteConfig[site].amps = document.getElementById('sc-amps').value;
        state.apps.roster.siteConfig[site].water = document.getElementById('sc-water').checked;
        state.apps.roster.siteConfig[site].sewer = document.getElementById('sc-sewer').checked;
        state.apps.roster.siteConfig[site].isADA = document.getElementById('sc-ada').checked;
        state.apps.roster.siteConfig[site].isHost = document.getElementById('sc-host').checked;

        StateManager.saveGlobalState(state);
        populateLoopFilter();
        renderRosterCalendar();
        NotificationSystem.show("Site Configuration Saved", "success");
    });

    document.getElementById('btn-sc-sel-all').addEventListener('click', () => {
        document.querySelectorAll('.bulk-site-cb').forEach(cb => {
            cb.checked = true;
        });
    });
    
    document.getElementById('btn-sc-sel-none').addEventListener('click', () => {
        document.querySelectorAll('.bulk-site-cb').forEach(cb => {
            cb.checked = false;
        });
    });

    document.getElementById('btn-sc-bulk-apply').addEventListener('click', () => {
        const targetLoop = document.getElementById('sc-bulk-loop').value;
        const checkedBoxes = document.querySelectorAll('.bulk-site-cb:checked');
        
        if (checkedBoxes.length === 0) {
            return NotificationSystem.show("Please select at least one site to move.", "error");
        }

        let state = StateManager.loadGlobalState();
        let count = 0;

        checkedBoxes.forEach(cb => {
            const site = cb.value;
            if (!state.apps.roster.siteConfig[site]) {
                state.apps.roster.siteConfig[site] = { 
                    length: '', 
                    amps: 'None', 
                    water: false, 
                    sewer: false, 
                    isADA: false, 
                    isHost: false 
                };
            }
            state.apps.roster.siteConfig[site].loop = targetLoop;
            count++;
        });

        StateManager.saveGlobalState(state);
        populateSiteDropdown();
        populateLoopFilter();
        renderRosterCalendar();
        NotificationSystem.show(`Successfully moved ${count} sites to ${targetLoop}.`, "success");
    });

    document.getElementById('btn-sc-delete').addEventListener('click', async () => {
        const site = siteSelect.value;
        if (!site) return;
        
        const confirmed = await DialogSystem.confirm("Delete Site?", `Are you sure you want to completely remove ${site} from the configuration? This will not delete active camper records, but the site will lose its loop and hookup data.`);
        
        if (confirmed) {
            let state = StateManager.loadGlobalState();
            
            if (state.apps.roster.siteConfig[site]) {
                delete state.apps.roster.siteConfig[site];
                
                StateManager.saveGlobalState(state);
                populateSiteDropdown();
                populateLoopFilter();
                renderRosterCalendar();
                NotificationSystem.show("Site Deleted", "success");
                
                if (document.getElementById('sc-site-select').options.length === 0) {
                    siteModal.close();
                }
            }
        }
    });
}

function openCamperModal(uid) {
    const state = StateManager.loadGlobalState();
    const roster = state.apps.roster;

    let camper = roster.active.find(c => c.uid === uid) || roster.archive.find(c => c.uid === uid) || roster.history.find(c => c.uid === uid);
    
    if (!camper) {
        return;
    }

    const siteConfig = roster.siteConfig[camper.site] || { loop: 'Unassigned' };

    document.getElementById('cm-id').value = camper.uid;
    document.getElementById('cm-title').innerText = camper.name;
    document.getElementById('cm-site').innerText = camper.site;
    document.getElementById('cm-loop').innerText = siteConfig.loop;
    document.getElementById('cm-dates').innerText = camper.dates;

    document.getElementById('cm-status').value = camper.status;
    
    document.getElementById('cm-extra-veh').value = camper.extraVehicles || 0;
    document.getElementById('cm-extra-veh-display').innerText = camper.extraVehicles || 0;
    
    document.getElementById('cm-atv').value = camper.atvCount || 0;
    document.getElementById('cm-atv-display').innerText = camper.atvCount || 0;

    document.getElementById('cm-trouble').checked = camper.isTrouble || false;
    document.getElementById('cm-notes').value = camper.notes || '';
    document.getElementById('cm-archive').checked = camper.isArchived || false;

    document.getElementById('camper-modal').showModal();
}