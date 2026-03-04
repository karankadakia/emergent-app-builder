import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../layout/Header';
import MainLayout from '../layout/MainLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { APPROVAL_STATUS, USER_ROLES } from '../../utils/constants';

const ApprovalsPage = () => {
  const [approvals, setApprovals] = useState([]);
  const [files, setFiles] = useState({});
  const [users, setUsers] = useState({});
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [reviewComments, setReviewComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const canApprove = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.APPROVER;

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const [approvalsRes, filesRes, usersRes] = await Promise.all([
        api.get('/approvals'),
        api.get('/files'),
        canApprove ? api.get('/users') : Promise.resolve({ data: [] })
      ]);

      setApprovals(approvalsRes.data);

      const filesMap = {};
      filesRes.data.forEach(f => { filesMap[f.id] = f; });
      setFiles(filesMap);

      const usersMap = {};
      usersRes.data.forEach(u => { usersMap[u.id] = u; });
      setUsers(usersMap);
    } catch (error) {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (approvalId, status) => {
    setSubmitting(true);
    try {
      await api.put(`/approvals/${approvalId}`, {
        status,
        comments: reviewComments
      });
      toast.success(`Approval ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setSelectedApproval(null);
      setReviewComments('');
      fetchApprovals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process approval');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      approved: { bg: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
      rejected: { bg: 'bg-red-100 text-red-800 border-red-200', icon: XCircle }
    };
    const style = styles[status] || styles.pending;
    const Icon = style.icon;
    return (
      <Badge className={`font-mono text-xs flex items-center gap-1 ${style.bg}`}>
        <Icon className="h-3 w-3" />
        {status.toUpperCase()}
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
      <Header
        title="Approvals"
        subtitle="Review and approve data loading requests"
      />

      <div className="p-6 md:p-8 max-w-7xl" data-testid="approvals-page">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Approval Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {approvals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="no-approvals">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No approval requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="approvals-table">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      <th className="p-4">File</th>
                      <th className="p-4">Requested By</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Requested</th>
                      {canApprove && <th className="p-4">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map((approval) => {
                      const file = files[approval.file_id];
                      const requester = users[approval.requested_by];
                      return (
                        <tr
                          key={approval.id}
                          className="border-t border-border hover:bg-muted/50 transition-colors"
                          data-testid={`approval-row-${approval.id}`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-accent" />
                              <span className="font-medium">{file?.original_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm">
                            {requester?.name || 'Unknown'}
                          </td>
                          <td className="p-4">{getStatusBadge(approval.status)}</td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {format(new Date(approval.created_at), 'MMM dd, yyyy HH:mm')}
                          </td>
                          {canApprove && (
                            <td className="p-4">
                              {approval.status === APPROVAL_STATUS.PENDING ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedApproval(approval);
                                    setReviewComments(approval.comments || '');
                                  }}
                                  data-testid={`review-btn-${approval.id}`}
                                >
                                  Review
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {approval.status === APPROVAL_STATUS.APPROVED ? 'Approved' : 'Rejected'}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedApproval} onOpenChange={(open) => !open && setSelectedApproval(null)}>
          <DialogContent className="max-w-2xl" data-testid="review-dialog">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Review Approval Request</DialogTitle>
            </DialogHeader>
            
            {selectedApproval && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
                  <div>
                    <p className="text-sm text-muted-foreground">File</p>
                    <p className="font-medium">{files[selectedApproval.file_id]?.original_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested By</p>
                    <p className="font-medium">{users[selectedApproval.requested_by]?.name || 'Unknown'}</p>
                  </div>
                </div>

                {selectedApproval.comments && (
                  <div>
                    <p className="text-sm font-medium mb-2">Requester Comments:</p>
                    <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                      {selectedApproval.comments}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">Review Comments</label>
                  <Textarea
                    placeholder="Add your review comments..."
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    rows={4}
                    data-testid="review-comments"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedApproval(null)}
                disabled={submitting}
                data-testid="cancel-btn"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReview(selectedApproval.id, APPROVAL_STATUS.REJECTED)}
                disabled={submitting}
                data-testid="reject-btn"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleReview(selectedApproval.id, APPROVAL_STATUS.APPROVED)}
                disabled={submitting}
                data-testid="approve-btn"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default ApprovalsPage;
