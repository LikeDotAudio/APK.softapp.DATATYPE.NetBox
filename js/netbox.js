// Part of APK.audio - NetBox DCIM Synchronizer & Exporter
// Ported from OneThing ACTION.netbox-export

export function exportNetboxDeviceCsv(devices = []) {
  const headers = ['name', 'device_type', 'device_role', 'site', 'rack', 'position', 'status'];
  const rows = devices.map(d => [
    `"${d.name}"`,
    `"${d.deviceType || 'Audio DSP'}"`,
    `"${d.role || 'Processor'}"`,
    `"${d.site || 'Main Studio'}"`,
    `"${d.rack || 'RACK-01'}"`,
    `"${d.position || 1}"`,
    `"${d.status || 'Active'}"`
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportNetboxCableCsv(cables = []) {
  const headers = ['side_a_device', 'side_a_type', 'side_a_name', 'side_b_device', 'side_b_type', 'side_b_name', 'status', 'type', 'label'];
  const rows = cables.map(c => [
    `"${c.fromDevice}"`,
    `"${c.fromType || 'interface'}"`,
    `"${c.fromPort}"`,
    `"${c.toDevice}"`,
    `"${c.toType || 'interface'}"`,
    `"${c.toPort}"`,
    `"${c.status || 'connected'}"`,
    `"${c.cableType || 'cat6a'}"`,
    `"${c.label || ''}"`
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
