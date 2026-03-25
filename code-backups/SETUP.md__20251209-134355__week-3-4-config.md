# 🚀 ShopCart Pro - Setup Guide

Complete setup instructions for installing and configuring ShopCart Pro e-commerce platform.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Environment Configuration](#environment-configuration)
4. [Service Setup Guides](#service-setup-guides)
5. [Promotion System Setup](#promotion-system-setup)
6. [Database Setup](#database-setup)
7. [Running the Application](#running-the-application)
8. [Admin Configuration](#admin-configuration)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Support](#support)
12. [Next Steps](#next-steps)

---

## Prerequisites

### Required Software

Before starting, ensure you have installed:

- **Node.js** 18.0 or higher → [Download](https://nodejs.org/)
- **npm**, **yarn**, or **pnpm** (we recommend pnpm)
- **Git** → [Download](https://git-scm.com/)

### Required Accounts

You'll need free accounts for the following services:

1. **Sanity CMS** → [sanity.io](https://www.sanity.io/)
2. **Clerk Authentication** → [clerk.com](https://clerk.com/)
3. **Stripe Payments** → [stripe.com](https://stripe.com/)
4. **Firebase** → [console.firebase.google.com](https://console.firebase.google.com/)
5. **Gmail/Google Cloud** (for emails) → [console.cloud.google.com](https://console.cloud.google.com/)

---

## Installation Steps

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-repo/shopcartpro-yt.git
cd shopcartpro
```

### 2️⃣ Install Dependencies

Choose your preferred package manager:

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm (recommended)
pnpm install
```

### 3️⃣ Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

Now you need to fill in the values. Follow the sections below for each service.

---

## Environment Configuration

### 📁 Base Configuration

```bash
# For local development
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# For production (update after deployment)
# NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

---

## Service Setup Guides

### 🎨 Sanity CMS Setup

**Step 1: Create Sanity Project**

```bash
npm create sanity@latest -- --env=.env --create-project "ShopCart Pro" --dataset production
```

Follow the prompts to:

- Sign in or create Sanity account
- Create new project
- Choose dataset name (use "production")

**Step 2: Get Your Credentials**

1. Go to [Sanity Management](https://www.sanity.io/manage)
2. Select your project
3. Copy **Project ID** from settings

**Step 3: Create API Tokens**

1. Navigate to **API** section
2. Click **Add API token**
3. Create two tokens:
   - **Write Token**: Name it "Editor", select "Editor" permissions
   - **Read Token**: Name it "Viewer", select "Viewer" permissions

**Step 4: Update .env**

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id_here
SANITY_API_TOKEN=your_write_token_here
SANITY_API_READ_TOKEN=your_read_token_here
```

**Step 5: Import Sample Data (Optional)**

If you have the seed data file:

```bash
npx sanity@latest dataset import seed.tar.gz
```

---

### 🔐 Clerk Authentication Setup

**Step 1: Create Clerk Application**

1. Visit [Clerk Dashboard](https://dashboard.clerk.com/)
2. Sign up or log in
3. Click **Add application**
4. Choose **Next.js** as framework
5. Name your application "ShopCart Pro"

**Step 2: Configure Authentication**

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Enable **Email** authentication
3. Configure other options as needed

**Step 3: Set Up Paths**

1. Go to **Paths** section
2. Set the following:
   - **Sign-in URL**: `/sign-in`
   - **Sign-up URL**: `/sign-up`
   - **After sign-in URL**: `/`
   - **After sign-up URL**: `/`

**Step 4: Get API Keys**

1. Go to **API Keys** section
2. Copy both keys:
   - **Publishable Key** (starts with `pk_`)
   - **Secret Key** (starts with `sk_`)

**Step 5: Update .env**

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

---

### 💳 Stripe Payment Setup

**Step 1: Create Stripe Account**

1. Visit [Stripe](https://stripe.com/)
2. Sign up for account
3. Complete business verification (can use test mode initially)

**Step 2: Get API Keys**

1. Go to **Developers** → **API Keys**
2. Copy **Secret Key** (starts with `sk_test_` for test mode)

**Step 3: Set Up Webhooks**

**For Local Development:**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook secret (starts with `whsec_`)

**For Production:**

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Copy webhook secret

**Step 4: Update .env**

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### 🔥 Firebase Setup

**Step 1: Create Firebase Project**

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Enter project name "ShopCart Pro"
4. Follow setup wizard

**Step 2: Add Web App**

1. In project overview, click **Web** icon (</>)
2. Register app with name "ShopCart Web"
3. Copy the config object

**Step 3: Enable Firestore**

1. Go to **Firestore Database**
2. Click **Create database**
3. Start in **Production mode**
4. Choose location closest to users

**Step 4: Update .env**

Copy values from Firebase config:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...
```

---

### 📧 Email Service Setup (Gmail OAuth2)

**Step 1: Enable Gmail API**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Gmail API**

**Step 2: Create OAuth Credentials**

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Configure consent screen (internal or external)
4. Application type: **Web application**
5. Add authorized redirect URI: `https://developers.google.com/oauthplayground`
6. Copy **Client ID** and **Client Secret**

**Step 3: Get Refresh Token**

1. Visit [OAuth Playground](https://developers.google.com/oauthplayground)
2. Click settings (gear icon)
3. Check **Use your own OAuth credentials**
4. Enter your Client ID and Secret
5. Select **Gmail API v1** → **https://mail.google.com**
6. Click **Authorize APIs**
7. Sign in with your Gmail account
8. Click **Exchange authorization code for tokens**
9. Copy the **Refresh token**

**Step 4: Update .env**

```bash
GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REFRESH_TOKEN=1//04xxx
SENDER_EMAIL_ADDRESS=your-email@gmail.com
```

---

## Promotion System Setup

### Environment Variables

Add these to your `.env.local`:

```bash
# Firebase Admin SDK (for promotion analytics)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Optional: Analytics/Tracking
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FB_PIXEL_ID=XXXXXXXXXX
```

### Sanity Configuration

After adding the promotion schema:

1. Run type generation:
   ```bash
   pnpm typegen
   ```

2. Verify the schema in Sanity Studio:
   - Navigate to your Sanity Studio
   - You should see "Promotion Campaign" in the document types
   - Create a test promotion to verify all fields work

### Firestore Indexes

Create the following composite indexes in Firebase Console:

**Collection: `promotions/{campaignId}/analytics/real-time`**
No indexes needed (single document)

**Collection: `users/{userId}/promotions`**
- campaignId (Ascending) + purchaseCount (Descending)

**Collection: `cartAbandonments`** (for Week 3-4)
- status (Ascending) + lastUpdatedAt (Descending)

### Testing the Promotion System

1. **Create a test promotion in Sanity:**
   - Use campaignId: "test-promo-001"
   - Set status: "active"
   - Set dates to include current time
   - Set targetAudience.segmentType: "allCustomers"

2. **Test the eligibility API:**
   ```bash
   curl -X POST http://localhost:3000/api/promotions/eligibility \
     -H "Content-Type: application/json" \
     -d '{"context": {"page": "homepage"}}'
   ```

3. **Test the tracking API:**
   ```bash
   curl -X POST http://localhost:3000/api/promotions/track \
     -H "Content-Type: application/json" \
     -d '{"campaignId": "test-promo-001", "action": "view", "sessionId": "test-123"}'
   ```

4. **Run unit tests:**
   ```bash
   pnpm test
   ```

### Promotion Routes

| Route | Description |
|-------|-------------|
| `/deal` | Legacy deals page (now shows promotions) |
| `/promotions` | All active promotions |
| `/promotions/[campaignId]` | Single promotion detail |
| `/api/promotions/eligibility` | Check user eligibility |
| `/api/promotions/track` | Track interactions |
| `/api/promotions/campaigns` | List campaigns |
| `/api/promotions/analytics` | Campaign analytics (admin) |

### Cache Invalidation

Promotions use Next.js cache tags. To revalidate:

```typescript
import { revalidateTag } from 'next/cache';

// Revalidate all promotions
revalidateTag('promotions');

// Revalidate specific promotion
revalidateTag('promotion:campaign-id-here');
```

### Troubleshooting

**Promotion not showing:**
1. Check status is "active"
2. Check startDate <= now <= endDate
3. Check targetAudience.segmentType includes user's segment
4. Check budget/usage limits not exceeded

**Analytics not recording:**
1. Verify FIREBASE_* env vars are set
2. Check Firestore security rules allow writes
3. Check browser console for API errors

---

## Database Setup

### Sanity Studio Access

The Sanity Studio is built into the application:

1. Start the development server
2. Navigate to `http://localhost:3000/studio`
3. Sign in with your Sanity account
4. Start adding products, categories, etc.

### Initial Data Structure

Create these content types in order:

1. **Categories** - Product categories
2. **Brands** - Product brands
3. **Products** - Your product catalog
4. **Blog Posts** (optional)

---

## Running the Application

### Development Mode

```bash
# Start development server with Turbopack
npm run dev

# Or with other package managers
pnpm dev
yarn dev
```

Access the application:

- **Frontend**: http://localhost:3000
- **Sanity Studio**: http://localhost:3000/studio

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Other Scripts

```bash
# Run linter
npm run lint

# Generate Sanity types
npm run typegen
```

---

## Admin Configuration

### Set Admin Email

Update `.env` with your admin email:

```bash
NEXT_PUBLIC_ADMIN_EMAIL=[your-email@example.com]
```

### Access Admin Panel

1. Sign in with the admin email
2. Navigate to `/admin`
3. Access all admin features

---

## Deployment

### Deploy to Vercel (Recommended)

**Step 1: Push to GitHub**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

**Step 2: Deploy on Vercel**

1. Visit [Vercel](https://vercel.com/)
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`

**Step 3: Add Environment Variables**

Add ALL environment variables from your `.env` file in Vercel dashboard

**Step 4: Update URLs**

After deployment, update these:

```bash
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

**Step 5: Update External Services**

1. **Clerk**: Add production domain in dashboard
2. **Stripe**: Create production webhook
3. **Sanity**: Add CORS origin in settings

---

## Troubleshooting

### Common Issues

**1. Sanity Studio Not Loading**

```bash
# Regenerate Sanity types
npm run typegen

# Clear cache and rebuild
rm -rf .next
npm run build
```

**2. Clerk Authentication Errors**

- Verify API keys are correct
- Check redirect URLs match
- Ensure domain is added in Clerk dashboard

**3. Stripe Webhooks Not Working**

Local development:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Production:

- Verify webhook URL is correct
- Check webhook secret matches
- Ensure events are selected

**4. Environment Variables Not Loading**

- Restart dev server after changing `.env`
- Check for typos in variable names
- Ensure no quotes around values (except multi-word strings)

**5. Build Errors**

```bash
# Clear all caches
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

---

## Support

### Getting Help

- **Documentation**: Check the main README.md
- **Issues**: Create issue on GitHub
- **Email**: support@ncsecom.pro
- **Premium Support**: Available for paid version customers

---

## Next Steps

After successful setup:

1. ✅ Add products in Sanity Studio
2. ✅ Customize company information in `.env`
3. ✅ Test payment flow with Stripe test cards
4. ✅ Configure email templates
5. ✅ Set up admin account
6. ✅ Deploy to production

---

<div align="center">

**Need Help?** Check out our [comprehensive README](./README.md) or contact support.

**Ready for Production?** Contact our team for enterprise support and onboarding guidance.

</div>
