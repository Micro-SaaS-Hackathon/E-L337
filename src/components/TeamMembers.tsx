"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Briefcase,
  Crown,
  Shield,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Bagde";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";

import QRCodeDisplay from "./QRCodeDisplay";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  field: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

interface TeamMembersProps {
  members: TeamMember[];
  onAddMember: (email: string) => Promise<void>;
  isLoading?: boolean;
  teamId: string;
  canAddMembers?: boolean;
}

export default function TeamMembers({
  members,
  teamId,
  onAddMember,
  isLoading = false,
  canAddMembers = false,
}: TeamMembersProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMemberEmail.trim()) {
      setError("Email is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onAddMember(newMemberEmail.trim());
      setNewMemberEmail("");
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role: TeamMember["role"]) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleText = (role: TeamMember["role"]) => {
    switch (role) {
      case "owner":
        return "Owner";
      case "admin":
        return "Admin";
      default:
        return "Member";
    }
  };

  const getRoleBadgeClass = (role: TeamMember["role"]) => {
    switch (role) {
      case "owner":
        return "bg-primary/10 text-primary";
      case "admin":
        return "bg-accent text-accent-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg  border border-input p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg  border border-input p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-primary" />
          Team Members
          <span className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-sm">
            {members.length}
          </span>
        </div>
        <div className="flex gap-2">
          {canAddMembers && (
            <Button
              variant="default"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2"
          >
            {/* You can use a share icon from lucide-react or similar */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 12v.01M12 4v.01M20 12v.01M12 20v.01M8.59 16.59L12 20l3.41-3.41M16.59 8.59L20 12l-3.41 3.41M8.59 7.41L12 4l3.41 3.41"
              />
            </svg>
            Share Team
          </Button>
        </div>
      </div>
      {/* Share Team Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="h-[70vh] !max-w-none w-[40vw]">
          <DialogHeader>
            <DialogTitle>Share Team</DialogTitle>
            <DialogDescription>
              Scan this QR code to join the team.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-full h-full flex items-center justify-center rounded-lg">
              <QRCodeDisplay
                value={`${
                  typeof window !== "undefined" ? window.location.origin : ""
                }/join-team?teamId=${teamId || "team-id"}`}
                size={400}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showAddForm && (
        <div className="mb-6 rounded-lg pt-2">
          <form onSubmit={handleAddMember}>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Enter member's email address"
                  className="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-primary/30 focus:border-primary/50 bg-background text-foreground"
                  disabled={isSubmitting}
                />
                {error && (
                  <p className="text-destructive text-sm mt-1">{error}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !newMemberEmail.trim()}
                className=""
              >
                {isSubmitting ? "Adding..." : "Add"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewMemberEmail("");
                  setError("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 text-muted" />
            <p>No team members yet</p>
            {canAddMembers && (
              <p className="text-sm mt-2">
                Add your first team member to get started
              </p>
            )}
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 p-4 bg-background rounded-lg  border border-muted  cursor-pointer"
            >
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-foreground truncate">
                    {member.name}
                  </h3>
                  <Badge
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(
                      member.role
                    )}`}
                  >
                    {getRoleIcon(member.role)}
                    {getRoleText(member.role)}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{member.email}</span>
                  </div>

                  {member.field && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      <span className="truncate">{member.field}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  Joined{" "}
                  {new Date(member.joined_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
