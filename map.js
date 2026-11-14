/* Maps: Leaflet + OpenStreetMap, nearby clinics/hospitals from Overpass, routes from OSRM.
   Everything is free and needs no API key. */
const RHUMap = (() => {
  const FALLBACK = [14.676, 121.0437]; // used only if location permission is denied
  const maps = {};
  let user = null, facilities = null;

  const km = (a, b) => {
    const r = x => x * Math.PI / 180, dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };

  const locate = () => new Promise(res => {
    if (user) return res(user);
    if (!navigator.geolocation) return res(user = FALLBACK);
    navigator.geolocation.getCurrentPosition(
      p => res(user = [p.coords.latitude, p.coords.longitude]),
      () => res(user = FALLBACK), { timeout: 8000 });
  });

  async function loadFacilities() {
    if (facilities) return facilities;
    const [la, lo] = await locate();
    const q = `[out:json][timeout:20];(nwr(around:6000,${la},${lo})[amenity~"^(hospital|clinic)$"];nwr(around:6000,${la},${lo})[healthcare=centre];);out center 40;`;
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) });
      const j = await r.json();
      facilities = j.elements.map(e => {
        const c = e.center || e, t = e.tags || {};
        return { name: t.name || 'Health facility', lat: c.lat, lon: c.lon, phone: t.phone || t['contact:phone'] || '', hours: t.opening_hours || '', km: km(user, [c.lat, c.lon]) };
      }).filter(f => f.lat).sort((a, b) => a.km - b.km);
    } catch (e) { facilities = []; }
    return facilities;
  }

  async function route(from, to) {
    try {
      const u = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
      const j = await (await fetch(u)).json(), r = j.routes[0];
      return { line: r.geometry.coordinates.map(c => [c[1], c[0]]), min: Math.max(1, Math.round(r.duration / 60)), km: r.distance / 1000 };
    } catch (e) { return null; }
  }

  /* Draws the map in element `id`, routes to facility #index (default: nearest). */
  async function render(id, index = 0) {
    const me = await locate(), list = await loadFacilities();
    let m = maps[id];
    if (!m) {
      m = maps[id] = L.map(id, { zoomControl: false }).setView(me, 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    } else { m.eachLayer(l => { if (!l._url) m.removeLayer(l); }); }
    setTimeout(() => m.invalidateSize(), 50);
    L.circleMarker(me, { radius: 8, color: '#fff', weight: 3, fillColor: '#2a8cc7', fillOpacity: 1 }).addTo(m).bindPopup('Ikaw ay nandito');
    const target = list[index];
    if (!target) return { me, list, target: null };
    L.marker([target.lat, target.lon]).addTo(m).bindPopup(target.name);
    const rt = await route(me, [target.lat, target.lon]);
    if (rt) { const pl = L.polyline(rt.line, { color: '#ff0000', weight: 4 }).addTo(m); m.fitBounds(pl.getBounds(), { padding: [24, 24] }); }
    else m.fitBounds([me, [target.lat, target.lon]], { padding: [24, 24] });
    return { me, list, target, min: rt ? rt.min : Math.round(target.km * 3), km: rt ? rt.km : target.km };
  }

  return { render };
})();
