"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tradeSchema, type TradeFormData, type TradeFormOutput } from "@/lib/validations/schemas";
import { createClient } from "@/lib/supabase/client";
import { calculateRiskReward } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  Strategy,
  MistakeCategory,
  PsychologyCategory,
  ContextField,
  Account,
  Trade,
} from "@/types/database";

interface TradeFormProps {
  account: Account | null;
  strategies: Strategy[];
  mistakeCategories: MistakeCategory[];
  psychologyBefore: PsychologyCategory[];
  contextFields: ContextField[];
  sessions: { name: string }[];
  existingTrade?: Trade;
}

export function TradeForm({
  account,
  strategies,
  mistakeCategories,
  psychologyBefore,
  contextFields,
  sessions,
  existingTrade,
}: TradeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [contextData, setContextData] = useState<Record<string, boolean>>({});
  const [psychBefore, setPsychBefore] = useState<string[]>([]);
  const [psychAfter, setPsychAfter] = useState({
    followed_rules: false,
    entered_early: false,
    moved_stop: false,
    revenge_trade: false,
    overtraded: false,
    followed_plan: false,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TradeFormData, unknown, TradeFormOutput>({
    resolver: zodResolver(tradeSchema),
    defaultValues: existingTrade
      ? {
          trade_date: existingTrade.trade_date,
          trade_time: existingTrade.trade_time ?? "",
          instrument: existingTrade.instrument,
          direction: existingTrade.direction,
          session: existingTrade.session ?? "",
          strategy_id: existingTrade.strategy_id ?? "",
          timeframe: existingTrade.timeframe ?? "",
          htf_bias: existingTrade.htf_bias ?? "",
          entry_price: existingTrade.entry_price ?? undefined,
          stop_loss: existingTrade.stop_loss ?? undefined,
          take_profit: existingTrade.take_profit ?? undefined,
          exit_price: existingTrade.exit_price ?? undefined,
          lot_size: existingTrade.lot_size ?? undefined,
          risk_percentage: existingTrade.risk_percentage ?? undefined,
          risk_amount: existingTrade.risk_amount ?? undefined,
          result: existingTrade.result,
          pnl: existingTrade.pnl ?? undefined,
          r_multiple: existingTrade.r_multiple ?? undefined,
          reason_for_entry: existingTrade.reason_for_entry ?? "",
          what_went_well: existingTrade.what_went_well ?? "",
          what_went_wrong: existingTrade.what_went_wrong ?? "",
          lesson_learned: existingTrade.lesson_learned ?? "",
        }
      : {
          trade_date: new Date().toISOString().split("T")[0],
          direction: "long" as const,
          result: "open" as const,
        },
  });

  const direction = watch("direction");
  const entryPrice = watch("entry_price");
  const stopLoss = watch("stop_loss");
  const takeProfit = watch("take_profit");
  const riskPercent = watch("risk_percentage");

  useEffect(() => {
    if (entryPrice && stopLoss && takeProfit && direction) {
      const rr = calculateRiskReward(
        Number(entryPrice),
        Number(stopLoss),
        Number(takeProfit),
        direction
      );
      setValue("risk_reward_ratio", Math.round(rr * 100) / 100);
    }
  }, [entryPrice, stopLoss, takeProfit, direction, setValue]);

  useEffect(() => {
    if (account && riskPercent) {
      const riskAmount = account.current_balance * (Number(riskPercent) / 100);
      setValue("risk_amount", Math.round(riskAmount * 100) / 100);
    }
  }, [account, riskPercent, setValue]);

  useEffect(() => {
    if (existingTrade) {
      setContextData((existingTrade.context_data as Record<string, boolean>) ?? {});
      setPsychBefore(existingTrade.psychology_before ?? []);
      setPsychAfter((existingTrade.psychology_after as typeof psychAfter) ?? psychAfter);
    }
  }, [existingTrade]);

  async function onSubmit(data: TradeFormOutput) {
    if (!account) {
      setError("No active account found");
      return;
    }

    setLoading(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const tradeData = {
      user_id: user.id,
      account_id: account.id,
      trade_date: data.trade_date,
      trade_time: data.trade_time || null,
      instrument: data.instrument,
      direction: data.direction,
      session: data.session || null,
      strategy_id: data.strategy_id || null,
      account_balance_at_trade: account.current_balance,
      timeframe: data.timeframe || null,
      htf_bias: data.htf_bias || null,
      entry_price: data.entry_price ?? null,
      stop_loss: data.stop_loss ?? null,
      take_profit: data.take_profit ?? null,
      exit_price: data.exit_price ?? null,
      lot_size: data.lot_size ?? null,
      risk_percentage: data.risk_percentage ?? null,
      risk_amount: data.risk_amount ?? null,
      expected_reward: data.expected_reward ?? null,
      risk_reward_ratio: data.risk_reward_ratio ?? null,
      setup_quality_score: data.setup_quality_score ?? null,
      context_data: contextData,
      psychology_before: psychBefore,
      psychology_after: psychAfter,
      reason_for_entry: data.reason_for_entry || null,
      what_went_well: data.what_went_well || null,
      what_went_wrong: data.what_went_wrong || null,
      lesson_learned: data.lesson_learned || null,
      result: data.result,
      pnl: data.pnl ?? null,
      r_multiple: data.r_multiple ?? null,
    };

    let tradeId = existingTrade?.id;

    if (existingTrade) {
      const { error: updateError } = await supabase
        .from("trades")
        .update(tradeData)
        .eq("id", existingTrade.id);
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { data: newTrade, error: insertError } = await supabase
        .from("trades")
        .insert(tradeData)
        .select("id")
        .single();
      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
      tradeId = newTrade.id;
    }

    // Handle mistakes
    if (tradeId) {
      await supabase.from("trade_mistakes").delete().eq("trade_id", tradeId);
      if (selectedMistakes.length > 0) {
        await supabase.from("trade_mistakes").insert(
          selectedMistakes.map((mid) => ({
            trade_id: tradeId!,
            mistake_category_id: mid,
          }))
        );
      }
    }

    router.push("/journal");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="psychology">Psychology</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="trade_date">Date *</Label>
                <Input id="trade_date" type="date" {...register("trade_date")} />
                {errors.trade_date && <p className="text-xs text-destructive mt-1">{errors.trade_date.message}</p>}
              </div>
              <div>
                <Label htmlFor="trade_time">Time</Label>
                <Input id="trade_time" type="time" {...register("trade_time")} />
              </div>
              <div>
                <Label htmlFor="instrument">Instrument / Pair *</Label>
                <Input id="instrument" placeholder="EUR/USD" {...register("instrument")} />
                {errors.instrument && <p className="text-xs text-destructive mt-1">{errors.instrument.message}</p>}
              </div>
              <div>
                <Label>Direction *</Label>
                <Select
                  value={watch("direction")}
                  onValueChange={(v) => setValue("direction", v as "long" | "short")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long (Buy)</SelectItem>
                    <SelectItem value="short">Short (Sell)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session</Label>
                <Select
                  value={watch("session") ?? ""}
                  onValueChange={(v) => setValue("session", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Strategy</Label>
                <Select
                  value={watch("strategy_id") ?? ""}
                  onValueChange={(v) => setValue("strategy_id", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select strategy" /></SelectTrigger>
                  <SelectContent>
                    {strategies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Result</Label>
                <Select
                  value={watch("result")}
                  onValueChange={(v) => setValue("result", v as TradeFormData["result"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="win">Win</SelectItem>
                    <SelectItem value="loss">Loss</SelectItem>
                    <SelectItem value="breakeven">Breakeven</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pnl">P/L ($)</Label>
                <Input id="pnl" type="number" step="0.01" {...register("pnl")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup">
          <Card>
            <CardHeader><CardTitle>Trade Setup</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="timeframe">Timeframe</Label>
                <Input id="timeframe" placeholder="15m, 1H, 4H" {...register("timeframe")} />
              </div>
              <div>
                <Label htmlFor="htf_bias">HTF Bias</Label>
                <Input id="htf_bias" placeholder="Bullish, Bearish, Neutral" {...register("htf_bias")} />
              </div>
              <div>
                <Label htmlFor="entry_price">Entry Price</Label>
                <Input id="entry_price" type="number" step="any" {...register("entry_price")} />
              </div>
              <div>
                <Label htmlFor="stop_loss">Stop Loss</Label>
                <Input id="stop_loss" type="number" step="any" {...register("stop_loss")} />
              </div>
              <div>
                <Label htmlFor="take_profit">Take Profit</Label>
                <Input id="take_profit" type="number" step="any" {...register("take_profit")} />
              </div>
              <div>
                <Label htmlFor="exit_price">Exit Price</Label>
                <Input id="exit_price" type="number" step="any" {...register("exit_price")} />
              </div>
              <div>
                <Label htmlFor="lot_size">Lot Size</Label>
                <Input id="lot_size" type="number" step="any" {...register("lot_size")} />
              </div>
              <div>
                <Label htmlFor="risk_percentage">Risk %</Label>
                <Input id="risk_percentage" type="number" step="0.1" {...register("risk_percentage")} />
              </div>
              <div>
                <Label htmlFor="risk_amount">Risk Amount ($)</Label>
                <Input id="risk_amount" type="number" step="0.01" readOnly {...register("risk_amount")} />
              </div>
              <div>
                <Label htmlFor="risk_reward_ratio">R:R Ratio</Label>
                <Input id="risk_reward_ratio" type="number" step="0.01" readOnly {...register("risk_reward_ratio")} />
              </div>
              <div>
                <Label htmlFor="r_multiple">R Multiple</Label>
                <Input id="r_multiple" type="number" step="0.1" {...register("r_multiple")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context">
          <Card>
            <CardHeader><CardTitle>Trade Context</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {contextFields.map((field) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Checkbox
                    id={field.id}
                    checked={contextData[field.label] ?? false}
                    onCheckedChange={(checked) =>
                      setContextData((prev) => ({
                        ...prev,
                        [field.label]: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor={field.id} className="font-normal cursor-pointer">
                    {field.label}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="psychology">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Before Trade</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {psychologyBefore.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`before-${cat.id}`}
                      checked={psychBefore.includes(cat.name)}
                      onCheckedChange={(checked) => {
                        setPsychBefore((prev) =>
                          checked
                            ? [...prev, cat.name]
                            : prev.filter((p) => p !== cat.name)
                        );
                      }}
                    />
                    <Label htmlFor={`before-${cat.id}`} className="font-normal cursor-pointer">
                      {cat.name}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>After Trade</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { key: "followed_rules", label: "Did I follow my rules?" },
                  { key: "entered_early", label: "Did I enter early?" },
                  { key: "moved_stop", label: "Did I move my stop?" },
                  { key: "revenge_trade", label: "Did I revenge trade?" },
                  { key: "overtraded", label: "Did I overtrade?" },
                  { key: "followed_plan", label: "Did I follow my plan?" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={psychAfter[key as keyof typeof psychAfter]}
                      onCheckedChange={(checked) =>
                        setPsychAfter((prev) => ({
                          ...prev,
                          [key]: checked === true,
                        }))
                      }
                    />
                    <Label htmlFor={key} className="font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Rule Violations</CardTitle></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {mistakeCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`mistake-${cat.id}`}
                      checked={selectedMistakes.includes(cat.id)}
                      onCheckedChange={(checked) => {
                        setSelectedMistakes((prev) =>
                          checked
                            ? [...prev, cat.id]
                            : prev.filter((id) => id !== cat.id)
                        );
                      }}
                    />
                    <Label htmlFor={`mistake-${cat.id}`} className="font-normal cursor-pointer">
                      {cat.name}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader><CardTitle>Trade Review</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reason_for_entry">Reason for Entry</Label>
                <Textarea id="reason_for_entry" {...register("reason_for_entry")} />
              </div>
              <div>
                <Label htmlFor="what_went_well">What Went Well?</Label>
                <Textarea id="what_went_well" {...register("what_went_well")} />
              </div>
              <div>
                <Label htmlFor="what_went_wrong">What Went Wrong?</Label>
                <Textarea id="what_went_wrong" {...register("what_went_wrong")} />
              </div>
              <div>
                <Label htmlFor="lesson_learned">Lesson Learned</Label>
                <Textarea id="lesson_learned" {...register("lesson_learned")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : existingTrade ? "Update Trade" : "Save Trade"}
        </Button>
      </div>
    </form>
  );
}
