import { Card, Grid, Heading, Stack, Text, Button } from "@sanity/ui";
import { IntentLink } from "sanity/router";

type QuickAction = {
  title: string;
  description: string;
  intent: "create";
  type: string;
  cta: string;
  tone?: "primary" | "positive" | "caution";
};

const quickActions: QuickAction[] = [
  {
    title: "Launch a Promotion",
    description: "Create a new promotion with targeting, budget, and schedule controls.",
    intent: "create",
    type: "promotion",
    cta: "New Promotion",
    tone: "primary",
  },
  {
    title: "Create a Deal",
    description: "Add a featured or daily deal to highlight limited-time offers.",
    intent: "create",
    type: "deal",
    cta: "New Deal",
    tone: "positive",
  },
  {
    title: "Add a Product",
    description: "Expand the catalog with a product and assign categories/brands.",
    intent: "create",
    type: "product",
    cta: "New Product",
  },
  {
    title: "Publish News",
    description: "Post announcements or press updates for customers and partners.",
    intent: "create",
    type: "news",
    cta: "New News Post",
  },
  {
    title: "Upload a Banner",
    description: "Manage hero banners with links to campaigns, deals, or products.",
    intent: "create",
    type: "banner",
    cta: "New Banner",
  },
  {
    title: "Add Catalog Download",
    description: "Share brochures or catalogs for customers to download.",
    intent: "create",
    type: "catalog",
    cta: "New Catalog",
  },
];

const Dashboard = () => {
  return (
    <Stack space={5} padding={4}>
      <Stack space={3}>
        <Heading size={2}>Welcome to the Admin Dashboard</Heading>
        <Text muted size={2}>
          Use these quick shortcuts to jump into common workflows. For anything else, navigate through the left menu.
        </Text>
      </Stack>

      <Grid columns={[1, 1, 2, 3]} gap={3}>
        {quickActions.map((action) => (
          <Card key={action.title} padding={4} radius={3} shadow={1} tone={action.tone}>
            <Stack space={3}>
              <Heading size={1}>{action.title}</Heading>
              <Text muted size={1}>{action.description}</Text>
              <Button
                as={IntentLink}
                intent={action.intent}
                params={{ type: action.type }}
                text={action.cta}
                tone={action.tone}
              />
            </Stack>
          </Card>
        ))}
      </Grid>

      <Card padding={4} radius={3} shadow={1} tone="caution">
        <Stack space={3}>
          <Heading size={1}>Tip: reuse the navigation</Heading>
          <Text size={1}>
            The left-hand navigation mirrors the Admin Dashboard structure. Jump between Store, Orders, Users, Content,
            Events, Marketing, Reviews, and Settings without losing context.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
};

export default Dashboard;
