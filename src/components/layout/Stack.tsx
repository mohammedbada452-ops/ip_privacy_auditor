import React from 'react';

export interface StackProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  gap?: 0 | 1 | 2 | 3 | 4 | 6 | 8 | 10;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
  wrap?: boolean;
}

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'column',
  gap = 4,
  align = 'stretch',
  justify = 'start',
  className = '',
  wrap = false,
}) => {
  const gapClasses = {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
    10: 'gap-10',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  const flexDir = direction === 'row' ? 'flex-row' : 'flex-col';
  const flexWrap = wrap ? 'flex-wrap' : 'flex-nowrap';

  return (
    <div
      className={`flex ${flexDir} ${gapClasses[gap]} ${alignClasses[align]} ${justifyClasses[justify]} ${flexWrap} ${className}`}
    >
      {children}
    </div>
  );
};
