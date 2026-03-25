import { type SchemaTypeDefinition } from "sanity";

import { blockContentType } from "./blockContentType";
import { categoryType } from "./categoryType";
import { productType } from "./productType";
import { orderType } from "./orderType";
import { bannerType } from "./bannerType";
import { brandType } from "./brandTypes";
import { blogType } from "./blogType";
import { blogCategoryType } from "./blogCategoryType";
import { insightCategoryType } from "./insightCategoryType";
import { insightAuthorType } from "./insightAuthorType";
import { insightType } from "./insightType";
import { insightSeriesType } from "./insightSeriesType";
import { localeType } from "../schemas/types/locale";
import { personType } from "../schemas/person";
import { eventType } from "./eventType";
import { newsType } from "./newsType";
import { authorType } from "./authType";
import { addressType } from "./addressType";
import { contactType } from "./contactType";
import { sentNotificationType } from "./sentNotificationType";
import { userType } from "./userType";
import { userAccessRequestType } from "./userAccessRequestType";
import { reviewType } from "./reviewType";
import { subscriptionType } from "./subscriptionType";
import { downloadType } from "./downloadType";
import { eventRsvpType } from "./eventRsvpType";
import { catalogType } from "./catalogType";
import { promotionType } from "./promotionType";
import { dealType } from "./dealType";
import { pricingSettingsType } from "./pricingSettingsType";
import { storefrontSettingsType } from "./storefrontSettingsType";
import { purchaseOrderSettingsType } from "./purchaseOrderSettingsType";
import { quotationType } from "./quotationType";
import { productTypeOption } from "./productTypeOption";
import { salesContactType } from "./salesContactType";
import { seoMetadataType } from "./helpers/seoMetadataType";
import {
  articleType,
  faqEntryType,
  glossaryTermType,
  knowledgePackType,
  learningEventType,
  learningProductType,
  lessonType,
  recommendedKitLinkType,
  recordingType,
  seriesType,
  sessionType,
  solutionBundleType,
  speakerType,
  ticketType,
  venueType,
} from "./learningContentTypes";
import { knowledgePackAccessType } from "./knowledgePackAccessType";
import { contactSettingsType } from "./contactSettingsType";
import { footerSettingsType } from "./footerSettingsType";

// blogType/downloadType remain exported for legacy news/download routes until migrations land.

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    blockContentType,
    categoryType,
    productType,
    orderType,
    bannerType,
    brandType,
    blogType,
    blogCategoryType,
    insightCategoryType,
    insightAuthorType,
    insightType,
    insightSeriesType,
    localeType,
    personType,
    eventType,
    newsType,
    authorType,
    addressType,
    contactType,
    sentNotificationType,
    userType,
    userAccessRequestType,
    reviewType,
    subscriptionType,
    downloadType,
    eventRsvpType,
    catalogType,
    promotionType,
    dealType,
    pricingSettingsType,
    storefrontSettingsType,
    purchaseOrderSettingsType,
    quotationType,
    salesContactType,
    productTypeOption,
    seoMetadataType,
    articleType,
    seriesType,
    lessonType,
    glossaryTermType,
    faqEntryType,
    knowledgePackType,
    knowledgePackAccessType,
    learningEventType,
    sessionType,
    speakerType,
    venueType,
    ticketType,
    recordingType,
    learningProductType,
    solutionBundleType,
    recommendedKitLinkType,
    contactSettingsType,
    footerSettingsType,
  ],
};
