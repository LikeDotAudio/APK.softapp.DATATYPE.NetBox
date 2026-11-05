// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* netboxApp.js — the page: devices and cables as APKTables, the NetBox CSVs
   beside them, discovered devices off the bus, the block in and out of the CAD. */

import { exportNetboxCableCsv, exportNetboxDeviceCsv } from './netbox.js';
import { connectNetboxHost, sampleExport, toBlock, addDiscoveredDevice } from './netboxHost.js';

const S = window.APKSoftapp;
const T = window.APKTable;
const state = sampleExport();
const $ = (id) => document.getElementById(id);

const DEVICE_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'deviceType', label: 'Device type' },
  { key: 'role', label: 'Role' },
  { key: 'site', label: 'Site' },
  { key: 'rack', label: 'Rack' },
  { key: 'position', label: 'U', type: 'number' },
  { key: 'status', label: 'Status' },
  { key: 'serial', label: 'Serial', mono: true },
];
const CABLE_COLUMNS = [
  { key: 'fromDevice', label: 'A device' },
  { key: 'fromPort', label: 'A port', mono: true },
  { key: 'toDevice', label: 'B device' },
  { key: 'toPort', label: 'B port', mono: true },
  { key: 'cableType', label: 'Type', placeholder: 'cat6a' },
  { key: 'label', label: 'Label', mono: true },
];

let devices = null;
let cables = null;

function render() {
  $('device-csv').value = exportNetboxDeviceCsv(state.devices);
  $('cable-csv').value = exportNetboxCableCsv(state.cables);
  if (!T) return;
  if (devices) devices.setRows(state.devices);
  else devices = T.create($('devices-table'), {
    id: 'netbox-devices', columns: DEVICE_COLUMNS, rows: state.devices, empty: 'No devices.',
    onEdit: (i, key, value) => { state.devices[i][key] = value; changed(); },
    onDelete: (i) => { state.devices.splice(i, 1); changed(); },
  });
  if (cables) cables.setRows(state.cables);
  else cables = T.create($('cables-table'), {
    id: 'netbox-cables', columns: CABLE_COLUMNS, rows: state.cables, empty: 'No cables.',
    onEdit: (i, key, value) => { state.cables[i][key] = value; changed(); },
    onDelete: (i) => { state.cables.splice(i, 1); changed(); },
  });
}

if (S) S.describe({
  name: 'NetBox DCIM Exporter',
  does: 'Lists devices and cables and writes them as NetBox import CSVs (devices, cables). It does not talk to NetBox itself.',
  inputs: [
    { name: 'Export block', from: 'the CAD (netbox_export block: devices[], cables[]); a labelled sample until one arrives', kind: 'block' },
    { name: 'Discovered devices', from: 'the bus, via ⚡ Discovered (kinds filter from config/discovered.json)', kind: 'bus', topic: 'Device/<kind>/<id>' },
  ],
  outputs: [
    { name: 'Devices CSV', to: 'netbox-devices-export.csv download (NetBox bulk import)', kind: 'file' },
    { name: 'Cables CSV', to: 'netbox-cables-export.csv download (NetBox bulk import)', kind: 'file' },
    { name: 'Export block', to: 'the CAD drawing (Save & Return), or netbox_export.json download when standalone', kind: 'block' },
  ],
  controls: [
    { name: '➕ Device / ➕ Cable', how: 'Adds a row; edit cells in the tables, delete a row with its ✕' },
    { name: '⚡ Discovered', how: 'Shows what the bus knows; Add device copies one in as a row (by MAC / serial)' },
    { name: 'Export Devices CSV / Export Cables CSV', how: 'Downloads the CSV shown on the right' },
    { name: 'Save & Return', how: 'Sends the block back to the CAD (or downloads it as .json)' },
  ],
  problems: ['bad_input', 'config_invalid', 'save_failed', 'sdk_missing'],
});

/* A block that is not a NetBox export loads as empty — say which field was missing. */
function checkBlock(block, meta) {
  const b = block && typeof block === 'object' ? block : null;
  const missing = ['devices', 'cables'].filter((k) => !b || !Array.isArray(b[k]));
  if (!missing.length || !S) return;
  S.showProblem('bad_input', {
    subject: (meta && (meta.blockName || meta.title)) || 'CAD block',
    detail: `The block has no ${missing.map((k) => `${k}[]`).join(' or ')} field${missing.length > 1 ? 's' : ''}, so ${missing.join(' and ')} loaded empty.`,
    fix: ['Open this from a NetBox export (netbox_export) block in the CAD, not another block type.'],
  });
}

const host = S ? connectNetboxHost(S, state, {
  onLoaded: (st, meta, block) => { $('block-tag').textContent = meta.blockName || meta.title || 'FROM THE CAD'; render(); checkBlock(block, meta); },
}) : null;

function changed() {
  render();
  if (host) host.changed(toBlock(state));
}

function download(text, name) {
  if (text.split('\n').filter((l) => l.trim()).length < 2) {
    // header only: NetBox would import nothing
    if (S) S.showProblem('bad_input', { subject: name, detail: 'The table is empty, so the CSV is a header with no rows.', fix: ['Add a row first (➕ Device / ➕ Cable, or ⚡ Discovered → Add device).'] });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('btn-dl').addEventListener('click', () => download($('cable-csv').value, 'netbox-cables-export.csv'));
$('btn-dl-devices').addEventListener('click', () => download($('device-csv').value, 'netbox-devices-export.csv'));
$('btn-add-device').addEventListener('click', () => { state.devices.push({ name: `DEVICE-${state.devices.length + 1}`, deviceType: '', role: '', site: '', rack: '', position: '', status: 'Active', serial: '' }); changed(); });
$('btn-add-cable').addEventListener('click', () => { state.cables.push({ fromDevice: '', fromPort: '', toDevice: '', toPort: '', label: '' }); changed(); });

$('btn-save').addEventListener('click', () => {
  let how = '';
  try { how = host ? host.save(toBlock(state), { filename: 'netbox_export' }) : ''; }
  catch (e) { S.showProblem('save_failed', { subject: 'netbox_export', detail: e && e.message ? e.message : String(e), onRetry: () => $('btn-save').click() }); return; }
  if (!host) $('block-tag').textContent = 'NOT SAVED: SHARED CODE MISSING';
  if (how) $('block-tag').textContent = how === 'host' ? 'SAVED TO THE CAD' : 'DOWNLOADED .JSON';
});

$('btn-discovered').addEventListener('click', async () => {
  const panel = $('discovered-panel');
  panel.hidden = !panel.hidden;
  if (panel.hidden || panel.dataset.started) return;
  panel.dataset.started = '1';
  // the Discovered panel is the shared client's (ROAD-3502): kinds in config/discovered.json
  if (!window.APKSoftapp) return;
  await window.APKSoftapp.discoveredPanel($('discovered-table'), {
    status: $('discovered-status'),
    configUrl: './config/discovered.json',
    id: 'netbox-discovered',
    pickLabel: 'Add device',
    onPick: (thing) => { if (addDiscoveredDevice(state, thing)) changed(); },
  });
});

if (!T) {
  if (S) S.showProblem('sdk_missing', { into: $('devices-table'), detail: 'vendor/apk-table/apk-table.js did not load, so the tables cannot draw.', dismissable: false });
  else $('devices-table').textContent = 'vendor/apk-table and vendor/apk-softapp did not load: reload (Ctrl+Shift+R), or re-vendor them with .apk.scripts/vendor_shared_web.py.';
}
render();
