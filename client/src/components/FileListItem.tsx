import { useState } from "react";
import { FileWithShareInfo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadFile, starFile, deleteFile } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Share2, MoreVertical, Star, Trash2 } from "lucide-react";

interface FileListItemProps {
  file: FileWithShareInfo;
  onPreview: () => void;
  onShare: () => void;
}

export default function FileListItem({ file, onPreview, onShare }: FileListItemProps) {
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
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Determine file type icon
  const getFileIcon = () => {
    const fileName = file.fileName.toLowerCase();
    const ext = fileName.split('.').pop() || '';
    
    // Default icon
    let icon = (
      <svg className="h-10 w-10 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
    
    // Determine file type
    if (['pdf'].includes(ext)) {
      icon = (
        <svg className="h-10 w-10 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <text x="9.5" y="16" fontSize="5" fill="currentColor" fontFamily="sans-serif">PDF</text>
        </svg>
      );
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      icon = (
        <svg className="h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <text x="8.5" y="16" fontSize="4.5" fill="currentColor" fontFamily="sans-serif">DOC</text>
        </svg>
      );
    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
      icon = (
        <svg className="h-10 w-10 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <text x="9" y="16" fontSize="4.5" fill="currentColor" fontFamily="sans-serif">XLS</text>
        </svg>
      );
    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      icon = (
        <svg className="h-10 w-10 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
      icon = (
        <svg className="h-10 w-10 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    } else if (['mp4', 'webm', 'avi', 'mov', 'wmv'].includes(ext)) {
      icon = (
        <svg className="h-10 w-10 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      icon = (
        <svg className="h-10 w-10 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    }
    
    return icon;
  };

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
    <li className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center min-w-0 space-x-3">
          <div className="flex-shrink-0">
            {getFileIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <button 
              className="text-sm font-medium text-primary hover:text-blue-600 truncate"
              onClick={onPreview}
            >
              {file.fileName}
            </button>
            <div className="flex items-center space-x-3 mt-1">
              <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
              <span className="text-gray-300">•</span>
              <p className="text-xs text-gray-500">Modified {formatDate(file.uploadTimestamp)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleDownload}
            disabled={isDownloading}
            className="text-gray-400 hover:text-primary"
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onShare}
            className="text-gray-400 hover:text-primary"
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleToggleStar}
            disabled={isStarring}
            className={`${file.isStarred ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-400`}
          >
            <Star className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </li>
  );
}
