'use client';

import React, { useState } from 'react';
import { useApiData } from '../lib/useApiData';
import { Field, cx, inputClass } from './ui';

interface Truck { number: string; driverName: string | null; label: string; own: boolean }

const NEW = '__new';

/**
 * Truck no. + driver for a plant / supplier load. Trucks seen before (and our
 * own vehicles) are a dropdown that also fills the driver; "+ New truck" types one in.
 */
export function TruckPicker({ vehicleNumber, driverName, onChange, onError }: { vehicleNumber: string; driverName: string; onChange: (v: { vehicleNumber: string; driverName: string }) => void; onError?: (m: string) => void }) {
  const q = useApiData<Truck[]>('/api/cylinder/trucks', onError);
  const trucks = q.data ?? [];
  const [typing, setTyping] = useState(false);
  const known = trucks.some((t) => t.number === vehicleNumber);
  const manual = typing || (!!vehicleNumber && q.data !== undefined && !known);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Truck no.">
        <div className="space-y-1.5">
          <select
            value={manual ? NEW : vehicleNumber}
            onChange={(e) => {
              if (e.target.value === NEW) {
                setTyping(true);
                return onChange({ vehicleNumber: '', driverName });
              }
              setTyping(false);
              const t = trucks.find((x) => x.number === e.target.value);
              onChange({ vehicleNumber: e.target.value, driverName: t?.driverName || (e.target.value ? driverName : '') });
            }}
            className={cx(inputClass, 'font-mono')}
          >
            <option value="">{trucks.length ? 'Choose truck…' : 'No trucks yet'}</option>
            {trucks.map((t) => (
              <option key={t.number} value={t.number}>{t.number}{t.label ? ` · ${t.label}` : ''}</option>
            ))}
            <option value={NEW}>+ New truck…</option>
          </select>
          {manual && <input autoFocus value={vehicleNumber} onChange={(e) => onChange({ vehicleNumber: e.target.value.toUpperCase(), driverName })} maxLength={20} placeholder="MH12 AB 1234" className={cx(inputClass, 'font-mono')} />}
        </div>
      </Field>
      <Field label="Driver name">
        <input value={driverName} onChange={(e) => onChange({ vehicleNumber, driverName: e.target.value })} maxLength={60} className={inputClass} />
      </Field>
    </div>
  );
}
