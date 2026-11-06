// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* netboxIfc.js — THE DCIM EXPORT'S .IFC TWIN (ROAD-3583). Save Model writes the native netbox_export block
   AND this IFC4X3_ADD2 file through APKSoftapp.saveModel; Open Model reads it back to the same block. The
   page never talks to NetBox (the sync runs outside this tree); this is the same devices and cables as IFC.
   The spine (project, units, sites, links, systems) is netIfc.js.

     a site         IfcSite Name = the row's site ('' = one unnamed site), its IfcBuilding and storey 'DCIM'
     a rack         IfcElementAssembly USERDEFINED 'EquipmentRack' (the bench's word), Name = Tag = the rack,
                    in its site's storey; it aggregates its devices
     a device       an occurrence by its role, else its device type (netIfc kindOf: Switch an
                    IfcCommunicationsAppliance IPNETWORKEQUIPMENT, else USERDEFINED with the word), typed by one
                    IfcXxxType per device type; Name = Tag = the row's name; APK_NetworkDevice {DeviceType, Role,
                    Status, DeviceId}; APK_RackPosition {Rack, StartUnit}; Pset_ManufacturerOccurrence.SerialNumber;
                    a MAC identity is also APK_Identity and its GlobalId inst/mac:<mac>
     a port         IfcDistributionPort CABLE nested on its device, Name = the row's port, SOURCEANDSINK, DATA
                    (ELECTRICAL for a power cable or power port); APK_NetworkPort.TerminationType when the row
                    names one; a second cable on one port gets its own port '<PORT> / <cable #>' with
                    APK_Terminal.FansOutOf, which the reader folds back
     a cable        IfcCableSegment CABLESEGMENT, Name = Tag = its label, ends 'A' (SINK) and 'B' (SOURCE):
                    A-device port → A, B → B-device port (two IfcRelConnectsPorts, as the wirelist writes);
                    Pset_CableSegmentTypeCableSegment.Standard = its type (cat6a …); APK_Connection {ConnectionId,
                    CableStatus, Medium wired, Domain}
     a device a cable names that is no row: an IfcDistributionElement with only that port (not read back as a row)
     the network    IfcDistributionSystem DATA 'Network', ObjectType 'SITE NETWORK', its DATA ports the members */

import { ifcModel, readIfc, occurrenceGuid, kindOf, ident, label, int, num, str, MAC_RE } from './netIfc.js';

export { schemaOf } from './netIfc.js';

const POWER = /power|\bac\b|\bdc\b|mains/i;
const stemOf = (n) => String(n || 'netbox_export').replace(/\.(ifc|json)$/i, '');

/** The netbox_export block (netboxHost toBlock) as IFC4X3_ADD2 STEP text. */
export function netboxToIfc(block, { name } = {}) {
  const b = block || {};
  const stem = stemOf(name);
  const devices = Array.isArray(b.devices) ? b.devices : [];
  const cables = Array.isArray(b.cables) ? b.cables : [];
  const m = ifcModel({ key: ['netbox', stem], name: `NetBox export (${devices.length} devices)`, description: 'NetBox DCIM Exporter: devices and cables',
    app: 'APK.audio NetBox DCIM Exporter', appId: 'DATATYPE.NetBox', storey: 'DCIM' });

  const netGid = m.gid('network');
  const net = m.system({ gid: netGid, name: 'Network', description: 'The devices and cables of the export', objectType: 'SITE NETWORK', predefined: 'DATA' });
  m.pset('Pset_DistributionSystemCommon', netGid, [m.prop('Reference', ident('network'))], [net]);

  const types = new Map();
  const typeFor = (word, kind) => {
    const k = `${kind.entity}/${word}`;
    if (!types.has(k)) types.set(k, m.type(`${kind.entity}TYPE`, { gid: m.gid('type', kind.entity, word), name: word || 'Device', elementType: kind.objectType, predefined: kind.predefined }));
    return types.get(k);
  };

  const racks = new Map();
  const rackOf = (site, rack) => {
    const k = `${site}\u0000${rack}`;
    if (!racks.has(k)) {
      const g = m.gid('rack', site, rack);
      const ref = m.element('IFCELEMENTASSEMBLY', { gid: g, name: rack, objectType: 'EquipmentRack', tag: rack, predefined: 'USERDEFINED' });
      m.contain(ref, m.space('', site));
      racks.set(k, { ref, gid: g, devices: [] });
    }
    return racks.get(k);
  };

  const byName = new Map();
  devices.forEach((d, i) => {
    const dn = str(d.name) || `DEVICE-${i + 1}`;
    const word = str(d.role) || str(d.deviceType) || 'Device';
    const kind = kindOf(word);
    const g = occurrenceGuid(m, d.deviceId, 'device', dn);
    const el = m.element(kind.entity, { gid: g, name: dn, objectType: kind.objectType, tag: dn, predefined: kind.predefined });
    m.typeOf(el, typeFor(str(d.deviceType), kind));
    const site = str(d.site);
    const rack = str(d.rack);
    if (rack) rackOf(site, rack).devices.push(el);
    else m.contain(el, m.space('', site));
    m.pset('APK_NetworkDevice', g, [
      m.prop('DeviceType', label(str(d.deviceType))),   // always: every row carries the set, even a blank one
      d.role ? m.prop('Role', label(d.role)) : null,
      d.status ? m.prop('Status', label(d.status)) : null,
      d.deviceId ? m.prop('DeviceId', ident(d.deviceId)) : null,
    ], [el]);
    const u = num(d.position);
    m.pset('APK_RackPosition', g, [rack ? m.prop('Rack', ident(rack)) : null, u != null ? m.prop('StartUnit', int(u)) : null], [el]);
    if (d.serial) m.pset('Pset_ManufacturerOccurrence', g, [m.prop('SerialNumber', ident(d.serial))], [el]);
    const mac = str(d.deviceId).trim().toLowerCase();
    if (MAC_RE.test(mac)) m.pset('APK_Identity', g, [m.prop('IdentityKey', ident(`mac:${mac}`)), m.prop('MacAddress', ident(mac))], [el]);
    if (!byName.has(dn)) byName.set(dn, { el, gid: g, ports: [], used: new Set(), row: true });
  });
  // a device a cable names that is no row
  const far = (dn) => {
    if (!byName.has(dn)) {
      const g = m.gid('device', dn);
      const el = m.element('IFCDISTRIBUTIONELEMENT', { gid: g, name: dn, tag: dn });
      m.contain(el, m.space('', ''));
      byName.set(dn, { el, gid: g, ports: [], used: new Set(), row: false });
    }
    return byName.get(dn);
  };

  const members = [];
  cables.forEach((c, i) => {
    const n = i + 1;
    const power = POWER.test(str(c.cableType)) || POWER.test(str(c.fromType)) || POWER.test(str(c.toType));
    const sys = power ? 'ELECTRICAL' : 'DATA';
    const devPort = (dn, pn, termination) => {
      const d = far(str(dn) || '?');
      const pname = str(pn);
      const again = d.used.has(pname);
      d.used.add(pname);
      const name_ = again ? `${pname} / ${n}` : pname;
      const pg = m.gid('device', str(dn) || '?', 'port', name_);
      const p = m.port({ gid: pg, name: name_ || null, flow: 'SOURCEANDSINK', kind: 'CABLE', system: sys });
      d.ports.push(p);
      if (again) m.pset('APK_Terminal', pg, [m.prop('FansOutOf', ident(`port:${pname}`))], [p]);
      m.pset('APK_NetworkPort', pg, [termination ? m.prop('TerminationType', label(termination)) : null], [p]);
      if (sys === 'DATA') members.push(p);
      return p;
    };
    const pa = devPort(c.fromDevice, c.fromPort, c.fromType);
    const pz = devPort(c.toDevice, c.toPort, c.toType);
    const cg = m.gid('cable', String(n));
    const lbl = str(c.label);
    const cable = m.element('IFCCABLESEGMENT', { gid: cg, name: lbl || null, tag: lbl || null, predefined: 'CABLESEGMENT' });
    m.contain(cable, m.space('', str(devices.find((d) => str(d.name) === str(c.fromDevice))?.site)));
    const endA = m.port({ gid: m.gid('cable', String(n), 'A'), name: 'A', flow: 'SINK', kind: 'CABLE', system: sys });
    const endB = m.port({ gid: m.gid('cable', String(n), 'B'), name: 'B', flow: 'SOURCE', kind: 'CABLE', system: sys });
    m.nest(cable, cg, [endA, endB]);
    m.connect(pa, endA, { gid: m.rel('connects', cg, 'A'), name: lbl || null });
    m.connect(endB, pz, { gid: m.rel('connects', cg, 'B'), name: lbl || null });
    if (c.cableType) m.pset('Pset_CableSegmentTypeCableSegment', cg, [m.prop('Standard', label(c.cableType))], [cable]);
    m.pset('APK_Connection', cg, [
      lbl ? m.prop('ConnectionId', ident(lbl)) : null,
      c.status ? m.prop('CableStatus', label(c.status)) : null,
      m.prop('Medium', label('wired')),
      m.prop('Domain', label(power ? 'power' : 'network')),
    ], [cable]);
  });
  for (const d of byName.values()) m.nest(d.el, d.gid, d.ports);
  for (const r of racks.values()) m.aggregate(r.ref, r.gid, r.devices, 'Rack');
  m.group(net, netGid, members);
  return m.finish(stem);
}

/** An IFC model → the netbox_export block; throws a sentence when it holds neither a device row nor a cable. */
export function netboxFromIfc(textIn) {
  const x = readIfc(textIn);
  const rows = x.ownersOf('APK_NetworkDevice');
  const cables = x.byType('IFCCABLESEGMENT');
  if (!rows.length && !cables.length) throw new TypeError('no DCIM export in this IFC: no element carries APK_NetworkDevice and there is no IfcCableSegment');
  const siteOf = (el) => {
    const at = x.whole(el) && x.whole(el).type === 'IFCELEMENTASSEMBLY' ? x.whole(el) : el;
    let c = x.container(at);
    while (c && c.type !== 'IFCSITE') c = x.whole(c);
    return c ? x.name(c) : '';
  };
  const devices = rows.map((el) => {
    const ps = x.psets(el);
    const d = ps.APK_NetworkDevice || {};
    const pos = ps.APK_RackPosition || {};
    const row = {
      name: x.name(el),
      deviceType: str(d.DeviceType),
      role: str(d.Role),
      site: siteOf(el),
      rack: str(pos.Rack),
      position: pos.StartUnit ?? '',
      status: str(d.Status),
      serial: str(ps.Pset_ManufacturerOccurrence?.SerialNumber),
    };
    if (d.DeviceId) row.deviceId = str(d.DeviceId);
    return row;
  });
  const portName = (p) => {
    const fan = str(x.psets(p).APK_Terminal?.FansOutOf);
    return fan.startsWith('port:') ? fan.slice(5) : x.name(p);
  };
  const out = cables.map((cable) => {
    const [endA, endB] = x.ports(cable);
    const pa = x.far(endA);
    const pz = x.far(endB);
    const ps = x.psets(cable);
    const conn = ps.APK_Connection || {};
    const row = {
      fromDevice: x.name(x.host(pa)),
      fromPort: pa ? portName(pa) : '',
      toDevice: x.name(x.host(pz)),
      toPort: pz ? portName(pz) : '',
      label: x.tag(cable),
    };
    const type = ps.Pset_CableSegmentTypeCableSegment?.Standard;
    if (type) row.cableType = str(type);
    if (conn.CableStatus) row.status = str(conn.CableStatus);
    const ta = pa && x.psets(pa).APK_NetworkPort?.TerminationType;
    const tz = pz && x.psets(pz).APK_NetworkPort?.TerminationType;
    if (ta) row.fromType = str(ta);
    if (tz) row.toType = str(tz);
    return row;
  });
  return { type: 'netbox_export', devices, cables: out };
}
