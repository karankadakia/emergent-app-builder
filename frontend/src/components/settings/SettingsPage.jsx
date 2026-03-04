import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import Header from '../layout/Header';
import MainLayout from '../layout/MainLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { UserPlus, Users, Settings as SettingsIcon } from 'lucide-react';
import { USER_ROLES } from '../../utils/constants';

const SettingsPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    password: '',
    role: USER_ROLES.VIEWER
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === USER_ROLES.ADMIN;

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    setSubmitting(true);
    try {
      await api.post('/users/invite', inviteForm);
      toast.success('User invited successfully');
      setShowInviteDialog(false);
      setInviteForm({ name: '', email: '', password: '', role: USER_ROLES.VIEWER });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to invite user');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      approver: 'bg-blue-100 text-blue-800 border-blue-200',
      uploader: 'bg-green-100 text-green-800 border-green-200',
      viewer: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return (
      <Badge className={`font-mono text-xs ${colors[role] || colors.viewer}`}>
        {role.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header title="Settings" subtitle="Manage organization and users" />

      <div className="p-6 md:p-8 max-w-7xl" data-testid="settings-page">
        {/* Azure Configuration Info */}
        <Card className="mb-6 border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              <SettingsIcon className="h-6 w-6" />
              Azure Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900 mb-2">Configuration Required</p>
                <p className="text-sm text-blue-800">
                  To enable full functionality, configure the following Azure services in your backend <code className="font-mono bg-blue-100 px-2 py-0.5 rounded">.env</code> file:
                </p>
                <ul className="mt-3 space-y-1 text-sm text-blue-800 ml-4 list-disc">
                  <li><strong>Azure Data Lake Storage:</strong> AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY</li>
                  <li><strong>Azure Synapse Analytics:</strong> SYNAPSE_SERVER, SYNAPSE_DATABASE, SYNAPSE_USERNAME, SYNAPSE_PASSWORD</li>
                  <li><strong>SendGrid (Email):</strong> SENDGRID_API_KEY, SENDER_EMAIL</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management (Admin Only) */}
        {isAdmin && (
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  User Management
                </CardTitle>
                <Button onClick={() => setShowInviteDialog(true)} data-testid="invite-user-btn">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="users-table">
                    <thead className="bg-muted/50">
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className="border-t border-border hover:bg-muted/50 transition-colors"
                          data-testid={`user-row-${u.id}`}
                        >
                          <td className="p-4 font-medium">{u.name}</td>
                          <td className="p-4 text-sm text-muted-foreground">{u.email}</td>
                          <td className="p-4">{getRoleBadge(u.role)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isAdmin && (
          <Card className="border border-border">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">You don't have permission to manage settings. Contact your administrator.</p>
            </CardContent>
          </Card>
        )}

        {/* Invite User Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent data-testid="invite-dialog">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Invite New User</DialogTitle>
              <DialogDescription>Add a new user to your organization</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="John Doe"
                  data-testid="invite-name-input"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="john@company.com"
                  data-testid="invite-email-input"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  placeholder="••••••••"
                  data-testid="invite-password-input"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                >
                  <SelectTrigger className="mt-1.5" data-testid="invite-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={USER_ROLES.ADMIN}>Admin</SelectItem>
                    <SelectItem value={USER_ROLES.APPROVER}>Approver</SelectItem>
                    <SelectItem value={USER_ROLES.UPLOADER}>Uploader</SelectItem>
                    <SelectItem value={USER_ROLES.VIEWER}>Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteUser}
                disabled={submitting || !inviteForm.name || !inviteForm.email || !inviteForm.password}
                data-testid="invite-submit-btn"
              >
                {submitting ? 'Inviting...' : 'Invite User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
