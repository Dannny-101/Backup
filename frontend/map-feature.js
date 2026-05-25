/**
 * Ten&See Map Feature
 * Mapbox-powered satellite + 3D routing map
 * Used on property.html and listing.html
 */

// Token set via window.MAPBOX_TOKEN (injected by server or inline script before this file loads)
const MAPBOX_TOKEN = window.MAPBOX_TOKEN || '';

(function () {
    'use strict';

    let map = null;
    let currentMarkers = [];
    let currentRouteLayer = null;
    let currentRouteSource = null;
    let pulseAnimFrame = null;
    let userInteracting = false;
    let selectedUniIndex = null;
    let selectedMode = 'driving';
    let subNavOpen = false;
    let entityData = null; // { lat, lng, name, linkedUniversities[] }

    // ── INIT ──────────────────────────────────────────────────────────────────
    window.initMap = function (data) {
        entityData = data;
        const container = document.getElementById('map-container');
        if (!container) return;

        const hasUniversities = data.linkedUniversities && data.linkedUniversities.length > 0;
        const hasCoords = typeof data.lat === 'number' && typeof data.lng === 'number';

        buildMapShell(hasUniversities);

        if (!hasUniversities || !hasCoords) {
            document.getElementById('map-canvas').innerHTML =
                `<div class="map-empty"><i class="fas fa-map"></i><p>No location data available</p></div>`;
            return;
        }

        loadMapbox(() => {
            mapboxgl.accessToken = MAPBOX_TOKEN;
            map = new mapboxgl.Map({
                container: 'map-canvas',
                style: 'mapbox://styles/mapbox/satellite-streets-v12',
                center: [data.lng, data.lat],
                zoom: 15,
                pitch: 45,
                bearing: -17.6,
                antialias: true
            });

            map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

            map.on('load', () => {
                add3DTerrain();
                addPropertyMarker(data);
                buildUniversityNav(data.linkedUniversities);

                // Auto-select first university with drive route
                if (data.linkedUniversities.length > 0) {
                    setTimeout(() => selectUniversity(0), 800);
                }
            });

            map.on('mousedown', () => { userInteracting = true; stopPulse(); });
            map.on('touchstart', () => { userInteracting = true; stopPulse(); });
            map.on('mouseup', () => { userInteracting = false; startPulse(); });
            map.on('touchend', () => { userInteracting = false; startPulse(); });
        });
    };

    // ── MAP SHELL HTML ─────────────────────────────────────────────────────────
    function buildMapShell(hasUniversities) {
        const container = document.getElementById('map-container');
        container.innerHTML = `
            <div class="map-wrapper">
                <div id="map-canvas"></div>
                ${hasUniversities ? `
                <div class="map-side-nav" id="mapSideNav">
                    <div class="map-nav-label"><i class="fas fa-university"></i> Nearby</div>
                    <div id="uniNavButtons"></div>
                </div>
                <div class="map-sub-nav" id="mapSubNav" style="display:none;">
                    <button class="map-sub-btn active" id="btnDrive" onclick="setRouteMode('driving')">
                        <i class="fas fa-car"></i> Drive
                    </button>
                    <button class="map-sub-btn" id="btnWalk" onclick="setRouteMode('walking')">
                        <i class="fas fa-walking"></i> Walk / BRT
                    </button>
                </div>` : ''}
            </div>`;
    }

    // ── MAPBOX LOADER ──────────────────────────────────────────────────────────
    function loadMapbox(cb) {
        if (window.mapboxgl) { cb(); return; }
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
        document.head.appendChild(css);

        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
        script.onload = cb;
        document.head.appendChild(script);
    }

    // ── 3D TERRAIN ─────────────────────────────────────────────────────────────
    function add3DTerrain() {
        map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
        });
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 });
    }

    // ── MARKERS ────────────────────────────────────────────────────────────────
    function addPropertyMarker(data) {
        const el = createMarkerEl('property', data.name);
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([data.lng, data.lat])
            .addTo(map);
        currentMarkers.push(marker);
        startPulse();
    }

    function addUniversityMarker(uni) {
        const el = createMarkerEl('university', uni.name);
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([uni.lng, uni.lat])
            .addTo(map);
        currentMarkers.push(marker);
        return marker;
    }

    function createMarkerEl(type, label) {
        const wrap = document.createElement('div');
        wrap.className = `map-marker map-marker--${type}`;
        wrap.innerHTML = `
            <div class="marker-pulse"></div>
            <div class="marker-pin">
                <i class="fas ${type === 'property' ? 'fa-building' : 'fa-university'}"></i>
            </div>
            <div class="marker-label">${label}</div>`;
        return wrap;
    }

    // ── PULSE ANIMATION ────────────────────────────────────────────────────────
    function startPulse() {
        if (userInteracting) return;
        document.querySelectorAll('.marker-pulse').forEach(el => el.classList.add('pulsing'));
    }

    function stopPulse() {
        document.querySelectorAll('.marker-pulse').forEach(el => el.classList.remove('pulsing'));
    }

    // ── UNIVERSITY NAV ─────────────────────────────────────────────────────────
    function buildUniversityNav(universities) {
        const nav = document.getElementById('uniNavButtons');
        if (!nav) return;
        nav.innerHTML = universities.map((uni, i) => `
            <button class="map-uni-btn" id="uniBtn${i}" onclick="selectUniversity(${i})">
                <i class="fas fa-university"></i>
                <span>${uni.name}</span>
            </button>
        `).join('');
    }

    window.selectUniversity = function (index) {
        selectedUniIndex = index;
        const unis = entityData.linkedUniversities;

        // Update button active state
        unis.forEach((_, i) => {
            const btn = document.getElementById(`uniBtn${i}`);
            if (btn) btn.classList.toggle('active', i === index);
        });

        // Show sub nav
        const subNav = document.getElementById('mapSubNav');
        if (subNav) {
            subNav.style.display = 'flex';
            subNav.classList.add('slide-in');
        }
        subNavOpen = true;

        // Add university marker
        clearNonPropertyMarkers();
        addUniversityMarker(unis[index]);
        startPulse();

        // Fly to midpoint between property and university
        flyToMidpoint(
            { lng: entityData.lng, lat: entityData.lat },
            { lng: unis[index].lng, lat: unis[index].lat }
        );

        // Fetch route with current mode
        setTimeout(() => fetchRoute(index, selectedMode), 900);
    };

    window.setRouteMode = function (mode) {
        selectedMode = mode;
        document.getElementById('btnDrive')?.classList.toggle('active', mode === 'driving');
        document.getElementById('btnWalk')?.classList.toggle('active', mode === 'walking');

        if (selectedUniIndex !== null) {
            flyToMidpoint(
                { lng: entityData.lng, lat: entityData.lat },
                { lng: entityData.linkedUniversities[selectedUniIndex].lng, lat: entityData.linkedUniversities[selectedUniIndex].lat }
            );
            setTimeout(() => fetchRoute(selectedUniIndex, mode), 700);
        }
    };

    // ── FLY ANIMATION ──────────────────────────────────────────────────────────
    function flyToMidpoint(a, b) {
        const midLng = (a.lng + b.lng) / 2;
        const midLat = (a.lat + b.lat) / 2;
        const dist = Math.sqrt(Math.pow(a.lng - b.lng, 2) + Math.pow(a.lat - b.lat, 2));
        const zoom = dist < 0.01 ? 15 : dist < 0.05 ? 14 : dist < 0.15 ? 13 : 12;

        map.flyTo({
            center: [midLng, midLat],
            zoom,
            pitch: 45,
            bearing: Math.atan2(b.lng - a.lng, b.lat - a.lat) * (180 / Math.PI),
            duration: 1800,
            essential: true
        });
    }

    // ── ROUTING ────────────────────────────────────────────────────────────────
    async function fetchRoute(uniIndex, mode) {
        const uni = entityData.linkedUniversities[uniIndex];
        const origin = `${entityData.lng},${entityData.lat}`;
        const dest = `${uni.lng},${uni.lat}`;
        const profile = mode === 'driving' ? 'driving' : 'walking';

        try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin};${dest}?geometries=geojson&steps=true&overview=full&access_token=${MAPBOX_TOKEN}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!data.routes || !data.routes.length) return;

            const route = data.routes[0];
            drawRoute(route.geometry, mode);
            drawWaypoints(route.legs[0]?.steps || []);
        } catch (e) {
            console.error('Route fetch error:', e);
        }
    }

    function drawRoute(geometry, mode) {
        clearRoute();
        const sourceId = 'ts-route-source';
        const layerId = 'ts-route-layer';
        const color = mode === 'driving' ? '#c9a84c' : '#4caf9a';

        map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry } });

        // Casing (outline)
        map.addLayer({
            id: layerId + '-casing',
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.6 }
        });

        // Main route
        map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': color, 'line-width': 5, 'line-opacity': 0.95 }
        });

        currentRouteSource = sourceId;
        currentRouteLayer = layerId;
    }

    function drawWaypoints(steps) {
        if (!steps.length) return;
        // Draw a waypoint dot every ~3 steps
        steps.filter((_, i) => i % 3 === 0 && i > 0).forEach((step, i) => {
            const coords = step.maneuver?.location;
            if (!coords) return;
            const el = document.createElement('div');
            el.className = 'map-waypoint';
            el.title = step.maneuver?.instruction || '';
            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat(coords)
                .addTo(map);
            currentMarkers.push(marker);
        });
    }

    function clearRoute() {
        if (currentRouteLayer) {
            if (map.getLayer(currentRouteLayer)) map.removeLayer(currentRouteLayer);
            if (map.getLayer(currentRouteLayer + '-casing')) map.removeLayer(currentRouteLayer + '-casing');
            if (map.getSource(currentRouteSource)) map.removeSource(currentRouteSource);
            currentRouteLayer = null;
            currentRouteSource = null;
        }
    }

    function clearNonPropertyMarkers() {
        // Remove all but the first marker (property)
        while (currentMarkers.length > 1) {
            currentMarkers.pop().remove();
        }
        clearRoute();
    }

})();
