export interface ClientInfo {
  id: string;
  name: string;
  address: string;
  phone?: string;
  notes?: string;
  deliveryType?: string;
  status?: string;
  lat?: number;
  lng?: number;
}

export interface DeliveryManifest {
  teamId: number;
  clients: ClientInfo[];
  totalDistance?: number;
  estimatedTime?: number;
  totalServiceTime?: number;
  googleMapsUrl?: string;
}
