'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { EmployeeMaster } from '../lib/types';

interface AddEditEmployeeModalProps {
  isOpen: boolean;
  employeeToEdit?: EmployeeMaster | null;
  onClose: () => void;
  onSave: (employee: EmployeeMaster) => void;
}

export const AddEditEmployeeModal: React.FC<AddEditEmployeeModalProps> = ({
  isOpen,
  employeeToEdit,
  onClose,
  onSave,
}) => {
  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [mobileNumber, setMobileNumber] = useState('');
  const [city, setCity] = useState('');
  const [joiningDate, setJoiningDate] = useState(getTodayDateString());
  const [designation, setDesignation] = useState('');
  const [salary, setSalary] = useState<number | ''>(0);
  const [salaryType, setSalaryType] = useState<'Day' | 'Month'>('Month');
  const [paidHoliday, setPaidHoliday] = useState<number | ''>(0);
  const [commission, setCommission] = useState<number | ''>(0);
  const [specialCommission, setSpecialCommission] = useState<number | ''>(0);
  const [totalSaleCommission, setTotalSaleCommission] = useState<number | ''>(0);
  const [commissionOnManufacturing, setCommissionOnManufacturing] = useState(false);

  useEffect(() => {
    const today = getTodayDateString();
    if (employeeToEdit) {
      setName(employeeToEdit.name || '');
      setActive(employeeToEdit.active !== undefined ? employeeToEdit.active : true);
      setMobileNumber(employeeToEdit.phone || '');
      setCity(employeeToEdit.city || '');
      setJoiningDate(employeeToEdit.joiningDate || today);
      setDesignation(employeeToEdit.designation || employeeToEdit.role || '');
      setSalary(employeeToEdit.salary !== undefined ? employeeToEdit.salary : 0);
      setSalaryType(employeeToEdit.salaryType || 'Month');
      setPaidHoliday(employeeToEdit.paidHoliday !== undefined ? employeeToEdit.paidHoliday : 0);
      setCommission(employeeToEdit.commissionPercent !== undefined ? employeeToEdit.commissionPercent : 0);
      setSpecialCommission(employeeToEdit.specialCommission !== undefined ? employeeToEdit.specialCommission : 0);
      setTotalSaleCommission(employeeToEdit.totalSaleCommission !== undefined ? employeeToEdit.totalSaleCommission : 0);
      setCommissionOnManufacturing(employeeToEdit.commissionOnManufacturing || false);
    } else {
      setName('');
      setActive(true);
      setMobileNumber('');
      setCity('');
      setJoiningDate(today);
      setDesignation('');
      setSalary(0);
      setSalaryType('Month');
      setPaidHoliday(0);
      setCommission(0);
      setSpecialCommission(0);
      setTotalSaleCommission(0);
      setCommissionOnManufacturing(false);
    }
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter Employee Name');
      return;
    }

    const savedEmployee: EmployeeMaster = {
      id: employeeToEdit?.id || `emp-${Date.now()}`,
      name: name.trim(),
      role: employeeToEdit?.role || 'Salesman',
      phone: mobileNumber.trim(),
      email: employeeToEdit?.email || '',
      salary: Number(salary) || 0,
      commissionPercent: Number(commission) || 0,
      active,
      city: city.trim(),
      joiningDate,
      designation: designation.trim(),
      salaryType,
      paidHoliday: Number(paidHoliday) || 0,
      specialCommission: Number(specialCommission) || 0,
      totalSaleCommission: Number(totalSaleCommission) || 0,
      commissionOnManufacturing,
    };

    onSave(savedEmployee);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden my-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">

        {/* Header Bar */}
        <div className="bg-[#00a8b5] px-5 py-3 flex items-center justify-between text-white shadow-sm">
          <h2 className="text-lg font-extrabold tracking-wide">Employee Master</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 bg-[#dc3545] hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5 font-extrabold" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold text-slate-800 dark:text-slate-200">

          {/* Row 1: Employee Name & Active Toggle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 dark:text-slate-100">Employee Name</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">Active</span>
              </div>
            </div>
            <input
              type="text"
              required
              placeholder="Enter Employee Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400 font-bold"
            />
          </div>

          {/* Row 2: Mobile Number & City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Mobile Number</label>
              <input
                type="text"
                placeholder="Enter Mobile Number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">City</label>
              <input
                type="text"
                placeholder="Enter City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Row 3: Joining Date, Designation, Salary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Designation</label>
              <input
                type="text"
                placeholder="Enter Designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Salary</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Day</span>
                  <button
                    type="button"
                    onClick={() => setSalaryType(salaryType === 'Month' ? 'Day' : 'Month')}
                    className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      salaryType === 'Month' ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        salaryType === 'Month' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Month</span>
                </div>
              </div>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Row 4: Paid Holiday, Commission, Special Commission */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Paid Holiday</label>
              <input
                type="number"
                value={paidHoliday}
                onChange={(e) => setPaidHoliday(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Commission</label>
              <input
                type="number"
                value={commission}
                onChange={(e) => setCommission(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Special Commission</label>
              <input
                type="number"
                value={specialCommission}
                onChange={(e) => setSpecialCommission(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Row 5: Total Sale Commission, Commission on Manufacturing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Total Sale Commission</label>
              <input
                type="number"
                value={totalSaleCommission}
                onChange={(e) => setTotalSaleCommission(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Commission on Manufacturing</label>
              <div className="relative">
                <select
                  value={commissionOnManufacturing ? 'YES' : 'NO'}
                  onChange={(e) => setCommissionOnManufacturing(e.target.value === 'YES')}
                  className="w-full px-3 py-2 pr-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer font-bold"
                >
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/60 -mx-6 -mb-6 p-4">
            <button
              type="submit"
              className="px-6 py-2 rounded bg-[#28a745] hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-colors cursor-pointer"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded bg-[#dc3545] hover:bg-red-700 text-white font-extrabold text-xs shadow transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
