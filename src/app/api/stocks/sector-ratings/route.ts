import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface SectorRating {
  name: string;
  rating: number;
  change?: number;
}

/**
 * Mock sector ratings data (backup if parsing fails)
 * Based on the actual page structure from chungkhoancaykhe.vn/overview
 */
const MOCK_SECTOR_RATINGS: SectorRating[] = [
  { name: "Ngân hàng", rating: 57 },
  { name: "Bất động sản", rating: 55 },
  { name: "Thép", rating: 55 },
  { name: "Nông nghiệp", rating: 53 },
  { name: "Chứng khoán", rating: 53 },
  { name: "Xây dựng", rating: 52 },
  { name: "BDS KCN", rating: 52 },
  { name: "Bán lẻ", rating: 50 },
  { name: "Cao su", rating: 50 },
  { name: "Hóa chất", rating: 49 },
  { name: "Công nghệ", rating: 48 },
  { name: "Nhựa", rating: 48 },
  { name: "Hàng không", rating: 48 },
  { name: "Thủy sản", rating: 48 },
  { name: "Năng lượng", rating: 47 },
  { name: "Dệt may", rating: 47 },
  { name: "Dầu khí", rating: 46 },
  { name: "Bảo hiểm", rating: 46 },
  { name: "Vận tải", rating: 46 },
  { name: "Thực phẩm", rating: 46 },
  { name: "VLXD", rating: 49 },
  { name: "Đầu tư công", rating: 60 },
];

/**
 * Fetch and parse sector ratings from chungkhoancaykhe.vn
 * Extracts data from Plotly chart embedded in the page
 */
const SECTOR_NAME_MAP: Record<string, string> = {
  'Chung_khoan': 'Chứng khoán',
  'Ngan_hang': 'Ngân hàng',
  'Bat_dong_san': 'Bất động sản',
  'Thep': 'Thép',
  'BDS_KCN': 'BDS KCN',
  'Thuy_san': 'Thủy sản',
  'Nong_nghiep': 'Nông nghiệp',
  'Nang_luong': 'Năng lượng',
  'Dau_khi': 'Dầu khí',
  'Van_tai': 'Vận tải',
  'Ban_le': 'Bán lẻ',
  'Cao_su': 'Cao su',
  'Xay_dung': 'Xây dựng',
  'Det_may': 'Dệt may',
  'Nhua': 'Nhựa',
  'Cong_nghe': 'Công nghệ',
  'Hoa_chat': 'Hóa chất',
  'Duong': 'Thực phẩm',
  'Hang_khong': 'Hàng không',
  'Bao_hiem': 'Bảo hiểm'
};

async function fetchSectorRatings(): Promise<SectorRating[]> {
  try {
    console.log("🔄 Fetching accurate sector ratings from JSON API...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://chungkhoancaykhe.vn/overview/api/sectors-rsi", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`⚠️ API returned ${response.status}, using mock data`);
      return MOCK_SECTOR_RATINGS;
    }

    const json = await response.json();
    const data = json.data;
    
    if (!data || !data.dates || !data.rsi_data) {
      console.warn("⚠️ Invalid API response structure, using mock data");
      return MOCK_SECTOR_RATINGS;
    }

    const { dates, rsi_data } = data;
    if (dates.length === 0) return MOCK_SECTOR_RATINGS;

    const latestDate = dates[dates.length - 1];
    const prevDate = dates.length >= 2 ? dates[dates.length - 2] : null;
    const ratings: SectorRating[] = [];

    for (const key in rsi_data) {
      const sectorSeries = rsi_data[key];
      const currentScore = sectorSeries[latestDate];
      
      if (currentScore !== null && currentScore !== undefined) {
        let change = 0;
        if (prevDate) {
          const prevScore = sectorSeries[prevDate];
          if (prevScore !== null && prevScore !== undefined) {
            change = Math.round((currentScore - prevScore) * 10) / 10;
          }
        }

        ratings.push({
          name: SECTOR_NAME_MAP[key] || key,
          rating: Math.round(currentScore),
          change
        });
      }
    }

    // Sort by rating descending (Top 10 first)
    ratings.sort((a, b) => b.rating - a.rating);

    if (ratings.length === 0) {
      console.warn("⚠️ No ratings calculated from API, using mock data");
      return MOCK_SECTOR_RATINGS;
    }

    console.log(`✅ Extracted ${ratings.length} accurate sector ratings`);
    return ratings;
  } catch (error) {
    console.error("❌ Error fetching sector ratings:", error);
    return MOCK_SECTOR_RATINGS;
  }
}

/**
 * GET /api/stocks/sector-ratings
 * Returns sector valuation ratings from chungkhoancaykhe.vn
 */
export async function GET() {
  try {
    const ratings = await fetchSectorRatings();

    // Cache the response for 1 hour (3600 seconds)
    return NextResponse.json(
      {
        success: true,
        data: ratings,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      },
    );
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
