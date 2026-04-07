import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const publicFlowUrl = process.env.NEXT_PUBLIC_SF_PUBLIC_FLOW_URL ?? "";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(58,91,173,0.14),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="flex flex-col gap-4">
          <div className="inline-flex w-fit rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs tracking-[0.24em] uppercase backdrop-blur">
            Texei Weather
          </div>
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              A clean Next.js front ready for the Salesforce weather flow.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              This `front/` app gives you a simple landing shell with shadcn UI,
              ready to host a public weather entry point, embed a Salesforce flow,
              or evolve into a richer standalone site.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <Card className="border-border/60 bg-background/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>
                Minimal hero form you can later connect to the weather service or
                your Salesforce public page.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <Input placeholder="Enter a city or coordinates" />
              <Button size="lg">Check weather</Button>
            </CardContent>
            <CardFooter className="justify-between text-sm text-muted-foreground">
              <span>Stack: Next.js App Router</span>
              <span>UI: shadcn/ui</span>
            </CardFooter>
          </Card>

          <Card className="border-border/60 bg-zinc-950 text-zinc-50">
            <CardHeader>
              <CardTitle>What is included</CardTitle>
              <CardDescription className="text-zinc-300">
                Enough structure to start building immediately without extra setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-zinc-200">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                App Router with TypeScript
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                Tailwind CSS v4
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                shadcn Button, Card, and Input
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border/60 bg-background/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Embedded Salesforce Flow</CardTitle>
              <CardDescription>
                This host page embeds the public Salesforce Screen Flow directly,
                which is simpler than mounting the LWC through Lightning Out for
                this public website use case.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {publicFlowUrl ? (
                <div className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
                  <iframe
                    allow="geolocation"
                    className="min-h-[720px] w-full"
                    src={publicFlowUrl}
                    title="Texei Weather Lookup Flow"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  Set <code>NEXT_PUBLIC_SF_PUBLIC_FLOW_URL</code> to the public
                  URL of your Salesforce flow, for example a site URL that points
                  to <code>/flow/Texei_Weather_Lookup</code>.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Required Environment</CardTitle>
              <CardDescription>
                Use this variable for local development or deployment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3 font-mono text-xs">
                NEXT_PUBLIC_SF_PUBLIC_FLOW_URL=https://your-public-site.example.com/flow/Texei_Weather_Lookup
              </div>
              <p className="text-muted-foreground">
                The iframe includes <code>allow="geolocation"</code> so the
                embedded flow can still use the browser location inside the
                weather component.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
