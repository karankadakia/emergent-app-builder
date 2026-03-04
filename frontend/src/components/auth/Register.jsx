import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    orgName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register(
        formData.orgName,
        formData.adminEmail,
        formData.adminPassword,
        formData.adminName
      );
      toast.success('Organization registered successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
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
      data-testid="register-page"
    >
      <div className="w-full max-w-md">
        <div className="bg-white border border-border rounded-md shadow-xl p-8">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-primary mb-2" data-testid="register-title">
              Create Organization
            </h1>
            <p className="text-muted-foreground">Get started with Azure Data Transformer</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="register-form">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                name="orgName"
                type="text"
                placeholder="Acme Corporation"
                value={formData.orgName}
                onChange={handleChange}
                required
                data-testid="org-name-input"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminName">Admin Name</Label>
              <Input
                id="adminName"
                name="adminName"
                type="text"
                placeholder="John Doe"
                value={formData.adminName}
                onChange={handleChange}
                required
                data-testid="admin-name-input"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                name="adminEmail"
                type="email"
                placeholder="admin@company.com"
                value={formData.adminEmail}
                onChange={handleChange}
                required
                data-testid="admin-email-input"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Password</Label>
              <Input
                id="adminPassword"
                name="adminPassword"
                type="password"
                placeholder="••••••••"
                value={formData.adminPassword}
                onChange={handleChange}
                required
                minLength={6}
                data-testid="admin-password-input"
                className="h-10"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-medium"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? (
                <span>Creating organization...</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Create Organization
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link
              to="/login"
              className="text-accent hover:underline font-medium"
              data-testid="login-link"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
