import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4" 
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.9)), url('https://images.unsplash.com/photo-1767474604678-e32410f62d1f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCU2MGRpZ2l0YWwlMjBkYXRhJTIwZmxvdyUyMGJsdWUlMjB3aGl0ZSUyMG1pbmltYWx8ZW58MHx8fHwxNzcyNTg1MTc3fDA&ixlib=rb-4.1.0&q=85')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
      data-testid="login-page"
    >
      <div className="w-full max-w-md">
        <div className="bg-white border border-border rounded-md shadow-xl p-8">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-primary mb-2" data-testid="login-title">
              Azure Data Transformer
            </h1>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                className="h-10"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-medium"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link
              to="/register"
              className="text-accent hover:underline font-medium"
              data-testid="register-link"
            >
              Register your organization
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-white/80 mt-6">
          Convert unstructured data into structured format with Azure
        </p>
      </div>
    </div>
  );
};

export default Login;
