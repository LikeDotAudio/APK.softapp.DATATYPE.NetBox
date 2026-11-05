// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* netboxHost.js — the NetBox export block in and out of the CAD over
   cad.like.audio/host@1, through the vendored APKSoftapp client (ROAD-3491).
   Block: { type: 'netbox_export', devices: [...], cables: [...] }. No DOM here. */

export const EDITOR = 'NetBox DCIM Exporter';
export const BLOCK_TYPE = 'netbox_export';

/** The starting document: a sample, labelled as one, until a block or the bus fills it. */
export function sampleExport() {
  return {
    devices: [
      { name: 'CORE-DSP-01', deviceType: 'Audio DSP', role: 'Processor', site: 'Studio A', rack: 'RACK-01', position: 10, status: 'Active', serial: '' },
      { name: 'SW-CORE-01', deviceType: 'Cisco CBS350', role: 'Switch', site: 'Studio A', rack: 'RACK-01', position: 22, status: 'Active', serial: '' },
    ],
    cables: [
      { fromDevice: 'CORE-DSP-01', fromPort: 'Dante Pri', toDevice: 'SW-CORE-01', toPort: 'ge-0/0/1', label: 'C-DANTE-01' },
      { fromDevice: 'CORE-DSP-01', fromPort: 'Dante Sec', toDevice: 'SW-CORE-01', toPort: 'ge-0/0/2', label: 'C-DANTE-02' },
    ],
  };
}

const arr = (v) => (Array.isArray(v) ? v : []);

export function fromBlock(block) {
  const b = block && typeof block === 'object' ? block : {};
  return { devices: arr(b.devices).map((d) => ({ ...d })), cables: arr(b.cables).map((c) => ({ ...c })) };
}

export function toBlock(state) {
  return { type: BLOCK_TYPE, devices: state.devices, cables: state.cables };
}

/**
 * Add a discovered thing (APKSoftapp.discovered) as a NetBox device, or refresh
 * the row already holding its identity. Identity is the MAC, else serial, else
 * agent — never the IP. NetBox's serial column gets the real serial when known.
 */
export function addDiscoveredDevice(state, thing) {
  const deviceId = thing && (thing.mac || thing.serial || thing.agent);
  if (!deviceId) return null;
  const name = thing.name || deviceId;
  const deviceType = [thing.vendor, thing.model].filter(Boolean).join(' ');
  let row = state.devices.find((d) => d.deviceId === deviceId);
  if (!row) {
    row = { name, deviceType: deviceType || 'Unknown', role: '', site: '', rack: '', position: '', status: 'Active', serial: thing.serial || '', deviceId };
    state.devices.push(row);
  } else {
    row.name = name;
    if (deviceType) row.deviceType = deviceType;
    if (thing.serial) row.serial = thing.serial;
  }
  return row;
}

/** state = { devices, cables } (mutated in place on load); onLoaded(state, meta, block) redraws. */
export function connectNetboxHost(S, state, { onLoaded, notice } = {}) {
  return S.connectHost({
    editor: EDITOR,
    blockType: BLOCK_TYPE,
    block: toBlock(state),
    notice,
    onLoad: (block, meta) => {
      Object.assign(state, fromBlock(block));
      if (onLoaded) onLoaded(state, meta, block);
    },
    onRequest: () => ({ block: toBlock(state), meta: { filename: 'netbox_export', title: `NetBox export (${state.devices.length} devices)` } }),
  });
}
