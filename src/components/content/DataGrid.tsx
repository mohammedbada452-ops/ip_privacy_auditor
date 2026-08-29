import React from 'react';

export interface DataGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const DataGrid: React.FC<DataGridProps> = ({
  children,
  columns = 2,
  className = '',
}) => {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${colClasses[columns]} gap-3 ${className}`}>
      {children}
    </div>
  );
};
