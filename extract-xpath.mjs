import * as cheerio from 'cheerio';

async function extractData() {
  try {
    console.log('Fetching https://chungkhoancaykhe.vn/overview...');
    
    const response = await fetch('https://chungkhoancaykhe.vn/overview', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('\n=== Looking for rankingSection ===');
    const rankingSection = $('#rankingSection');
    console.log('rankingSection found:', rankingSection.length > 0);
    
    if (rankingSection.length > 0) {
      console.log('rankingSection HTML (first 500 chars):');
      console.log(rankingSection.html()?.substring(0, 500));
    }

    console.log('\n=== All tables in page ===');
    const tables = $('table');
    console.log('Number of tables:', tables.length);
    
    tables.each((i, table) => {
      const rows = $(table).find('tr');
      if (rows.length > 0) {
        console.log(`\nTable ${i}: ${rows.length} rows`);
        rows.slice(0, 2).each((j, row) => {
          const cells = $(row).find('td, th');
          const rowData = cells.map((k, cell) => $(cell).text().trim()).get();
          if (rowData.length > 0) {
            console.log(`  Row ${j}: ${rowData.slice(0, 8).join(' | ')}`);
          }
        });
      }
    });

    // Look for ranking data with regex
    console.log('\n=== Looking for rating/ranking patterns ===');
    const ratingMatches = html.match(/(\w+(?:\s+\w+)*)\s+(\d{1,3})\s*(?:%|điểm|rating|rank)/gi) || [];
    console.log('Found potential rating matches:', ratingMatches.slice(0, 20));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

extractData();
