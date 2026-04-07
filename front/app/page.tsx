import { Card, CardContent } from "@/components/ui/card";

const publicFlowUrl = process.env.NEXT_PUBLIC_SF_PUBLIC_FLOW_URL ?? "";

export default function Home() {
  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-4 text-foreground sm:px-6 sm:py-6">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-center gap-4">
        <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Texei Weather Lookup
        </h1>

        <Card className="flex h-full max-h-[calc(100vh-7rem)] w-full max-w-5xl overflow-hidden border-border/60 bg-background/90 shadow-lg">
          <CardContent className="h-full p-0">
            {publicFlowUrl ? (
              <iframe
                allow="geolocation"
                className="h-full min-h-[720px] w-full"
                src={publicFlowUrl}
                title="Texei Weather Lookup Flow"
              />
            ) : (
              <div className="flex h-full min-h-[720px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Set <code className="mx-1">NEXT_PUBLIC_SF_PUBLIC_FLOW_URL</code>
                to your public Salesforce flow page URL.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
