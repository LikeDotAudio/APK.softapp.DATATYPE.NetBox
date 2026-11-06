// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// ROAD-3583: the export's .ifc twin (js/netboxIfc.js) — written byte-deterministically, read back to the
// same block. IFC_OUT=<dir> npm test also writes the file there, for IfcOpenShell validate + the BIM oracle
// (DATABASE.server.BIM SRC/tools/ifc/editors_census.py).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sampleExport, toBlock, addDiscoveredDevice } from '../js/netboxHost.js';
import { netboxToIfc, netboxFromIfc, schemaOf } from '../js/netboxIfc.js';

function out(name, text) {
  if (!process.env.IFC_OUT) return;
  mkdirSync(process.env.IFC_OUT, { recursive: true });
  writeFileSync(join(process.env.IFC_OUT, name), text);
}

function exportBlock() {
  const st = sampleExport();
  addDiscoveredDevice(st, { mac: 'b8:27:eb:00:00:09', serial: 'SN-77', name: 'pi', vendor: 'Raspberry', model: 'Pi 4' });
  st.devices.push({ name: 'DEVICE-4', deviceType: '', role: '', site: '', rack: '', position: '', status: 'Active', serial: '' });
  st.cables.push({ fromDevice: 'pi', fromPort: 'eth0', toDevice: 'SW-CORE-01', toPort: 'ge-0/0/1', cableType: 'cat6a', label: 'C-PI', status: 'planned', fromType: 'interface', toType: 'interface' });
  st.cables.push({ fromDevice: 'PDU-1', fromPort: 'OUT1', toDevice: 'SW-CORE-01', toPort: 'PSU1', cableType: 'power', label: 'P1', toType: 'power-port' });
  return JSON.parse(JSON.stringify(toBlock(st)));
}

test('the export: the same block writes the same bytes, and reads back to the same block', () => {
  const block = exportBlock();
  const a = netboxToIfc(block, { name: 'netbox_export' });
  assert.equal(a, netboxToIfc(JSON.parse(JSON.stringify(block)), { name: 'netbox_export' }));
  assert.equal(schemaOf(a), 'IFC4X3_ADD2');
  assert.match(a, /IFCSITE\('[^']+',\$,'Studio A'/);
  assert.match(a, /IFCELEMENTASSEMBLY\('[^']+',\$,'RACK-01',\$,'EquipmentRack',\$,\$,'RACK-01',\$,\.USERDEFINED\.\)/);
  assert.match(a, /IFCCOMMUNICATIONSAPPLIANCE\('[^']+',\$,'SW-CORE-01',\$,\$,\$,\$,'SW-CORE-01',\.IPNETWORKEQUIPMENT\.\)/);
  assert.match(a, /IFCCABLESEGMENT\('[^']+',\$,'C-DANTE-01',\$,\$,\$,\$,'C-DANTE-01',\.CABLESEGMENT\.\)/);
  assert.match(a, /'Standard',\$,IFCLABEL\('cat6a'\)/);
  assert.match(a, /'StartUnit',\$,IFCINTEGER\(22\)/);
  assert.match(a, /'SerialNumber',\$,IFCIDENTIFIER\('SN-77'\)/);
  assert.equal((a.match(/IFCRELCONNECTSPORTS\(/g) || []).length, 2 * block.cables.length, 'each cable: device → A, B → device');
  out('netbox-export.ifc', a);
  const b = netboxFromIfc(a);
  assert.deepEqual(b, block);
  assert.equal(netboxToIfc(b, { name: 'netbox_export' }), a, 'read and written again: the same file');
});

test('a second cable on one port fans out and folds back; a power cable runs on ELECTRICAL ports', () => {
  const block = exportBlock();
  block.cables.push({ fromDevice: 'CORE-DSP-01', fromPort: 'Dante Pri', toDevice: 'pi', toPort: 'eth1', label: 'C-AGAIN' });
  const a = netboxToIfc(block, { name: 'x' });
  assert.match(a, /'FansOutOf',\$,IFCIDENTIFIER\('port:Dante Pri'\)/);
  assert.match(a, /IFCDISTRIBUTIONPORT\('[^']+',\$,'PSU1',\$,\$,\$,\$,\.SOURCEANDSINK\.,\.CABLE\.,\.ELECTRICAL\.\)/);
  assert.deepEqual(netboxFromIfc(a).cables.at(-1), block.cables.at(-1));
});

test('identity is the MAC or serial, never an IP; a cable to a device with no row adds no row', () => {
  const a = netboxToIfc(exportBlock(), { name: 'x' });
  assert.match(a, /'MacAddress',\$,IFCIDENTIFIER\('b8:27:eb:00:00:09'\)/);
  assert.match(a, /IFCDISTRIBUTIONELEMENT\('[^']+',\$,'PDU-1'/);
  assert.equal(netboxFromIfc(a).devices.some((d) => d.name === 'PDU-1'), false);
});

test('no export in the file: a sentence, never a half-read block', () => {
  const a = netboxToIfc({ devices: [], cables: [] }, { name: 'x' });
  assert.throws(() => netboxFromIfc(a), /no DCIM export in this IFC/);
});
