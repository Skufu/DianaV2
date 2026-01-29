// AdminLayout: Dedicated layout for Admin module with Indigo accents
import React from 'react';
import AdminSidebar from './AdminSidebar';
import BiologicalNetwork from './BiologicalNetwork';
import ErrorBoundary from '../common/ErrorBoundary';

const AdminLayout = ({ activeView, setActiveView, onLogout, children }) => {
  return (
    <div
      className="flex min-h-screen relative overflow-hidden bg-slate-50"
    >
      {/* Animated Background */}
      <BiologicalNetwork
        nodeCount={40}
        connectionDistance={200}
        speed={0.15}
      />

      {/* Indigo Gradient Overlay for Admin Theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-violet-50/50 pointer-events-none" />

      <AdminSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={onLogout}
      />

      <main className="relative z-10 flex-1 ml-20 lg:ml-72 p-6 lg:p-8">
        <ErrorBoundary section="admin">
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default AdminLayout;
