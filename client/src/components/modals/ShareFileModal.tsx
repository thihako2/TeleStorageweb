import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileWithShareInfo } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clipboard } from "lucide-react";
import { shareFile } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface ShareFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileWithShareInfo;
}

export default function ShareFileModal({ isOpen, onClose, file }: ShareFileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [accessType, setAccessType] = useState<string>("anyone");
  const [expiration, setExpiration] = useState<string>("7");
  const [shareLink, setShareLink] = useState<string>(file.shareInfo?.shareLink || "");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLinkGenerated, setIsLinkGenerated] = useState<boolean>(!!file.shareInfo?.shareLink);
  
  // Handle generating share link
  const handleGenerateLink = async () => {
    try {
      setIsGenerating(true);
      
      const expiryDays = expiration === "no-expiry" ? undefined : parseInt(expiration);
      const result = await shareFile(file.id, expiryDays);
      
      setShareLink(result.shareLink);
      setIsLinkGenerated(true);
      
      // Invalidate file queries
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: [`/api/files/${file.id}`] });
      
      toast({
        title: "Share Link Generated",
        description: "Link has been created successfully.",
      });
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Failed to Generate Link",
        description: "There was an error creating the share link.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle copying link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Link Copied",
      description: "The share link has been copied to your clipboard.",
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{file.fileName}"</DialogTitle>
          <DialogDescription>
            Create a link to share this file with others.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-type">Access Type</Label>
            <Select 
              value={accessType} 
              onValueChange={setAccessType}
              disabled={isLinkGenerated}
            >
              <SelectTrigger id="access-type">
                <SelectValue placeholder="Select access type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anyone">Anyone with the link</SelectItem>
                <SelectItem value="specific">Only specific people</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expiration">Link Expiration</Label>
            <Select 
              value={expiration} 
              onValueChange={setExpiration}
              disabled={isLinkGenerated}
            >
              <SelectTrigger id="expiration">
                <SelectValue placeholder="Select expiration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="no-expiry">No expiration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isLinkGenerated && (
            <div className="space-y-2">
              <Label htmlFor="share-link">Share Link</Label>
              <div className="flex rounded-md shadow-sm">
                <Input
                  id="share-link"
                  value={shareLink}
                  readOnly
                  className="flex-1 min-w-0 block rounded-r-none"
                />
                <Button
                  className="rounded-l-none"
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex sm:justify-between mt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {isLinkGenerated ? "Done" : "Cancel"}
          </Button>
          
          {!isLinkGenerated && (
            <Button
              onClick={handleGenerateLink}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
