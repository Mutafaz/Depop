import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mbhcdlldqwqcbamrleyd.supabase.co'
// IMPORTANT: Paste your brand NEW service_role key here to bypass security during the import.
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iaGNkbGxkcXdxY2JhbXJsZXlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3NTAyOSwiZXhwIjoyMDk1NzUxMDI5fQ.9F2qJyYsTGlIliTs80lA8YhJq3xeCekmGwsEs6wKg1U'
const supabase = createClient(supabaseUrl, supabaseKey)

const USER_ID = 'cf6d2522-6491-4947-ba48-e4f5f5cc602e'

async function run() {
  console.log("Starting full database wipe for user...")
  
  // 1. Wipe Sales
  const { error: saleDelErr } = await supabase.from('sales').delete().eq('user_id', USER_ID)
  if (saleDelErr) console.error("Error wiping sales:", saleDelErr)
  
  // 2. Wipe Inventory (must happen after Sales because of foreign key)
  const { error: invDelErr } = await supabase.from('inventory').delete().eq('user_id', USER_ID)
  if (invDelErr) console.error("Error wiping inventory:", invDelErr)

  // 3. Wipe Expenses
  const { error: expDelErr } = await supabase.from('expenses').delete().eq('user_id', USER_ID)
  if (expDelErr) console.error("Error wiping expenses:", expDelErr)

  console.log("Wipe complete. Starting fresh import...")

  const csv = fs.readFileSync('./Resale Profits 2025 - 2025.csv', 'utf8')
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l)
  const dataLines = lines.slice(1) // Skip header
  
  let successCount = 0
  
  let currentYear = 2025
  let previousMonthNum = 0 // Track rollover

  for (let line of dataLines) {
    const cols = line.split(',')
    
    let qty = cols[0]
    let priceStr = cols[1]
    let costStr = cols[2]
    let profitStr = cols[3]
    let platform = cols[4]
    let month = cols[6]
    
    // Skip empty filler rows
    if (!priceStr || !platform) continue 
    
    const price = parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) || 0
    const cost = parseFloat(costStr.replace(/[^0-9.-]+/g, '')) || 0
    const profit = parseFloat(profitStr.replace(/[^0-9.-]+/g, '')) || 0
    
    platform = platform.trim()
    platform = platform.charAt(0).toUpperCase() + platform.slice(1)
    
    month = month ? month.trim().toLowerCase() : 'january'
    const monthMap = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
      'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
    }
    
    const monthNum = monthMap[month] || 1
    
    // Rollover logic: If we drop from a high month (e.g. December=12) back to January=1, bump the year.
    // Technically, any drop backwards (e.g. November to January) implies a new year crossover in sequential data.
    if (previousMonthNum !== 0 && monthNum < previousMonthNum) {
      currentYear++
    }
    previousMonthNum = monthNum
    
    const monthStr = monthNum.toString().padStart(2, '0')
    const dateStr = `${currentYear}-${monthStr}-01` // Always map to the 1st of the month
    
    let itemName = `Past Sale (${platform})`
    if (qty.toLowerCase() === 'giveaway') itemName = 'Giveaway'
    else if (qty === '0') itemName = 'Bonus/Misc'
    else if (parseInt(qty) > 1) itemName = `Bulk Sale (${qty} items)`

    console.log(`Importing: ${itemName} on ${dateStr} for $${price.toFixed(2)}`)

    const { data: invData, error: invErr } = await supabase.from('inventory').insert([{
      user_id: USER_ID,
      item_name: itemName,
      category: 'Imported',
      date_sourced: dateStr,
      cost_price: cost,
      status: 'Sold'
    }]).select().single()
    
    if (invErr) {
      console.error('Inventory Error:', invErr.message)
      continue
    }
    
    const { error: saleErr } = await supabase.from('sales').insert([{
      user_id: USER_ID,
      inventory_id: invData.id,
      platform: platform,
      sale_price: price,
      net_profit: profit,
      sale_date: dateStr
    }])
    
    if (saleErr) {
      console.error('Sale Error:', saleErr.message)
    } else {
      successCount++
    }
  }
  
  console.log(`\n✅ Done! Successfully imported ${successCount} past sales with corrected dates!`)
}

run()
