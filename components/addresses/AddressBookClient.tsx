"use client";

import "@/app/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddressForm, AddressFormValues } from "@/components/addresses/AddressForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Address } from "@/lib/address";
import { useTranslation } from "react-i18next";

type AddressBookClientProps = {
  userEmail: string;
};

const buildAddressPayload = (values: AddressFormValues | Address) => ({
  _id: values._id,
  name: values.name,
  email: values.email,
  address: values.address,
  city: values.city,
  state: values.state,
  zip: values.zip,
  country: values.country,
  countryCode: values.countryCode ?? "",
  stateCode: values.stateCode ?? "",
  subArea: values.subArea ?? "",
  phone: values.phone ?? "",
  fax: values.fax ?? "",
  contactEmail: values.contactEmail ?? "",
  lineId: values.lineId ?? "",
  company: values.company ?? "",
  taxId: values.taxId ?? "",
  branch: values.branch ?? "",
  type: values.type ?? "home",
  default: Boolean(values.default),
});

const formatAddressSummary = (
  address: Address,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  const typeValue = typeof address.type === "string" ? address.type : "";
  const normalizedType = typeValue.toLowerCase();
  const label = normalizedType
    ? normalizedType === "home"
      ? t("client.account.addresses.form.type.home")
      : normalizedType === "office"
        ? t("client.account.addresses.form.type.office")
        : normalizedType === "other"
          ? t("client.account.addresses.form.type.other")
          : typeValue[0]?.toUpperCase() + typeValue.slice(1)
    : t("client.account.addresses.list.fallbackType");
  return t("client.account.addresses.list.summary", {
    type: label,
    address: address.address,
    city: address.city,
  });
};

export default function AddressBookClient({ userEmail }: AddressBookClientProps) {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<"add" | "edit" | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [defaultUpdatingId, setDefaultUpdatingId] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/addresses");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.error || t("client.account.addresses.errors.load")
        );
      }
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.account.addresses.errors.load")
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const initialFormValues = useMemo(() => {
    if (activeForm === "edit" && editingAddress) {
      return editingAddress;
    }
    return {
      email: userEmail,
      contactEmail: userEmail,
      default: addresses.length === 0,
      country: t("client.account.addresses.defaultCountry"),
      countryCode: "",
      stateCode: "",
      subArea: "",
    };
  }, [activeForm, editingAddress, userEmail, addresses.length, t]);

  const handleFormSubmit = async (values: AddressFormValues) => {
    setIsSaving(true);
    try {
      const isEdit = Boolean(values._id);
      const response = await fetch("/api/user/addresses", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAddressPayload(values)),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.error || t("client.account.addresses.errors.save")
        );
      }

      await response.json();
      toast.success(
        isEdit
          ? t("client.account.addresses.toast.updated")
          : t("client.account.addresses.toast.added")
      );
      setActiveForm(null);
      setEditingAddress(null);
      await loadAddresses();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.account.addresses.errors.save")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget._id;
    if (!targetId) {
      toast.error(t("client.account.addresses.errors.delete"));
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/user/addresses?id=${encodeURIComponent(targetId)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.error || t("client.account.addresses.errors.delete")
        );
      }
      toast.success(t("client.account.addresses.toast.deleted"));
      setDeleteTarget(null);
      await loadAddresses();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.account.addresses.errors.delete")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (address: Address) => {
    const targetId = address._id;
    if (!targetId) {
      toast.error(t("client.account.addresses.errors.save"));
      return;
    }
    setDefaultUpdatingId(targetId);
    try {
      const response = await fetch("/api/user/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildAddressPayload({
            ...address,
            _id: targetId,
            default: true,
          })
        ),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.error || t("client.account.addresses.errors.setDefault")
        );
      }
      toast.success(t("client.account.addresses.toast.defaultUpdated"));
      await loadAddresses();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.account.addresses.errors.setDefault")
      );
    } finally {
      setDefaultUpdatingId(null);
    }
  };

  const openAddForm = () => {
    setEditingAddress(null);
    setActiveForm("add");
  };

  const openEditForm = (address: Address) => {
    setEditingAddress(address);
    setActiveForm("edit");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("client.account.addresses.card.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("client.account.addresses.card.subtitle")}
            </p>
          </div>
          <Button onClick={openAddForm} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("client.account.addresses.actions.addNew")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-16 rounded-lg bg-muted animate-pulse" />
              <div className="h-16 rounded-lg bg-muted animate-pulse" />
              <div className="h-16 rounded-lg bg-muted animate-pulse" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t("client.account.addresses.empty.title")}
              </p>
              <Button onClick={openAddForm} variant="outline" className="mt-4">
                {t("client.account.addresses.actions.add")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {addresses.map((address) => (
                <Card key={address._id} className="border border-muted">
                  <CardHeader className="space-y-3 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {formatAddressSummary(address, t)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {address.name}
                        </p>
                      </div>
                      {address.default && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3" />
                          {t("client.account.addresses.labels.default")}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <p>{address.address}</p>
                      <p>
                        {address.city}, {address.state} {address.zip}
                      </p>
                      {address.country && <p>{address.country}</p>}
                      {address.company && <p>{address.company}</p>}
                      {(address.contactEmail || address.email) && (
                        <p>{address.contactEmail || address.email}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!address.default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetDefault(address)}
                          disabled={defaultUpdatingId === address._id}
                        >
                          {t("client.account.addresses.actions.makeDefault")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditForm(address)}
                        className="gap-1"
                      >
                        <Pencil className="h-3 w-3" />
                        {t("client.account.addresses.actions.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(address)}
                        className="gap-1 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("client.account.addresses.actions.delete")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={activeForm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveForm(null);
            setEditingAddress(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {activeForm === "edit"
                ? t("client.account.addresses.dialog.editTitle")
                : t("client.account.addresses.dialog.addTitle")}
            </DialogTitle>
            <DialogDescription>
              {activeForm === "edit"
                ? t("client.account.addresses.dialog.editDescription")
                : t("client.account.addresses.dialog.addDescription")}
            </DialogDescription>
          </DialogHeader>
          <AddressForm
            initialValues={initialFormValues}
            defaultContactEmail={userEmail}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setActiveForm(null);
              setEditingAddress(null);
            }}
            submitLabel={
              activeForm === "edit"
                ? t("client.account.addresses.actions.update")
                : t("client.account.addresses.actions.save")
            }
            isSubmitting={isSaving}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("client.account.addresses.delete.title")}</DialogTitle>
            <DialogDescription>
              {t("client.account.addresses.delete.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              {t("client.account.addresses.delete.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? t("client.account.addresses.delete.deleting")
                : t("client.account.addresses.delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
