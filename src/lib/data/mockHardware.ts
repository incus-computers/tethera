export interface ComponentItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  slot: string;
  price: number;
  image: string;
  inStock: boolean;
  stockCount: number;
  description?: string;
  highlights?: string[];
  specs: {
    socket?: string;
    ramType?: "DDR4" | "DDR5";
    formFactor?: "ATX" | "Micro-ATX" | "Mini-ITX";
    tdpWatts?: number;
    lengthMm?: number;
    maxGpuLengthMm?: number;
    radiatorSizeMm?: number;
    wattage?: number;
    capacity?: string;
    speed?: string;
  };
}

export const MOCK_COMPONENTS: ComponentItem[] = [
  // --- CPUs ---
  {
    id: "cpu-1",
    sku: "AMD-100-100000910WOF",
    name: "AMD Ryzen 7 7800X3D 8-Core 16-Thread Processor",
    brand: "AMD",
    category: "Processors",
    slot: "cpu",
    price: 7199000,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 14,
    specs: { socket: "AM5", tdpWatts: 120 }
  },
  {
    id: "cpu-2",
    sku: "AMD-100-100000593WOF",
    name: "AMD Ryzen 9 7950X 16-Core 32-Thread Processor",
    brand: "AMD",
    category: "Processors",
    slot: "cpu",
    price: 9399000,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 6,
    specs: { socket: "AM5", tdpWatts: 170 }
  },
  {
    id: "cpu-3",
    sku: "INT-BX8071514700K",
    name: "Intel Core i7-14700K 20-Core (8P+12E) Processor",
    brand: "Intel",
    category: "Processors",
    slot: "cpu",
    price: 6499000,
    image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 9,
    specs: { socket: "LGA1700", tdpWatts: 253 }
  },
  {
    id: "cpu-4",
    sku: "INT-BX8071514900K",
    name: "Intel Core i9-14900K 24-Core (8P+16E) Processor",
    brand: "Intel",
    category: "Processors",
    slot: "cpu",
    price: 8799000,
    image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 4,
    specs: { socket: "LGA1700", tdpWatts: 253 }
  },

  // --- Motherboards ---
  {
    id: "mb-1",
    sku: "ASUS-ROG-B650E-F",
    name: "ASUS ROG STRIX B650E-F GAMING WIFI Motherboard",
    brand: "ASUS",
    category: "Motherboards",
    slot: "motherboard",
    price: 4599000,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 11,
    specs: { socket: "AM5", ramType: "DDR5", formFactor: "ATX" }
  },
  {
    id: "mb-2",
    sku: "MSI-MAG-B650-TOMAHAWK",
    name: "MSI MAG B650 TOMAHAWK WIFI AM5 Motherboard",
    brand: "MSI",
    category: "Motherboards",
    slot: "motherboard",
    price: 3499000,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 18,
    specs: { socket: "AM5", ramType: "DDR5", formFactor: "ATX" }
  },
  {
    id: "mb-3",
    sku: "ASUS-ROG-Z790-E",
    name: "ASUS ROG STRIX Z790-E GAMING WIFI II Motherboard",
    brand: "ASUS",
    category: "Motherboards",
    slot: "motherboard",
    price: 6999000,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 7,
    specs: { socket: "LGA1700", ramType: "DDR5", formFactor: "ATX" }
  },
  {
    id: "mb-4",
    sku: "MSI-PRO-B760M-A",
    name: "MSI PRO B760M-A WIFI DDR5 Micro-ATX Motherboard",
    brand: "MSI",
    category: "Motherboards",
    slot: "motherboard",
    price: 2499000,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 12,
    specs: { socket: "LGA1700", ramType: "DDR5", formFactor: "Micro-ATX" }
  },
  {
    id: "mb-5",
    sku: "MSI-PRO-Z790-P-D4",
    name: "MSI PRO Z790-P DDR4 ATX Motherboard",
    brand: "MSI",
    category: "Motherboards",
    slot: "motherboard",
    price: 2999000,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 8,
    specs: { socket: "LGA1700", ramType: "DDR4", formFactor: "ATX" }
  },

  // --- Memory (RAM) ---
  {
    id: "ram-1",
    sku: "COR-CMH32GX5M2B6000C30",
    name: "Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz CL30",
    brand: "Corsair",
    category: "Memory",
    slot: "ram",
    price: 2299000,
    image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 22,
    specs: { ramType: "DDR5", capacity: "32GB", speed: "6000MHz" }
  },
  {
    id: "ram-2",
    sku: "GSK-F5-6000J3040G32GX2-TZ5NR",
    name: "G.Skill Trident Z5 Neo RGB 64GB (2x32GB) DDR5 6000MHz",
    brand: "G.Skill",
    category: "Memory",
    slot: "ram",
    price: 3499000,
    image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 8,
    specs: { ramType: "DDR5", capacity: "64GB", speed: "6000MHz" }
  },
  {
    id: "ram-3",
    sku: "COR-CMK32GX4M2D3600C18",
    name: "Corsair Vengeance LPX 32GB (2x16GB) DDR4 3600MHz CL18",
    brand: "Corsair",
    category: "Memory",
    slot: "ram",
    price: 1399000,
    image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 15,
    specs: { ramType: "DDR4", capacity: "32GB", speed: "3600MHz" }
  },

  // --- Graphics Cards (GPU) ---
  {
    id: "gpu-1",
    sku: "ASUS-TUF-RTX4080S-O16G",
    name: "ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB OC Edition",
    brand: "ASUS",
    category: "Graphics Cards",
    slot: "gpu",
    price: 16799000,
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 5,
    specs: { tdpWatts: 320, lengthMm: 348 }
  },
  {
    id: "gpu-2",
    sku: "GIG-GV-N407TSGAMING-16GD",
    name: "Gigabyte GeForce RTX 4070 Ti SUPER Gaming OC 16GB",
    brand: "Gigabyte",
    category: "Graphics Cards",
    slot: "gpu",
    price: 13299000,
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 9,
    specs: { tdpWatts: 285, lengthMm: 300 }
  },
  {
    id: "gpu-3",
    sku: "ASUS-DUAL-RTX4060TI-O8G",
    name: "ASUS Dual GeForce RTX 4060 Ti White OC 8GB",
    brand: "ASUS",
    category: "Graphics Cards",
    slot: "gpu",
    price: 6399000,
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 14,
    specs: { tdpWatts: 160, lengthMm: 227 }
  },

  // --- CPU Coolers ---
  {
    id: "clr-1",
    sku: "LIA-GA2T36W",
    name: "Lian Li Galahad II Trinity 360mm ARGB Liquid AIO Cooler - White",
    brand: "Lian Li",
    category: "Cooling",
    slot: "cooler",
    price: 2899000,
    image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 10,
    specs: { radiatorSizeMm: 360 }
  },
  {
    id: "clr-2",
    sku: "NOC-NH-D15-CH-BK",
    name: "Noctua NH-D15 chromax.black Dual-Tower High-Performance Air Cooler",
    brand: "Noctua",
    category: "Cooling",
    slot: "cooler",
    price: 1899000,
    image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 15,
    specs: { radiatorSizeMm: 0 }
  },

  // --- Storage ---
  {
    id: "str-1",
    sku: "SAM-MZ-V9P2T0B",
    name: "Samsung 990 PRO 2TB PCIe Gen 4.0 NVMe M.2 Solid State Drive",
    brand: "Samsung",
    category: "Storage",
    slot: "storage_primary",
    price: 2899000,
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 30,
    specs: { capacity: "2TB", speed: "7,450 MB/s" }
  },
  {
    id: "str-2",
    sku: "KIN-SKC3000S-1024G",
    name: "Kingston KC3000 1TB PCIe 4.0 NVMe M.2 SSD",
    brand: "Kingston",
    category: "Storage",
    slot: "storage_primary",
    price: 1599000,
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 25,
    specs: { capacity: "1TB", speed: "7,000 MB/s" }
  },

  // --- Chassis (Case) ---
  {
    id: "cas-1",
    sku: "LIA-O11D-EVO-RGB-W",
    name: "Lian Li O11 Dynamic EVO RGB Panoramic Glass Chassis - Pure White",
    brand: "Lian Li",
    category: "Chassis",
    slot: "case",
    price: 2899000,
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 8,
    specs: { formFactor: "ATX", maxGpuLengthMm: 455, radiatorSizeMm: 360 }
  },
  {
    id: "cas-2",
    sku: "FRA-FD-C-NOR1C-01",
    name: "Fractal Design North Chalk White Mid-Tower Case with Oak Wood",
    brand: "Fractal Design",
    category: "Chassis",
    slot: "case",
    price: 2499000,
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 6,
    specs: { formFactor: "ATX", maxGpuLengthMm: 355, radiatorSizeMm: 360 }
  },

  // --- Power Supplies (PSU) ---
  {
    id: "psu-1",
    sku: "COR-CP-9020263-NA",
    name: "Corsair RM850x Shift 850W 80+ Gold Fully Modular ATX 3.0",
    brand: "Corsair",
    category: "Power Supplies",
    slot: "psu",
    price: 2399000,
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 16,
    specs: { wattage: 850 }
  },
  {
    id: "psu-2",
    sku: "SEA-FOCUS-GX-1000",
    name: "Seasonic Focus GX-1000 1000W 80+ Gold ATX 3.0 PCIe 5.0",
    brand: "Seasonic",
    category: "Power Supplies",
    slot: "psu",
    price: 2999000,
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 7,
    specs: { wattage: 1000 }
  },

  // --- Operating System ---
  {
    id: "os-1",
    sku: "MS-HAV-00163",
    name: "Microsoft Windows 11 Home 64-Bit USB Retail Flash Drive",
    brand: "Microsoft",
    category: "Software",
    slot: "os",
    price: 2199000,
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 40,
    specs: {}
  },
  {
    id: "os-2",
    sku: "MS-FQC-10528",
    name: "Microsoft Windows 11 Pro 64-Bit USB Retail Flash Drive",
    brand: "Microsoft",
    category: "Software",
    slot: "os",
    price: 3199000,
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
    inStock: true,
    stockCount: 30,
    specs: {}
  }
];

export const PREBUILT_SYSTEMS = [
  {
    id: "pb-1",
    name: "Tethera Apex Ryzen 7 RTX 4080S",
    sku: "TET-APEX-7800X3D",
    brand: "Tethera Systems",
    category: "Pre-Built Systems",
    cpu: "AMD Ryzen 7 7800X3D",
    gpu: "GeForce RTX 4080 SUPER 16GB",
    ram: "32GB DDR5-6000",
    storage: "2TB NVMe PCIe 4.0",
    cooling: "360mm ARGB Liquid AIO",
    chassis: "Lian Li O11 Dynamic EVO RGB White",
    psu: "850W 80+ Gold Fully Modular",
    os: "Windows 11 Home 64-Bit Pre-installed",
    price: 43199000,
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80",
    status: "In Stock at Flagship (Ready for Pickup in 60m)",
    inStock: true,
    stockCount: 3,
    description:
      "Engineered for supreme 4K gaming and high-framerate esports. Powered by the legendary AMD Ryzen 7 7800X3D processor and NVIDIA GeForce RTX 4080 SUPER 16GB graphics card. Rigorously tested with 24 hours of sustained Prime95 & 3DMark burn-in benchmarks.",
    highlights: [
      "4K Ultra Gaming & High-FPS Esports Benchmark Winner",
      "AMD 3D V-Cache Technology for unrivaled gaming speeds",
      "Panoramic dual-chamber chassis with precision cable routing",
      "2-Year Tethera Comprehensive Hardware Warranty & Express Support"
    ],
    specs: {
      "Processor (CPU)": "AMD Ryzen 7 7800X3D (8 Cores, 16 Threads, up to 5.0 GHz)",
      "Graphics (GPU)": "NVIDIA GeForce RTX 4080 SUPER 16GB GDDR6X",
      "Motherboard": "ASUS ROG STRIX B650E-F GAMING WIFI (AM5, DDR5, PCIe 5.0)",
      "Memory (RAM)": "32GB (2x16GB) Corsair Vengeance RGB DDR5 6000MHz CL30",
      "Primary SSD": "2TB Samsung 990 PRO PCIe 4.0 NVMe (7,450 MB/s Read)",
      "Liquid Cooler": "Lian Li Galahad II Trinity 360mm ARGB Liquid AIO",
      "Case": "Lian Li O11 Dynamic EVO RGB - Chalk White Edition",
      "Power Supply": "Corsair RM850x Shift 850W 80+ Gold ATX 3.0 Modular",
      "Operating System": "Windows 11 Home (Licensed & Drivers Configured)",
      "Burn-in Testing": "24-Hour Prime95 & FurMark Stress Verification"
    }
  },
  {
    id: "pb-2",
    name: "Tethera Kinetic Core i7 RTX 4070Ti",
    sku: "TET-KIN-14700K",
    brand: "Tethera Systems",
    category: "Pre-Built Systems",
    cpu: "Intel Core i7-14700K",
    gpu: "GeForce RTX 4070 Ti SUPER 16GB",
    ram: "32GB DDR5-6000",
    storage: "1TB NVMe PCIe 4.0",
    cooling: "Noctua Dual Tower Air",
    chassis: "Fractal Design North White",
    psu: "850W 80+ Gold Modular",
    os: "Windows 11 Home 64-Bit Pre-installed",
    price: 35199000,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80",
    status: "In Stock at Flagship (Ready for Pickup in 60m)",
    inStock: true,
    stockCount: 5,
    description:
      "A versatile powerhouse designed for creators, programmers, and enthusiasts. Delivers outstanding multi-threaded productivity with 20 cores (8P + 12E) and cutting-edge 1440p/4K ray tracing with DLSS 3 frame generation.",
    highlights: [
      "Hybrid 20-Core architecture ideal for streaming & video rendering",
      "Whisper-quiet Noctua dual-tower air cooling with oak wood front panel",
      "High-speed 32GB DDR5 6000MHz low-latency memory kit",
      "Complete plug-and-play setup with fresh Windows 11 installation"
    ],
    specs: {
      "Processor (CPU)": "Intel Core i7-14700K (20 Cores, 28 Threads, up to 5.6 GHz)",
      "Graphics (GPU)": "Gigabyte GeForce RTX 4070 Ti SUPER Gaming OC 16GB",
      "Motherboard": "ASUS ROG STRIX Z790-E GAMING WIFI II",
      "Memory (RAM)": "32GB (2x16GB) Corsair Vengeance DDR5 6000MHz",
      "Primary SSD": "1TB Kingston KC3000 PCIe 4.0 NVMe (7,000 MB/s Read)",
      "Air Cooler": "Noctua NH-D15 chromax.black High-Performance Air Cooler",
      "Case": "Fractal Design North Chalk White with Oak Accent",
      "Power Supply": "Corsair RM850x 850W 80+ Gold Modular",
      "Operating System": "Windows 11 Home 64-Bit",
      "Burn-in Testing": "24-Hour Continuous Multi-Loop Thermal Chamber Verification"
    }
  },
  {
    id: "pb-3",
    name: "Tethera Minimalist White Workstation",
    sku: "TET-MIN-7950X",
    brand: "Tethera Systems",
    category: "Pre-Built Systems",
    cpu: "AMD Ryzen 9 7950X 16-Core",
    gpu: "GeForce RTX 4080 SUPER 16GB",
    ram: "64GB DDR5-6000",
    storage: "4TB NVMe RAID",
    cooling: "Fractal North Chalk White",
    chassis: "Lian Li O11 Dynamic EVO RGB White",
    psu: "1000W 80+ Gold Modular",
    os: "Windows 11 Pro 64-Bit Pre-installed",
    price: 51199000,
    image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&auto=format&fit=crop&q=80",
    status: "Built-to-Order (24h Express Assembly)",
    inStock: true,
    stockCount: 2,
    description:
      "The ultimate desktop workstation for 3D simulation, CAD, Unreal Engine compilation, and heavy AI workloads. Blends 16 full performance Zen 4 cores with 64GB of DDR5 memory and 16GB of VRAM in a pristine white chassis.",
    highlights: [
      "16 High-Performance Cores and 32 threads running up to 5.7 GHz",
      "Massive 64GB high-bandwidth DDR5 memory capacity",
      "Tier-1 Seasonic 1000W ATX 3.0 PCIe 5.0 power delivery",
      "Tethera White Glove express workbench delivery"
    ],
    specs: {
      "Processor (CPU)": "AMD Ryzen 9 7950X (16 Cores, 32 Threads, up to 5.7 GHz)",
      "Graphics (GPU)": "ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB OC",
      "Motherboard": "ASUS ROG STRIX B650E-F GAMING WIFI (AM5)",
      "Memory (RAM)": "64GB (2x32GB) G.Skill Trident Z5 Neo DDR5 6000MHz",
      "Primary SSD": "2TB Samsung 990 PRO NVMe + 2TB Secondary NVMe (4TB Total)",
      "Liquid Cooler": "Lian Li Galahad II Trinity 360mm ARGB White AIO",
      "Case": "Lian Li O11 Dynamic EVO RGB Pure White",
      "Power Supply": "Seasonic Focus GX-1000 1000W 80+ Gold ATX 3.0",
      "Operating System": "Windows 11 Pro 64-Bit",
      "Burn-in Testing": "48-Hour Continuous Multi-Loop Thermal Chamber Verification"
    }
  }
];

export const CATEGORY_SLUG_MAP: Record<string, { name: string; slot?: string; description: string }> = {
  "cpu": {
    name: "Processors",
    slot: "cpu",
    description: "High-performance AMD Ryzen & Intel Core processors for gaming and demanding computing."
  },
  "gpu": {
    name: "Graphics Cards",
    slot: "gpu",
    description: "NVIDIA GeForce RTX 40-Series and AMD Radeon GPUs for 1440p, 4K gaming, and AI development."
  },
  "motherboards": {
    name: "Motherboards",
    slot: "motherboard",
    description: "Enthusiast Socket AM5 and LGA1700 motherboards with DDR5, PCIe 5.0, and Wi-Fi 6E/7."
  },
  "cooling": {
    name: "Cooling",
    slot: "cooler",
    description: "Quiet liquid AIO coolers and high-performance dual-tower air coolers."
  },
  "cases": {
    name: "Chassis",
    slot: "case",
    description: "Architectural PC cases with high airflow, tempered glass, and panoramic dual-chamber designs."
  },
  "ram": {
    name: "Memory",
    slot: "ram",
    description: "Ultra-fast DDR5 and DDR4 memory kits optimized for AMD EXPO and Intel XMP."
  },
  "storage": {
    name: "Storage",
    slot: "storage_primary",
    description: "Blazing fast PCIe 4.0 and PCIe 5.0 NVMe M.2 solid state drives."
  },
  "power-supplies": {
    name: "Power Supplies",
    slot: "psu",
    description: "80+ Gold and Platinum certified ATX 3.0 power supplies with native 12VHPWR cables."
  }
};

export function getComponentById(id: string): ComponentItem | undefined {
  return MOCK_COMPONENTS.find((item) => item.id === id);
}

export function getProductOrPrebuiltById(id: string): (ComponentItem | typeof PREBUILT_SYSTEMS[0]) | undefined {
  const component = MOCK_COMPONENTS.find((item) => item.id === id);
  if (component) return component;
  return PREBUILT_SYSTEMS.find((pb) => pb.id === id);
}

export interface ProductOverviewInfo {
  summary: string;
  paragraphs: string[];
  highlights: string[];
}

export function getProductOverviewData(
  product: ComponentItem | (typeof PREBUILT_SYSTEMS)[0]
): ProductOverviewInfo {
  // If product is a prebuilt system with explicit description and highlights
  if ("cpu" in product && "highlights" in product && product.description) {
    return {
      summary: product.description,
      paragraphs: [
        `Configured and precision-assembled by Tethera's engineering team, this turnkey system delivers exceptional high-framerate 1440p/4K gaming, Unreal Engine development, and heavy multithreaded creator workloads right out of the box.`,
        `Includes our comprehensive 24-48 hour thermal stress burn-in verification with Prime95, FurMark, and 3DMark loop tests to ensure zero thermal throttling and rock-solid memory stability.`
      ],
      highlights: product.highlights || [
        "Factory-verified thermal burn-in stress testing",
        "Official component distributor warranties included",
        "Ready for immediate Click & Collect or insured courier transit",
        "Clean Windows 11 installation with latest BIOS & stable drivers"
      ]
    };
  }

  // If component has its own custom description
  if ("description" in product && product.description) {
    return {
      summary: product.description,
      paragraphs: [
        `Directly sourced from authorized Indonesian principal distributors. Packaged in brand-new, factory-sealed condition with complete manufacturer accessories and documentation.`,
        `Fully verified for electrical, dimensional, and thermal compatibility with modern PC components and the Tethera Custom PC Builder.`
      ],
      highlights: (product as any).highlights || [
        "100% Genuine Authorized Distributor Stock (Distributor Resmi)",
        "Manufacturer Limited Warranty with Local RMA Service",
        "Verified Compatible with Tethera Custom PC Builder",
        "Instant Flagship Pickup or Insured Fragile Courier Delivery"
      ]
    };
  }

  // Category-tailored dynamic rich descriptions for all components
  const category = (product.category || "").toLowerCase();
  const name = product.name;
  const brand = product.brand;

  if (category.includes("processor") || category.includes("cpu")) {
    return {
      summary: `The ${name} represents cutting-edge silicon architecture by ${brand}, purpose-built to deliver blistering single-threaded IPC responsiveness and immense multi-threaded compute throughput for modern esports, 4K triple-A titles, and demanding creative software.`,
      paragraphs: [
        `Engineered with advanced semiconductor fabrication and intelligent dynamic frequency scaling, this processor maximizes power efficiency while keeping operating temperatures within optimal thresholds under sustained heavy workloads.`,
        `Compatible with modern high-bandwidth DDR5 memory subsystems and PCIe Gen 4/5 expansion buses, delivering exceptional bandwidth for high-end graphics cards and direct-storage solid state drives.`
      ],
      highlights: [
        `High-performance compute microarchitecture by ${brand}`,
        "Optimized for high-FPS gaming and heavy multitasking throughput",
        "Native DDR5 high-bandwidth memory channel architecture",
        "Official Indonesian Distributor Warranty with direct RMA support"
      ]
    };
  }

  if (category.includes("graphic") || category.includes("gpu")) {
    return {
      summary: `Powered by ${brand}'s high-efficiency GPU silicon, the ${name} is engineered for ultra-high-resolution gaming, hardware-accelerated real-time ray tracing, and AI-accelerated workflows.`,
      paragraphs: [
        `Features a heavy-duty multi-fan cooling heatsink with reinforced composite copper heatpipes and high-static-pressure fans designed to maintain low temperatures and whisper-quiet acoustics under intense gaming sessions.`,
        `Equipped with high-bandwidth GDDR memory and next-generation video display outputs, ensuring ultra-smooth framerates on high-refresh-rate 1440p and 4K HDR gaming monitors.`
      ],
      highlights: [
        "Hardware ray tracing and AI frame generation acceleration",
        "Reinforced multi-fan thermal assembly with silent zero-RPM idle mode",
        "High-bandwidth dedicated video memory for high-resolution gaming",
        "Full support for modern DirectX 12 Ultimate and Vulkan APIs"
      ]
    };
  }

  if (category.includes("motherboard")) {
    return {
      summary: `The ${name} delivers a robust electrical foundation for your system, featuring premium VRM power stages, optimized PCB trace routing, and enthusiast cooling armor.`,
      paragraphs: [
        `Engineered to support current-generation processors with maximum power stability, extensive PCIe 4.0/5.0 expansion lanes, multi-slot M.2 NVMe thermal shields, and high-speed networking for low-latency connectivity.`,
        `Features a comprehensive UEFI BIOS with one-click memory profile tuning (XMP / EXPO), granular fan curve management, and built-in hardware diagnostics.`
      ],
      highlights: [
        "Reinforced digital VRM power delivery with thermal heatsinks",
        "Multiple high-speed M.2 NVMe slots with integrated heatspreaders",
        "High-speed 2.5G Ethernet and modern wireless networking",
        "User-friendly BIOS with one-click memory profile tuning"
      ]
    };
  }

  if (category.includes("memory") || category.includes("ram")) {
    return {
      summary: `Built with tightly-screened IC memory chips, the ${name} by ${brand} provides high bandwidth, low latencies, and extreme stability under intensive gaming and rendering sessions.`,
      paragraphs: [
        `Crafted with a sleek anodized aluminum heat spreader that swiftly draws thermal energy away from the memory dies, preventing heat accumulation and ensuring rock-solid stability even when running heavy game engines or compilation tasks.`,
        `Pre-configured with industry-standard overclocking profiles (Intel XMP 3.0 / AMD EXPO) for effortless, stable single-click clock speed enablement in your BIOS.`
      ],
      highlights: [
        "Tightly-screened ICs for low latency and high bandwidth",
        "High-efficiency anodized aluminum heat spreader",
        "One-click Intel XMP 3.0 / AMD EXPO profile support",
        "Lifetime Limited Warranty backed by official distributor"
      ]
    };
  }

  if (category.includes("storage") || category.includes("ssd")) {
    return {
      summary: `Experience instantaneous load times and seamless file transfers with the ${name}, designed for heavy gaming libraries, 4K/8K video editing, and high-throughput data tasks.`,
      paragraphs: [
        `Leverages a next-generation high-speed NVMe controller and advanced 3D NAND flash to provide sustained high-bandwidth sequential and random IOPS, virtually eliminating load screens in DirectStorage-enabled titles.`,
        `Features dynamic thermal throttling management to maintain peak performance and preserve NAND endurance over years of heavy read/write cycles.`
      ],
      highlights: [
        "Blazing-fast PCIe NVMe sequential read and write speeds",
        "Drastically reduced OS boot times and instant game level loading",
        "Advanced thermal management algorithms for sustained transfer rates",
        "5-Year Official Distributor Limited Warranty"
      ]
    };
  }

  if (category.includes("cool")) {
    return {
      summary: `Engineered for superior thermal dissipation, the ${name} keeps high-performance processors running at peak boost clocks while maintaining remarkably quiet acoustics.`,
      paragraphs: [
        `Features a precision-machined micro-channel copper cold plate paired with high-static-pressure fans that efficiently draw heat away from the CPU heat spreader.`,
        `Designed for broad socket compatibility, effortless mounting bracket installation, and long-term fluid or bearing reliability.`
      ],
      highlights: [
        "High-efficiency thermal transfer with precision copper cold plate",
        "Acoustically tuned low-noise PWM fans with fluid dynamic bearings",
        "Broad compatibility with Intel and AMD desktop sockets",
        "Official Indonesian distributor warranty"
      ]
    };
  }

  if (category.includes("case") || category.includes("chassis")) {
    return {
      summary: `The ${name} by ${brand} blends architectural aesthetics with precision airflow dynamics, providing an enthusiast canvas for high-end custom gaming systems and clean workstation builds.`,
      paragraphs: [
        `Designed with high-flow ventilation channels, magnetic removable dust filters, and versatile radiator mounting brackets accommodating top, front, and side configurations.`,
        `Includes generous behind-the-motherboard cable management channels, velcro tie straps, and toolless panel releases for a streamlined assembly experience.`
      ],
      highlights: [
        "Engineered high-airflow geometry with removable dust filters",
        "Panoramic tempered glass and premium chassis materials",
        "Expansive clearance for long GPUs and multi-radiator setups",
        "Dedicated routing channels for clean, hidden cable management"
      ]
    };
  }

  if (category.includes("power") || category.includes("psu")) {
    return {
      summary: `Delivering clean, ripple-free power to demanding graphics cards and multi-core processors, the ${name} by ${brand} is engineered for peak electrical efficiency and rock-solid system stability.`,
      paragraphs: [
        `Built with 100% Japanese 105°C rated capacitors and an advanced LLC resonant converter design that achieves high efficiency certification (80 PLUS Gold/Platinum), reducing wasted heat and electric draw.`,
        `Fully modular cable design allows you to connect only the leads your specific configuration requires, maximizing case airflow and keeping interior cabling pristine.`
      ],
      highlights: [
        "80 PLUS certified efficiency for low heat and power waste",
        "100% Japanese 105°C industrial-grade capacitors",
        "Fully modular low-profile flat black cabling",
        "Comprehensive electrical protections (OVP, UVP, OCP, OPP, SCP)"
      ]
    };
  }

  // Fallback for any other category
  return {
    summary: `The ${name} is an enthusiast-grade hardware component by ${brand}, rigorously tested and verified for stability and compatibility within Tethera custom systems.`,
    paragraphs: [
      `Sourced directly through authorized Indonesian principal distributors to ensure authentic provenance, sealed packaging, and complete local warranty backing.`,
      `Ready for immediate assembly in our Custom PC Builder or rapid dispatch via Click & Collect and insured multi-courier delivery.`
    ],
    highlights: [
      `Authentic ${brand} hardware from authorized distributor`,
      "100% genuine factory sealed retail packaging",
      "Full local warranty and technical assistance support",
      "Insured shipping with fragile protection"
    ]
  };
}

export const SERVICE_TIERS = [
  {
    id: "srv-standard",
    name: "Standard Build & 24h Thermal Stress Test",
    price: 250000,
    leadTime: "2-3 Days",
    features: [
      "Precision Cable Management",
      "Latest BIOS Flash & XMP/EXPO Tuning",
      "24-Hour Prime95 & 3DMark Stress Burn-in",
      "2-Year Return-to-Base Hardware Warranty"
    ]
  },
  {
    id: "srv-express",
    name: "Express Priority Build & 48h Extreme Benchmark",
    price: 450000,
    leadTime: "24 Hours (Click & Collect Express)",
    features: [
      "Front-of-Line Priority Workbench Queue",
      "Overclocking / Undervolting Stability Profile",
      "48-Hour Continuous Multi-Loop Thermal Chamber Test",
      "Dedicated Build Technician Video & Cert of Assembly"
    ]
  },
  {
    id: "srv-self",
    name: "Parts Only / Self-Assembly Kit",
    price: 0,
    leadTime: "Ready Today",
    features: [
      "Individual Brand Sealed Boxes",
      "Thermal Paste Included",
      "Individual Component Warranties Apply"
    ]
  }
];

