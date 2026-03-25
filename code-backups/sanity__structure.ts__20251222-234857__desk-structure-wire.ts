import { StructureBuilder } from "sanity/structure";
import {
  TagIcon,
  PackageIcon,
  ShoppingCartIcon,
  UsersIcon,
  BarChartIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react";

export const structure = (S: StructureBuilder) =>
  S.list()
    .title("Marketing Hub")
    .items([
      // PROMOTIONS SECTION
      S.listItem()
        .title("🎯 Promotions")
        .icon(() => "🎯")
        .child(
          S.list()
            .title("Promotions")
            .items([
              // Active Promotions
              S.listItem()
                .title("✅ Active Promotions")
                .child(
                  S.documentTypeList("promotion")
                    .title("Active Promotions")
                    .filter('_type == "promotion" && status == "active"')
                ),
              // Scheduled
              S.listItem()
                .title("📅 Scheduled")
                .child(
                  S.documentTypeList("promotion")
                    .title("Scheduled Promotions")
                    .filter('_type == "promotion" && status == "scheduled"')
                ),
              // Drafts
              S.listItem()
                .title("📝 Drafts")
                .child(
                  S.documentTypeList("promotion")
                    .title("Draft Promotions")
                    .filter('_type == "promotion" && status == "draft"')
                ),
              // All Promotions
              S.divider(),
              S.listItem()
                .title("📋 All Promotions")
                .child(S.documentTypeList("promotion").title("All Promotions")),
              // Create New
              S.divider(),
              S.listItem()
                .title("➕ Create New Promotion")
                .child(
                  S.document()
                    .schemaType("promotion")
                    .documentId("new-promotion")
                    .title("New Promotion")
                ),
            ])
        ),

      // DEALS SECTION
      S.listItem()
        .title("🏷️ Deals")
        .icon(() => "🏷️")
        .child(
          S.list()
            .title("Deals")
            .items([
              S.listItem()
                .title("✅ Active Deals")
                .child(
                  S.documentTypeList("deal")
                    .title("Active Deals")
                    .filter('_type == "deal" && status == "active"')
                ),
              S.listItem()
                .title("⭐ Featured Deals")
                .child(
                  S.documentTypeList("deal")
                    .title("Featured Deals")
                    .filter('_type == "deal" && dealType == "featured"')
                ),
              S.listItem()
                .title("📅 Daily Deals")
                .child(
                  S.documentTypeList("deal")
                    .title("Daily Deals")
                    .filter('_type == "deal" && dealType == "daily"')
                ),
              S.divider(),
              S.listItem()
                .title("📋 All Deals")
                .child(S.documentTypeList("deal").title("All Deals")),
              S.divider(),
              S.listItem()
                .title("➕ Create New Deal")
                .child(
                  S.document()
                    .schemaType("deal")
                    .documentId("new-deal")
                    .title("New Deal")
                ),
            ])
        ),

      S.divider(),

      // PRODUCTS
      S.listItem()
        .title("📦 Products")
        .icon(() => "📦")
        .child(S.documentTypeList("product").title("Products")),

      // CATEGORIES
      S.listItem()
        .title("📁 Categories")
        .icon(() => "📁")
        .child(S.documentTypeList("category").title("Categories")),

      S.divider(),

      // Quick Actions
      S.listItem()
        .title("⚡ Quick Actions")
        .icon(() => "⚡")
        .child(
          S.list()
            .title("Quick Actions")
            .items([
              S.listItem()
                .title("🆕 New Flash Sale")
                .child(
                  S.document()
                    .schemaType("promotion")
                    .documentId(`flash-sale-${Date.now()}`)
                    .initialValueTemplate("promotion-flash-sale")
                ),
              S.listItem()
                .title("📦 New Bundle Deal")
                .child(
                  S.document()
                    .schemaType("promotion")
                    .documentId(`bundle-${Date.now()}`)
                    .initialValueTemplate("promotion-bundle")
                ),
              S.listItem()
                .title("🏷️ New Clearance")
                .child(
                  S.document()
                    .schemaType("promotion")
                    .documentId(`clearance-${Date.now()}`)
                    .initialValueTemplate("promotion-clearance")
                ),
            ])
        ),
    ]);
