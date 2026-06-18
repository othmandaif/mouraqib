import { MahakimScraper } from './services/scraper/mahakimScraper'

async function main() {
  const scraper = new MahakimScraper()
  await scraper.init()

    const data = await (scraper as any).scrapeDossier(
    '2023/1501/5697',
    'محكمة الاستئناف بالدار البيضاء',
    'المحكمة الابتدائية الاجتماعية بالدار البيضاء'
    )
  console.log(JSON.stringify(data, null, 2))
  await scraper.close()
}

main()