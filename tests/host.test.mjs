// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// The NetBox export block round trip over cad.like.audio/host@1 (ROAD-3491), with
// the app's vendored APKSoftapp client in a stub window; discovered devices by identity.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { connectNetboxHost, sampleExport, fromBlock, toBlock, addDiscoveredDevice, EDITOR, BLOCK_TYPE } from '../js/netboxHost.js';
import { exportNetboxDeviceCsv, exportNetboxCableCsv } from '../js/netbox.js';

const require = createRequire(import.meta.url);
const { world, hostContract } = require('./host-world.cjs');

test('load → edit → request: the CAD gets the edited export back, at our origin, on host@1', async () => {
  const w = world();
  const state = sampleExport();
  const loaded = [];
  const host = connectNetboxHost(w.S, state, { onLoaded: (s, meta) => loaded.push(meta), notice: false });
  assert.ok(host.embedded);
  assert.deepEqual(w.toParent[0], { m: { protocol: 'cad.like.audio/host@1', type: 'editorReady', editor: EDITOR, blockType: BLOCK_TYPE }, o: w.ORIGIN });

  w.fire({ protocol: w.S.PROTOCOL, type: 'load', block: { type: BLOCK_TYPE, devices: [{ name: 'D1' }], cables: [] }, meta: { blockName: 'NB_1' } });
  assert.deepEqual(loaded, [{ blockName: 'NB_1' }]);
  addDiscoveredDevice(state, { mac: '00:0e:c6:00:00:01', serial: 'SN-77', name: 'switch-a', vendor: 'Cisco', model: 'CBS350', ips: ['10.0.0.2'] });
  w.fire({ protocol: w.S.PROTOCOL, type: 'request' });
  const save = w.toParent.at(-1);
  assert.equal(save.o, w.ORIGIN, 'never "*"');
  assert.equal(save.m.type, 'blockSave');
  assert.equal(save.m.meta.blockName, 'NB_1');
  assert.deepEqual(save.m.block.devices.map((d) => d.name), ['D1', 'switch-a']);
  assert.deepEqual(toBlock(fromBlock(save.m.block)), save.m.block, 'the block survives a reload');

  const c = await hostContract();
  if (c) for (const { m } of w.toParent) assert.deepEqual(c.validateMessage(c.schema, 'toCad', m), [], m.type);
});

test('a discovered device is one row per MAC / serial; its serial reaches the NetBox CSV; an IP alone is nothing', () => {
  const st = { devices: [], cables: [] };
  const a = addDiscoveredDevice(st, { mac: '00:0e:c6:00:00:01', serial: 'SN-77', name: 'sw', ips: ['10.0.0.2'] });
  const b = addDiscoveredDevice(st, { mac: '00:0e:c6:00:00:01', serial: 'SN-77', name: 'sw-renamed', ips: ['10.0.0.3'] });
  assert.equal(a, b);
  assert.equal(st.devices.length, 1);
  assert.equal(addDiscoveredDevice(st, { ips: ['10.0.0.9'] }), null);
  assert.match(exportNetboxDeviceCsv(st.devices), /"sw-renamed".*"SN-77"$/m);
});

test('a quote inside a value is doubled, so the CSV keeps its columns', () => {
  const csv = exportNetboxCableCsv([{ fromDevice: 'A "rack"', fromPort: 'P1', toDevice: 'B', toPort: 'P2' }]);
  assert.match(csv, /"A ""rack"""/);
});
