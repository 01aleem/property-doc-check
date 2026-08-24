import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

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
    ],
  }),
  component: Index,
});

type AnalysisRow = {
  id: string;
  title: string | null;
  doc_type: string | null;
  verdict: string | null;
  created_at: string | null;
};

function Index() {
  const [text, setText] = useState("");
  const [docType, setDocType] = useState("Rental Agreement");

  const { data: analyses, isLoading } = useQuery({
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

            <Button disabled={text.trim().length === 0}>Analyze Document</Button>
          </div>
        </section>

        <section
          aria-label="Analysis results"
          className="rounded-lg border border-dashed border-border bg-background/60 p-10 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Results will appear here after you analyze a document.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-background shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Past Analyses
            </h2>
          </div>

          {isLoading ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">Loading past analyses…</p>
          ) : !analyses || analyses.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No analyses yet — run your first document check above and it will show up here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {analyses.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
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
                  {row.verdict ? (
                    <Badge variant="secondary">{row.verdict}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">No verdict</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
