import React from 'react';

export interface GridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  colsSm?: 1 | 2 | 3 | 4;
  colsMd?: 1 | 2 | 3 | 4 | 6;
  colsLg?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 2 | 3 | 4 | 6 | 8;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  cols = 1,
  colsSm,
  colsMd,
  colsLg,
  gap = 4,
  className = '',
}) => {
  const colMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6',
    12: 'grid-cols-12',
  };

  const smMap = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
  };

  const mdMap = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    6: 'md:grid-cols-6',
  };

  const lgMap = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    6: 'lg:grid-cols-6',
    12: 'lg:grid-cols-12',
  };

  const gapMap = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  };

  const classes = [
    'grid',
    colMap[cols],
    colsSm ? smMap[colsSm] : '',
    colsMd ? mdMap[colsMd] : '',
    colsLg ? lgMap[colsLg] : '',
    gapMap[gap],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
};
