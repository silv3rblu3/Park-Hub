// apps/roster/template.js

function renderRosterApp() {
    return `
    <style>
        /* Gantt Calendar Styles */
        .gantt-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            min-width: 1000px;
        }
        .gantt-table th {
            background-color: #2c3e50;
            color: #ffffff;
            padding: 10px;
            text-align: left;
            border: 1px solid #1a252f;
            font-size: 0.9rem;
        }
        .gantt-table td {
            border: 1px solid var(--border-color);
            padding: 0;
            vertical-align: top;
            height: 60px;
            position: relative;
            background-color: var(--bg-surface);
        }
        .gantt-site-col {
            width: 180px;
            padding: 10px !important;
            vertical-align: middle !important;
            background-color: var(--bg-base) !important;
            position: sticky;
            left: 0;
            z-index: 10;
            border-right: 2px solid var(--border-color) !important;
        }
        
        .camper-block {
            background-color: #4b5563;
            color: #ffffff;
            margin: 2px;
            padding: 8px;
            border-radius: 4px;
            height: calc(100% - 4px);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: transform 0.1s, box-shadow 0.1s;
            overflow: hidden;
        }
        .camper-block:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            filter: brightness(1.1);
        }
        
        /* Modifiers */
        .camper-block.checked-in {
            border: 2px solid #2ecc71;
            background-color: #374151;
            box-shadow: 0 0 8px rgba(46, 204, 113, 0.4);
        }
        .camper-block.departed {
            border: 2px solid #95a5a6;
            background-color: #2c3e50;
            opacity: 0.7;
        }
        .camper-block.trouble {
            border: 2px solid #e74c3c;
            background-color: #7f1d1d;
        }
        .camper-block.closed {
            background-color: #333333;
            border: 1px dashed #777777;
            color: #aaaaaa;
            justify-content: center;
            align-items: center;
            text-align: center;
        }

        .block-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            font-size: 0.85rem;
            margin-bottom: 4px;
        }
        .block-name {
            font-weight: bold;
            font-size: 1rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* Interactive Elements inside block */
        .block-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .status-toggle-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .status-toggle-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: scale(1.1);
        }
        .note-telltale {
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .note-telltale.has-note {
            opacity: 1;
            filter: drop-shadow(0 0 3px #f1c40f);
        }
        .note-telltale.no-note {
            opacity: 0.3;
            filter: grayscale(100%);
        }
        .note-telltale:hover {
            transform: scale(1.2);
        }

        /* Empty Cells */
        .empty-cell {
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            align-items: flex-start;
            justify-content: flex-end;
            padding: 5px !important;
            height: 100%;
            width: 100%;
            color: var(--text-secondary);
            font-size: 0.75rem;
            opacity: 0.5;
        }
        .empty-cell:hover {
            background-color: rgba(52, 152, 219, 0.1);
            opacity: 1;
        }

        /* Dual-Pane Date Picker Styles */
        .dr-container {
            display: flex;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-surface);
        }
        .dr-sidebar {
            width: 140px;
            background: rgba(0,0,0,0.03);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
        }
        [data-theme="dark"] .dr-sidebar { background: rgba(255,255,255,0.02); }
        .dr-sidebar button {
            padding: 12px 15px;
            text-align: left;
            border: none;
            background: transparent;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-primary);
            font-size: 0.9rem;
            transition: background 0.1s;
        }
        .dr-sidebar button:hover, .dr-sidebar button.active {
            background: var(--accent-primary);
            color: white;
        }
        .dr-calendars {
            flex: 1;
            padding: 15px;
        }
        .dr-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .dr-months-wrapper {
            display: flex;
            gap: 20px;
        }
        .dr-month {
            flex: 1;
        }
        .dr-month-name {
            text-align: center;
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--text-primary);
        }
        .dr-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
            text-align: center;
        }
        .dr-day-header {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-bottom: 5px;
            font-weight: bold;
        }
        .dr-day {
            padding: 8px 0;
            cursor: pointer;
            border-radius: 4px;
            font-size: 0.9rem;
            transition: background 0.1s;
            color: var(--text-primary);
        }
        .dr-day:hover:not(.empty) {
            background: rgba(52, 152, 219, 0.2);
        }
        .dr-day.empty {
            cursor: default;
        }
        .dr-day.selected {
            background: var(--accent-primary) !important;
            color: white !important;
            font-weight: bold;
            border-radius: 4px !important;
        }
        .dr-day.in-range {
            background: rgba(52, 152, 219, 0.15);
            border-radius: 0;
        }
        /* Connect the edges of the selection */
        .dr-day.selected.range-start { border-top-right-radius: 0 !important; border-bottom-right-radius: 0 !important; }
        .dr-day.selected.range-end { border-top-left-radius: 0 !important; border-bottom-left-radius: 0 !important; }
    </style>

    <div style="padding: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>Camp Roster Calendar</h2>
            <div style="display: flex; gap: 10px;">
                <button id="btn-roster-scan" class="btn-primary">📲 Sync Roster Stream</button>
                <button id="btn-roster-import-file" class="btn-outline">💾 Import JSON</button>
                <input type="file" id="file-roster-import" accept=".json" style="display: none;">
                <button id="btn-manage-sites" class="btn-outline" style="border-color: #3498db; color: #3498db;">⚙️ Master Site Setup</button>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--bg-surface); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
            
            <div style="display: flex; gap: 15px; flex: 1;">
                <div>
                    <label style="font-weight: bold; font-size: 0.85rem; display: block; margin-bottom: 5px;">Filter by Loop</label>
                    <select id="filter-loop" class="app-select" style="margin-bottom: 0; min-width: 200px;">
                        <option value="All">All Loops</option>
                        </select>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 15px;">
                <button id="btn-open-date-picker" class="btn-outline" style="padding: 10px 20px; font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
                    📅 <span id="cal-date-range">Loading Dates...</span>
                </button>
            </div>
        </div>

        <div class="app-table-container" style="overflow-x: auto; max-height: 65vh;">
            <table class="gantt-table" id="roster-table">
                <thead id="roster-thead" style="position: sticky; top: 0; z-index: 20;">
                    </thead>
                <tbody id="roster-tbody">
                    </tbody>
            </table>
        </div>

        <dialog id="date-range-modal" style="max-width: 700px; width: 95%;">
            <div class="modal-header">
                <h3 id="dr-display-text">Select Dates</h3>
                <button id="btn-dr-close" class="icon-btn">❌</button>
            </div>
            
            <div class="dr-container">
                <div class="dr-sidebar">
                    <button class="dr-quick-btn active" data-range="custom">Custom Range</button>
                    <button class="dr-quick-btn" data-range="this-week">This Week</button>
                    <button class="dr-quick-btn" data-range="next-week">Next Week</button>
                    <button class="dr-quick-btn" data-range="this-month">This Month</button>
                    <button class="dr-quick-btn" data-range="next-month">Next Month</button>
                </div>
                
                <div class="dr-calendars">
                    <div class="dr-header">
                        <button id="dr-prev-month" class="icon-btn" style="border: 1px solid var(--border-color);">◀</button>
                        <div id="dr-month-labels" style="display: flex; gap: 20px; flex: 1; justify-content: space-around;">
                            <span id="dr-month-1-label" class="dr-month-name">Month 1</span>
                            <span id="dr-month-2-label" class="dr-month-name">Month 2</span>
                        </div>
                        <button id="dr-next-month" class="icon-btn" style="border: 1px solid var(--border-color);">▶</button>
                    </div>
                    
                    <div class="dr-months-wrapper">
                        <div class="dr-month">
                            <div class="dr-grid dr-header-grid">
                                <div class="dr-day-header">Su</div><div class="dr-day-header">Mo</div><div class="dr-day-header">Tu</div>
                                <div class="dr-day-header">We</div><div class="dr-day-header">Th</div><div class="dr-day-header">Fr</div><div class="dr-day-header">Sa</div>
                            </div>
                            <div class="dr-grid" id="dr-grid-1"></div>
                        </div>
                        <div class="dr-month">
                            <div class="dr-grid dr-header-grid">
                                <div class="dr-day-header">Su</div><div class="dr-day-header">Mo</div><div class="dr-day-header">Tu</div>
                                <div class="dr-day-header">We</div><div class="dr-day-header">Th</div><div class="dr-day-header">Fr</div><div class="dr-day-header">Sa</div>
                            </div>
                            <div class="dr-grid" id="dr-grid-2"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="padding: 15px; display: flex; justify-content: flex-end; gap: 10px; background: var(--bg-surface);">
                <button id="btn-dr-cancel" class="btn-outline">Cancel</button>
                <button id="btn-dr-apply" class="btn-primary" style="min-width: 120px;">Apply</button>
            </div>
        </dialog>

        <dialog id="empty-site-modal">
            <div class="modal-header">
                <h3>Manage Availability</h3>
                <button id="btn-es-close" class="icon-btn">❌</button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <p style="font-size: 1.1rem; margin-bottom: 5px;"><strong>Site:</strong> <span id="es-site-name" style="color: var(--accent-primary);"></span></p>
                <p style="font-size: 1.1rem; margin-bottom: 25px;"><strong>Date:</strong> <span id="es-date-str" style="color: var(--accent-primary);"></span></p>
                
                <input type="hidden" id="es-site-val">
                <input type="hidden" id="es-date-val">

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <button id="btn-es-walkin" class="btn-primary" style="padding: 15px; font-size: 1.1rem;">🚶‍♂️ Add Walk-In Here</button>
                    <button id="btn-es-close-site" class="btn-danger" style="padding: 15px; font-size: 1.1rem; background-color: #333333; border: 2px solid #555555;">🚫 Mark Closed / Maintenance</button>
                </div>
            </div>
        </dialog>

        <dialog id="quick-note-modal">
            <div class="modal-header">
                <h3>Camper Notes</h3>
                <button id="btn-qn-close" class="icon-btn">❌</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="qn-id">
                <p id="qn-name" style="font-weight: bold; font-size: 1.1rem; margin-bottom: 15px; color: var(--accent-primary);"></p>
                
                <textarea id="qn-notes" class="app-input" rows="8" placeholder="Type notes here..."></textarea>
                
                <button id="btn-qn-save" class="btn-primary" style="width: 100%; margin-top: 15px;">Save Notes</button>
            </div>
        </dialog>

        <dialog id="camper-modal">
            <div class="modal-header">
                <h3 id="cm-title">Camper Details</h3>
                <button id="btn-cm-close" class="icon-btn">❌</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="cm-id">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 0.85rem; font-weight: bold; color: var(--text-secondary);">Site</label>
                        <p id="cm-site" style="font-size: 1.1rem; font-weight: bold;"></p>
                    </div>
                    <div>
                        <label style="font-size: 0.85rem; font-weight: bold; color: var(--text-secondary);">Loop</label>
                        <p id="cm-loop" style="font-size: 1.1rem; font-weight: bold;"></p>
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="font-size: 0.85rem; font-weight: bold; color: var(--text-secondary);">Dates</label>
                        <p id="cm-dates"></p>
                    </div>
                </div>

                <hr>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                    <label style="font-weight: bold;">Check-In Status</label>
                    <select id="cm-status" class="app-select" style="width: auto; margin-bottom: 0;">
                        <option value="Pending">Pending</option>
                        <option value="Checked-In">Checked-In</option>
                        <option value="Departed">Departed</option>
                        <option value="Closed">Closed / Maint.</option>
                    </select>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                    <label style="font-weight: bold;">Extra Vehicles</label>
                    <input type="number" id="cm-extra-veh" class="app-input" style="width: 80px; margin-bottom: 0;" min="0" value="0">
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; background: rgba(231, 76, 60, 0.1); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--danger-color);">
                    <label style="font-weight: bold; color: var(--danger-color);">⚠️ Mark as Trouble Site</label>
                    <input type="checkbox" id="cm-trouble" style="transform: scale(1.5);">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">Notes</label>
                    <textarea id="cm-notes" class="app-input" rows="4" placeholder="Enter vehicle descriptions, issues, or general notes here..."></textarea>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 10px; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
                    <label style="font-weight: bold; color: var(--text-secondary);">🗄️ Archive Record (Prevent Auto-Delete)</label>
                    <input type="checkbox" id="cm-archive" style="transform: scale(1.5);">
                </div>

                <button id="btn-cm-save" class="btn-primary" style="width: 100%;">Save Changes</button>
            </div>
        </dialog>

        <dialog id="site-config-modal">
            <div class="modal-header">
                <h3>Permanent Site Setup</h3>
                <button id="btn-sc-close" class="icon-btn">❌</button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">Data set here is permanently tied to the site, overriding any scraped data.</p>
                
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <div style="flex: 2;">
                        <label style="font-weight: bold;">Select Site to Edit</label>
                        <select id="sc-site-select" class="app-select" style="margin-bottom: 0;"></select>
                    </div>
                    <div style="flex: 1; display: flex; align-items: flex-end;">
                        <button id="btn-sc-add-new" class="btn-outline" style="width: 100%; margin-bottom: 0; padding: 10px;">+ New Site</button>
                    </div>
                </div>

                <hr style="margin: 15px 0; border: none; border-top: 1px solid var(--border-color);">

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: bold; font-size: 0.9rem;">Loop Assignment</label>
                        <select id="sc-loop" class="app-select">
                            <option value="Unassigned">Unassigned</option>
                            <option value="Appaloosa (A)">Appaloosa (A)</option>
                            <option value="Bitterroot (B)">Bitterroot (B)</option>
                            <option value="Camas (C)">Camas (C)</option>
                            <option value="Other">Other / Overflow</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight: bold; font-size: 0.9rem;">Max Length (ft)</label>
                        <input type="number" id="sc-length" class="app-input" placeholder="e.g. 45">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: bold; font-size: 0.9rem;">Electrical Service</label>
                        <select id="sc-amps" class="app-select">
                            <option value="None">Dry / None</option>
                            <option value="15 Amp">15 Amp</option>
                            <option value="30 Amp">30 Amp</option>
                            <option value="50 Amp">50 Amp</option>
                        </select>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label style="font-weight: bold; font-size: 0.9rem;">💧 Water Hookup</label>
                            <input type="checkbox" id="sc-water" style="transform: scale(1.3);">
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label style="font-weight: bold; font-size: 0.9rem;">🕳️ Sewer Hookup</label>
                            <input type="checkbox" id="sc-sewer" style="transform: scale(1.3);">
                        </div>
                    </div>
                </div>

                <hr style="margin: 15px 0; border: none; border-top: 1px solid var(--border-color);">

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 10px; border-radius: var(--radius-md); background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db;">
                    <label style="font-weight: bold; color: #3498db;">♿ ADA Accessible</label>
                    <input type="checkbox" id="sc-ada" style="transform: scale(1.5);">
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 10px; border-radius: var(--radius-md); background: rgba(46, 204, 113, 0.1); border: 1px solid #2ecc71;">
                    <label style="font-weight: bold; color: #2ecc71;">🏕️ Camp Host Site</label>
                    <input type="checkbox" id="sc-host" style="transform: scale(1.5);">
                </div>

                <button id="btn-sc-save" class="btn-primary" style="width: 100%;">Save Site Config</button>
            </div>
        </dialog>
    </div>
    `;
}