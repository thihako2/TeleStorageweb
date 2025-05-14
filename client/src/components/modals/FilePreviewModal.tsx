import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileWithShareInfo } from "@shared/schema";
import { downloadFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Download, X } from "lucide-react";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileWithShareInfo;
}

export default function FilePreviewModal({ isOpen, onClose, file }: FilePreviewModalProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Format bytes to human-readable format
  const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  // Format date
  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Determine file type and preview
  const getFilePreview = () => {
    const fileName = file.fileName.toLowerCase();
    const ext = fileName.split('.').pop() || '';
    
    // Default preview - file icon
    let icon = (
      <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
    
    // PDF preview
    if (['pdf'].includes(ext)) {
      icon = (
        <svg className="mx-auto h-12 w-12 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <text x="9.5" y="16" fontSize="5" fill="currentColor" fontFamily="sans-serif">PDF</text>
        </svg>
      );
    } 
    // Image preview
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      // If we have a file link, render the image
      if (file.fileLink) {
        return (
          <div className="bg-gray-50 rounded-lg h-64 flex items-center justify-center overflow-hidden">
            <img 
              src={file.fileLink} 
              alt={file.fileName} 
              className="max-h-full max-w-full object-contain"
            />
          </div>
        );
      }
    }
    // Video preview
    else if (['mp4', 'webm'].includes(ext)) {
      if (file.fileLink) {
        return (
          <div className="bg-gray-50 rounded-lg h-64 flex items-center justify-center overflow-hidden">
            <video 
              controls 
              className="max-h-full max-w-full"
            >
              <source src={file.fileLink} type={`video/${ext}`} />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      }
    }
    // Audio preview
    else if (['mp3', 'wav', 'ogg'].includes(ext)) {
      if (file.fileLink) {
        return (
          <div className="bg-gray-50 rounded-lg h-64 flex flex-col items-center justify-center p-4">
            <svg className="h-16 w-16 text-purple-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <audio controls className="w-full mt-2">
              <source src={file.fileLink} type={`audio/${ext}`} />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      }
    }
    
    // Default - no preview available
    return (
      <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
        <div className="text-center">
          {icon}
          <h3 className="mt-2 text-sm font-medium text-gray-900">Preview not available</h3>
          <p className="mt-1 text-sm text-gray-500">Download the file to view it</p>
        </div>
      </div>
    );
  };
  
  // Handle file download
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span className="truncate">{file.fileName}</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 -mr-2">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Uploaded on {formatDate(file.uploadTimestamp)} • {formatBytes(file.fileSize)}
          </p>
        </DialogHeader>
        
        <div className="mt-5 sm:mt-4">
          {getFilePreview()}
          
          <div className="mt-5 sm:mt-4 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
