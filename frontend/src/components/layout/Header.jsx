import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ title, subtitle }) => {
  const { user } = useAuth();

  return (
    <div className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40 px-6 md:px-8 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary" data-testid="page-title">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1" data-testid="page-subtitle">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default Header;
