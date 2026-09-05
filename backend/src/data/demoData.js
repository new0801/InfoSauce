// backend/src/data/demoData.js
//
// Prepared cross-platform demo data for InfoSauce.
// Trending + Daily use prepared information.
// Verify uses prepared evidence, but the final verification
// is still performed LIVE by Gonka.

const trending = [
  {
    id: "TR001",
    title: "NVIDIA agrees to acquire Hugging Face for about $12.93B",
    category: "AI & Technology",
    summary:
      "NVIDIA announced an agreement to acquire Hugging Face while keeping the platform open to the wider AI ecosystem.",
    source: "NVIDIA",
    platform: "Website",
    url: "https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/",
    publishedAt: "2026-09-03",
    trendScore: 98,
  },
  {
    id: "TR002",
    title: "Los Angeles declares BTS Week ahead of BTS concerts",
    category: "Entertainment & K-Pop",
    summary:
      "K-pop fans are discussing Los Angeles declaring BTS Week around the group's SoFi Stadium concerts.",
    source: "Reddit r/kpop",
    platform: "Reddit",
    url: "https://www.reddit.com/r/kpop/comments/1w4g204/los_angeles_declares_bts_week_ahead_of_concerts/",
    publishedAt: "2026-09-01",
    trendScore: 94,
  },
  {
    id: "TR003",
    title: "Sarawak haze emergency declared in Serian",
    category: "World & Local",
    summary:
      "An emergency was declared in Serian, Sarawak after hazardous haze pushed air pollution to dangerous levels.",
    source: "Reuters",
    platform: "Website",
    url: "https://www.reuters.com/business/environment/malaysias-sarawak-declares-emergency-serian-district-due-haze-2026-09-04/",
    publishedAt: "2026-09-04",
    trendScore: 92,
  },
  {
    id: "TR004",
    title: "Bursa Malaysia rises after BNM keeps OPR at 2.75%",
    category: "Business & Money",
    summary:
      "Malaysian equities ended higher after Bank Negara Malaysia kept the Overnight Policy Rate unchanged.",
    source: "BERNAMA",
    platform: "Website",
    url: "https://www.bernama.com/en/market/news.php?id=2602551",
    publishedAt: "2026-09-03",
    trendScore: 89,
  },
  {
    id: "TR005",
    title: "Johor data-centre demand sparks online discussion",
    category: "AI & Technology",
    summary:
      "Malaysian Reddit users are discussing Johor's growing role as a regional data-centre hub.",
    source: "Reddit r/malaysia",
    platform: "Reddit",
    url: "https://www.reddit.com/r/malaysia/comments/1w3zlam/singapores_low_data_centre_rate_to_propel_demand/",
    publishedAt: "2026-09-01",
    trendScore: 87,
  },
];

const daily = {
  "AI & Technology": [
    {
      id: "AI001",
      title: "NVIDIA to acquire Hugging Face",
      category: "AI & Technology",
      summary:
        "NVIDIA announced an agreement to acquire Hugging Face for approximately $12.93 billion.",
      source: "NVIDIA",
      platform: "Website",
      url: "https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/",
      publishedAt: "2026-09-03",
    },
    {
      id: "AI002",
      title: "OpenAI acknowledges AI-agent wiki incident",
      category: "AI & Technology",
      summary:
        "OpenAI acknowledged unintended agent behaviour involving wiki sites and discussed improving transparency around AI incidents.",
      source: "Reuters",
      platform: "Website",
      url: "https://www.reuters.com/business/media-telecom/openai-acknowledges-wiki-incident-need-more-transparency-around-unintended-ai-2026-09-05/",
      publishedAt: "2026-09-05",
    },
    {
      id: "AI003",
      title: "Foxconn expects stronger Q3 on AI demand",
      category: "AI & Technology",
      summary:
        "Foxconn expects strong AI-related product demand to support its third-quarter performance.",
      source: "Reuters",
      platform: "Website",
      url: "https://www.reuters.com/world/asia-pacific/foxconn-says-third-quarter-outperform-market-expectations-ai-strength-2026-09-05/",
      publishedAt: "2026-09-05",
    },
    {
      id: "AI004",
      title: "Malaysia's data-centre boom draws public debate",
      category: "AI & Technology",
      summary:
        "Reddit users are discussing investment opportunities and sustainability concerns surrounding Malaysia's data-centre growth.",
      source: "Reddit r/civilengineering",
      platform: "Reddit",
      url: "https://www.reddit.com/r/civilengineering/comments/1vgthlk/malaysias_data_centre_boom_is_kinda_crazy_when/",
      publishedAt: "2026-08-06",
    },
  ],

  "Entertainment & K-Pop": [
    {
      id: "ENT001",
      title: "Major K-pop solo releases fill September",
      category: "Entertainment & K-Pop",
      summary:
        "September features a busy K-pop release schedule with several major solo artists competing for attention.",
      source: "The Korea Times",
      platform: "Website",
      url: "https://www.koreatimes.co.kr/entertainment/k-pop/20260903/solo-queens-crowd-septembers-k-pop-comeback-race",
      publishedAt: "2026-09-03",
    },
    {
      id: "ENT002",
      title: "BTS Week becomes a major fan discussion",
      category: "Entertainment & K-Pop",
      summary:
        "Fans are reacting online to Los Angeles declaring BTS Week ahead of BTS concerts at SoFi Stadium.",
      source: "Reddit r/kpop",
      platform: "Reddit",
      url: "https://www.reddit.com/r/kpop/comments/1w4g204/los_angeles_declares_bts_week_ahead_of_concerts/",
      publishedAt: "2026-09-01",
    },
    {
      id: "ENT003",
      title: "September K-pop comeback calendar attracts fans",
      category: "Entertainment & K-Pop",
      summary:
        "K-pop communities are tracking a packed September schedule of comebacks and debuts.",
      source: "Reddit r/kpoppers",
      platform: "Reddit",
      url: "https://www.reddit.com/r/kpoppers/comments/1w2lq5t/september_2026_kpop_comebacks_debuts_schedule/",
      publishedAt: "2026-08-30",
    },
    {
      id: "ENT004",
      title: "Korean entertainment updates continue across Soompi",
      category: "Entertainment & K-Pop",
      summary:
        "Soompi continues to track current K-pop releases, artist activities and Korean entertainment updates.",
      source: "Soompi",
      platform: "Website",
      url: "https://www.soompi.com/",
      publishedAt: "2026-09-05",
    },
  ],

  "World & Local": [
    {
      id: "WORLD001",
      title: "Emergency declared in Serian over hazardous haze",
      category: "World & Local",
      summary:
        "Authorities declared an emergency in Serian, Sarawak after air pollution reached hazardous levels.",
      source: "Reuters",
      platform: "Website",
      url: "https://www.reuters.com/business/environment/malaysias-sarawak-declares-emergency-serian-district-due-haze-2026-09-04/",
      publishedAt: "2026-09-04",
    },
    {
      id: "WORLD002",
      title: "Malaysia announces measures to ease living costs",
      category: "World & Local",
      summary:
        "Malaysia announced measures covering fuel, small businesses and digital access as part of efforts to ease living costs.",
      source: "Reuters",
      platform: "Website",
      url: "https://www.reuters.com/business/energy/malaysia-reinstate-300-litre-monthly-limit-per-citizen-ron95-transport-fuel-pm-2026-08-30/",
      publishedAt: "2026-08-30",
    },
    {
      id: "WORLD003",
      title: "China seeks deeper Middle East ties",
      category: "World & Local",
      summary:
        "China's diplomatic engagement with Egypt highlights Beijing's growing economic and political role in the Middle East.",
      source: "Associated Press",
      platform: "Website",
      url: "https://apnews.com/article/946c3b90b6251c08fdcb219e24a088a2",
      publishedAt: "2026-09-02",
    },
    {
      id: "WORLD004",
      title: "Johor data-centre growth debated online",
      category: "World & Local",
      summary:
        "Malaysian users debate the economic benefits, electricity demand and water use associated with Johor's expanding data-centre sector.",
      source: "Reddit r/malaysia",
      platform: "Reddit",
      url: "https://www.reddit.com/r/malaysia/comments/1w3zlam/singapores_low_data_centre_rate_to_propel_demand/",
      publishedAt: "2026-09-01",
    },
  ],

  "Business & Money": [
    {
      id: "BUS001",
      title: "Malaysia assesses AirAsia funding needs",
      category: "Business & Money",
      summary:
        "Malaysia's finance ministry hired an adviser to assess AirAsia's funding needs while the airline works on financing and restructuring.",
      source: "Reuters",
      platform: "Website",
      url: "https://www.reuters.com/world/asia-pacific/malaysias-finance-ministry-hires-adviser-assess-airasias-funding-needs-sources-2026-09-03/",
      publishedAt: "2026-09-03",
    },
    {
      id: "BUS002",
      title: "Bursa Malaysia closes higher after BNM decision",
      category: "Business & Money",
      summary:
        "The FBM KLCI rose after Bank Negara Malaysia kept its benchmark interest rate unchanged.",
      source: "BERNAMA",
      platform: "Website",
      url: "https://www.bernama.com/en/market/news.php?id=2602551",
      publishedAt: "2026-09-03",
    },
    {
      id: "BUS003",
      title: "Bank Negara Malaysia keeps OPR at 2.75%",
      category: "Business & Money",
      summary:
        "Malaysia's central bank maintained its Overnight Policy Rate at 2.75% amid resilient economic growth.",
      source: "The Wall Street Journal",
      platform: "Website",
      url: "https://www.wsj.com/economy/central-banking/malaysia-central-bank-holds-rates-as-growth-stays-firm-a7b16bb7",
      publishedAt: "2026-09-03",
    },
    {
      id: "BUS004",
      title: "South Korea exports boosted by AI chip demand",
      category: "Business & Money",
      summary:
        "Strong global demand for AI-related semiconductors helped South Korea's exports reach record levels.",
      source: "Reuters",
      platform: "Website",
      url: "https://www.reuters.com/world/asia-pacific/south-korea-exports-surpass-full-year-record-hit-7094-billion-ytd-2026-09-05/",
      publishedAt: "2026-09-05",
    },
  ],
};

const verifyCases = [
  {
    id: "VERIFY001",
    label: "TRUE Demo",
    claim:
      "NVIDIA has agreed to acquire Hugging Face for approximately $12.93 billion.",

    sources: [
      "https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/",
      "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000078/nvda-20260902.htm",
      "https://apnews.com/article/7e1bffd68c53b54806be950f01181994",
    ],

    evidence: [
      `Title: NVIDIA to Acquire Hugging Face
Source: NVIDIA
URL: https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/
Content: NVIDIA announced that it agreed to acquire Hugging Face for $12.9303 billion and said the platform will remain open.`,

      `Title: NVIDIA Form 8-K
Source: U.S. Securities and Exchange Commission
URL: https://www.sec.gov/Archives/edgar/data/1045810/000104581026000078/nvda-20260902.htm
Content: NVIDIA disclosed a definitive agreement to acquire Hugging Face. The transaction remains subject to closing conditions and regulatory approvals.`,

      `Title: NVIDIA-Hugging Face acquisition coverage
Source: Associated Press
URL: https://apnews.com/article/7e1bffd68c53b54806be950f01181994
Content: AP reported NVIDIA's plan to acquire AI platform Hugging Face for about $13 billion.`,
    ],
  },

  {
    id: "VERIFY002",
    label: "FALSE Demo",
    claim:
      "Malaysia has completely stopped all new data-centre development in 2026.",

    sources: [
      "https://www.thestar.com.my/business/business-news/2026/09/03/kerjaya-prospek-bags-rm858mil-data-centre-contract-in-johor",
      "https://www.reddit.com/r/malaysia/comments/1w3zlam/singapores_low_data_centre_rate_to_propel_demand/",
    ],

    evidence: [
      `Title: Kerjaya Prospek bags RM858mil data centre contract in Johor
Source: The Star
URL: https://www.thestar.com.my/business/business-news/2026/09/03/kerjaya-prospek-bags-rm858mil-data-centre-contract-in-johor
Content: Kerjaya Prospek announced an RM858 million contract for work on a data-centre development in Iskandar Puteri, Johor.`,

      `Title: Johor data-centre demand discussion
Source: Reddit r/malaysia
URL: https://www.reddit.com/r/malaysia/comments/1w3zlam/singapores_low_data_centre_rate_to_propel_demand/
Content: Users discuss continued data-centre demand and development activity in Johor.`,
    ],
  },

  {
    id: "VERIFY003",
    label: "UNCERTAIN Demo",
    claim:
      "The Malaysian government will provide a bailout to AirAsia.",

    sources: [
      "https://www.reuters.com/world/asia-pacific/malaysias-finance-ministry-hires-adviser-assess-airasias-funding-needs-sources-2026-09-03/",
      "https://newsroom.airasia.com/news/airasia-group-clarifies-capital-raising-and-fleet-optimisation-strategy",
    ],

    evidence: [
      `Title: Malaysia assesses AirAsia funding needs
Source: Reuters
URL: https://www.reuters.com/world/asia-pacific/malaysias-finance-ministry-hires-adviser-assess-airasias-funding-needs-sources-2026-09-03/
Content: Reuters reported that Malaysia's finance ministry engaged an adviser to assess AirAsia's funding needs. The government was not planning a bailout at the time of the report.`,

      `Title: AirAsia capital raising strategy
Source: AirAsia
URL: https://newsroom.airasia.com/news/airasia-group-clarifies-capital-raising-and-fleet-optimisation-strategy
Content: AirAsia described fundraising plans involving international debt markets and local credit facilities for restructuring and refinancing.`,
    ],
  },
];

function getDailyItems() {
  return Object.values(daily).flat();
}

function getVerifyCase(caseId) {
  return verifyCases.find((item) => item.id === caseId);
}

module.exports = {
  trending,
  daily,
  verifyCases,
  getDailyItems,
  getVerifyCase,
};