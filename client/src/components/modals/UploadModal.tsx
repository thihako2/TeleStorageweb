import { useState, useRef, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadFile, saveTempFile } from "@/lib/api"; // Import saveTempFile
import { formatBytes } from "@/lib/utils";
import UploadProgressModal from "./UploadProgressModal";
import { File, FileText, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUploaded?: () => void;
}

interface SelectedFile {
  file: File;
  id: string;
  tempPath?: string; // Add tempPath
}

interface UploadingFile {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  tempPath?: string; // Add tempPath
}

export default function UploadModal({ isOpen, onClose, onFileUploaded }: UploadModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  // Save file temporarily on the server
  const saveFileTemporarily = async (file: File): Promise<SelectedFile | null> => {
    try {
      const response = await saveTempFile(file); // Call the new API function
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tempPath: response.tempPath, // Store the temporary path
      };
    } catch (error) {
      console.error("Error saving file temporarily:", error);
      toast({
        title: "Error",
        description: `Failed to save file ${file.name} temporarily.`,
        variant: "destructive",
      });
      return null;
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const filesToProcess = Array.from(e.target.files);
    const processedFiles: SelectedFile[] = [];

    for (const file of filesToProcess) {
      // Check if user has enough quota left for this file
      const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0) + file.size;
      
      if (user && (user.storageInfo.used + totalSize > user.storageInfo.total)) {
        toast({
          title: "Storage Quota Exceeded",
          description: `You don't have enough storage space for ${file.name}.`,
          variant: "destructive",
        });
        continue; // Skip this file
      }

      const tempFile = await saveFileTemporarily(file);
      if (tempFile) {
        processedFiles.push(tempFile);
      }
    }
    
    setSelectedFiles((prev) => [...prev, ...processedFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove file from selection
  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!e.dataTransfer.files?.length) return;
    
    const filesToProcess = Array.from(e.dataTransfer.files);
    const processedFiles: SelectedFile[] = [];

    for (const file of filesToProcess) {
      // Check if user has enough quota left for this file
      const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0) + file.size;
      
      if (user && (user.storageInfo.used + totalSize > user.storageInfo.total)) {
        toast({
          title: "Storage Quota Exceeded",
          description: `You don't have enough storage space for ${file.name}.`,
          variant: "destructive",
        });
        continue; // Skip this file
      }

      const tempFile = await saveFileTemporarily(file);
      if (tempFile) {
        processedFiles.push(tempFile);
      }
    }
    
    setSelectedFiles((prev) => [...prev, ...processedFiles]);
  };

  // Start upload process
  const startUpload = async () => {
    if (!selectedFiles.length) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    // Initialize uploading files
    const filesToUpload: UploadingFile[] = selectedFiles.map((sf) => ({
      ...sf,
      progress: 0,
      status: "pending",
    }));
    
    setUploadingFiles(filesToUpload);
    setIsUploading(true);
    setShowProgress(true);
    onClose(); // Close the selection modal
    
    // Process uploads sequentially
    for (const file of filesToUpload) {
      try {
        // Update file status to uploading
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "uploading" } : f
          )
        );
        
        // Upload the file using the temporary path
        await uploadFile(file.file, (progress) => { // Modify uploadFile to accept tempPath
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, progress } : f
            )
          );
        }, file.tempPath); // Pass tempPath to uploadFile
        
        // Mark as completed
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "completed", progress: 100 } : f
          )
        );
        
        if (onFileUploaded) {
          onFileUploaded();
        }
        
      } catch (error) {
        console.error("Upload error:", error);
        
        // Mark as error
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }
    }
    
    setIsUploading(false);
    setSelectedFiles([]);
  };

  // Handle upload completion
  const handleUploadComplete = () => {
    setShowProgress(false);
    setUploadingFiles([]);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Select files from your computer to upload to TeleStore. Files will be securely stored on Telegram.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-5 sm:mt-6">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <File className="h-12 w-12 text-gray-400" />
              <p className="mt-1 text-sm text-gray-500">Drag and drop files here, or click to select files</p>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                multiple 
                onChange={handleFileSelect}
              />
              <Button 
                type="button" 
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Files
              </Button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900">Selected Files</h4>
                <ul className="mt-2 divide-y divide-gray-200 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file) => (
                    <li key={file.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center overflow-hidden">
                        <FileText className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-900 truncate">{file.file.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">{formatBytes(file.file.size)}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-gray-400 hover:text-gray-600"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mt-3"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={startUpload}
                disabled={!selectedFiles.length || isUploading}
              >
                Upload
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      <UploadProgressModal
        isOpen={showProgress}
        onClose={handleUploadComplete}
        uploads={uploadingFiles}
      />
    </>
  );
}
