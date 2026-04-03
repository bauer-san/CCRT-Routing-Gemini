import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { DeliveryManifest } from "../types";

// Fix for default marker icons in Leaflet with React
// @ts-ignore
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
// @ts-ignore
import markerIcon from "leaflet/dist/images/marker-icon.png";
// @ts-ignore
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface RouteMapProps {
  manifests: DeliveryManifest[];
}

const TEAM_COLORS = [
  "#2563eb", // blue-600
  "#dc2626", // red-600
  "#16a34a", // green-600
  "#ca8a04", // yellow-600
  "#9333ea", // purple-600
  "#0891b2", // cyan-600
];

function ChangeView({ manifests }: { manifests: DeliveryManifest[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (manifests.length === 0) return;
    
    const allCoords = manifests.flatMap(m => m.clients.map(c => [c.lat || 0, c.lng || 0] as [number, number]));
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [manifests, map]);

  return null;
}

interface RouteLineProps {
  manifest: DeliveryManifest;
  color: string;
}

function RouteLine({ manifest, color }: RouteLineProps) {
  const [routePoints, setRoutePoints] = React.useState<[number, number][]>([]);

  useEffect(() => {
    const fetchRoute = async () => {
      const validClients = manifest.clients.filter(c => typeof c.lat === 'number' && typeof c.lng === 'number');
      if (validClients.length < 2) {
        setRoutePoints(validClients.map(c => [c.lat!, c.lng!] as [number, number]));
        return;
      }

      const coords = validClients
        .map(c => `${c.lng},${c.lat}`)
        .join(';');

      const tryFetch = async (url: string) => {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`OSRM request failed with status ${response.status}`);
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes || !data.routes[0]) throw new Error('Invalid OSRM response');
        return data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );
      };

      try {
        // Try primary OSRM endpoint
        const primaryUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
        const points = await tryFetch(primaryUrl);
        setRoutePoints(points);
      } catch (error) {
        try {
          // Try secondary OSRM endpoint (OpenStreetMap Germany)
          const secondaryUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=full&geometries=geojson`;
          const points = await tryFetch(secondaryUrl);
          setRoutePoints(points);
        } catch (secondaryError) {
          // Final fallback to straight lines
          setRoutePoints(validClients.map(c => [c.lat!, c.lng!] as [number, number]));
        }
      }
    };

    fetchRoute();
  }, [manifest]);

  if (routePoints.length === 0) {
    // Initial fallback to straight lines while loading
    const initialPoints = manifest.clients.map(c => [c.lat || 0, c.lng || 0] as [number, number]);
    return <Polyline positions={initialPoints} pathOptions={{ color, weight: 3, opacity: 0.4, dashArray: '5, 5' }} />;
  }

  return <Polyline positions={routePoints} pathOptions={{ color, weight: 4, opacity: 0.8 }} />;
}

export function RouteMap({ manifests }: RouteMapProps) {
  if (manifests.length === 0) return null;

  // Calculate initial center (average of all points)
  const allClients = manifests.flatMap(m => m.clients);
  const avgLat = allClients.reduce((sum, c) => sum + (c.lat || 0), 0) / allClients.length;
  const avgLng = allClients.reduce((sum, c) => sum + (c.lng || 0), 0) / allClients.length;

  return (
    <div className="w-full h-[500px] rounded-3xl overflow-hidden border border-gray-100 shadow-sm mt-8 relative z-0">
      <MapContainer
        center={[avgLat, avgLng]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView manifests={manifests} />
        
        {manifests.map((manifest, mIdx) => {
          const color = TEAM_COLORS[mIdx % TEAM_COLORS.length];
          
          return (
            <React.Fragment key={manifest.teamId}>
              <RouteLine manifest={manifest} color={color} />
              {manifest.clients.map((client, cIdx) => {
                const isHQ = cIdx === 0 || cIdx === manifest.clients.length - 1;
                return (
                  <Marker
                    key={client.id}
                    position={[client.lat || 0, client.lng || 0]}
                    icon={L.divIcon({
                      className: "custom-marker",
                      html: `<div style="background-color: ${isHQ ? '#1e293b' : color}; width: 24px; height: 24px; border-radius: ${isHQ ? '4px' : '50%'}; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${isHQ ? (cIdx === 0 ? 'S' : 'E') : cIdx}</div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                    })}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold text-sm">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.address}</p>
                        <p className="text-[10px] mt-1 font-semibold" style={{ color: isHQ ? '#1e293b' : color }}>
                          {isHQ ? (cIdx === 0 ? 'START' : 'END') : `Stop ${cIdx}`}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
