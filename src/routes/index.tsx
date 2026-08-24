import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { analyzeDocument } from "@/lib/analyze-document.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  MinusCircle,
  TriangleAlert,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Document Compliance Checker — Property Agreement Review" },
      {
        name: "description",
        content:
          "Internal tool for brokerage and legal teams to review rental and sale agreements for compliance issues.",
      },
      { property: "og:title", content: "Document Compliance Checker" },
      {
        property: "og:description",
        content:
          "Review rental and sale agreements for compliance issues and keep a record of past analyses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Flag = { item: string; status: string; note: string };

type AnalysisResult = {
  extracted: Record<string, unknown>;
  flags: Flag[];
  verdict: string;
  summary: string;
};

type AnalysisRow = {
  id: string;
  title: string | null;
  doc_type: string | null;
  verdict: string | null;
  created_at: string | null;
};

function toText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(toText).filter(Boolean) as string[];
    return parts.length ? parts.join(" & ") : null;
  }
  if (typeof value === "object") {
    const parts = Object.values(value as Record<string, unknown>)
      .map(toText)
      .filter(Boolean) as string[];
    return parts.length ? parts.join(" & ") : null;
  }
  return null;
}

function buildTitle(
  extracted: Record<string, unknown> | null | undefined,
  docType: string,
  fallbackText: string,
): string {
  const property = toText(extracted?.["property"]);
  const parties = toText(extracted?.["parties"]);

  const shortProperty = property ? property.split(/[\n]/)[0]!.slice(0, 70) : null;
  const shortParties = parties ? parties.split(/[\n]/)[0]!.slice(0, 60) : null;

  const pieces = [shortProperty, shortParties].filter(Boolean) as string[];
  if (pieces.length) return `${docType} — ${pieces.join(" · ")}`.slice(0, 160);

  const firstLine = fallbackText.trim().split("\n")[0]?.slice(0, 120);
  return firstLine || "Untitled document";
}

function verdictStyles(verdict: string | null | undefined) {
  const v = (verdict ?? "").toLowerCase();
  if (v.includes("complete"))
    return {
      className: "bg-success-muted text-success border-success/30",
      Icon: CheckCircle2,
    };
  if (v.includes("minor"))
    return {
      className: "bg-warning-muted text-warning-foreground border-warning/40",
      Icon: TriangleAlert,
    };
  if (v.includes("review"))
    return {
      className: "bg-destructive-muted text-destructive border-destructive/30",
      Icon: AlertCircle,
    };
  return { className: "bg-muted text-muted-foreground border-border", Icon: MinusCircle };
}

function statusStyles(status: string) {
  const s = status.toLowerCase();
  if (s === "ok")
    return { className: "bg-success-muted text-success border-success/30", Icon: CheckCircle2 };
  if (s === "attention")
    return {
      className: "bg-warning-muted text-warning-foreground border-warning/40",
      Icon: TriangleAlert,
    };
  if (s === "missing")
    return {
      className: "bg-destructive-muted text-destructive border-destructive/30",
      Icon: AlertCircle,
    };
  return { className: "bg-muted text-muted-foreground border-border", Icon: MinusCircle };
}

function VerdictBadge({ verdict, large }: { verdict: string | null; large?: boolean }) {
  const { className, Icon } = verdictStyles(verdict);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-semibold ${className} ${
        large ? "px-4 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Icon className={large ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
      {verdict || "No verdict"}
    </span>
  );
}

function ResultsPanel({ result }: { result: AnalysisResult }) {
  return (
    <section
      aria-label="Analysis results"
      className="space-y-6 rounded-lg border border-border bg-background p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Analysis results</h2>
        <VerdictBadge verdict={result.verdict} large />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{result.summary}</p>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Compliance checks
        </h3>
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {(result.flags ?? []).map((flag, i) => {
            const { className, Icon } = statusStyles(flag.status ?? "");
            return (
              <li key={`${flag.item}-${i}`} className="flex gap-3 px-4 py-3">
                <span
                  className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${className}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {flag.status}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{flag.item}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{flag.note}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Extracted details
        </h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(result.extracted ?? {}).map(([key, value]) => (
            <div key={key} className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {key.replace(/_/g, " ")}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {toText(value) ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive-muted p-4"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-destructive">Something went wrong</p>
        <p className="mt-0.5 text-sm text-destructive/90">{message}</p>
      </div>
    </div>
  );
}

function Index() {
  const [text, setText] = useState("");
  const [docType, setDocType] = useState("Rental Agreement");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const runAnalysis = useServerFn(analyzeDocument);

  const analyze = useMutation({
    mutationFn: async () => {
      const analysis = (await runAnalysis({
        data: { document_text: text, doc_type: docType },
      })) as AnalysisResult;

      const title = buildTitle(analysis.extracted, docType, text);
      const { error } = await supabase.from("analyses").insert({
        document_text: text,
        doc_type: docType,
        title,
        verdict: analysis.verdict,
        summary: analysis.summary,
        extracted: analysis.extracted as never,
        flags: analysis.flags as never,
      });
      if (error) throw new Error(`Analysis ran, but saving it failed: ${error.message}`);
      return analysis;
    },
    onSuccess: (analysis) => {
      setOpenId(null);
      setResult(analysis);
      void queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Analysis failed. Please try again.");
    },
  });

  const {
    data: analyses,
    isLoading,
    error: listError,
  } = useQuery({
    queryKey: ["analyses"],
    queryFn: async (): Promise<AnalysisRow[]> => {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, title, doc_type, verdict, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const {
    data: savedResult,
    isFetching: isLoadingSaved,
    error: savedError,
  } = useQuery({
    queryKey: ["analysis", openId],
    enabled: !!openId,
    queryFn: async (): Promise<AnalysisResult> => {
      const { data, error } = await supabase
        .from("analyses")
        .select("verdict, summary, extracted, flags")
        .eq("id", openId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("That analysis could not be found.");
      return {
        verdict: data.verdict ?? "",
        summary: data.summary ?? "",
        extracted: (data.extracted ?? {}) as Record<string, unknown>,
        flags: (data.flags ?? []) as Flag[],
      };
    },
  });

  const shown = openId ? (savedResult ?? null) : result;

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-2 px-6">
          <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Document Compliance Checker
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        <section className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Review an agreement
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste the full document text and run a compliance check.
          </p>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="agreement-text">Paste the agreement text here</Label>
              <Textarea
                id="agreement-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                placeholder="e.g. THIS RENTAL AGREEMENT is made on 1st April 2026 between the Lessor, Mr. A. Sharma, and the Lessee, Ms. R. Iyer, for the premises at Flat 402, Green Meadows, Pune — including rent, security deposit, lock-in period, maintenance and termination clauses…"
                className="resize-y font-mono text-sm leading-relaxed"
              />
            </div>

            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor="doc-type">Document type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger id="doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rental Agreement">Rental Agreement</SelectItem>
                  <SelectItem value="Sale Agreement">Sale Agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => analyze.mutate()}
              disabled={text.trim().length === 0 || analyze.isPending}
            >
              {analyze.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Analyzing…
                </>
              ) : (
                "Analyze Document"
              )}
            </Button>

            {analyze.isError ? (
              <ErrorPanel message={(analyze.error as Error).message} />
            ) : null}
          </div>
        </section>

        {analyze.isPending ? (
          <section
            aria-label="Analysis results"
            aria-busy="true"
            className="flex items-center justify-center gap-3 rounded-lg border border-border bg-background p-10 shadow-sm"
          >
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Analyzing the document…</p>
          </section>
        ) : openId && isLoadingSaved && !savedResult ? (
          <section
            aria-label="Analysis results"
            className="flex items-center justify-center gap-3 rounded-lg border border-border bg-background p-10 shadow-sm"
          >
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Loading saved analysis…</p>
          </section>
        ) : openId && savedError ? (
          <ErrorPanel message={(savedError as Error).message} />
        ) : shown ? (
          <ResultsPanel result={shown} />
        ) : (
          <section
            aria-label="Analysis results"
            className="rounded-lg border border-dashed border-border bg-background/60 p-10 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Results will appear here after you analyze a document — or open a past analysis below.
            </p>
          </section>
        )}

        <section className="rounded-lg border border-border bg-background shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Past Analyses</h2>
          </div>

          {isLoading ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">Loading past analyses…</p>
          ) : listError ? (
            <div className="px-6 py-6">
              <ErrorPanel message={(listError as Error).message} />
            </div>
          ) : !analyses || analyses.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No analyses yet — run your first document check above and it will show up here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {analyses.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(row.id);
                      if (typeof window !== "undefined")
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    aria-current={openId === row.id ? "true" : undefined}
                    className={`flex w-full flex-wrap items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/60 ${
                      openId === row.id ? "bg-muted/60" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.title || "Untitled document"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.doc_type ?? "—"}
                        {row.created_at
                          ? ` · ${new Date(row.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}`
                          : ""}
                      </p>
                    </div>
                    <VerdictBadge verdict={row.verdict} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
