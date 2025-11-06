"use client";

import { PublicKey } from "@solana/web3.js";
import { Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AddressWithLabel } from "@/components/address-with-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { validatePublicKey } from "@/lib/validation";
import type { MultisigAccount } from "@/types/multisig";

interface MemberManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multisig: MultisigAccount | null;
  onUpdate?: () => void;
}

export function MemberManagementDialog({
  open,
  onOpenChange,
  multisig,
  onUpdate,
}: MemberManagementDialogProps) {
  const [newMemberAddress, setNewMemberAddress] = useState("");
  const [newThreshold, setNewThreshold] = useState("");
  const [membersToAdd, setMembersToAdd] = useState<PublicKey[]>([]);
  const [membersToRemove, setMembersToRemove] = useState<PublicKey[]>([]);

  if (!multisig) return null;

  const currentMembers = multisig.members.map((m) => m.key);
  const proposedMembers = currentMembers
    .filter((m) => !membersToRemove.some((r) => r.equals(m)))
    .concat(membersToAdd);

  const handleAddMember = () => {
    if (!validatePublicKey(newMemberAddress)) {
      toast.error("Invalid Solana address");
      return;
    }

    const pubkey = new PublicKey(newMemberAddress);

    // Check if already exists
    if (
      currentMembers.some((m) => m.equals(pubkey)) ||
      membersToAdd.some((m) => m.equals(pubkey))
    ) {
      toast.error("Member already exists");
      return;
    }

    setMembersToAdd([...membersToAdd, pubkey]);
    setNewMemberAddress("");
    toast.success("Member added to proposed changes");
  };

  const handleRemoveMember = (member: PublicKey) => {
    // Check if already in remove list
    if (membersToRemove.some((m) => m.equals(member))) {
      setMembersToRemove(membersToRemove.filter((m) => !m.equals(member)));
      toast.success("Removal cancelled");
    } else {
      setMembersToRemove([...membersToRemove, member]);
      toast.success("Member marked for removal");
    }
  };

  const handleCancelAddMember = (member: PublicKey) => {
    setMembersToAdd(membersToAdd.filter((m) => !m.equals(member)));
    toast.success("Addition cancelled");
  };

  const handleSubmit = async () => {
    const finalMemberCount = proposedMembers.length;
    const thresholdValue = newThreshold ? parseInt(newThreshold, 10) : null;

    if (finalMemberCount === 0) {
      toast.error("Must have at least one member");
      return;
    }

    if (
      thresholdValue &&
      (thresholdValue < 1 || thresholdValue > finalMemberCount)
    ) {
      toast.error(`Threshold must be between 1 and ${finalMemberCount}`);
      return;
    }

    if (
      membersToAdd.length === 0 &&
      membersToRemove.length === 0 &&
      !thresholdValue
    ) {
      toast.error("No changes to apply");
      return;
    }

    // TODO: Create a config transaction proposal to update members and/or threshold
    // This requires using the Squads SDK to create a ConfigTransaction
    toast.info(
      "Member management is not yet implemented. This will create a config transaction proposal."
    );

    // Reset state
    setMembersToAdd([]);
    setMembersToRemove([]);
    setNewThreshold("");
    onUpdate?.();
  };

  const handleReset = () => {
    setMembersToAdd([]);
    setMembersToRemove([]);
    setNewThreshold("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Members & Threshold
          </DialogTitle>
          <DialogDescription>
            Propose changes to members and threshold. Changes will create a
            configuration proposal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-muted/50 flex items-center justify-between rounded-lg p-4">
            <div>
              <p className="text-sm font-medium">Current Configuration</p>
              <p className="text-muted-foreground text-xs">
                {multisig.members.length} members · Threshold{" "}
                {multisig.threshold}/{multisig.members.length}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Proposed Configuration</p>
              <p className="text-muted-foreground text-xs">
                {proposedMembers.length} members · Threshold{" "}
                {newThreshold || multisig.threshold}/{proposedMembers.length}
              </p>
            </div>
          </div>

          {/* Update Threshold */}
          <div className="space-y-2">
            <Label>New Threshold</Label>
            <Input
              type="number"
              min={1}
              max={proposedMembers.length}
              placeholder={`Current: ${multisig.threshold}`}
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Number of approvals required (1-{proposedMembers.length})
            </p>
          </div>

          <Separator />

          {/* Add Member */}
          <div className="space-y-2">
            <Label>Add Member</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter Solana address..."
                value={newMemberAddress}
                onChange={(e) => setNewMemberAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddMember();
                  }
                }}
              />
              <Button onClick={handleAddMember}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-2">
            <Label>Members</Label>
            <ScrollArea className="h-[300px] rounded-md border">
              <div className="space-y-2 p-4">
                {proposedMembers.map((member, index) => {
                  const isMarkedForRemoval = membersToRemove.some((m) =>
                    m.equals(member)
                  );
                  const isNewMember = membersToAdd.some((m) =>
                    m.equals(member)
                  );

                  return (
                    <div
                      key={member.toString()}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        isMarkedForRemoval
                          ? "bg-destructive/10 border-destructive"
                          : isNewMember
                            ? "border-green-500 bg-green-500/10"
                            : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-sm">
                          #{index + 1}
                        </span>
                        <AddressWithLabel
                          address={member.toString()}
                          showCopy={false}
                          showLabelButton={false}
                        />
                        {isNewMember && (
                          <Badge variant="default" className="bg-green-600">
                            New
                          </Badge>
                        )}
                        {isMarkedForRemoval && (
                          <Badge variant="destructive">Remove</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (isNewMember) {
                            handleCancelAddMember(member);
                          } else {
                            handleRemoveMember(member);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Changes Summary */}
          {(membersToAdd.length > 0 ||
            membersToRemove.length > 0 ||
            newThreshold) && (
            <div className="bg-muted/50 space-y-2 rounded-lg p-4">
              <p className="text-sm font-medium">Proposed Changes:</p>
              {membersToAdd.length > 0 && (
                <p className="text-xs text-green-600">
                  + Add {membersToAdd.length} member(s)
                </p>
              )}
              {membersToRemove.length > 0 && (
                <p className="text-destructive text-xs">
                  - Remove {membersToRemove.length} member(s)
                </p>
              )}
              {newThreshold && (
                <p className="text-xs text-blue-600">
                  → Update threshold to {newThreshold}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSubmit}>Create Configuration Proposal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
