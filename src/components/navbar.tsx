import { LucidePaperclip } from "lucide-react";
import React from "react";

type User = {
  user_metadata?: {
    username?: string;
    full_name?: string;
  };
  email?: string;
};

type NavbarProps = {
  user: User;
};

function Navbar({ user }: NavbarProps) {
  return (
    <nav className="flex items-center justify-between rounded-lg  backdrop-blur px-4 py-3  ">
      <div className="flex items-center gap-2 text-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <span className="text-xl">
            <LucidePaperclip size={14} />
          </span>
          <span className="font-semibold tracking-tight">clippy</span>
        </div>
        <span className="text-muted-foreground">/</span>
        <span className="uppercase text-xs tracking-widest font-semibold text-muted-foreground">
          Dashboard
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="text-foreground">
          {user.user_metadata?.username ||
            user.user_metadata?.full_name ||
            "User"}
        </span>
        <span className="text-muted-foreground">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="hidden sm:block text-muted-foreground">
          {user.email}
        </span>
      </div>
    </nav>
  );
}

export default Navbar;
