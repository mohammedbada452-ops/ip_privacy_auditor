import React, { createContext, useContext, useEffect, useState } from 'react';

type RouterContextType = {
  currentPath: string;
  navigate: (path: string) => void;
};

export const normalizePath = (path: string): string => {
  if (!path) return '/';
  const normalized = path.replace(/\/+$/, '');
  return normalized || '/';
};

const getInitialPath = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return normalizePath(window.location.pathname);
  }
  return '/';
};

const RouterContext = createContext<RouterContextType>({
  currentPath: getInitialPath(),
  navigate: () => {},
});

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(getInitialPath());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    const normalizedPath = normalizePath(path);
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', normalizedPath);
    }
    setCurrentPath(normalizedPath);
  };


  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => useContext(RouterContext);

export interface RouteLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: React.ReactNode;
}

export const Link: React.FC<RouteLinkProps> = ({ to, children, className, onClick, ...props }) => {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }

    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <a href={to} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
};
