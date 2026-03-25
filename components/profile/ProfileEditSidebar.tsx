"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { showToast } from "@/lib/toast";
import { User, Phone, Calendar, Save, X } from "lucide-react";
import type { Address } from "@/lib/address";

interface EmailAddress {
  emailAddress: string;
  id: string;
}

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: EmailAddress[];
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SanityUser {
  _id: string;
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  phone?: string;
  dateOfBirth?: string;
  profileImage?: {
    asset: {
      _id: string;
      url: string;
    };
  };
  addresses?: Address[];
  preferences?: Record<string, unknown>;
  loyaltyPoints?: number;
  rewardPoints?: number;
  totalSpent?: number;
  lastLogin?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileEditSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    clerk: ClerkUser;
    sanity: SanityUser | null;
  };
}

export default function ProfileEditSidebar({
  isOpen,
  onClose,
  userData,
}: ProfileEditSidebarProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: userData.sanity?.firstName || "",
    lastName: userData.sanity?.lastName || "",
    phone: userData.sanity?.phone || "",
    dateOfBirth: userData.sanity?.dateOfBirth || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          clerkUserId: userData.clerk.id,
        }),
      });

      if (response.ok) {
        showToast.success(
          "Profile Updated",
          "Your profile has been successfully updated."
        );
        onClose();
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast.error("Error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Edit Profile</span>
          </SheetTitle>
          <SheetDescription>
            Update your personal information. Clerk data is read-only.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Clerk Data (Read-only) */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                Clerk Account (Read-only)
              </h3>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">First Name</Label>
                  <div className="text-gray-900 bg-white p-2 rounded border text-sm">
                    {userData.clerk.firstName || "Not provided"}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Last Name</Label>
                  <div className="text-gray-900 bg-white p-2 rounded border text-sm">
                    {userData.clerk.lastName || "Not provided"}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Email</Label>
                  <div className="text-gray-900 bg-white p-2 rounded border text-sm">
                    {userData.clerk.emailAddresses?.[0]?.emailAddress ||
                      "Not provided"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Sanity Data */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Additional Information (Editable)
              </h3>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="firstName"
                    className="flex items-center space-x-1"
                  >
                    <User className="h-4 w-4" />
                    <span>First Name (Override)</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    placeholder="Enter first name"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Override Clerk first name for display
                  </p>
                </div>

                <div>
                  <Label
                    htmlFor="lastName"
                    className="flex items-center space-x-1"
                  >
                    <User className="h-4 w-4" />
                    <span>Last Name (Override)</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    placeholder="Enter last name"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Override Clerk last name for display
                  </p>
                </div>

                <div>
                  <Label
                    htmlFor="phone"
                    className="flex items-center space-x-1"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Phone Number</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="dateOfBirth"
                    className="flex items-center space-x-1"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Date of Birth</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      handleInputChange("dateOfBirth", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-6 border-t">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </div>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
