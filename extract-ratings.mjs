import * as cheerio from 'cheerio';

async function extractSectorRatings() {
  try {
    console.log('Fetching https://chungkhoancaykhe.vn/overview...');
    
    const response = await fetch('https://chungkhoancaykhe.vn/overview', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const ratings = [];

    // Find all tables in the ranking section
    const tables = $('table').slice(2, 5); // Tables 2, 3, 4 contain the sector data
    
    console.log('Found', tables.length, 'rating tables\n');

    tables.each((tableIndex, table) => {
      const rows = $(table).find('tr');
      
      // First row contains sector names with average ratings
      if (rows.length > 0) {
        const firstRow = $(rows[0]);
        const cells = firstRow.find('td');
        
        cells.each((i, cell) => {
          const text = $(cell).text().trim();
          // Parse "SECTOR_NAME\navg RATING" format
          const match = text.match(/([A-ZÀ-ỿ\s]+)\s+avg\s+(\d+)/i);
          
          if (match) {
            const name = match[1].trim();
            const rating = parseInt(match[2], 10);
            
            if (name.length > 0 && rating >= 0 && rating <= 100) {
              ratings.push({ name, rating });
              console.log(`✓ ${name.padEnd(25)} = ${rating}`);
            }
          }
        });
      }
    });

    console.log(`\nTotal sectors extracted: ${ratings.length}`);
    console.log('\nJSON output:');
    console.log(JSON.stringify({ success: true, data: ratings }, null, 2));

    return ratings;

  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

extractSectorRatings();
