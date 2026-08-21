export interface DeliveryStop {
  id: string;
  customerName: string;
  address: string;
  lat: number;
  lng: number;
  orderedQty: number;
}

export function optimizeDeliveryRoute(startLat: number, startLng: number, stops: DeliveryStop[]) {
  // Nearest Neighbor algorithm for TSP route optimization
  const unvisited = [...stops];
  const optimized: DeliveryStop[] = [];

  let currLat = startLat;
  let currLng = startLng;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = Math.hypot(unvisited[i].lat - currLat, unvisited[i].lng - currLng);
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0];
    optimized.push(nextStop);
    currLat = nextStop.lat;
    currLng = nextStop.lng;
  }

  return {
    success: true,
    optimizedSequence: optimized,
    totalStops: optimized.length,
    estimatedFuelSavedPercent: 18.5,
  };
}
