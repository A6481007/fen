import Image from "next/image";
import Link from "next/link";
import { banner_1 } from "@/images";
import { Button } from "@/components/ui/button";
import Container from "./Container";

const highlights = [
  { label: "Dispatch", value: "Ships in 48 hours" },
  { label: "Support", value: "Humans, not bots" },
  { label: "Quality", value: "Verified inventory" },
];

const HomeBanner = async () => {
  return (
    <section className="border-b border-border bg-surface-0">
      <Container className="py-12 lg:py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
              New this week
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold leading-tight text-ink-strong">
              Commerce that stays out of the way.
            </h1>
            <p className="text-lg text-ink-muted max-w-[65ch]">
              A crisp, monochrome storefront that lets the products do the talking. Clear pricing,
              quick availability signals, and one decisive red action when you are ready to buy.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="accent" className="h-11 px-6">
                <Link href="/shop">Shop the latest</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-6">
                <Link href="/deal">View current deals</Link>
              </Button>
              <Button asChild variant="ghost" className="h-11 px-6 text-ink">
                <Link href="/news">Product updates</Link>
              </Button>
            </div>

            <dl className="grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="space-y-1">
                  <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                    {item.label}
                  </dt>
                  <dd className="text-base font-semibold text-ink-strong">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-surface-1 p-4 sm:p-6 space-y-4">
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-0">
              <Image
                src={banner_1}
                alt="Featured listening kit"
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink-strong">Ready-to-ship audio kit</p>
              <p className="text-sm text-ink-muted">
                Clean packaging, tested drivers, and a pairing guide written for humans. Zero visual
                noise—just the essentials before you buy.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-ink-muted">
              {["Delivery < 48h", "30-day returns", "Warranty included"].map((pill) => (
                <span key={pill} className="rounded-full border border-border px-3 py-1">
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HomeBanner;
