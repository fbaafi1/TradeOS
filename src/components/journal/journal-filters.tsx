"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Strategy } from "@/types/database";

export function JournalFilters({ strategies }: { strategies: Strategy[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/journal?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = () => router.push("/journal");

  const hasFilters = Array.from(searchParams.keys()).length > 0;

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <Label className="text-xs">Search</Label>
          <Input
            placeholder="Search trades..."
            defaultValue={searchParams.get("search") ?? ""}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Pair</Label>
          <Input
            placeholder="EUR/USD"
            defaultValue={searchParams.get("pair") ?? ""}
            onChange={(e) => updateFilter("pair", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Strategy</Label>
          <Select
            value={searchParams.get("strategy") ?? ""}
            onValueChange={(v) => updateFilter("strategy", v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All strategies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All strategies</SelectItem>
              {strategies.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Result</Label>
          <Select
            value={searchParams.get("result") ?? ""}
            onValueChange={(v) => updateFilter("result", v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All results" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All results</SelectItem>
              <SelectItem value="win">Win</SelectItem>
              <SelectItem value="loss">Loss</SelectItem>
              <SelectItem value="breakeven">Breakeven</SelectItem>
              <SelectItem value="open">Open</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Direction</Label>
          <Select
            value={searchParams.get("direction") ?? ""}
            onValueChange={(v) => updateFilter("direction", v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All directions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All directions</SelectItem>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={clearFilters}
        >
          <X className="h-3 w-3 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
