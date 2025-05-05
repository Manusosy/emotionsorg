import React from 'react';
import { useNavigate } from 'react-router-dom';

export const useNavigationHook = () => {
  return useNavigate();
};

export const NavigateButton: React.FC<{
  to: string;
  children: React.ReactNode;
  className?: string;
}> = ({ to, children, className }) => {
  const navigate = useNavigate();
  
  return (
    <button 
      className={className || "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"}
      onClick={() => navigate(to)}
    >
      {children}
    </button>
  );
}; 