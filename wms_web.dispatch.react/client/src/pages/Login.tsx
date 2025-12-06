import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';
import { 
  Package, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Truck,
  BarChart3,
  Users
} from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Invalid username or password. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Package,
      title: 'Parcel Management',
      description: 'Track and manage shipments efficiently'
    },
    {
      icon: Truck,
      title: 'Dispatch Control',
      description: 'Optimize delivery routes and schedules'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Gain insights with comprehensive reporting'
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Control access and permissions'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%2523f3f4f6%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
      
      <div className="relative min-h-screen flex">
        {/* Left Side - Features */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 to-brand-600 p-12 flex-col justify-center">
          <div className="max-w-md">
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">NID Logistics Dispatch</h1>
                <p className="text-brand-100 text-sm">Warehouse Management System</p>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-6">
              Streamline Your Logistics Operations
            </h2>
            
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                    <p className="text-brand-100 text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mr-4">
                <Package className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NID Logistics Dispatch</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Warehouse Management System</p>
              </div>
            </div>

            <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <Card.Content className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Sign in to your account to continue
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <Input
                      label="Username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      icon={<User className="w-5 h-5" />}
                      required
                      disabled={isLoading}
                    />

                    <div className="relative">
                      <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={<Lock className="w-5 h-5" />}
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    disabled={!username || !password || isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Need help? Contact your system administrator
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                © 2024 NID Logistics. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 