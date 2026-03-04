import React from 'react';
import Sidebar from './Sidebar';
import { Toaster } from '../ui/sonner';

const MainLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen" data-testid="main-layout">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
};

export default MainLayout;
