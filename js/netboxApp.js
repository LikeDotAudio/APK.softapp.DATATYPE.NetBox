// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* netboxApp.js — the page: devices and cables as APKTables, the NetBox CSVs
   beside them, discovered devices off the bus, the block in and out of the CAD. */

import { exportNetboxCableCsv, exportNetboxDeviceCsv } from './netbox.js';
import { connectNetboxHost, sampleExport, toBlock, addDiscoveredDevice } from './netboxHost.js';
import { showDiscovered, loadDiscoveredConfig } from './discoveredPanel.js';

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

const host = S ? connectNetboxHost(S, state, {
  onLoaded: (st, meta) => { $('block-tag').textContent = meta.blockName || meta.title || 'FROM THE CAD'; render(); },
}) : null;

function changed() {
  render();
  if (host) host.changed(toBlock(state));
}

function download(text, name) {
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
  const how = host ? host.save(toBlock(state), { filename: 'netbox_export' }) : '';
  if (how) $('block-tag').textContent = how === 'host' ? 'SAVED TO THE CAD' : 'DOWNLOADED .JSON';
});

$('btn-discovered').addEventListener('click', async () => {
  const panel = $('discovered-panel');
  panel.hidden = !panel.hidden;
  if (panel.hidden || panel.dataset.started) return;
  panel.dataset.started = '1';
  const cfg = await loadDiscoveredConfig();
  await showDiscovered($('discovered-table'), {
    S, T, statusEl: $('discovered-status'),
    kinds: Array.isArray(cfg.kinds) ? cfg.kinds : [],
    tableId: 'netbox-discovered',
    pickLabel: 'Add device',
    onPick: (thing) => { if (addDiscoveredDevice(state, thing)) changed(); },
  });
});

if (!T) $('devices-table').textContent = 'vendor/apk-table did not load.';
render();
