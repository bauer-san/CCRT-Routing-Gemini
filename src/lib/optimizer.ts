import { ClientInfo, DeliveryManifest } from "../types";
import { HQ_LOCATION } from "../constants";

const SERVICE_TIME_PER_STOP = 10; // minutes

/**
 * A simple nearest-neighbor heuristic to sort stops starting from a given point.
 */
function sortStops(start: { lat: number; lng: number }, stops: ClientInfo[]): ClientInfo[] {
  const sorted: ClientInfo[] = [];
  let current = start;
  const remaining = [...stops];

  while (remaining.length > 0) {
    let bestIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = Math.sqrt(
        Math.pow((remaining[i].lat || 0) - current.lat, 2) +
          Math.pow((remaining[i].lng || 0) - current.lng, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0];
    sorted.push(next);
    current = { lat: next.lat || 0, lng: next.lng || 0 };
  }

  return sorted;
}

/**
 * A balanced clustering implementation to group clients into delivery teams.
 * This ensures spatially-balanced manifests with approximately equal number of stops.
 * Each route starts and ends at CCRT HQ.
 */
export function optimizeManifests(
  clients: ClientInfo[],
  numTeams: number
): DeliveryManifest[] {
  if (clients.length === 0) return [];

  // Cap numTeams to clients.length to avoid empty clusters or undefined centroids
  const effectiveNumTeams = Math.min(numTeams, clients.length);

  // 1. Initialize centroids (randomly pick clients)
  let centroids = clients
    .slice(0, effectiveNumTeams)
    .map((c) => ({ lat: c.lat || 0, lng: c.lng || 0 }));

  let assignments: number[] = new Array(clients.length).fill(-1);
  let changed = true;
  let iterations = 0;

  // 2. Standard K-means to find stable centroids
  while (changed && iterations < 15) {
    changed = false;
    iterations++;

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      let minDist = Infinity;
      let closestCentroid = 0;

      for (let j = 0; j < centroids.length; j++) {
        const dist = Math.sqrt(
          Math.pow((client.lat || 0) - centroids[j].lat, 2) +
            Math.pow((client.lng || 0) - centroids[j].lng, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          closestCentroid = j;
        }
      }

      if (assignments[i] !== closestCentroid) {
        assignments[i] = closestCentroid;
        changed = true;
      }
    }

    for (let j = 0; j < centroids.length; j++) {
      const assignedClients = clients.filter((_, i) => assignments[i] === j);
      if (assignedClients.length > 0) {
        centroids[j] = {
          lat:
            assignedClients.reduce((sum, c) => sum + (c.lat || 0), 0) /
            assignedClients.length,
          lng:
            assignedClients.reduce((sum, c) => sum + (c.lng || 0), 0) /
            assignedClients.length,
        };
      }
    }
  }

  // 3. Balanced Assignment
  const targetSize = Math.floor(clients.length / effectiveNumTeams);
  const extraStops = clients.length % effectiveNumTeams;
  const capacities = new Array(effectiveNumTeams).fill(targetSize);
  for (let i = 0; i < extraStops; i++) {
    capacities[i]++;
  }

  const finalAssignments = new Array(clients.length).fill(-1);
  const teamCounts = new Array(effectiveNumTeams).fill(0);

  const distances: { clientIdx: number; teamIdx: number; dist: number }[] = [];
  for (let i = 0; i < clients.length; i++) {
    for (let j = 0; j < effectiveNumTeams; j++) {
      const dist = Math.sqrt(
        Math.pow((clients[i].lat || 0) - centroids[j].lat, 2) +
          Math.pow((clients[i].lng || 0) - centroids[j].lng, 2)
      );
      distances.push({ clientIdx: i, teamIdx: j, dist });
    }
  }

  distances.sort((a, b) => a.dist - b.dist);

  for (const item of distances) {
    if (
      finalAssignments[item.clientIdx] === -1 &&
      teamCounts[item.teamIdx] < capacities[item.teamIdx]
    ) {
      finalAssignments[item.clientIdx] = item.teamIdx;
      teamCounts[item.teamIdx]++;
    }
  }

  for (let i = 0; i < clients.length; i++) {
    if (finalAssignments[i] === -1) {
      for (let j = 0; j < effectiveNumTeams; j++) {
        if (teamCounts[j] < capacities[j]) {
          finalAssignments[i] = j;
          teamCounts[j]++;
          break;
        }
      }
    }
  }

  // 4. Create manifests with HQ as start and end
  const manifests: DeliveryManifest[] = [];
  for (let j = 0; j < effectiveNumTeams; j++) {
    const clusterClients = clients.filter((_, i) => finalAssignments[i] === j);
    
    // Sort the cluster clients for a better route starting from HQ
    const sortedRoute = sortStops({ lat: HQ_LOCATION.lat!, lng: HQ_LOCATION.lng! }, clusterClients);
    
    // Prepend and append HQ
    const fullRoute = [
      { ...HQ_LOCATION, id: `hq-start-${j}` },
      ...sortedRoute,
      { ...HQ_LOCATION, id: `hq-end-${j}` }
    ];

    // Generate Google Maps URL
    const origin = encodeURIComponent(HQ_LOCATION.address);
    const destination = origin;
    const waypoints = sortedRoute.map(c => encodeURIComponent(c.address)).join('|');
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;

    manifests.push({
      teamId: j + 1,
      clients: fullRoute,
      totalServiceTime: clusterClients.length * SERVICE_TIME_PER_STOP,
      googleMapsUrl,
    });
  }

  return manifests;
}
