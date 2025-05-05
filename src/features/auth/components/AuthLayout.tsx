import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-purple-light via-white to-brand-blue-light">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
