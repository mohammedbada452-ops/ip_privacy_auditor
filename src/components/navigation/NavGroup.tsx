import React from 'react';

export interface NavGroupProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const NavGroup: React.FC<NavGroupProps> = ({
  children,
  title,
  className = '',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {title && (
        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          {title}
        </div>
      )}
      {children}
    </div>
  );
};
