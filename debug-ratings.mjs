import * as cheerio from 'cheerio';

async function debugSectorRatings() {
  try {
    console.log('Fetching https://chungkhoancaykhe.vn/overview...');
    
    const response = await fetch('https://chungkhoancaykhe.vn/overview', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find all tables in the ranking section
    const tables = $('table').slice(2, 5); // Tables 2, 3, 4 contain the sector data
    
    console.log('Found', tables.length, 'rating tables\n');

    tables.each((tableIndex, table) => {
      const rows = $(table).find('tr');
      console.log(`\n=== Table ${tableIndex}: ${rows.length} rows ===`);
      
      if (rows.length > 0) {
        const firstRow = $(rows[0]);
        const cells = firstRow.find('td, th, div');
        
        console.log(`First row has ${cells.length} cells\n`);
        
        cells.each((i, cell) => {
          const text = $(cell).text().trim();
          const html = $(cell).html();
          
          console.log(`Cell ${i}:`);
          console.log(`  Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
          console.log(`  HTML: "${html?.substring(0, 100)}${html && html.length > 100 ? '...' : ''}"`);
          
          // Try different regex patterns
          const patterns = [
            /([A-ZÀ-ỿ\s]+)\s+avg\s+(\d+)/i,
            /([A-Z\s]+)\s+avg\s+(\d+)/,
            /avg\s+(\d+)/,
            /\d+/
          ];
          
          patterns.forEach((pattern, idx) => {
            const match = text.match(pattern);
            if (match) {
              console.log(`  Pattern ${idx} matches:`, match);
            }
          });
          
          console.log();
        });
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugSectorRatings();
