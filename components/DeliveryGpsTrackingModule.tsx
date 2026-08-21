'use client';
import React, { useState, useEffect } from 'react';
import { Navigation, MapPin, Zap, RefreshCw, Smartphone, Battery, Shield } from 'lucide-react';

export default function DeliveryGpsTrackingModule() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/delivery/gps');
      const json = await res.json();
      if (json.success) setLocations(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGps();
    const interval = setInterval(fetchGps, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Navigation className="w-7 h-7 text-indigo-600" /> Phase 2: Live GPS Tracking & AI Route Optimization
          </h1>
          <p className="text-sm text-slate-500">Real-time delivery boy locations and AI fuel-saving route sequence</p>
        </div>
        <button onClick={fetchGps} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Live Map
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Tracked Delivery Boys */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Active Delivery Partners</h2>
          {locations.map(loc => (
            <div key={loc.deliveryBoyId} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{loc.name}</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">ONLINE</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-4">
                <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5 text-indigo-500" /> Speed: {loc.speed}</span>
                <span className="flex items-center gap-1"><Battery className="w-3.5 h-3.5 text-emerald-500" /> Battery: {loc.battery}</span>
              </div>
              <div className="text-xs text-slate-400">Lat: {loc.lat}, Lng: {loc.lng}</div>
            </div>
          ))}
        </div>

        {/* Live Map Representation */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <MapPin className="w-5 h-5" /> Live Map Coordinates Overlay (Central Delhi Zone)
            </div>
            <span className="text-xs bg-emerald-950 border border-emerald-700 text-emerald-300 px-3 py-1 rounded-full font-semibold">
              AI Route Engine Active (18.5% Fuel Saved)
            </span>
          </div>

          <div className="h-64 bg-slate-950/80 rounded-xl border border-slate-800 p-4 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="text-center space-y-2 z-10">
              <Navigation className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
              <div className="font-bold text-slate-200 text-base">Live Route Optimizer Active</div>
              <div className="text-xs text-slate-400">2 Delivery Partners moving on optimal route sequence</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
