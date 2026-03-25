"use client";

/*
[PROPOSED] EmployeeInsightCreate - scaffolded insight creation form for content ops.
[EXISTING] uses Alert, Badge, Button, Card, Input, Label, Select, Tabs, Textarea, Separator.
*/

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createInsight } from "@/actions/insightActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, UploadCloud } from "lucide-react";
import { ImageUploader } from "@/components/admin/backoffice/ImageUploader";
import { useTranslation } from "react-i18next";
import {
  EMPTY_INSIGHT_FORM_VALUES,
  INSIGHT_TYPE_OPTIONS,
  INSIGHT_VALIDATION_LIMITS,
  parseDelimitedList,
  type InsightFormErrors,
  type InsightFormOptions,
  type InsightFormValues,
  validateInsightForm,
} from "@/lib/insightForm";

const FieldError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
};

const EmployeeInsightCreate = ({ options }: { options: InsightFormOptions }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [formValues, setFormValues] = useState<InsightFormValues>(
    EMPTY_INSIGHT_FORM_VALUES
  );
  const [formErrors, setFormErrors] = useState<InsightFormErrors>({});
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const summaryCount = formValues.summary.length;
  const tagsCount = parseDelimitedList(formValues.tags).length;

  const handleChange = (field: keyof InsightFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (intent: "draft" | "publish") => {
    const { errors } = validateInsightForm(formValues, {
      requirePublishedAt: intent === "publish",
    });
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormMessage({
        type: "error",
        text: t("employee.insights.create.errors.resolveFields"),
      });
      return;
    }

    startTransition(async () => {
      const result = await createInsight(formValues, intent);
      if (!result.success) {
        setFormErrors(result.errors ?? {});
        setFormMessage({ type: "error", text: result.message });
        return;
      }

      setFormMessage({ type: "success", text: result.message });
      if (result.insightId) {
        router.push(`/employee/content/insights/${result.insightId}`);
      }
    });
  };

  const authorOptions = useMemo(
    () =>
      options.authors.map((author) => ({
        label: author.name || t("employee.insights.create.placeholders.unnamedAuthor"),
        value: author._id,
      })),
    [options.authors, t]
  );

  const categoryOptions = useMemo(
    () =>
      options.categories.map((category) => ({
        label: category.title || t("employee.insights.create.placeholders.untitledCategory"),
        value: category._id,
      })),
    [options.categories, t]
  );

  const insightOptions = useMemo(
    () =>
      options.insights.map((insight) => ({
        label: insight.title || t("employee.insights.create.placeholders.untitledInsight"),
        value: insight._id,
      })),
    [options.insights, t]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
            <Link href="/employee/content/insights">
              <ArrowLeft className="h-4 w-4" />
              {t("employee.insights.create.actions.backToInsights")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">
              {t("employee.insights.create.title")}
            </h1>
            <Badge variant="outline">{t("employee.insights.create.status.draft")}</Badge>
          </div>
          <p className="text-muted-foreground">
            {t("employee.insights.create.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" disabled={isPending}>
            <Link href="/employee/content/insights">
              {t("employee.insights.create.actions.cancel")}
            </Link>
          </Button>
          <Button
            className="gap-2"
            type="button"
            disabled={isPending}
            onClick={() => handleSubmit("draft")}
          >
            <Save className="h-4 w-4" />
            {t("employee.insights.create.actions.saveDraft")}
          </Button>
          <Button
            className="gap-2"
            type="button"
            disabled={isPending}
            onClick={() => handleSubmit("publish")}
          >
            <UploadCloud className="h-4 w-4" />
            {t("employee.insights.create.actions.publish")}
          </Button>
        </div>
      </div>

      {formMessage ? (
        <Alert variant={formMessage.type === "error" ? "destructive" : "default"}>
          <AlertTitle>
            {formMessage.type === "error"
              ? t("employee.insights.create.alerts.errorTitle")
              : t("employee.insights.create.alerts.successTitle")}
          </AlertTitle>
          <AlertDescription>{formMessage.text}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="content">
            {t("employee.insights.create.tabs.content")}
          </TabsTrigger>
          <TabsTrigger value="metadata">
            {t("employee.insights.create.tabs.metadata")}
          </TabsTrigger>
          <TabsTrigger value="relations">
            {t("employee.insights.create.tabs.relations")}
          </TabsTrigger>
          <TabsTrigger value="seo">
            {t("employee.insights.create.tabs.seo")}
          </TabsTrigger>
          <TabsTrigger value="solution">
            {t("employee.insights.create.tabs.solution")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("employee.insights.create.sections.coreContent")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    {t("employee.insights.create.fields.title")}
                  </Label>
                  <Input
                    id="title"
                    placeholder={t("employee.insights.create.placeholders.title")}
                    value={formValues.title}
                    onChange={(event) => handleChange("title", event.target.value)}
                  />
                  <FieldError message={formErrors.title} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">{t("employee.insights.create.fields.slug")}</Label>
                  <Input
                    id="slug"
                    placeholder={t("employee.insights.create.placeholders.slug")}
                    value={formValues.slug}
                    onChange={(event) => handleChange("slug", event.target.value)}
                  />
                  <FieldError message={formErrors.slug} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">
                    {t("employee.insights.create.fields.insightType")}
                  </Label>
                  <Select
                    value={formValues.insightType}
                    onValueChange={(value) => handleChange("insightType", value)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue
                        placeholder={t("employee.insights.create.placeholders.selectType")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {INSIGHT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(`employee.insights.type.${option.value}`, option.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={formErrors.insightType} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="readingTime">
                    {t("employee.insights.create.fields.readingTime")}
                  </Label>
                  <Input
                    id="readingTime"
                    type="number"
                    min={0}
                    value={formValues.readingTime}
                    onChange={(event) => handleChange("readingTime", event.target.value)}
                  />
                  <FieldError message={formErrors.readingTime} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">
                  {t("employee.insights.create.fields.summary")}
                </Label>
                <Textarea
                  id="summary"
                  placeholder={t("employee.insights.create.placeholders.summary")}
                  rows={4}
                  value={formValues.summary}
                  onChange={(event) => handleChange("summary", event.target.value)}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {t("employee.insights.create.summaryCount", {
                      count: summaryCount,
                      max: INSIGHT_VALIDATION_LIMITS.summaryMax,
                    })}
                  </span>
                  <FieldError message={formErrors.summary} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">{t("employee.insights.create.fields.body")}</Label>
                <Textarea
                  id="body"
                  placeholder={t("employee.insights.create.placeholders.body")}
                  rows={10}
                  value={formValues.body}
                  onChange={(event) => handleChange("body", event.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="publishedAt">
                    {t("employee.insights.create.fields.publishDate")}
                  </Label>
                  <Input
                    id="publishedAt"
                    type="datetime-local"
                    value={formValues.publishedAt}
                    onChange={(event) => handleChange("publishedAt", event.target.value)}
                  />
                  <FieldError message={formErrors.publishedAt} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextReview">
                    {t("employee.insights.create.fields.nextReviewDate")}
                  </Label>
                  <Input
                    id="nextReview"
                    type="datetime-local"
                    value={formValues.nextReviewDate}
                    onChange={(event) => handleChange("nextReviewDate", event.target.value)}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>{t("employee.insights.create.fields.mainImage")}</Label>
                <ImageUploader
                  label={t("employee.insights.create.imageUpload.label")}
                  description={t("employee.insights.create.imageUpload.description")}
                  onChange={(asset) => handleChange("mainImageAssetId", asset?.assetId ?? "")}
                />
                {formValues.mainImageAssetId ? (
                  <p className="text-xs text-muted-foreground">
                    {t("employee.insights.create.imageUpload.selected", {
                      assetId: formValues.mainImageAssetId,
                    })}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("employee.insights.create.sections.metadata")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="author">
                    {t("employee.insights.create.fields.author")}
                  </Label>
                  <Select
                    value={formValues.authorId}
                    onValueChange={(value) => handleChange("authorId", value)}
                  >
                    <SelectTrigger id="author">
                      <SelectValue
                        placeholder={t("employee.insights.create.placeholders.selectAuthor")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {authorOptions.map((author) => (
                        <SelectItem key={author.value} value={author.value}>
                          {author.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={formErrors.authorId} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewer">
                    {t("employee.insights.create.fields.reviewer")}
                  </Label>
                  <Select
                    value={formValues.reviewerId}
                    onValueChange={(value) => handleChange("reviewerId", value)}
                  >
                    <SelectTrigger id="reviewer">
                      <SelectValue
                        placeholder={t("employee.insights.create.placeholders.selectReviewer")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {authorOptions.map((author) => (
                        <SelectItem key={author.value} value={author.value}>
                          {author.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryCategory">
                    {t("employee.insights.create.fields.primaryCategory")}
                  </Label>
                  <Select
                    value={formValues.primaryCategoryId}
                    onValueChange={(value) => handleChange("primaryCategoryId", value)}
                  >
                    <SelectTrigger id="primaryCategory">
                      <SelectValue
                        placeholder={t("employee.insights.create.placeholders.selectCategory")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={formErrors.primaryCategoryId} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categories">
                    {t("employee.insights.create.fields.additionalCategories")}
                  </Label>
                  <Input
                    id="categories"
                    placeholder={t("employee.insights.create.placeholders.categoryIds")}
                    value={formValues.categoryIds}
                    onChange={(event) => handleChange("categoryIds", event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">
                  {t("employee.insights.create.fields.tags")}
                </Label>
                <Input
                  id="tags"
                  placeholder={t("employee.insights.create.placeholders.tags")}
                  value={formValues.tags}
                  onChange={(event) => handleChange("tags", event.target.value)}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {t("employee.insights.create.tags.limit", {
                      count: INSIGHT_VALIDATION_LIMITS.tagsMax,
                    })}
                  </span>
                  <span>
                    {t("employee.insights.create.tags.selected", {
                      count: tagsCount,
                    })}
                  </span>
                </div>
                <FieldError message={formErrors.tags} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("employee.insights.create.sections.relations")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkedProducts">
                  {t("employee.insights.create.fields.linkedProducts")}
                </Label>
                <Input
                  id="linkedProducts"
                  placeholder={t("employee.insights.create.placeholders.productIds")}
                  value={formValues.linkedProductIds}
                  onChange={(event) => handleChange("linkedProductIds", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedInsights">
                  {t("employee.insights.create.fields.linkedInsights")}
                </Label>
                <Input
                  id="linkedInsights"
                  placeholder={t("employee.insights.create.placeholders.insightIds")}
                  value={formValues.linkedInsightIds}
                  onChange={(event) => handleChange("linkedInsightIds", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pillarPage">
                  {t("employee.insights.create.fields.pillarPage")}
                </Label>
                <Select
                  value={formValues.pillarPageId}
                  onValueChange={(value) => handleChange("pillarPageId", value)}
                >
                  <SelectTrigger id="pillarPage">
                    <SelectValue
                      placeholder={t("employee.insights.create.placeholders.pillarInsight")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {insightOptions.map((insight) => (
                      <SelectItem key={insight.value} value={insight.value}>
                        {insight.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("employee.insights.create.sections.seo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryKeyword">
                    {t("employee.insights.create.fields.primaryKeyword")}
                  </Label>
                  <Input
                    id="primaryKeyword"
                    value={formValues.primaryKeyword}
                    onChange={(event) => handleChange("primaryKeyword", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryKeywordVolume">
                    {t("employee.insights.create.fields.keywordVolume")}
                  </Label>
                  <Input
                    id="primaryKeywordVolume"
                    type="number"
                    value={formValues.primaryKeywordVolume}
                    onChange={(event) =>
                      handleChange("primaryKeywordVolume", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryKeywordDifficulty">
                    {t("employee.insights.create.fields.keywordDifficulty")}
                  </Label>
                  <Input
                    id="primaryKeywordDifficulty"
                    type="number"
                    value={formValues.primaryKeywordDifficulty}
                    onChange={(event) =>
                      handleChange("primaryKeywordDifficulty", event.target.value)
                    }
                  />
                  <FieldError message={formErrors.primaryKeywordDifficulty} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seoMetadataId">
                    {t("employee.insights.create.fields.seoMetadataId")}
                  </Label>
                  <Input
                    id="seoMetadataId"
                    placeholder={t("employee.insights.create.placeholders.seoMetadataId")}
                    value={formValues.seoMetadataId}
                    onChange={(event) => handleChange("seoMetadataId", event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryKeywords">
                  {t("employee.insights.create.fields.secondaryKeywords")}
                </Label>
                <Textarea
                  id="secondaryKeywords"
                  placeholder={t("employee.insights.create.placeholders.secondaryKeywords")}
                  rows={4}
                  value={formValues.secondaryKeywords}
                  onChange={(event) => handleChange("secondaryKeywords", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("employee.insights.create.placeholders.secondaryKeywordsHelp")}
                </p>
                <FieldError message={formErrors.secondaryKeywords} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("employee.insights.create.sections.solution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="solutionMaturity">
                    {t("employee.insights.create.fields.solutionMaturity")}
                  </Label>
                  <Input
                    id="solutionMaturity"
                    placeholder={t("employee.insights.create.placeholders.solutionMaturity")}
                    value={formValues.solutionMaturity}
                    onChange={(event) => handleChange("solutionMaturity", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solutionComplexity">
                    {t("employee.insights.create.fields.solutionComplexity")}
                  </Label>
                  <Input
                    id="solutionComplexity"
                    placeholder={t("employee.insights.create.placeholders.solutionComplexity")}
                    value={formValues.solutionComplexity}
                    onChange={(event) => handleChange("solutionComplexity", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="implementationTimeline">
                    {t("employee.insights.create.fields.implementationTimeline")}
                  </Label>
                  <Input
                    id="implementationTimeline"
                    placeholder={t(
                      "employee.insights.create.placeholders.implementationTimeline"
                    )}
                    value={formValues.implementationTimeline}
                    onChange={(event) =>
                      handleChange("implementationTimeline", event.target.value)
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">
                    {t("employee.insights.create.fields.clientName")}
                  </Label>
                  <Input
                    id="clientName"
                    value={formValues.clientName}
                    onChange={(event) => handleChange("clientName", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientIndustry">
                    {t("employee.insights.create.fields.clientIndustry")}
                  </Label>
                  <Input
                    id="clientIndustry"
                    value={formValues.clientIndustry}
                    onChange={(event) => handleChange("clientIndustry", event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientChallenge">
                  {t("employee.insights.create.fields.clientChallenge")}
                </Label>
                <Textarea
                  id="clientChallenge"
                  rows={3}
                  value={formValues.clientChallenge}
                  onChange={(event) => handleChange("clientChallenge", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSolution">
                  {t("employee.insights.create.fields.clientSolution")}
                </Label>
                <Textarea
                  id="clientSolution"
                  rows={3}
                  value={formValues.clientSolution}
                  onChange={(event) => handleChange("clientSolution", event.target.value)}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="metrics">
                  {t("employee.insights.create.fields.metrics")}
                </Label>
                <Textarea
                  id="metrics"
                  rows={4}
                  placeholder={t("employee.insights.create.placeholders.metrics")}
                  value={formValues.metrics}
                  onChange={(event) => handleChange("metrics", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="solutionProducts">
                  {t("employee.insights.create.fields.solutionProducts")}
                </Label>
                <Textarea
                  id="solutionProducts"
                  rows={4}
                  placeholder={t("employee.insights.create.placeholders.solutionProducts")}
                  value={formValues.solutionProducts}
                  onChange={(event) => handleChange("solutionProducts", event.target.value)}
                />
                <FieldError message={formErrors.solutionProducts} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeInsightCreate;
