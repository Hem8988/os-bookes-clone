'use client';

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Shield, 
  Truck, 
  UserCheck, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Edit, 
  CheckCircle, 
  XCircle,
  Briefcase,
  Award
} from 'lucide-react';
import { EmployeeMaster } from '../lib/types';
import { AddEditEmployeeModal } from './AddEditEmployeeModal';

const DEFAULT_STAFF: EmployeeMaster[] = [
  {
    id: 'emp_1',
    name: 'Ramesh Kumar',
    role: 'Delivery Boy',
    phone: '+91 98260 11223',
    email: 'ramesh.delivery@deskshark.in',
    salary: 18000,
    commissionPercent: 2,
    active: true,
    city: 'Indore',
    joiningDate: '2025-01-15',
    designation: 'Senior Fleet Delivery Executive',
    salaryType: 'Month',
  },
  {
    id: 'emp_2',
    name: 'Vikram Sharma',
    role: 'Relationship Manager',
    phone: '+91 98260 44556',
    email: 'vikram.rm@deskshark.in',
    salary: 32000,
    commissionPercent: 5,
    active: true,
    city: 'Indore',
    joiningDate: '2024-06-10',
    designation: 'Key Account Relationship Manager',
    salaryType: 'Month',
  },
  {
    id: 'emp_3',
    name: 'Suresh Patel',
    role: 'Delivery Boy',
    phone: '+91 98260 77889',
    email: 'suresh.delivery@deskshark.in',
    salary: 17500,
    commissionPercent: 2,
    active: true,
    city: 'Bhopal',
    joiningDate: '2025-03-01',
    designation: 'LPG Delivery Executive',
    salaryType: 'Month',
  },
  {
    id: 'emp_4',
    name: 'Priya Verma',
    role: 'Relationship Manager',
    phone: '+91 98260 99000',
    email: 'priya.rm@deskshark.in',
    salary: 35000,
    commissionPercent: 5,
    active: true,
    city: 'Indore',
    joiningDate: '2023-11-20',
    designation: 'Commercial Accounts Relationship Lead',
    salaryType: 'Month',
  },
  {
    id: 'emp_5',
    name: 'Amit Joshi',
    role: 'Accountant',
    phone: '+91 98260 33445',
    email: 'accounts@deskshark.in',
    salary: 28000,
    commissionPercent: 0,
    active: true,
    city: 'Indore',
    joiningDate: '2024-02-14',
    designation: 'Head Accountant',
    salaryType: 'Month',
  },
];

export const StaffManagementModule: React.FC = () => {
  const [staffList, setStaffList] = useState<EmployeeMaster[]>(DEFAULT_STAFF);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<EmployeeMaster | null>(null);

  const filteredStaff = staffList.filter((emp) => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone.includes(searchQuery) ||
      (emp.city && emp.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.designation && emp.designation.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleSaveStaff = (saved: EmployeeMaster) => {
    setStaffList((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      if (exists) {
        return prev.map((e) => (e.id === saved.id ? saved : e));
      }
      return [saved, ...prev];
    });
  };

  const handleToggleActive = (id: string) => {
    setStaffList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e))
    );
  };

  const totalStaffCount = staffList.length;
  const deliveryBoysCount = staffList.filter((e) => e.role === 'Delivery Boy').length;
  const rmCount = staffList.filter((e) => e.role === 'Relationship Manager').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl md:text-2xl font-black tracking-wide">Staff & Fleet Management</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400">
            Manage Delivery Boys, Relationship Managers, Accountants & Staff Assignments for B2B Customers
          </p>
        </div>

        <button
          onClick={() => {
            setStaffToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New Staff Member</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Active Staff</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalStaffCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delivery Boys (Fleet)</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">{deliveryBoysCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Truck className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Relationship Managers</p>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{rmCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Staff Name, Phone, City..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
          {['ALL', 'Delivery Boy', 'Relationship Manager', 'Salesman', 'Accountant'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                roleFilter === role
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Role / Designation</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">City</th>
                <th className="py-3.5 px-4">Salary & Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400 font-bold">
                    No staff members match the search query or filter.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-200 dark:border-indigo-800">
                          {staff.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{staff.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Joined: {staff.joiningDate || '2024-01-01'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border ${
                        staff.role === 'Delivery Boy'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          : staff.role === 'Relationship Manager'
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}>
                        {staff.role === 'Delivery Boy' && <Truck className="h-3.5 w-3.5" />}
                        {staff.role === 'Relationship Manager' && <UserCheck className="h-3.5 w-3.5" />}
                        <span>{staff.role}</span>
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{staff.designation}</p>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{staff.phone}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{staff.email}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{staff.city || 'Indore'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{staff.salary?.toLocaleString('en-IN')} / {staff.salaryType || 'Month'}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(staff.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black cursor-pointer transition-all ${
                          staff.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {staff.active ? <CheckCircle className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3" />}
                        <span>{staff.active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setStaffToEdit(staff);
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      <AddEditEmployeeModal
        isOpen={isModalOpen}
        employeeToEdit={staffToEdit}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveStaff}
      />
    </div>
  );
};
