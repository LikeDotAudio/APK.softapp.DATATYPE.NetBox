// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// NetBox DCIM Synchronizer & Exporter. Ported from OneThing ACTION.netbox-export.

/** One CSV cell, always quoted, a quote inside doubled. */
export function cell(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export function exportNetboxDeviceCsv(devices = []) {
  const headers = ['name', 'device_type', 'device_role', 'site', 'rack', 'position', 'status', 'serial'];
  const rows = devices.map(d => [
    cell(d.name),
    cell(d.deviceType || 'Audio DSP'),
    cell(d.role || 'Processor'),
    cell(d.site || 'Main Studio'),
    cell(d.rack || 'RACK-01'),
    cell(d.position || 1),
    cell(d.status || 'Active'),
    cell(d.serial || ''),
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportNetboxCableCsv(cables = []) {
  const headers = ['side_a_device', 'side_a_type', 'side_a_name', 'side_b_device', 'side_b_type', 'side_b_name', 'status', 'type', 'label'];
  const rows = cables.map(c => [
    cell(c.fromDevice),
    cell(c.fromType || 'interface'),
    cell(c.fromPort),
    cell(c.toDevice),
    cell(c.toType || 'interface'),
    cell(c.toPort),
    cell(c.status || 'connected'),
    cell(c.cableType || 'cat6a'),
    cell(c.label || ''),
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
