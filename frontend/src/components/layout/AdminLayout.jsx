// AdminLayout: Dedicated layout for Admin module with Indigo accents
import React from 'react';
import AdminSidebar from './AdminSidebar';
import BiologicalNetwork from './BiologicalNetwork';
import ErrorBoundary from '../common/ErrorBoundary';

const AdminLayout = ({ activeView, setActiveView, onLogout, children, animationNodeCount }) => {
  return (
    <div
      className="flex min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #020617 0%, #1E1B4B 100%)' }}
    >
      {/* Animated Background - Reusing the same component but effectively "themed" by the parent container's darkness */}
      {animationNodeCount > 0 && (
        <BiologicalNetwork
          nodeCount={animationNodeCount}
          connectionDistance={200}
          speed={0.15}
        // We can't easily change the canvas color without props, but the overlay below helps tint it
        />
      )}

      {/* Indigo Gradient Overlay for Admin Theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-transparent to-violet-900/10 pointer-events-none" />

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
