const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load local .env values
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error("Missing .env file in project root");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    envVars[key] = value;
  }
});

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const key = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!url || !key) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(url, key);
const productsPath = path.join(__dirname, 'products.json');
if (!fs.existsSync(productsPath)) {
  console.error("Missing products.json. Please run parse_csv.js first.");
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

async function upload() {
  console.log(`Connecting to Supabase at: ${url}`);
  console.log(`Attempting to upload ${products.length} products...`);
  
  // Format items for insert/upsert
  const items = products.map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    brand: p.brand,
    price: p.price,
    stock: p.stock,
    warehouse_location: p.warehouse_location,
    description: p.description,
    image_url: p.image_url,
    status: p.status,
    specs: p.specs,
    support_info: p.support_info
  }));

  try {
    const { data, error } = await supabase
      .from('products')
      .upsert(items, { onConflict: 'id' });

    if (error) {
      console.error("Error inserting products:", error.message);
      console.error("Details:", error.details || error.hint);
      console.log("\nTIP: Make sure you have created the 'products' table in Supabase SQL editor using 'schema.sql'.");
    } else {
      console.log("Successfully fed 30 products into live Supabase database!");
    }
  } catch (err) {
    console.error("Exception during upload:", err.message);
  }
}

upload();
