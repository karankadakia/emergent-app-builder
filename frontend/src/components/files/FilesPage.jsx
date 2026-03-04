import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import Header from '../layout/Header';
import MainLayout from '../layout/MainLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, Eye, Clock } from 'lucide-react';
import { FILE_STATUS_LABELS } from '../../utils/constants';
import { format } from 'date-fns';

const FilesPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await api.get('/files');
      setFiles(response.data);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(response.data.message);
      fetchFiles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const getStatusBadge = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      pending_approval: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-blue-100 text-blue-800 border-blue-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      parsed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      mapping: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return (
      <Badge className={`font-mono text-xs ${colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`} data-testid={`status-${status}`}>
        {FILE_STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" data-testid="loading-spinner"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header title="Files" subtitle="Upload and manage your data files" />

      <div className="p-6 md:p-8 max-w-7xl" data-testid="files-page">
        {/* Upload Area */}
        <Card className="mb-8 border-2 border-dashed border-border hover:border-accent transition-colors" data-testid="upload-area">
          <CardContent className="p-8">
            <div
              {...getRootProps()}
              className={`text-center cursor-pointer ${
                isDragActive ? 'opacity-50' : ''
              }`}
            >
              <input {...getInputProps()} data-testid="file-input" />
              <UploadCloud className="h-16 w-16 mx-auto mb-4 text-accent" />
              {uploading ? (
                <p className="text-lg font-medium text-foreground">Uploading and parsing file...</p>
              ) : isDragActive ? (
                <p className="text-lg font-medium text-foreground">Drop the file here</p>
              ) : (
                <>
                  <p className="text-lg font-medium text-foreground mb-2">
                    Drag & drop a file here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supported formats: PDF, JSON, CSV
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Files List */}
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="no-files">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No files uploaded yet</p>
                <p className="text-sm mt-2">Upload your first file to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="files-table">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      <th className="p-4">File Name</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Uploaded</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr
                        key={file.id}
                        className="border-t border-border hover:bg-muted/50 transition-colors"
                        data-testid={`file-row-${file.id}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-accent" />
                            <span className="font-medium">{file.original_name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-sm uppercase">{file.file_type}</span>
                        </td>
                        <td className="p-4">{getStatusBadge(file.status)}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {format(new Date(file.created_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/files/${file.id}`)}
                            data-testid={`view-file-btn-${file.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default FilesPage;
