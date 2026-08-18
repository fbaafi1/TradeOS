"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
} from "lightweight-charts";

export interface OHLCVBar {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingChartProps {
  data: OHLCVBar[];
  symbol?: string;           // used to set correct price precision
  height?: number;
  className?: string;
  onCrosshairMove?: (price: number | null, time: number | null) => void;
}

/** Returns the correct priceFormat for a given symbol */
function getPriceFormat(symbol: string) {
  const s = symbol.toUpperCase();
  if (s.includes("JPY") || s.includes("CADJPY") || s.includes("CHFJPY")) {
    return { type: "price" as const, precision: 3, minMove: 0.001 };
  }
  if (["US30","SPX500","NAS100","DAX40","FTSE100"].includes(s)) {
    return { type: "price" as const, precision: 2, minMove: 0.01 };
  }
  if (["BTCUSD"].includes(s)) {
    return { type: "price" as const, precision: 1, minMove: 0.1 };
  }
  if (["ETHUSD","SOLUSD","BNBUSD"].includes(s)) {
    return { type: "price" as const, precision: 2, minMove: 0.01 };
  }
  if (["XAUUSD"].includes(s)) {
    return { type: "price" as const, precision: 2, minMove: 0.01 };
  }
  if (["XAGUSD"].includes(s)) {
    return { type: "price" as const, precision: 4, minMove: 0.0001 };
  }
  // Default: standard 5-decimal forex
  return { type: "price" as const, precision: 5, minMove: 0.00001 };
}

const CHART_THEME = {
  background: "#0c0e12",
  gridLines: "#1a1d23",
  textColor: "#6b7280",
  borderColor: "#27272a",
  upColor: "#26a69a",
  downColor: "#ef5350",
  wickUpColor: "#26a69a",
  wickDownColor: "#ef5350",
  volumeUpColor: "rgba(38, 166, 154, 0.3)",
  volumeDownColor: "rgba(239, 83, 80, 0.3)",
};

export function TradingChart({
  data,
  symbol = "EURUSD",
  height,
  className = "",
  onCrosshairMove,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const initialHeight = height ?? containerRef.current.clientHeight ?? 480;

    const chart = createChart(containerRef.current, {
      height: initialHeight,
      layout: {
        background: { color: CHART_THEME.background },
        textColor: CHART_THEME.textColor,
        fontFamily: "'Inter', 'Geist', system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_THEME.gridLines },
        horzLines: { color: CHART_THEME.gridLines },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#52525b",
          width: 1,
          style: 2,
          labelBackgroundColor: "#27272a",
        },
        horzLine: {
          color: "#52525b",
          width: 1,
          style: 2,
          labelBackgroundColor: "#27272a",
        },
      },
      rightPriceScale: {
        borderColor: CHART_THEME.borderColor,
        scaleMargins: { top: 0.05, bottom: 0.12 },
        autoScale: true,
      },
      timeScale: {
        borderColor: CHART_THEME.borderColor,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        minBarSpacing: 3,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    // Candlestick series with symbol-correct price precision
    const priceFormat = getPriceFormat(symbol);
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_THEME.upColor,
      downColor: CHART_THEME.downColor,
      borderUpColor: CHART_THEME.upColor,
      borderDownColor: CHART_THEME.downColor,
      borderVisible: true,
      wickUpColor: CHART_THEME.wickUpColor,
      wickDownColor: CHART_THEME.wickDownColor,
      wickVisible: true,
      priceFormat,
    }) as ISeriesApi<"Candlestick">;

    // Volume histogram — overlaid on a separate non-scaling pane
    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol_pane",
      lastValueVisible: false,
      priceLineVisible: false,
    }) as ISeriesApi<"Histogram">;

    // Volume pane occupies only bottom 15% — leaves 85%+ for candles
    chart.priceScale("vol_pane").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      borderVisible: false,
      visible: false,   // hide the volume price axis label
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volSeries;

    // Crosshair callback
    if (onCrosshairMove) {
      chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.seriesData) {
          onCrosshairMove(null, null);
          return;
        }
        const bar = param.seriesData.get(candleSeries) as CandlestickData | undefined;
        onCrosshairMove(
          bar ? bar.close : null,
          param.time ? Number(param.time) : null
        );
      });
    }

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: height ?? containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, symbol]);

  // Update data when it changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !data.length) return;

    const sorted = [...data].sort((a, b) => a.time - b.time);

    const candles: CandlestickData<Time>[] = sorted.map((d) => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumes: HistogramData<Time>[] = sorted.map((d) => ({
      time: d.time as Time,
      value: d.volume ?? 0,
      color: d.close >= d.open ? CHART_THEME.volumeUpColor : CHART_THEME.volumeDownColor,
    }));

    candleSeriesRef.current.setData(candles);
    volumeSeriesRef.current.setData(volumes);

    // Scroll to most recent candle
    chartRef.current?.timeScale().scrollToRealTime();
  }, [data]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${className}`}
      style={height !== undefined ? { height } : { height: "100%" }}
    />
  );
}
