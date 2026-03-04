import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Textarea } from '../ui/textarea';
import { ArrowLeft, Save, Send, GitMerge } from 'lucide-react';
import { FILE_STATUS_LABELS } from '../../utils/constants';

const FileDetail = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [sourceSchema, setSourceSchema] = useState({});
  const [targetSchema, setTargetSchema] = useState({});
  const [mappingRules, setMappingRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');

  useEffect(() => {
    fetchFileDetails();
  }, [fileId]);

  const fetchFileDetails = async () => {
    try {
      const fileRes = await api.get(`/files/${fileId}`);
      setFile(fileRes.data);

      // Extract source schema from parsed data
      if (fileRes.data.parsed_data) {
        const schema = extractSchema(fileRes.data);
        setSourceSchema(schema);
        
        // Initialize default target schema
        const defaultTarget = {};
        Object.keys(schema).forEach(key => {
          defaultTarget[key] = schema[key];
        });
        setTargetSchema(defaultTarget);

        // Initialize default mapping rules
        const defaultRules = Object.keys(schema).map(key => ({
          source_field: key,
          target_field: key,
          transformation: null
        }));
        setMappingRules(defaultRules);
      }

      // Try to fetch existing mapping
      try {
        const mappingRes = await api.get(`/mappings/${fileId}`);
        if (mappingRes.data) {
          setSourceSchema(mappingRes.data.source_schema);
          setTargetSchema(mappingRes.data.target_schema);
          setMappingRules(mappingRes.data.mapping_rules);
        }
      } catch (err) {
        // No existing mapping, use defaults
      }
    } catch (error) {
      toast.error('Failed to load file details');
      navigate('/files');
    } finally {
      setLoading(false);
    }
  };

  const extractSchema = (fileData) => {
    const schema = {};
    if (fileData.file_type === 'json' && fileData.parsed_data?.data) {
      const data = fileData.parsed_data.data;
      const sample = Array.isArray(data) ? data[0] : data;
      if (sample) {
        Object.keys(sample).forEach(key => {
          schema[key] = inferType(sample[key]);
        });
      }
    } else if (fileData.file_type === 'pdf' && fileData.parsed_data) {
      schema['filename'] = 'string';
      schema['total_pages'] = 'integer';
      schema['full_text'] = 'string';
      if (fileData.parsed_data.metadata) {
        schema['title'] = 'string';
        schema['author'] = 'string';
      }
    }
    return schema;
  };

  const inferType = (value) => {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  };

  const handleTargetFieldChange = (sourceField, newTargetField) => {
    setMappingRules(prev => 
      prev.map(rule => 
        rule.source_field === sourceField
          ? { ...rule, target_field: newTargetField }
          : rule
      )
    );
  };

  const handleSaveMapping = async () => {
    setSaving(true);
    try {
      await api.post('/mappings', {
        file_id: fileId,
        source_schema: sourceSchema,
        target_schema: targetSchema,
        mapping_rules: mappingRules
      });
      toast.success('Mapping saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestApproval = async () => {
    try {
      // First save mapping
      const mappingRes = await api.post('/mappings', {
        file_id: fileId,
        source_schema: sourceSchema,
        target_schema: targetSchema,
        mapping_rules: mappingRules
      });

      // Then request approval
      await api.post('/approvals', {
        file_id: fileId,
        mapping_id: mappingRes.data.id,
        comments: approvalComments
      });

      toast.success('Approval requested successfully');
      navigate('/approvals');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to request approval');
    }
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
        title={`File: ${file?.original_name}`}
        subtitle="Review and configure field mappings"
      />

      <div className="p-6 md:p-8 max-w-7xl" data-testid="file-detail-page">
        <Button
          variant="ghost"
          onClick={() => navigate('/files')}
          className="mb-6"
          data-testid="back-btn"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Files
        </Button>

        {/* File Info */}
        <Card className="mb-6 border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">File Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">File Name</p>
                <p className="font-medium">{file?.original_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-mono uppercase">{file?.file_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className="font-mono text-xs">
                  {FILE_STATUS_LABELS[file?.status] || file?.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Size</p>
                <p className="font-mono">{(file?.size_bytes / 1024).toFixed(2)} KB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mapping Editor */}
        <Card className="border border-border" data-testid="mapping-editor">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                  <GitMerge className="h-6 w-6" />
                  Field Mapping
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Map source fields to target schema
                </p>
              </div>
              <Button
                onClick={handleSaveMapping}
                disabled={saving}
                variant="outline"
                data-testid="save-mapping-btn"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Mapping
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 pb-2 border-b border-border font-medium text-sm text-muted-foreground">
                <div>Source Field</div>
                <div>Target Field</div>
                <div>Type</div>
              </div>

              {mappingRules.map((rule, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 items-center" data-testid={`mapping-row-${index}`}>
                  <div>
                    <Input
                      value={rule.source_field}
                      readOnly
                      className="font-mono text-sm bg-muted"
                    />
                  </div>
                  <div>
                    <Input
                      value={rule.target_field}
                      onChange={(e) => handleTargetFieldChange(rule.source_field, e.target.value)}
                      className="font-mono text-sm"
                      placeholder="Enter target field name"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-mono text-muted-foreground">
                      {sourceSchema[rule.source_field]}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Request Approval Section */}
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-lg font-semibold mb-4">Request Approval</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="comments">Comments (Optional)</Label>
                  <Textarea
                    id="comments"
                    placeholder="Add any notes for the approver..."
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    className="mt-1.5"
                    rows={3}
                    data-testid="approval-comments"
                  />
                </div>
                <Button
                  onClick={handleRequestApproval}
                  className="w-full md:w-auto"
                  data-testid="request-approval-btn"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Approval
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default FileDetail;
