import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, LogOut, Settings, User } from "lucide-react";

export default function MainHeader({ onUploadClick }: { onUploadClick: () => void }) {
  const { user, logout } = useAuth();
  
  // Get user's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const displayName = user?.user.displayName || user?.user.email?.split('@')[0] || 'User';
  const initials = getInitials(displayName);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <svg className="h-8 w-auto text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.2,10.95L12.71,4.33a1,1,0,0,0-1.42,0L2.8,10.95a1,1,0,0,0,0,1.41l8.49,6.62a1,1,0,0,0,1.42,0l8.49-6.62A1,1,0,0,0,21.2,10.95ZM12,16.08l-6.77-5.28L12,5.92l6.77,4.88Z"></path>
                <path d="M12,18c-.28,0-1.95-.14-6.19-3.95a1,1,0,1,0-1.22,1.58C9.07,19.41,11.57,20,12,20s2.93-.59,7.41-4.37a1,1,0,1,0-1.22-1.58C13.95,17.86,12.28,18,12,18Z"></path>
              </svg>
              <span className="ml-2 text-xl font-bold text-gray-900">TeleStore</span>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <a className="border-primary text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Home
                </a>
              </Link>
              <Link href="/dashboard">
                <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Files
                </a>
              </Link>
              <Link href="/shared">
                <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Shared
                </a>
              </Link>
              <Link href="/settings">
                <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Settings
                </a>
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Button onClick={onUploadClick}>
                Upload Files
              </Button>
            </div>
            <div className="hidden md:ml-4 md:flex-shrink-0 md:flex md:items-center">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5 text-gray-400" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="ml-3 relative">
                    <div className="flex items-center cursor-pointer">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user.photoURL || ''} alt={displayName} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="ml-2 text-sm font-medium text-gray-700 hidden md:block">
                        {displayName}
                      </span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
