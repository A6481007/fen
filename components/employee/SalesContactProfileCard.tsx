"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  getEmployeeSalesContact,
  updateEmployeeSalesContact,
  type EmployeeSalesContact,
} from "@/actions/employeeSalesContactActions";
import { useTranslation } from "react-i18next";

const emptyForm = {
  name: "",
  phone: "",
  ext: "",
  fax: "",
  mobile: "",
  lineId: "",
  lineExt: "",
  email: "",
  web: "",
};

type SalesContactForm = typeof emptyForm;

const mapContactToForm = (contact: EmployeeSalesContact): SalesContactForm => ({
  name: contact.name ?? "",
  phone: contact.phone ?? "",
  ext: contact.ext ?? "",
  fax: contact.fax ?? "",
  mobile: contact.mobile ?? "",
  lineId: contact.lineId ?? "",
  lineExt: contact.lineExt ?? "",
  email: contact.email ?? "",
  web: contact.web ?? "",
});

export default function SalesContactProfileCard() {
  const { t } = useTranslation();
  const [formState, setFormState] = useState<SalesContactForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadContact = async () => {
      setIsLoading(true);
      try {
        const contact = await getEmployeeSalesContact();
        if (!isActive) return;
        if (contact) {
          setFormState(mapContactToForm(contact));
        }
      } catch (error) {
        console.error("Failed to load sales contact:", error);
        toast.error(t("employee.orders.salesContact.toasts.loadFailed"));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadContact();

    return () => {
      isActive = false;
    };
  }, []);

  const handleChange = (field: keyof SalesContactForm, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = await updateEmployeeSalesContact(formState);
      if (result.success) {
        toast.success(result.message);
        if (result.contact) {
          setFormState(mapContactToForm(result.contact));
        }
      } else {
        toast.error(
          result.message ||
            t("employee.orders.salesContact.toasts.updateFailed")
        );
      }
    } catch (error) {
      console.error("Failed to update sales contact:", error);
      toast.error(t("employee.orders.salesContact.toasts.updateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>{t("employee.orders.salesContact.title")}</CardTitle>
        <CardDescription>
          {t("employee.orders.salesContact.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="sales-name">
                  {t("employee.orders.salesContact.fields.name")}
                </Label>
                <Input
                  id="sales-name"
                  value={formState.name}
                  onChange={(event) =>
                    handleChange("name", event.target.value)
                  }
                  placeholder={t(
                    "employee.orders.salesContact.placeholders.name"
                  )}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales-email">
                  {t("employee.orders.salesContact.fields.email")}
                </Label>
                <Input
                  id="sales-email"
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    handleChange("email", event.target.value)
                  }
                  placeholder={t(
                    "employee.orders.salesContact.placeholders.email"
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales-phone">
                  {t("employee.orders.salesContact.fields.phone")}
                </Label>
                <Input
                  id="sales-phone"
                  value={formState.phone}
                  onChange={(event) =>
                    handleChange("phone", event.target.value)
                  }
                  placeholder={t(
                    "employee.orders.salesContact.placeholders.phone"
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales-ext">
                  {t("employee.orders.salesContact.fields.extension")}
                </Label>
                <Input
                  id="sales-ext"
                  value={formState.ext}
                  onChange={(event) =>
                    handleChange("ext", event.target.value)
                  }
                  placeholder={t(
                    "employee.orders.salesContact.placeholders.extension"
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales-mobile">
                  {t("employee.orders.salesContact.fields.mobile")}
                </Label>
                <Input
                  id="sales-mobile"
                  value={formState.mobile}
                  onChange={(event) =>
                    handleChange("mobile", event.target.value)
                  }
                  placeholder={t(
                    "employee.orders.salesContact.placeholders.mobile"
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales-fax">
                  {t("employee.orders.salesContact.fields.fax")}
                </Label>
                <Input
                  id="sales-fax"
                  value={formState.fax}
                  onChange={(event) =>
                    handleChange("fax", event.target.value)
                  }
                  placeholder={t(
                    "employee.orders.salesContact.placeholders.fax"
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales-line">
                  {t("employee.orders.salesContact.fields.salesLine")}
                </Label>
                <Input
                  id="sales-line"
                  value={formState.lineId}
                  onChange={(event) =>
                    handleChange("lineId", event.target.value)
                  }
                  placeholder={t(
                    "employee.orders.salesContact.placeholders.salesLine"
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales-line-ext">
                  {t("employee.orders.salesContact.fields.lineExtension")}
                </Label>
                <Input
                  id="sales-line-ext"
                  value={formState.lineExt}
                  onChange={(event) =>
                    handleChange("lineExt", event.target.value)
                  }
                  placeholder={t(
                    "employee.orders.salesContact.placeholders.lineExtension"
                  )}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="sales-web">
                  {t("employee.orders.salesContact.fields.website")}
                </Label>
                <Input
                  id="sales-web"
                  type="url"
                  value={formState.web}
                  onChange={(event) => handleChange("web", event.target.value)}
                  placeholder={t(
                    "employee.orders.salesContact.placeholders.website"
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? t("employee.orders.salesContact.actions.saving")
                  : t("employee.orders.salesContact.actions.saveChanges")}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
