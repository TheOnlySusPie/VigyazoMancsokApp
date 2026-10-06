import React, { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { Crosshair, PawPrint } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css"

interface MapViewProps {
    userLocation: {
        latitude: number;
        longitude: number;
    };
}

export function MapView({ userLocation: { latitude, longitude } }: MapViewProps): React.JSX.Element {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const userMarker = useRef<maplibregl.Marker | null>(null);

    useEffect(() => {
        if(!mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: "https://tiles.openfreemap.org/styles/bright",
            center: [longitude, latitude],
            zoom: 15.5,
            pitch: 45,
            bearing: -17.6,
            canvasContextAttributes: { antialias: true },
        })

        map.current.on("load", () => {
            const currentMap = map.current;
            if (!currentMap) return;

            const layers = currentMap.getStyle().layers ?? [];
            let labelLayerId: string | undefined;

            for (const layer of layers) {
                if (layer.type === 'symbol') {
                    const hasIcon = map.current?.getLayoutProperty(layer.id, 'icon-image');

                    if(hasIcon) {
                        map.current?.setLayoutProperty(layer.id, 'visibility', 'none');
                    }
                }
            }

            if (!currentMap.getSource('openfreemap')) {
                currentMap.addSource('openfreemap', {
                    url: 'https://tiles.openfreemap.org/planet',
                    type: 'vector',
                });
            }

            if (!currentMap.getLayer('3d-buildings')) {
                currentMap.addLayer(
                    {
                        id: '3d-buildings',
                        source: 'openfreemap',
                        'source-layer': 'building',
                        type: 'fill-extrusion',
                        minzoom: 15,
                        filter: ['!=', ['get', 'hide_3d'], true],
                        paint: {
                            'fill-extrusion-color': [
                                'interpolate',
                                ['linear'],
                                ['get', 'render_height'],
                                0,
                                'lightgray',
                                200,
                                'royalblue',
                                400,
                                'lightblue',
                            ],
                            'fill-extrusion-height': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                15,
                                0,
                                16,
                                ['get', 'render_height'],
                            ],
                            'fill-extrusion-base': [
                                'case',
                                ['>=', ['get', 'zoom'], 16],
                                ['get', 'render_min_height'],
                                0,
                            ],
                        },
                    },
                    labelLayerId,
                )
            }

            const markerElement = document.createElement('div');
            markerElement.className = 'user-location-marker';
            markerElement.setAttribute('role', 'img');
            markerElement.setAttribute('aria-label', 'Jelenlegi helyzet');

            const marker = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
                .setLngLat([longitude, latitude])
                .addTo(currentMap);
            userMarker.current = marker;

            let isFirstLocationFix = true;

            if(navigator.geolocation != null) {
               navigator.geolocation.watchPosition((position) => {
                    const { longitude, latitude } = position.coords;
                    const userCoords: [number, number] = [longitude, latitude];
                    
                    marker.setLngLat(userCoords);

                    if(isFirstLocationFix) {
                        map.current?.flyTo({ center: userCoords, zoom: 14 })
                        isFirstLocationFix = false;
                    } else {
                        map.current?.panTo(userCoords, {animate: true})
                    }
               }, (error) => {
                    console.error("Hiba történt a geolokáció visszakövetésekkor: ", error);
               }, {enableHighAccuracy: true, maximumAge: 0, timeout: 5000}) 
            }
        })

        return () => {
            userMarker.current?.remove();
            userMarker.current = null;
            map.current?.remove();
            map.current = null;
        }
    }, [])

    return (
        <div className="map-view-shell">
            <div ref={mapContainer} className="map-canvas" />
            <div className="map-controls" aria-label="Térkép vezérlők">
                <button type="button" aria-label="Szűrők" className="map-control-button map-filter-button">
                    <PawPrint aria-hidden="true" />
                </button>
                <div className="map-zoom-controls">
                    <button type="button" aria-label="Nagyítás" onClick={() => map.current?.zoomIn()}>+</button>
                    <button type="button" aria-label="Kicsinyítés" onClick={() => map.current?.zoomOut()}>-</button>
                </div>
                <button
                    type="button"
                    aria-label="Ugrás a jelenlegi helyre"
                    className="map-control-button map-location-button"
                    onClick={() => map.current?.flyTo({ center: [longitude, latitude], zoom: 15.5 })}
                >
                    <Crosshair aria-hidden="true" />
                </button>
            </div>
        </div>
    )
}