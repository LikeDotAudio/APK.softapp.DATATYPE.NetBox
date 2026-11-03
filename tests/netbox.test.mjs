import test from 'node:test';
import assert from 'node:assert/strict';
import { exportNetboxCableCsv, exportNetboxDeviceCsv } from '../js/netbox.js';

test('NetBox exporter emits valid CSV formatted for NetBox bulk imports', () => {
  const devices = [{ name: 'DSP-01', deviceType: 'DSP', role: 'Audio', site: 'HQ', rack: 'R01', position: 1, status: 'Active' }];
  const cables = [{ fromDevice: 'DSP-01', fromPort: 'ETH1', toDevice: 'SW-01', toPort: 'P1', status: 'connected', cableType: 'cat6a', label: 'W-01' }];

  const devCsv = exportNetboxDeviceCsv(devices);
  assert.match(devCsv, /name,device_type,device_role/);
  assert.match(devCsv, /"DSP-01"/);

  const cabCsv = exportNetboxCableCsv(cables);
  assert.match(cabCsv, /side_a_device,side_a_type,side_a_name/);
  assert.match(cabCsv, /"DSP-01","interface","ETH1","SW-01","interface","P1"/);
});
