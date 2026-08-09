"use client";
/* Daily agri-tip rotation for the home page.
 * Deterministic per-day pick (so every user sees the same tip on the same day),
 * cycles through the full list before repeating. */

export interface AgriTip {
  id: string;
  icon: string; // lucide icon name (mapped in component)
  titleEn: string;
  titleHi: string;
  bodyEn: string;
  bodyHi: string;
  category: "water" | "soil" | "pest" | "harvest" | "weather" | "general";
}

export const AGRI_TIPS: AgriTip[] = [
  {
    id: "water-morning",
    icon: "Droplets",
    titleEn: "Water in the early morning",
    titleHi: "सुबह जल्दी पानी दें",
    bodyEn: "Watering at dawn cuts evaporation loss by up to 30% and keeps fungal diseases down — leaves dry by noon.",
    bodyHi: "भोर में पानी देने से वाष्पीकरण की हानि 30% तक कम होती है और कवक रोग घटते हैं — दोपहर तक पत्तियाँ सूख जाती हैं।",
    category: "water",
  },
  {
    id: "soil-mulch",
    icon: "Layers",
    titleEn: "Mulch to lock in moisture",
    titleHi: "नमी बनाए रखने के लिए मल्च करें",
    bodyEn: "A 5 cm layer of straw or dry leaves around plants cuts water need by half and smothers weeds.",
    bodyHi: "पौधों के चारों ओर 5 सेमी पुआल या सूखे पत्तों की परत से पानी की ज़रूरत आधी रह जाती है और खरपतवार दब जाते हैं।",
    category: "soil",
  },
  {
    id: "pest-neem",
    icon: "Bug",
    titleEn: "Neem spray weekly",
    titleHi: "नीम स्प्रे हर हफ़्ते",
    bodyEn: "A neem oil spray (5 ml per litre of water) every 7 days keeps most sap-sucking pests away without harming bees.",
    bodyHi: "हर 7 दिन में नीम तेल स्प्रे (प्रति लीटर पानी में 5 मिली) ज़्यादातर चूसने वाले कीटों को दूर रखता है, मधुमक्खियों को नुकसान नहीं।",
    category: "pest",
  },
  {
    id: "harvest-morning",
    icon: "Wheat",
    titleEn: "Harvest greens in the morning",
    titleHi: "सुबह हरी पत्तियाँ तोड़ें",
    bodyEn: "Leafy greens picked before 9 AM stay crisp longer — sugars are at their peak and leaves are fully hydrated.",
    bodyHi: "सुबह 9 बजे से पहले तोड़ी गई हरी पत्तियाँ लम्बे समय तक कुरकुरी रहती हैं — शर्करा अधिकतम और पत्तियाँ पूरी नमी वाली होती हैं।",
    category: "harvest",
  },
  {
    id: "soil-compost",
    icon: "Sprout",
    titleEn: "Feed the soil, not the plant",
    titleHi: "पौधे नहीं, मिट्टी को खाद दें",
    bodyEn: "A handful of vermicompost per plant every 3 weeks builds long-term fertility — chemical feeds give a quick spike but leave soil poorer.",
    bodyHi: "हर 3 हफ़्ते में प्रति पौधा एक मुट्ठी वर्मीकम्पोस्ट दीर्घकालिक उर्वरता बढ़ाता है — रासायनिक खाद से तुरंत फायदा, पर मिट्टी कमज़ोर होती है।",
    category: "soil",
  },
  {
    id: "water-rain-check",
    icon: "CloudRain",
    titleEn: "Skip watering after rain",
    titleHi: "बारिश के बाद पानी न दें",
    bodyEn: "Push a finger 5 cm into the soil — if it feels wet, skip today's watering. Overwatering is the #1 cause of root rot.",
    bodyHi: "मिट्टी में 5 सेमी नीचे उँगली डालें — गीली लगे तो आज पानी छोड़ दें। ज़्यादा पानी जड़ सड़न का सबसे बड़ा कारण है।",
    category: "water",
  },
  {
    id: "pest-trap-crop",
    icon: "Shield",
    titleEn: "Plant marigolds as a trap crop",
    titleHi: "जाल फसल के लिए गेंदे लगाएँ",
    bodyEn: "A border of marigolds draws nematodes and whiteflies away from your main crop — and they bloom year-round.",
    bodyHi: "गेंदे की कतार मुख्य फसल से सूत्रकृमि और सफ़ेद मक्खियों को दूर खींचती है — और साल भर खिलते हैं।",
    category: "pest",
  },
  {
    id: "weather-frost",
    icon: "Snowflake",
    titleEn: "Cover tender plants on cold nights",
    titleHi: "ठंडी रातों में नाजुक पौधे ढकें",
    bodyEn: "When the forecast drops below 8°C, drape a light cloth over young plants before sunset — remove it in the morning.",
    bodyHi: "पूर्वानुमान 8°C से नीचे जाए तो डूबते सूरज से पहले छोटे पौधों पर हल्का कपड़ा डालें — सुबह हटा दें।",
    category: "weather",
  },
  {
    id: "harvest-ripe-tomato",
    icon: "Cherry",
    titleEn: "Pick tomatoes at first blush",
    titleHi: "टमाटर लाल होने लगे तो तोड़ें",
    bodyEn: "Tomatoes ripened fully on the vine split easily — pick when half-red and let them finish on a sunny windowsill.",
    bodyHi: "बेल पर पूरी तरह पके टमाटर फट जाते हैं — आधा लाल होने पर तोड़कर धूप वाली खिड़की पर पकने दें।",
    category: "harvest",
  },
  {
    id: "soil-test-ph",
    icon: "FlaskConical",
    titleEn: "Test your soil pH yearly",
    titleHi: "हर साल मिट्टी की pH जाँचें",
    bodyEn: "Most vegetables thrive at pH 6.0–7.0. A simple kit costs ₹50 and tells you if you need lime (to raise) or sulphur (to lower).",
    bodyHi: "ज़्यादातर सब्ज़ियाँ pH 6.0–7.0 पर अच्छी होती हैं। ₹50 का किट बताता है कि चूना (बढ़ाने) या गंधक (घटाने) की ज़रूरत है।",
    category: "soil",
  },
  {
    id: "water-drip",
    icon: "Droplet",
    titleEn: "Switch to drip irrigation",
    titleHi: "ड्रिप सिंचाई अपनाएँ",
    bodyEn: "Drip uses 50% less water than flooding and cuts weed growth. Even a simple gravity kit pays for itself in one season.",
    bodyHi: "ड्रिप फ्लडिंग से 50% कम पानी लेता है और खरपतवार घटाता है। साधारण ग्रैविटी किट एक ही सीज़न में लाभतर होता है।",
    category: "water",
  },
  {
    id: "pest-companion",
    icon: "Leaf",
    titleEn: "Companion-plant basil with tomato",
    titleHi: "टमाटर के साथ तुलसी लगाएँ",
    bodyEn: "Basil repels tomato hornworms and whiteflies — plus you get two crops from the same patch.",
    bodyHi: "तुलसी टमाटर के हॉर्नवर्म और सफ़ेद मक्खियों को भगाती है — साथ ही एक ही जगह से दो फसलें।",
    category: "pest",
  },
  {
    id: "general-record-keeping",
    icon: "NotebookPen",
    titleEn: "Keep a simple farm diary",
    titleHi: "सरल खेत डायरी रखें",
    bodyEn: "Note sowing dates, varieties and yields — next year, you'll know exactly what worked and what didn't.",
    bodyHi: "बुवाई तिथि, किस्म और उपज लिखें — अगले साल पता होगा क्या कामयाब रहा और क्या नहीं।",
    category: "general",
  },
  {
    id: "weather-monsoon",
    icon: "CloudLightning",
    titleEn: "Drainage before the monsoon",
    titleHi: "मानसून से पहले जल निकासी",
    bodyEn: "Clear field channels before the first monsoon rain — waterlogged roots suffocate in just 48 hours.",
    bodyHi: "पहली मानसून बारिश से पहले खेत की नालियाँ साफ़ करें — 48 घंटे में ही जड़ें डूबकर मर सकती हैं।",
    category: "weather",
  },
  {
    id: "soil-cover-crop",
    icon: "Wheat",
    titleEn: "Plant a cover crop in off-season",
    titleHi: "बंद सीज़न में कवर फसल लगाएँ",
    bodyEn: "Sun-hemp or cowpea between main crops adds 40 kg of nitrogen per hectare — free fertilizer from the air.",
    bodyHi: "मुख्य फसलों के बीच सन-हेम्प या लोबिया हेक्टेयर पर 40 किलो नाइट्रोजन जोड़ता है — हवा से मुफ़्त खाद।",
    category: "soil",
  },
  {
    id: "general-seed-saving",
    icon: "Sprout",
    titleEn: "Save seeds from your best plant",
    titleHi: "सबसे अच्छे पौधे से बीज बचाएँ",
    bodyEn: "Mark your healthiest plant with a ribbon and let it go to seed — next season's crop will be better adapted to your land.",
    bodyHi: "सबसे स्वस्थ पौधे को रिबन से चिह्नित कर बीज के लिए छोड़ दें — अगले सीज़न की फसल आपकी ज़मीन के अनुरूप बेहतर होगी।",
    category: "general",
  },
];

/* Deterministic daily pick — same tip across all users for a given day.
 * Cycles through the full list before repeating. */
export function getTipOfDay(): AgriTip {
  const epochDays = Math.floor(Date.now() / 86_400_000);
  return AGRI_TIPS[epochDays % AGRI_TIPS.length];
}

/* Tomorrow's tip — for the "next tip" preview. */
export function getTipForOffset(daysOffset: number): AgriTip {
  const epochDays = Math.floor(Date.now() / 86_400_000) + daysOffset;
  return AGRI_TIPS[((epochDays % AGRI_TIPS.length) + AGRI_TIPS.length) % AGRI_TIPS.length];
}
