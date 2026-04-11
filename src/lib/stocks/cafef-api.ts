/**
 * Service to fetch foreign investor and proprietary trading data from CafeF APIs
 */

export interface StockMarketData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  basicPrice: number;
  changePrice: number;
  changePricePercent: number;
  ceilPrice: number;
  floorPrice: number;
  volume: number;
  value: number;
  eps: number;
  pe: number;
  marketCap: number;
  changeType: number; // 1: up, -1: down, 0: flat
  updateDate: string;
  link: string;
}

export interface InvestorHistoryData {
  buyVol: number;
  buyVal: number;
  sellVol: number;
  sellVal: number;
  netVol: number;
  netVal: number;
  date: string;
}

export interface ForeignInvestorData {
  ticker: string;
  buyValue: number;
  sellValue: number;
  netValue: number;
  buyVolume?: number;
  sellVolume?: number;
}

export interface ProprietaryTradingData {
  ticker: string;
  buyValue: number;
  sellValue: number;
  netValue: number;
}

export interface PERatioData {
  ticker: string;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  bvps: number | null;
  date?: string;
}

const CAFEF_BASE = "https://cafef.vn/du-lieu/ajax/mobile/smart";
const CAFEF_FINANCE = "https://cafef.vn/du-lieu/Ajax/PageNew/FinanceData";

/**
 * Cache for foreign investor API calls (5 minute expiry)
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const FOREIGN_INVESTOR_CACHE = new Map<string, CacheEntry<ForeignInvestorData[]>>();
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(type: "buy" | "sell", ticker: string): string {
  return `foreign-investor-${type}-${ticker}`;
}

function isCacheValid<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp < CACHE_EXPIRY_MS;
}

/**
 * Fetch foreign investor buy data for a ticker with caching
 */
export async function fetchForeignInvestorBuy(
  ticker: string,
): Promise<ForeignInvestorData[]> {
  const cacheKey = getCacheKey("buy", ticker);
  const cached = FOREIGN_INVESTOR_CACHE.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    console.log(`📦 Using cached foreign investor buy data for ${ticker}`);
    return cached.data;
  }

  try {
    console.log(`🔄 Fetching foreign investor buy data for ${ticker}`);
    const response = await fetch(
      `${CAFEF_BASE}/ajaxkhoingoai.ashx?type=buy&code=${ticker}`,
      { 
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) return [];
    const json = await response.json() as any;
    const data = parseForeignInvestorDataJSON(json, ticker, "buy");
    
    // Store in cache
    FOREIGN_INVESTOR_CACHE.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    
    return data;
  } catch (error) {
    console.error(`Error fetching foreign investor buy data for ${ticker}:`, error);
    return [];
  }
}

/**
 * Fetch foreign investor sell data for a ticker with caching
 */
export async function fetchForeignInvestorSell(
  ticker: string,
): Promise<ForeignInvestorData[]> {
  const cacheKey = getCacheKey("sell", ticker);
  const cached = FOREIGN_INVESTOR_CACHE.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    console.log(`📦 Using cached foreign investor sell data for ${ticker}`);
    return cached.data;
  }

  try {
    console.log(`🔄 Fetching foreign investor sell data for ${ticker}`);
    const response = await fetch(
      `${CAFEF_BASE}/ajaxkhoingoai.ashx?type=sell&code=${ticker}`,
      { 
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) return [];
    const json = await response.json() as any;
    const data = parseForeignInvestorDataJSON(json, ticker, "sell");
    
    // Store in cache
    FOREIGN_INVESTOR_CACHE.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    
    return data;
  } catch (error) {
    console.error(`Error fetching foreign investor sell data for ${ticker}:`, error);
    return [];
  }
}

/**
 * Fetch proprietary trading buy value
 */
/**
 * Cache for proprietary trading API calls (5 minute expiry)
 */
const PROPRIETARY_TRADING_CACHE = new Map<string, CacheEntry<ProprietaryTradingData[]>>();

function getProprietaryTradingCacheKey(type: "buy" | "sell", ticker: string): string {
  return `proprietary-trading-${type}-${ticker}`;
}

export async function fetchProprietaryTradingBuy(
  ticker: string,
): Promise<ProprietaryTradingData[]> {
  const cacheKey = getProprietaryTradingCacheKey("buy", ticker);
  const cached = PROPRIETARY_TRADING_CACHE.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    console.log(`📦 Using cached proprietary trading buy data for ${ticker}`);
    return cached.data;
  }

  try {
    console.log(`🔄 Fetching proprietary trading buy data for ${ticker}`);
    const response = await fetch(
      `${CAFEF_BASE}/ajaxgiaodichtudoanh.ashx?type=BUYVALUE&code=${ticker}`,
      { 
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) return [];
    const json = await response.json() as any;
    const data = parseProprietaryTradingDataJSON(json, ticker, "buy");
    
    // Store in cache
    PROPRIETARY_TRADING_CACHE.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    
    return data;
  } catch (error) {
    console.error(`Error fetching proprietary trading buy data for ${ticker}:`, error);
    return [];
  }
}

/**
 * Fetch proprietary trading sell value with caching
 */
export async function fetchProprietaryTradingSell(
  ticker: string,
): Promise<ProprietaryTradingData[]> {
  const cacheKey = getProprietaryTradingCacheKey("sell", ticker);
  const cached = PROPRIETARY_TRADING_CACHE.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    console.log(`📦 Using cached proprietary trading sell data for ${ticker}`);
    return cached.data;
  }

  try {
    console.log(`🔄 Fetching proprietary trading sell data for ${ticker}`);
    const response = await fetch(
      `${CAFEF_BASE}/ajaxgiaodichtudoanh.ashx?type=SELLVALUE&code=${ticker}`,
      { 
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) return [];
    const json = await response.json() as any;
    const data = parseProprietaryTradingDataJSON(json, ticker, "sell");
    
    // Store in cache
    PROPRIETARY_TRADING_CACHE.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    
    return data;
  } catch (error) {
    console.error(`Error fetching proprietary trading sell data for ${ticker}:`, error);
    return [];
  }
}



/**
 * Parse foreign investor data from JSON response
 */
function parseForeignInvestorDataJSON(
  json: any,
  ticker: string,
  type: "buy" | "sell",
): ForeignInvestorData[] {
  try {
    // Handle different response formats
    const dataArray = json?.Data || json?.data || [];
    
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return [];
    }

    // Find the matching ticker in the array
    const tickerData = dataArray.find((item: any) => 
      item?.Symbol?.toUpperCase() === ticker.toUpperCase()
    );

    if (!tickerData) {
      return [];
    }

    // Extract volume based on type
    const volume = type === "buy" 
      ? tickerData.Volume || tickerData.BuyVolume || 0
      : tickerData.Volume || tickerData.SellVolume || 0;

    const value = type === "buy"
      ? tickerData.Value || tickerData.BuyValue || 0
      : tickerData.Value || tickerData.SellValue || 0;

    if (!Number.isFinite(value)) {
      return [];
    }

    const result: ForeignInvestorData = {
      ticker: tickerData.Symbol?.toUpperCase() || ticker.toUpperCase(),
      buyValue: type === "buy" ? value : 0,
      sellValue: type === "sell" ? value : 0,
      netValue: type === "buy" ? value : -value,
    };

    if (type === "buy") {
      result.buyVolume = volume;
    } else {
      result.sellVolume = volume;
    }

    return [result];
  } catch (error) {
    console.error("Error parsing foreign investor JSON:", error);
    return [];
  }
}

/**
 * Parse proprietary trading data from JSON response
 */
function parseProprietaryTradingDataJSON(
  json: any,
  ticker: string,
  type: "buy" | "sell",
): ProprietaryTradingData[] {
  try {
    // Handle different response formats
    const dataArray = json?.Data || json?.data || [];
    
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return [];
    }

    // Find the matching ticker in the array
    const tickerData = dataArray.find((item: any) => 
      item?.Symbol?.toUpperCase() === ticker.toUpperCase()
    );

    if (!tickerData) {
      return [];
    }

    const value = type === "buy"
      ? tickerData.Value || tickerData.BuyValue || 0
      : tickerData.Value || tickerData.SellValue || 0;

    if (!Number.isFinite(value)) {
      return [];
    }

    const result: ProprietaryTradingData = {
      ticker: tickerData.Symbol?.toUpperCase() || ticker.toUpperCase(),
      buyValue: type === "buy" ? value : 0,
      sellValue: type === "sell" ? value : 0,
      netValue: type === "buy" ? value : -value,
    };

    return [result];
  } catch (error) {
    console.error("Error parsing proprietary trading JSON:", error);
    return [];
  }
}

/**
 * Parse foreign investor data from CSV format (legacy)
 */
function parseForeignInvestorData(
  csv: string,
  type: "buy" | "sell",
): ForeignInvestorData[] {
  const lines = csv.trim().split("\n").slice(1); // Skip header
  return lines
    .map((line) => {
      const parts = line.split(",");
      if (parts.length < 3) return null;

      const value = parseFloat(parts[1]);
      const volume = parseFloat(parts[2]);

      if (!Number.isFinite(value)) return null;

      const result: ForeignInvestorData = {
        ticker: parts[0]?.trim() || "N/A",
        buyValue: type === "buy" ? value : 0,
        sellValue: type === "sell" ? value : 0,
        netValue: type === "buy" ? value : -value,
      };

      if (type === "buy") {
        result.buyVolume = volume;
      } else {
        result.sellVolume = volume;
      }

      return result;
    })
    .filter((item): item is ForeignInvestorData => item !== null);
}

/**
 * Parse proprietary trading data from CSV format (legacy)
 */
function parseProprietaryTradingData(
  csv: string,
  type: "buy" | "sell",
): ProprietaryTradingData[] {
  const lines = csv.trim().split("\n").slice(1); // Skip header
  return lines
    .map((line) => {
      const parts = line.split(",");
      if (parts.length < 2) return null;

      const value = parseFloat(parts[1]);
      if (!Number.isFinite(value)) return null;

      const result: ProprietaryTradingData = {
        ticker: parts[0]?.trim() || "N/A",
        buyValue: type === "buy" ? value : 0,
        sellValue: type === "sell" ? value : 0,
        netValue: type === "buy" ? value : -value,
      };

      return result;
    })
    .filter((item): item is ProprietaryTradingData => item !== null);
}

/**
 * Parse PE/PB ratio data from API response
 */
function parsePERatioData(data: any, ticker: string): PERatioData | null {
  try {
    const latest = Array.isArray(data) ? data[data.length - 1] : data;
    if (!latest) return null;

    return {
      ticker,
      pe: latest.pe ? parseFloat(latest.pe) : null,
      pb: latest.pb ? parseFloat(latest.pb) : null,
      eps: latest.eps ? parseFloat(latest.eps) : null,
      bvps: latest.bvps ? parseFloat(latest.bvps) : null,
      date: latest.date || new Date().toISOString().split("T")[0],
    };
  } catch (error) {
    console.error(`Error parsing PE/PB data:`, error);
    return null;
  }
}

/**
 * Combine foreign investor buy and sell data
 */
export async function fetchForeignInvestorData(
  ticker: string,
): Promise<ForeignInvestorData | null> {
  const [buyData, sellData] = await Promise.all([
    fetchForeignInvestorBuy(ticker),
    fetchForeignInvestorSell(ticker),
  ]);

  const buy = buyData[0];
  const sell = sellData[0];

  if (!buy && !sell) return null;

  return {
    ticker,
    buyValue: buy?.buyValue || 0,
    sellValue: sell?.sellValue || 0,
    netValue: (buy?.buyValue || 0) - (sell?.sellValue || 0),
    buyVolume: buy?.buyVolume,
    sellVolume: sell?.sellVolume,
  };
}

/**
 * Combine proprietary trading buy and sell data
 */
export async function fetchProprietaryTradingData(
  ticker: string,
): Promise<ProprietaryTradingData | null> {
  const [buyData, sellData] = await Promise.all([
    fetchProprietaryTradingBuy(ticker),
    fetchProprietaryTradingSell(ticker),
  ]);

  const buy = buyData[0];
  const sell = sellData[0];

  if (!buy && !sell) return null;

  return {
    ticker,
    buyValue: buy?.buyValue || 0,
    sellValue: sell?.sellValue || 0,
    netValue: (buy?.buyValue || 0) - (sell?.sellValue || 0),
  };
}

/**
 * Cache for foreign investor market data API calls (5 minute expiry)
 */
const FOREIGN_INVESTOR_MARKET_CACHE = new Map<string, CacheEntry<StockMarketData[]>>();

/**
 * Track in-flight requests to prevent duplicate requests
 */
const FOREIGN_INVESTOR_MARKET_REQUESTS = new Map<string, Promise<StockMarketData[]>>();

export async function fetchForeignInvestorMarketData(
  type: "buy" | "sell",
  signal?: AbortSignal,
): Promise<StockMarketData[]> {
  const cacheKey = `foreign-investor-market-${type}`;
  const cached = FOREIGN_INVESTOR_MARKET_CACHE.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    console.log(`📦 Using cached foreign investor market data (${type})`);
    return cached.data;
  }

  // Return existing in-flight request if any
  const existingRequest = FOREIGN_INVESTOR_MARKET_REQUESTS.get(cacheKey);
  if (existingRequest) {
    console.log(`⏳ Waiting for in-flight foreign investor market data request (${type})`);
    return existingRequest;
  }

  const request = (async () => {
    try {
      console.log(`🔄 Fetching foreign investor market data (${type})`);
      const response = await fetch(
        `${CAFEF_BASE}/ajaxkhoingoai.ashx?type=${type}`,
        { 
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal,
        },
      );
      if (!response.ok) return [];
      const json = await response.json() as any;
      const data = parseMarketData(json);
      
      // Store in cache
      FOREIGN_INVESTOR_MARKET_CACHE.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log(`⚠️ Request cancelled for foreign investor market data (${type})`);
      } else {
        console.error(`Error fetching foreign investor market data:`, error);
      }
      return [];
    } finally {
      FOREIGN_INVESTOR_MARKET_REQUESTS.delete(cacheKey);
    }
  })();

  FOREIGN_INVESTOR_MARKET_REQUESTS.set(cacheKey, request);
  return request;
}

/**
 * Cache for proprietary trading market data API calls (5 minute expiry)
 */
const PROPRIETARY_TRADING_MARKET_CACHE = new Map<string, CacheEntry<StockMarketData[]>>();

/**
 * Fetch proprietary trading market data (all top stocks) with caching
 */
export async function fetchProprietaryTradingMarketData(
  type: "BUYVALUE" | "SELLVALUE",
): Promise<StockMarketData[]> {
  const cacheKey = `proprietary-trading-market-${type}`;
  const cached = PROPRIETARY_TRADING_MARKET_CACHE.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    console.log(`📦 Using cached proprietary trading market data (${type})`);
    return cached.data;
  }

  try {
    console.log(`🔄 Fetching proprietary trading market data (${type})`);
    const response = await fetch(
      `${CAFEF_BASE}/ajaxgiaodichtudoanh.ashx?type=${type}`,
      { 
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) return [];
    const json = await response.json() as any;
    const data = parseMarketData(json);
    
    // Store in cache
    PROPRIETARY_TRADING_MARKET_CACHE.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    
    return data;
  } catch (error) {
    console.error(`Error fetching proprietary trading market data:`, error);
    return [];
  }
}

/**
 * Parse market data from API response
 */
function parseMarketData(json: any): StockMarketData[] {
  try {
    const dataArray = json?.Data || json?.data || [];
    if (!Array.isArray(dataArray)) return [];

    return dataArray.map((item: any) => ({
      symbol: item?.Symbol?.toUpperCase() || "N/A",
      companyName: item?.CompanyName || "",
      currentPrice: typeof item?.CurrentPrice === "number" ? item.CurrentPrice : 0,
      basicPrice: typeof item?.BasicPrice === "number" ? item.BasicPrice : 0,
      changePrice: typeof item?.ChangePrice === "number" ? item.ChangePrice : 0,
      changePricePercent: typeof item?.ChangePricePercent === "number" ? item.ChangePricePercent : 0,
      ceilPrice: typeof item?.CeilPrice === "number" ? item.CeilPrice : 0,
      floorPrice: typeof item?.FloorPrice === "number" ? item.FloorPrice : 0,
      volume: typeof item?.Volume === "number" ? item.Volume : 0,
      value: typeof item?.Value === "number" ? item.Value : 0,
      eps: typeof item?.EPS === "number" ? item.EPS : 0,
      pe: typeof item?.PE === "number" ? item.PE : 0,
      marketCap: typeof item?.MarketCap === "number" ? item.MarketCap : 0,
      changeType: typeof item?.ChangeType === "number" ? item.ChangeType : 0,
      updateDate: item?.UpdateDate || new Date().toISOString(),
      link: item?.Link || "",
    })).filter(stock => stock.symbol !== "N/A" && Math.abs(stock.value) > 0);
  } catch (error) {
    console.error("Error parsing market data:", error);
    return [];
  }
}

const MSH_APPDATA_BASE = "https://msh-appdata.cafef.vn/rest-api/api/v1";

/**
 * Fetch foreign investor historical data
 */
export async function fetchForeignInvestorHistory(
  symbol: string = "VNINDEX",
  days: number = 20,
): Promise<InvestorHistoryData[]> {
  try {
    const response = await fetch(
      `${MSH_APPDATA_BASE}/OverviewOrgnizaztion/0/yyyyMMdd/${days}?symbol=${symbol}`,
      { cache: "no-store" },
    );
    if (!response.ok) return [];
    const json = (await response.json()) as any;
    return parseInvestorHistory(json);
  } catch (error) {
    console.error(`Error fetching foreign investor history:`, error);
    return [];
  }
}

/**
 * Fetch proprietary trading historical data
 */
export async function fetchProprietaryTradingHistory(
  symbol: string = "VNINDEX",
  days: number = 20,
): Promise<InvestorHistoryData[]> {
  try {
    const response = await fetch(
      `${MSH_APPDATA_BASE}/OverviewOrgnizaztion/1/yyyyMMdd/${days}?symbol=${symbol}`,
      { cache: "no-store" },
    );
    if (!response.ok) return [];
    const json = (await response.json()) as any;
    return parseInvestorHistory(json);
  } catch (error) {
    console.error(`Error fetching proprietary trading history:`, error);
    return [];
  }
}

/**
 * Parse historical investor data
 */
function parseInvestorHistory(json: any): InvestorHistoryData[] {
  try {
    if (!Array.isArray(json)) return [];

    return json
      .map((item: any) => ({
        buyVol: typeof item?.buyVol === "number" ? item.buyVol : 0,
        buyVal: typeof item?.buyVal === "number" ? item.buyVal : 0,
        sellVol: typeof item?.sellVol === "number" ? item.sellVol : 0,
        sellVal: typeof item?.sellVal === "number" ? item.sellVal : 0,
        netVol: typeof item?.netVol === "number" ? item.netVol : 0,
        netVal: typeof item?.netVal === "number" ? item.netVal : 0,
        date: item?.date || new Date().toISOString(),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error("Error parsing investor history:", error);
    return [];
  }
}

/**
 * Fetch PE/PB ratio data for a ticker
 */
export async function fetchPERatioData(ticker: string): Promise<PERatioData | null> {
  try {
    const normalizedTicker = ticker.toUpperCase();
    const response = await fetch(
      `https://cafef.vn/du-lieu/Ajax/PageNew/FinanceData/GetDataChartPE.ashx`,
      { 
        cache: "no-store",
        method: "GET",
      },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as any;
    
    // Parse the response - handle both array and object formats
    const dataArray = Array.isArray(json) ? json : json?.data || [];
    const data = Array.isArray(dataArray) ? dataArray[0] : json;
    
    if (!data) return null;

    return {
      ticker: normalizedTicker,
      pe: typeof data.PE === "number" ? data.PE : null,
      pb: typeof data.PB === "number" ? data.PB : null,
      eps: typeof data.EPS === "number" ? data.EPS : null,
      bvps: typeof data.BVPS === "number" ? data.BVPS : null,
      date: data.date || new Date().toISOString().split("T")[0],
    };
  } catch (error) {
    console.error(`Error fetching PE/PB data for ${ticker}:`, error);
    return null;
  }
}

/**
 * Bulk stock data cache - stores all stock data fetched from bulk API
 * Key is ticker symbol, value is StockMarketData
 */
interface BulkStockCache {
  data: Map<string, StockMarketData>;
  timestamp: number;
  expiryMs: number; // Cache validity in milliseconds
}

let stockDataCache: BulkStockCache | null = null;
const BULK_CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes cache validity

/**
 * Check if bulk stock data cache is still valid
 */
function isStockDataCacheValid(): boolean {
  if (!stockDataCache) return false;
  const now = Date.now();
  return now - stockDataCache.timestamp < stockDataCache.expiryMs;
}

/**
 * Get bulk API endpoint with all stock codes
 * Combines tickers from all exchanges (HSX, HNX, UPCOM, plus VN30 indices)
 */
function getBulkApiEndpoint(): string {
  // Import ticker list - build it here to avoid circular dependencies
  const allTickers = [
    "VNINDEX", // Main index
    "HNX", // HNX index
    "HSX", // HSX index
    "UPCOM", // UPCOM index
    // Add a sample of popular stocks to avoid excessively long URL
    // In production, you may want to fetch by batch or paginate
    "ACB", "BCM", "BID", "BVH", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG",
    "MBB", "MSN", "MWG", "NVL", "PDR", "PLX", "POW", "SAB", "SSI", "STB",
    "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB", "VRE",
  ].join(",");

  return `https://bgapidatafeed.vps.com.vn/getliststockdata/${allTickers}`;
}

/**
 * Fetch all stock data in a single bulk request
 * Results are cached for 5 minutes
 */
export async function fetchAllStockDataBulk(): Promise<Map<string, StockMarketData>> {
  // Return cached data if valid
  if (isStockDataCacheValid() && stockDataCache) {
    console.log("📦 Using cached stock data");
    return stockDataCache.data;
  }

  try {
    console.log("🔄 Fetching bulk stock data from API...");
    const endpoint = getBulkApiEndpoint();
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.warn(`Bulk API returned ${response.status}, using empty cache`);
      return new Map();
    }

    const json = (await response.json()) as any;
    const stocks = parseMarketData(json);

    // Create cache with expiry
    const dataMap = new Map<string, StockMarketData>();
    stocks.forEach((stock) => {
      dataMap.set(stock.symbol, stock);
    });

    stockDataCache = {
      data: dataMap,
      timestamp: Date.now(),
      expiryMs: CACHE_EXPIRY_MS,
    };

    console.log(`✅ Cached ${stocks.length} stocks`);
    return dataMap;
  } catch (error) {
    console.error("Error fetching bulk stock data:", error);
    return new Map();
  }
}

/**
 * Get a specific stock data from cache, fetching bulk data if needed
 */
export async function getCachedStockData(
  ticker: string,
): Promise<StockMarketData | null> {
  const normalizedTicker = ticker.toUpperCase();
  
  // Fetch bulk data if not cached
  const stockMap = await fetchAllStockDataBulk();
  
  const stock = stockMap.get(normalizedTicker);
  return stock || null;
}

/**
 * Clear the stock data cache (useful for testing or manual refresh)
 */
export function clearStockDataCache(): void {
  stockDataCache = null;
  console.log("🗑️ Stock data cache cleared");
}

/**
 * Get cache status for debugging
 */
export function getStockCacheStatus(): {
  isCached: boolean;
  stockCount: number;
  timestamp: number | null;
  isValid: boolean;
} {
  return {
    isCached: stockDataCache !== null,
    stockCount: stockDataCache?.data.size || 0,
    timestamp: stockDataCache?.timestamp || null,
    isValid: isStockDataCacheValid(),
  };
}
