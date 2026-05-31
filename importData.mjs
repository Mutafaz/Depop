import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mbhcdlldqwqcbamrleyd.supabase.co'
// IMPORTANT: Replace this placeholder with your 'service_role' secret key!
// You can find it in your Supabase Dashboard -> Settings (gear icon) -> API
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iaGNkbGxkcXdxY2JhbXJsZXlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3NTAyOSwiZXhwIjoyMDk1NzUxMDI5fQ.9F2qJyYsTGlIliTs80lA8YhJq3xeCekmGwsEs6wKg1U'
const supabase = createClient(supabaseUrl, supabaseKey)

// Your exact User ID from the chat
const USER_ID = 'cf6d2522-6491-4947-ba48-e4f5f5cc602e'

async function run() {
  console.log("Starting import...")
  
  const csv = fs.readFileSync('./Resale Profits 2025 - 2025.csv', 'utf8')
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l)
  
  // Skip header line
  const dataLines = lines.slice(1)
  
  let successCount = 0
  
  for (let line of dataLines) {
    const cols = line.split(',')
    
    let qty = cols[0]
    let priceStr = cols[1]
    let costStr = cols[2]
    let profitStr = cols[3]
    let platform = cols[4]
    let month = cols[6]
    
    // Skip empty filler rows at the bottom of the CSV
    if (!priceStr || !platform) continue 
    
    // Clean currency strings
    const price = parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) || 0
    const cost = parseFloat(costStr.replace(/[^0-9.-]+/g, '')) || 0
    const profit = parseFloat(profitStr.replace(/[^0-9.-]+/g, '')) || 0
    
    // Capitalize platform name
    platform = platform.trim()
    platform = platform.charAt(0).toUpperCase() + platform.slice(1)
    
    // Map month string to a date (e.g. "January" -> "2025-01-01")
    month = month ? month.trim() : 'January'
    const monthMap = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04', 'may': '05', 'june': '06',
      'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'
    }
    const monthNum = monthMap[month.toLowerCase()] || '01'
    const dateStr = `2025-${monthNum}-01`
    
    // Create a meaningful inventory item name
    let itemName = `Past Sale (${platform})`
    if (qty.toLowerCase() === 'giveaway') itemName = 'Giveaway'
    else if (qty === '0') itemName = 'Bonus/Misc'
    else if (parseInt(qty) > 1) itemName = `Bulk Sale (${qty} items)`

    console.log(`Importing: ${itemName} on ${platform} for $${price.toFixed(2)}`)

    // 1. Insert into Inventory first
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
    
    // 2. Insert into Sales
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
  
  console.log(`\n✅ Done! Successfully imported ${successCount} past sales!`)
}

run()
