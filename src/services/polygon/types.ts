// src/services/polygon/types.ts

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export enum Market {
  STOCKS = 'stocks',
  OPTIONS = 'options',
  FOREX = 'forex',
  CRYPTO = 'crypto',
}

export type StockUpdateEvent = {
  symbol: string;
  price: number;
  timestamp: number;
};

export type OptionUpdateEvent = {
  symbol: string;
  underlyingSymbol: string;
  price: number;
  size: number;
  timestamp: number;
};

export interface StockData {
  ticker: string;
  name?: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
}

export interface OptionData {
  symbol: string;
  underlyingSymbol: string;
  expirationDate: string;
  strikePrice: number;
  optionType: 'call' | 'put';
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  openInterest: number;
  volume: number;
  impliedVolatility: number;
  greeks: OptionGreeks;
}

export interface StockSearchResult {
  ticker: string;
  name: string;
  market: string;
  type: string;
  primary_exchange?: string;
  locale?: string;
  active?: boolean;
}