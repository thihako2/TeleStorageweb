import { useState } from "react";
import { FileWithShareInfo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Share2, Download, MoreVertical, Star, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadFile, starFile, deleteFile } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface FileCardProps {
  file: FileWithShareInfo;
  onPreview: () => void;
  onShare: () => void;
}

export default function FileCard({ file, onPreview, onShare }: FileCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isStarring, setIsStarring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Format date
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString();
    }
  };

  // Determine file type and icon
  const getFileTypeInfo = () => {
    const fileName = file.fileName.toLowerCase();
    const ext = fileName.split('.').pop() || '';
    
    // Default style
    let bgColor = 'bg-gray-50';
    let textColor = 'text-gray-500';
    let icon = (
      <svg className="h-16 w-16 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
    let preview = null;
    
    // Determine file type
    if (['pdf'].includes(ext)) {
      bgColor = 'bg-red-50';
      textColor = 'text-red-500';
      icon = (
        <svg className="h-16 w-16 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <text x="9.5" y="16" fontSize="5" fill="currentColor" fontFamily="sans-serif">PDF</text>
        </svg>
      );
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      bgColor = 'bg-blue-50';
      textColor = 'text-blue-500';
      icon = (
        <svg className="h-16 w-16 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <text x="8.5" y="16" fontSize="4.5" fill="currentColor" fontFamily="sans-serif">DOC</text>
        </svg>
      );
    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
      bgColor = 'bg-green-50';
      textColor = 'text-green-500';
      icon = (
        <svg className="h-16 w-16 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <text x="9" y="16" fontSize="4.5" fill="currentColor" fontFamily="sans-serif">XLS</text>
        </svg>
      );
    } else if (['ppt', 'pptx'].includes(ext)) {
      bgColor = 'bg-orange-50';
      textColor = 'text-orange-500';
      icon = (
        <svg className="h-16 w-16 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <text x="8.5" y="16" fontSize="4.5" fill="currentColor" fontFamily="sans-serif">PPT</text>
        </svg>
      );
    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      // For images, show a preview if we have a URL
      bgColor = 'p-0 h-32 bg-cover bg-center';
      textColor = 'text-white';
      icon = null; // Will use preview instead
      preview = (
        <div 
          className={`${bgColor} relative`} 
          style={{ backgroundImage: file.fileLink ? `url(${file.fileLink})` : 'none' }}
        >
          {!file.fileLink && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <svg className="h-16 w-16 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="h-full w-full flex justify-end p-2">
            <Button variant="ghost" size="icon" className="text-white hover:text-gray-200 bg-black/20 hover:bg-black/30">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      );
    } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
      bgColor = 'bg-purple-50';
      textColor = 'text-purple-500';
      icon = (
        <svg className="h-16 w-16 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    } else if (['mp4', 'webm', 'avi', 'mov', 'wmv'].includes(ext)) {
      bgColor = 'bg-purple-50';
      textColor = 'text-purple-500';
      icon = (
        <svg className="h-16 w-16 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      bgColor = 'bg-yellow-50';
      textColor = 'text-yellow-500';
      icon = (
        <svg className="h-16 w-16 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    }
    
    return { bgColor, textColor, icon, preview };
  };

  // Get file type information
  const { bgColor, textColor, icon, preview } = getFileTypeInfo();

  // Handle download
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const blob = await downloadFile(file.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Complete",
        description: `${file.fileName} has been downloaded.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading this file.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle starring/unstarring file
  const handleToggleStar = async () => {
    try {
      setIsStarring(true);
      await starFile(file.id, !file.isStarred);
      
      // Update queries
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files/type/starred'] });
      
      toast({
        title: file.isStarred ? "File Unstarred" : "File Starred",
        description: `${file.fileName} has been ${file.isStarred ? 'removed from' : 'added to'} starred files.`,
      });
    } catch (error) {
      console.error('Star toggle error:', error);
      toast({
        title: "Action Failed",
        description: "Failed to update star status.",
        variant: "destructive",
      });
    } finally {
      setIsStarring(false);
    }
  };

  // Handle deleting file
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteFile(file.id);
      
      // Update queries
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files/recent'] });
      
      toast({
        title: "File Deleted",
        description: `${file.fileName} has been moved to trash.`,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the file.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-lg shadow bg-white overflow-hidden transition-shadow hover:shadow-md file-card">
      {/* File Preview/Icon */}
      {preview ? (
        preview
      ) : (
        <div className={`p-4 flex items-center justify-center ${bgColor} h-32 relative`}>
          <div className="file-icon transform transition-transform">
            {icon}
          </div>
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onPreview}>Preview</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>Download</DropdownMenuItem>
                <DropdownMenuItem onClick={onShare}>Share</DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleStar}>
                  {file.isStarred ? 'Unstar' : 'Star'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
      
      {/* File Info */}
      <div className="p-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 truncate" title={file.fileName}>
          {file.fileName}
        </h3>
        <div className="mt-1 flex justify-between items-center">
          <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
          <p className="text-xs text-gray-500">{formatDate(file.uploadTimestamp)}</p>
        </div>
        <div className="mt-4 flex justify-between">
          <Button variant="link" size="sm" onClick={handleDownload} disabled={isDownloading} className="text-xs text-primary hover:text-blue-700 font-medium p-0">
            Download
          </Button>
          <Button variant="link" size="sm" onClick={onShare} className="text-xs text-gray-600 hover:text-gray-900 font-medium p-0">
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
