"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Repeat,
  Sprout,
  ArrowRight,
  AlertTriangle,
  Leaf,
  History,
  CalendarDays,
  Trash2,
  Check,
  Info,
  Wheat,
  Grape,
  Cherry,
  Carrot,
  Trees,
  Bean,
  Salad,
} from "lucide-react";
import {
  StickerCard,
  StickerButton,
  StickerBadge,
  SectionHeader,
} from "@/components/plantio/sticker";
import { useI18n } from "@/lib/plantio/i18n";
import { cn } from "@/lib/utils";
import {
  getRotationHistory,
  addRotationEntry,
  clearRotationHistory,
  type RotationEntry,
} from "@/lib/plantio/storage";

/* ===================================================================
   Types
   =================================================================== */

/** The 8 selectable crops on the main picker grid. */
type SelectorCrop =
  | "Wheat"
  | "Rice"
  | "Maize"
  | "Cotton"
  | "Soybean"
  | "Tomato"
  | "Potato"
  | "Sugarcane";

/** Any crop that can appear in recommendations or "avoid" lists. */
type AnyCrop =
  | SelectorCrop
  | "Barley"
  | "Sorghum"
  | "Pigeon Pea"
  | "Beans"
  | "Cabbage";

interface LocalizedText {
  en: string;
  hi: string;
  mr: string;
}

interface RotationRec {
  crop: AnyCrop;
  reason: LocalizedText;
  isBest?: boolean;
}

interface AvoidEntry {
  crop: AnyCrop;
  reason: LocalizedText;
}

interface RotationRule {
  currentCrop: SelectorCrop;
  recommendations: RotationRec[];
  avoid: AvoidEntry[];
  soilBenefit: LocalizedText;
  /** Year 1 = current crop, Year 2 + 3 = sensible follow-ups. */
  threeYearPlan: [AnyCrop, AnyCrop, AnyCrop];
}

/* ===================================================================
   Static data — 8 crop rotation rules (real agricultural science)
   =================================================================== */

const SELECTOR_CROPS: SelectorCrop[] = [
  "Wheat",
  "Rice",
  "Maize",
  "Cotton",
  "Soybean",
  "Tomato",
  "Potato",
  "Sugarcane",
];

const CROP_ICONS: Record<AnyCrop, LucideIcon> = {
  Wheat: Wheat,
  Rice: Grape,
  Maize: Leaf,
  Cotton: Cherry,
  Soybean: Sprout,
  Tomato: Cherry,
  Potato: Carrot,
  Sugarcane: Trees,
  Barley: Wheat,
  Sorghum: Wheat,
  "Pigeon Pea": Bean,
  Beans: Bean,
  Cabbage: Salad,
};

/* Localized crop labels — uses the rotation.<crop> i18n keys so the picker,
   recommendations, and "avoid" list all share one source of truth. */
const CROP_LABEL_KEY: Record<AnyCrop, string> = {
  Wheat: "rotation.wheat",
  Rice: "rotation.rice",
  Maize: "rotation.maize",
  Cotton: "rotation.cotton",
  Soybean: "rotation.soybean",
  Tomato: "rotation.tomato",
  Potato: "rotation.potato",
  Sugarcane: "rotation.sugarcane",
  Barley: "rotation.barley",
  Sorghum: "rotation.sorghum",
  "Pigeon Pea": "rotation.pigeonPea",
  Beans: "rotation.beans",
  Cabbage: "rotation.cabbage",
};

const ROTATION_RULES: Record<SelectorCrop, RotationRule> = {
  Wheat: {
    currentCrop: "Wheat",
    recommendations: [
      {
        crop: "Soybean",
        isBest: true,
        reason: {
          en: "Soybean fixes 30-50 kg of nitrogen per hectare through root nodules, replenishing what wheat depleted.",
          hi: "सोयाबीन अपनी जड़ों की गाँठों से 30-50 कि॰ग्रा॰ प्रति हेक्टेयर नाइट्रोजन जोड़ता है, जो गेहूँ ने खींच लिया था।",
          mr: "सोयाबीन मुळांच्या गाठींतून 30-50 किलो प्रति हेक्टर नत्र जोडते, जे गहूने शोषले होते.",
        },
      },
      {
        crop: "Potato",
        reason: {
          en: "Potato's shallow tubers don't compete with wheat's deeper roots, so the same soil layers recover.",
          hi: "आलू की उथली कंद गेहूँ की गहरी जड़ों से प्रतिस्पर्धा नहीं करतीं, इसलिए मिट्टी की परतें ठीक हो जाती हैं।",
          mr: "बटाट्याच्या उथळ कंदांचा गहूच्या खोल मुळांशी स्पर्धा होत नाही, त्यामुळे मातीच्या थरांची पुनर्प्राप्ती होते.",
        },
      },
      {
        crop: "Maize",
        reason: {
          en: "Maize breaks the disease cycle of wheat-specific fungi like rust and smut.",
          hi: "मक्का रस्ट व स्मट जैसे गेहूँ-विशिष्ट कवक के रोग चक्र को तोड़ता है।",
          mr: "मका गहू-विशिष्ट रस्ट व स्मट सारख्या बुरशीजन्य रोगांचे चक्र तोडतो.",
        },
      },
    ],
    avoid: [
      {
        crop: "Barley",
        reason: {
          en: "Barley shares the same diseases as wheat (rust, smut, blight) — planting it back-to-back builds up inoculum.",
          hi: "जौ गेहूँ के समान रोग (रस्ट, स्मट, ब्लाइट) से ग्रस्त होता है — लगातार बोने से रोग बढ़ता है।",
          mr: "जव गहूसारख्याच रोगांनी (रस्ट, स्मट, ब्लाइट) ग्रसित होतो — सलग पेरल्याने रोग वाढतो.",
        },
      },
    ],
    soilBenefit: {
      en: "Soybean after Wheat adds 30-50 kg nitrogen per hectare to your soil — roughly one bag of urea, free.",
      hi: "गेहूँ के बाद सोयाबीन आपकी मिट्टी में 30-50 कि॰ग्रा॰ प्रति हेक्टेयर नाइट्रोजन जोड़ता है — लगभग एक बैग यूरिया, मुफ़्त।",
      mr: "गहूनंतर सोयाबीन तुमच्या मातीत 30-50 किलो प्रति हेक्टर नत्र घालते — सुमारे एक पोती युरिया, मोफत.",
    },
    threeYearPlan: ["Wheat", "Soybean", "Maize"],
  },

  Rice: {
    currentCrop: "Rice",
    recommendations: [
      {
        crop: "Soybean",
        isBest: true,
        reason: {
          en: "Soybean's deep taproot opens up the compacted puddled soil left after flooded rice, improving drainage.",
          hi: "सोयाबीन की गहरी मुख्य जड़ बाढ़ वाले चावल के बाद ठोस मिट्टी को खोलती है, जिससे जल निकास सुधरता है।",
          mr: "सोयाबीनची खोल मुख्य मूळ तलावातील भातानंतरची घट्ट माती उघडते, त्यामुळे जलनिचया सुधारतो.",
        },
      },
      {
        crop: "Wheat",
        reason: {
          en: "Wheat in the rabi season uses residual moisture and breaks the anaerobic cycle of flooded paddies.",
          hi: "रबी मौसम में गेहूँ शेष नमी का उपयोग करता है और बाढ़ वाले खेतों के अवायवीय चक्र को तोड़ता है।",
          mr: "रब्बी हंगामात गहू उर्वरित ओलावाचा वापर करतो व तलावाच्या अऑक्सिजनविरहित चक्राला तोडतो.",
        },
      },
      {
        crop: "Maize",
        reason: {
          en: "Maize's upright growth and deep roots restructure the puddled rice soil and add organic matter.",
          hi: "मक्के की सीधी वृद्धि और गहरी जड़ें ठोस चावल मिट्टी को पुनर्संरचित करती हैं और कार्बनिक पदार्थ जोड़ती हैं।",
          mr: "मक्याची उभी वाढ व खोल मुळे घट्ट भात मातीला पुनर्रचना करतात व सेंद्रिय पदार्थ घालतात.",
        },
      },
    ],
    avoid: [
      {
        crop: "Rice",
        reason: {
          en: "Rice after rice keeps soil waterlogged, encouraging bacterial blight, blast, and stem rot.",
          hi: "चावल के बाद चावल मिट्टी को जलमग्न रखता है, जिससे जीवाणु ब्लाइट, ब्लास्ट और तना सड़न बढ़ती है।",
          mr: "तांदळानंतर तांदूळ मातीला बुडवून ठेवते, त्यामुळे जीवाणु ब्लाइट, ब्लास्ट व खोड सडून गेल्यासारखे होते.",
        },
      },
    ],
    soilBenefit: {
      en: "Soybean after Rice breaks the waterlogged disease cycle and adds nitrogen, so the next rice crop needs less urea.",
      hi: "चावल के बाद सोयाबीन जलमग्न रोग चक्र तोड़ता है और नाइट्रोजन जोड़ता है, इसलिए अगली चावल फसल को कम यूरिया चाहिए।",
      mr: "तांदळानंतर सोयाबीन बुडवलेले रोग चक्र तोडते व नत्र घालते, त्यामुळे पुढच्या भात पिकाला कमी युरिया लागतो.",
    },
    threeYearPlan: ["Rice", "Soybean", "Wheat"],
  },

  Maize: {
    currentCrop: "Maize",
    recommendations: [
      {
        crop: "Soybean",
        isBest: true,
        reason: {
          en: "Soybean after maize fixes nitrogen and disrupts the fall armyworm and stem borer life cycle.",
          hi: "मक्के के बाद सोयाबीन नाइट्रोजन जोड़ता है और पत्ता गोबर सूंडी व तना छेदक के जीवन चक्र को बाधित करता है।",
          mr: "मक्यानंतर सोयाबीन नत्र घालते व शेंड अळी व खोड तोडणाऱ्या कीडीचे जीवन चक्र तोडते.",
        },
      },
      {
        crop: "Potato",
        reason: {
          en: "Potato benefits from the loose, well-tilled soil maize leaves behind and uses different nutrients.",
          hi: "आलू मक्के द्वारा छोड़ी गई ढीली, अच्छी जुती हुई मिट्टी से लाभान्वित होता है और अलग पोषक तत्वों का उपयोग करता है।",
          mr: "बटाटा मक्याने सोडलेल्या भुसभुशीत, चांगल्या नांगरलेल्या मातीपासून फायदा घेतो व वेगळे पोषक वापरतो.",
        },
      },
      {
        crop: "Wheat",
        reason: {
          en: "Wheat's fibrous roots complement maize's taproot system, structuring the soil across two seasons.",
          hi: "गेहूँ की रेशेदार जड़ें मक्के की मुख्य जड़ प्रणाली के पूरक हैं, जो दो मौसमों में मिट्टी को संरचित करती हैं।",
          mr: "गहूची तंतुमय मुळे मक्याच्या मुख्य मूळ प्रणालीस पूरक आहेत, दोन हंगामांत मातीची रचना करतात.",
        },
      },
    ],
    avoid: [
      {
        crop: "Sorghum",
        reason: {
          en: "Sorghum shares stem borer and shoot fly pests with maize — back-to-back planting lets populations explode.",
          hi: "ज्वार मक्के के साथ तना छेदक व शूट मक्षी कीट साझा करता है — लगातार बोने से कीट संख्या बढ़ जाती है।",
          mr: "ज्वारी मक्यासोबत खोड तोडणारी व शूट माशीची कीडे सामायिक घेते — सलग पेरल्याने कीडींची संख्या वाढते.",
        },
      },
    ],
    soilBenefit: {
      en: "Soybean after Maize can supply 30-40 kg of nitrogen per hectare, halving the urea needed for the next crop.",
      hi: "मक्के के बाद सोयाबीन प्रति हेक्टेयर 30-40 कि॰ग्रा॰ नाइट्रोजन दे सकता है, जिससे अगली फसल के यूरिया की आधी ज़रूरत पड़ती है।",
      mr: "मक्यानंतर सोयाबीन प्रति हेक्टर 30-40 किलो नत्र देऊ शकते, त्यामुळे पुढच्या पिकाला लागणाऱ्या युरियाची निम्ही गरज भागते.",
    },
    threeYearPlan: ["Maize", "Soybean", "Wheat"],
  },

  Cotton: {
    currentCrop: "Cotton",
    recommendations: [
      {
        crop: "Soybean",
        isBest: true,
        reason: {
          en: "Soybean fixes nitrogen and starves pink bollworm larvae that overwinter in cotton residues.",
          hi: "सोयाबीन नाइट्रोजन जोड़ता है और कपास अवशेषों में सर्दियों में जीवित रहने वाले गुलाबी बॉलवर्म लार्वा को भूखा मारता है।",
          mr: "सोयाबीन नत्र घालते व कापसाच्या अवशेषांत हिवाळ्यात जगणाऱ्या गुलाबी बॉलवर्म अळ्यांना उपाशी मारते.",
        },
      },
      {
        crop: "Pigeon Pea",
        reason: {
          en: "Pigeon pea's deep taproot breaks the hardpan cotton creates and adds organic matter through leaf fall.",
          hi: "अरहर की गहरी मुख्य जड़ कपास द्वारा बनाई गई कठोर परत को तोड़ती है और पत्ती गिरने से कार्बनिक पदार्थ जोड़ती है।",
          mr: "तुराचे खोल मुख्य मूळ कापसाने तयार केलेली टणक थर तोडते व पाने गळून सेंद्रिय पदार्थ घालते.",
        },
      },
      {
        crop: "Maize",
        reason: {
          en: "Maize is a non-host for cotton pests like whitefly and leaf hopper, interrupting their cycle.",
          hi: "मक्का व्हाइटफ्लाई व लीफ हॉपर जैसे कपास कीटों के लिए गैर-मेज़बान है, जो उनके चक्र को रोकता है।",
          mr: "मका पांढरी माशी व लीफ हॉपरसारख्या कापसाच्या कीडींसाठी गैर-यजमान आहे, त्यांचे चक्र थांबवतो.",
        },
      },
    ],
    avoid: [
      {
        crop: "Cotton",
        reason: {
          en: "Cotton after cotton lets pink bollworm and bollworm pupae persist in the soil and stubble.",
          hi: "कपास के बाद कपास गुलाबी बॉलवर्म व बॉलवर्म को खेत की मिट्टी व ठूठों में जीवित रहने देता है।",
          mr: "कापसानंतर कापूस गुलाबी बॉलवर्म व बॉलवर्म को शेताच्या मातीत व देठांत जगू देतो.",
        },
      },
    ],
    soilBenefit: {
      en: "Pigeon Pea after Cotton sheds 2-3 tonnes of leaf litter per hectare, adding organic carbon back to exhausted soil.",
      hi: "कपास के बाद अरहर प्रति हेक्टेयर 2-3 टन पत्ती गिराता है, जो थकी हुई मिट्टी में कार्बनिक कार्बन वापस जोड़ता है।",
      mr: "कापसानंतर तूर प्रति हेक्टर 2-3 टन पाने गाळते, जे थकलेल्या मातीत सेंद्रिय कार्बन परत घालते.",
    },
    threeYearPlan: ["Cotton", "Soybean", "Pigeon Pea"],
  },

  Soybean: {
    currentCrop: "Soybean",
    recommendations: [
      {
        crop: "Maize",
        isBest: true,
        reason: {
          en: "Maize uses the nitrogen soybean left behind, often needing no starter nitrogen fertilizer at all.",
          hi: "मक्का सोयाबीन द्वारा छोड़े गए नाइट्रोजन का उपयोग करता है, अक्सर बिना किसी शुरुआती नाइट्रोजन खाद के।",
          mr: "मका सोयाबीनने सोडलेले नत्र वापरतो, बहुतेक वेळा सुरुवातीला नत्र खताची गरजच नसते.",
        },
      },
      {
        crop: "Wheat",
        reason: {
          en: "Wheat follows soybean well in the rabi season, using residual moisture and nitrogen.",
          hi: "गेहूँ रबी मौसम में सोयाबीन के बाद अच्छी तरह आता है, शेष नमी व नाइट्रोजन का उपयोग करता है।",
          mr: "गहू रब्बी हंगामात सोयाबीननंतर चांगला येतो, उर्वरित ओलावा व नत्र वापरतो.",
        },
      },
      {
        crop: "Rice",
        reason: {
          en: "Rice benefits from the improved soil structure and nitrogen soybean leaves in the profile.",
          hi: "चावल सोयाबीन द्वारा प्रोफ़ाइल में छोड़ी गई बेहतर मिट्टी संरचना व नाइट्रोजन से लाभान्वित होता है।",
          mr: "तांदूळ सोयाबीनने थरात सोडलेल्या सुधारलेल्या माती रचनेपासून व नत्रापासून फायदा घेतो.",
        },
      },
    ],
    avoid: [
      {
        crop: "Soybean",
        reason: {
          en: "Soybean after soybean lets root-knot nematode and sudden death syndrome build up to damaging levels.",
          hi: "सोयाबीन के बाद सोयाबीन रूट-नॉट सूत्रकृमि व अचानक मृत्यु सिंड्रोम को नुकसानदायक स्तर तक पहुँचने देता है।",
          mr: "सोयाबीननंतर सोयाबीन रूट-नॉट अळी व अचानक मृत्यू सिंड्रोम नुकसानकारक पातळीपर्यंत वाढू देते.",
        },
      },
    ],
    soilBenefit: {
      en: "Maize after Soybean needs 40-60% less nitrogen fertilizer, since the soybean residue releases nitrogen slowly as it decomposes.",
      hi: "सोयाबीन के बाद मक्के को 40-60% कम नाइट्रोजन खाद चाहिए, क्योंकि सोयाबीन अवशेष सड़ने पर धीरे-धीरे नाइट्रोजन छोड़ता है।",
      mr: "सोयाबीननंतर मक्याला 40-60% कम नत्र खत लागते, कारण सोयाबीन अवशेष कुजल्यावर हळूहळू नत्र सोडतो.",
    },
    threeYearPlan: ["Soybean", "Maize", "Wheat"],
  },

  Tomato: {
    currentCrop: "Tomato",
    recommendations: [
      {
        crop: "Maize",
        isBest: true,
        reason: {
          en: "Maize is a non-host for tomato's early and late blight pathogens, breaking the disease cycle.",
          hi: "मक्का टमाटर के अर्ली व लेट ब्लाइट रोगाणुओं के लिए गैर-मेज़बान है, जो रोग चक्र तोड़ता है।",
          mr: "मका टोमॅटोच्या अर्ली व लेट ब्लाइट रोगकारकांसाठी गैर-यजमान आहे, रोग चक्र तोडतो.",
        },
      },
      {
        crop: "Beans",
        reason: {
          en: "Beans fix nitrogen and are not related to tomato, so they don't share soil-borne wilts.",
          hi: "फलियाँ नाइट्रोजन जोड़ती हैं और टमाटर से संबंधित नहीं हैं, इसलिए मिट्टीजनित मुरझाव साझा नहीं करतीं।",
          mr: "शेंगा नत्र घालतात व टोमॅटोशी संबंधित नाहीत, त्यामुळे मातीजन्य आलणे सामायिक करत नाहीत.",
        },
      },
      {
        crop: "Cabbage",
        reason: {
          en: "Cabbage is from a different plant family, so tomato pests and diseases can't carry over.",
          hi: "पत्तागोभी एक अलग पौधे के कुल से है, इसलिए टमाटर के कीट व रोग आगे नहीं बढ़ सकते।",
          mr: "कोबी वेगळ्या वनस्पती कुळातील आहे, त्यामुळे टोमॅटोची कीडे व रोग पुढे जाऊ शकत नाहीत.",
        },
      },
    ],
    avoid: [
      {
        crop: "Potato",
        reason: {
          en: "Potato and tomato share late blight (Phytophthora infestans) — consecutive planting guarantees infection.",
          hi: "आलू व टमाटर लेट ब्लाइट साझा करते हैं — लगातार लगाने पर संक्रमण निश्चित है।",
          mr: "बटाटा व टोमॅटो लेट ब्लाइट सामायिक घेतात — सलग लावल्यास संक्रमण नक्की.",
        },
      },
      {
        crop: "Tomato",
        reason: {
          en: "Tomato after tomato lets bacterial wilt, root-knot nematode, and viruses build up rapidly.",
          hi: "टमाटर के बाद टमाटर जीवाणु मुरझाव, रूट-नॉट सूत्रकृमि व वायरस को तेज़ी से बढ़ने देता है।",
          mr: "टोमॅटोनंतर टोमॅटो जीवाणु आलणे, रूट-नॉट अळी व व्हायरस लवकर वाढू देते.",
        },
      },
    ],
    soilBenefit: {
      en: "Maize after Tomato takes up leftover nitrogen and dries out the soil, reducing fungal spores that cause blight.",
      hi: "टमाटर के बाद मक्का शेष नाइट्रोजन ग्रहण करता है और मिट्टी को सुखाता है, जिससे ब्लाइट कवक बीजाणु कम होते हैं।",
      mr: "टोमॅटोनंतर मका उर्वरित नत्र घेतो व माती वाळवतो, त्यामुळे ब्लाइट बुरशीच्या बीजाणू कमी होतात.",
    },
    threeYearPlan: ["Tomato", "Maize", "Beans"],
  },

  Potato: {
    currentCrop: "Potato",
    recommendations: [
      {
        crop: "Maize",
        isBest: true,
        reason: {
          en: "Maize breaks the late blight and scab cycle and uses the deep-tilled, loose soil potatoes leave behind.",
          hi: "मक्का लेट ब्लाइट व स्कैब चक्र तोड़ता है और आलू द्वारा छोड़ी गई गहरी जुती, ढीली मिट्टी का उपयोग करता है।",
          mr: "मका लेट ब्लाइट व स्कॅब चक्र तोडतो व बटाट्याने सोडलेली खोल नांगरलेली, भुसभुशीत माती वापरतो.",
        },
      },
      {
        crop: "Wheat",
        reason: {
          en: "Wheat's dense fibrous roots stabilize the loose potato beds and use leftover nutrients.",
          hi: "गेहूँ की घनी रेशेदार जड़ें ढीले आलू क्यारियों को स्थिर करती हैं और शेष पोषक तत्वों का उपयोग करती हैं।",
          mr: "गहूची घन तंतुमय मुळे भुसभुशीत बटाटा वाफ्यांना स्थिर करतात व उर्वरित पोषके वापरतात.",
        },
      },
      {
        crop: "Beans",
        reason: {
          en: "Beans add nitrogen back to the soil potato crops heavily deplete, and don't share blight pathogens.",
          hi: "फलियाँ आलू फसलों द्वारा भारी निकास वाली मिट्टी में नाइट्रोजन वापस जोड़ती हैं, और ब्लाइट रोगाणु साझा नहीं करतीं।",
          mr: "शेंगा बटाटा पिकांनी रिकामी केलेल्या मातीत नत्र परत घालतात, व ब्लाइट रोगकारक सामायिक करत नाहीत.",
        },
      },
    ],
    avoid: [
      {
        crop: "Tomato",
        reason: {
          en: "Tomato shares late blight with potato — the pathogen overwinters in volunteer tubers and infects tomato.",
          hi: "टमाटर आलू के साथ लेट ब्लाइट साझा करता है — रोगाणु स्वयंसेवी कंदों में सर्दी में जीवित रहता है और टमाटर को संक्रमित करता है।",
          mr: "टोमॅटो बटाट्यासोबत लेट ब्लाइट सामायिक घेतो — रोगकारक स्वयंसेवी कंदांत हिवाळा काढतो व टोमॅटोला संक्रमित करतो.",
        },
      },
      {
        crop: "Potato",
        reason: {
          en: "Potato after potato lets late blight, golden nematode, and scab reach damaging levels within 2 seasons.",
          hi: "आलू के बाद आलू लेट ब्लाइट, गोल्डन सूत्रकृमि व स्कैब को 2 मौसमों में नुकसानदायक स्तर तक पहुँचने देता है।",
          mr: "बटाट्यानंतर बटाटा लेट ब्लाइट, गोल्डन अळी व स्कॅब 2 हंगामांत नुकसानकारक पातळीपर्यंत पोहोचू देतो.",
        },
      },
    ],
    soilBenefit: {
      en: "Beans after Potato return 40-50 kg of nitrogen per hectare, replacing what the heavy-feeding potato crop removed.",
      hi: "आलू के बाद फलियाँ प्रति हेक्टेयर 40-50 कि॰ग्रा॰ नाइट्रोजन लौटाती हैं, जो भारी भोजी आलू फसल ने निकाला था।",
      mr: "बटाट्यानंतर शेंगा प्रति हेक्टर 40-50 किलो नत्र परत देतात, जे जड खाणाऱ्या बटाटा पिकाने काढले होते.",
    },
    threeYearPlan: ["Potato", "Maize", "Wheat"],
  },

  Sugarcane: {
    currentCrop: "Sugarcane",
    recommendations: [
      {
        crop: "Soybean",
        isBest: true,
        reason: {
          en: "Soybean in the gap year fixes nitrogen and breaks the ratoon stunting disease cycle.",
          hi: "गैर वर्ष में सोयाबीन नाइट्रोजन जोड़ता है और रेटून विकास रोग चक्र को तोड़ता है।",
          mr: "पडीत वर्षात सोयाबीन नत्र घालते व रेटून कुजून रोगाचे चक्र तोडते.",
        },
      },
      {
        crop: "Wheat",
        reason: {
          en: "Wheat in the rabi season uses the well-prepared sugarcane beds and recovers soil structure.",
          hi: "रबी मौसम में गेहूँ अच्छी तैयार की गई गन्ना क्यारियों का उपयोग करता है और मिट्टी संरचना ठीक करता है।",
          mr: "रब्बी हंगामात गहू चांगल्या तयार केलेल्या ऊस वाफ्यांचा वापर करतो व माती रचना ठीक करतो.",
        },
      },
      {
        crop: "Rice",
        reason: {
          en: "Rice in the next kharif flushes the soil with water, drowning sugarcane pest larvae and grubs.",
          hi: "अगले खरीफ में चावल मिट्टी को पानी से भर देता है, जिससे गन्ना कीट लार्वा व ग्रब डूब जाते हैं।",
          mr: "पुढच्या खरीपात तांदूळ मातीला पाण्याने भरते, त्यामुळे ऊस कीड अळ्या व ग्रब बुडतात.",
        },
      },
    ],
    avoid: [
      {
        crop: "Sugarcane",
        reason: {
          en: "Sugarcane after sugarcane (ratooning year after year) lets ratoon stunting, red rot, and borers build up.",
          hi: "गन्ने के बाद गन्ना (वर्षों तक रेटूनिंग) रेटून विकास, लाल सड़न व छेदक कीट को बढ़ने देता है।",
          mr: "ऊसानंतर ऊस (वर्षानुवर्ष रेटूनिंग) रेटून कुजून, लाल सडून व छेदक कीडे वाढू देतो.",
        },
      },
    ],
    soilBenefit: {
      en: "A soybean break crop after Sugarcane can add 40-60 kg of nitrogen and reduce ratoon stunting disease by 50-70%.",
      hi: "गन्ने के बाद सोयाबीन अंतराल फसल 40-60 कि॰ग्रा॰ नाइट्रोजन जोड़ सकती है और रेटून विकास रोग 50-70% कम कर सकती है।",
      mr: "ऊसानंतर सोयाबीन अंतर पीक 40-60 किलो नत्र घालू शकते व रेटून कुजून रोग 50-70% कमी करू शकते.",
    },
    threeYearPlan: ["Sugarcane", "Soybean", "Wheat"],
  },
};

/* ===================================================================
   Crop picker pill (one of the 8 selectable crops)
   =================================================================== */
function CropPill({
  crop,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  crop: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label}`}
      className={cn(
        "plantio-pop-in flex items-center gap-2 px-3 py-3 rounded-2xl border-[2.5px] border-ink shadow-[3px_3px_0px_0px_#161611] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#161611] transition-all cursor-pointer select-none",
        active ? "bg-leaf text-ink" : "bg-white text-ink"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "shrink-0 w-9 h-9 rounded-xl border-[2px] border-ink flex items-center justify-center",
          active ? "bg-forest text-white" : "bg-cream text-forest"
        )}
      >
        <Icon className="w-5 h-5" strokeWidth={2.5} />
      </span>
      <span className="font-display text-sm font-bold uppercase tracking-wide">
        {label}
      </span>
      {active && (
        <Check className="w-4 h-4 ml-auto" strokeWidth={3} aria-hidden />
      )}
    </button>
  );
}

/* ===================================================================
   Recommendation mini-card (one of 2-3 next-crop suggestions)
   =================================================================== */
function RecCard({
  crop,
  icon: Icon,
  label,
  reason,
  isBest,
  bestLabel,
  delay,
}: {
  crop: string;
  icon: LucideIcon;
  label: string;
  reason: string;
  isBest?: boolean;
  bestLabel: string;
  delay: number;
}) {
  return (
    <div
      className="plantio-pop-in relative bg-white border-[2.5px] border-ink rounded-2xl p-4 shadow-[4px_4px_0px_0px_#161611]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {isBest && (
        <span className="absolute -top-3 -right-2">
          <StickerBadge variant="leaf">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            {bestLabel}
          </StickerBadge>
        </span>
      )}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="shrink-0 w-11 h-11 rounded-xl bg-cream border-[2px] border-ink flex items-center justify-center"
        >
          <Icon className="w-6 h-6 text-forest" strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <h4 className="font-display text-base font-bold uppercase leading-tight text-ink">
            {label}
          </h4>
          <p className="sr-only">Crop id: {crop}</p>
        </div>
      </div>
      <p className="mt-2.5 text-sm text-ink/85 leading-snug">{reason}</p>
    </div>
  );
}

/* ===================================================================
   Avoid row (one crop to avoid with reason)
   =================================================================== */
function AvoidRow({
  icon: Icon,
  label,
  reason,
}: {
  icon: LucideIcon;
  label: string;
  reason: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="shrink-0 w-10 h-10 rounded-xl bg-warn border-[2px] border-ink flex items-center justify-center text-white shadow-[2px_2px_0px_0px_#161611]"
      >
        <Icon className="w-5 h-5" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="font-display text-sm font-bold uppercase tracking-wide text-ink">
          {label}
        </h4>
        <p className="mt-0.5 text-sm text-ink/85 leading-snug">{reason}</p>
      </div>
    </div>
  );
}

/* ===================================================================
   Year node for the 3-year plan timeline
   =================================================================== */
function YearNode({
  year,
  crop,
  icon: Icon,
  label,
}: {
  year: number;
  crop: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center text-center min-w-0">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-forest border-[3px] border-ink text-white shadow-[3px_3px_0px_0px_#161611]">
        <span className="font-display text-lg font-bold" aria-hidden>
          {year}
        </span>
      </div>
      <span
        aria-hidden
        className="mt-2 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-leaf border-[2px] border-ink"
      >
        <Icon className="w-5 h-5 text-ink" strokeWidth={2.5} />
      </span>
      <h4 className="mt-1.5 font-display text-xs font-bold uppercase tracking-wide text-ink leading-tight">
        {label}
      </h4>
      <span className="sr-only">Crop: {crop}</span>
    </div>
  );
}

/* Connector arrow between year nodes — shown on sm+ screens. */
function YearConnector() {
  return (
    <div className="hidden sm:flex items-start pt-5">
      <ArrowRight className="w-5 h-5 text-ink/60" strokeWidth={2.5} aria-hidden />
    </div>
  );
}

/* ===================================================================
   Relative-time formatter — uses rotation.justNow / minutesAgo /
   hoursAgo / daysAgo keys (with {n} substitution).
   =================================================================== */
function relativeTime(ts: number, t: (k: string) => string): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return t("rotation.justNow");
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return t("rotation.minutesAgo").replace("{n}", String(mins));
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("rotation.hoursAgo").replace("{n}", String(hrs));
  const days = Math.floor(hrs / 24);
  return t("rotation.daysAgo").replace("{n}", String(days));
}

/* ===================================================================
   Page
   =================================================================== */
export default function RotationPage() {
  const { lang, t } = useI18n();
  const [selected, setSelected] = useState<SelectorCrop | null>(null);
  const [history, setHistory] = useState<RotationEntry[]>([]);

  /* Load history on mount + whenever the storage event fires
     (addRotationEntry / clearRotationHistory dispatch it). */
  const refresh = useCallback(() => {
    setHistory(getRotationHistory());
  }, []);

  useEffect(() => {
    // Defer the initial localStorage read to a microtask so we don't call
    // setState synchronously in the effect body (react-hooks/set-state-in-effect).
    queueMicrotask(refresh);
    if (typeof window === "undefined") return;
    window.addEventListener("plantio-rotation-updated", refresh);
    // Refresh on tab refocus so "x minutes ago" stays current.
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("plantio-rotation-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const pickLocalized = useCallback(
    (text: LocalizedText) => text[lang] ?? text.en,
    [lang]
  );

  const rule = selected ? ROTATION_RULES[selected] : null;

  const cropLabel = useCallback(
    (crop: AnyCrop) => t(CROP_LABEL_KEY[crop]),
    [t]
  );

  const handleSelect = useCallback(
    (crop: SelectorCrop) => {
      setSelected(crop);
      // Record in history only when the user picks a *different* crop than
      // the one currently selected — so re-tapping the same pill doesn't
      // spam duplicates (addRotationEntry also dedupes by crop).
      if (crop !== selected) {
        addRotationEntry(crop);
      }
    },
    [selected]
  );

  const handleClearHistory = useCallback(() => {
    if (typeof window === "undefined") return;
    // Friendly confirm — no native prompt() in Plantio (UX rule).
    const ok = window.confirm(t("rotation.confirmClear"));
    if (!ok) return;
    clearRotationHistory();
    // clearRotationHistory dispatches the event, which triggers refresh.
  }, [t]);

  const threeYearCrops = useMemo<AnyCrop[] | null>(() => {
    if (!rule) return null;
    return rule.threeYearPlan;
  }, [rule]);

  return (
    <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <SectionHeader
        title={t("rotation.title")}
        subtitle={t("rotation.subtitle")}
        bg="forest"
        text="white"
        icon={Repeat}
        iconTint="bg-leaf"
      />

      <section className="plantio-grain px-5 py-5 space-y-4 plantio-section-gap">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* ============ Current Crop Selector ============ */}
          <StickerCard
            className="plantio-pop-in bg-white"
            style={{ animationDelay: "0ms" }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <span
                aria-hidden
                className="shrink-0 w-9 h-9 rounded-xl bg-leaf border-[2px] border-ink flex items-center justify-center"
              >
                <Sprout className="w-5 h-5 text-ink" strokeWidth={2.5} />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold uppercase leading-tight text-ink">
                  {t("rotation.whatPlanted")}
                </h2>
                <p className="text-xs text-ink/70 leading-snug">
                  {t("rotation.whatPlantedHint")}
                </p>
              </div>
            </div>

            <div
              role="radiogroup"
              aria-label={t("rotation.whatPlanted")}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
            >
              {SELECTOR_CROPS.map((crop) => {
                const Icon = CROP_ICONS[crop];
                return (
                  <CropPill
                    key={crop}
                    crop={crop}
                    icon={Icon}
                    label={cropLabel(crop)}
                    active={selected === crop}
                    onClick={() => handleSelect(crop)}
                  />
                );
              })}
            </div>
            {/* Visible "selected" hint */}
            {selected && (
              <p className="mt-3 text-sm text-ink/75 leading-snug">
                <span className="font-display font-bold uppercase text-ink">
                  {cropLabel(selected)}
                </span>
              </p>
            )}
          </StickerCard>

          {/* ============ Recommendation ============ */}
          {rule && (
            <StickerCard
              className="plantio-pop-in bg-gold/40"
              style={{ animationDelay: "60ms" }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span
                  aria-hidden
                  className="shrink-0 w-9 h-9 rounded-xl bg-forest border-[2px] border-ink flex items-center justify-center"
                >
                  <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
                </span>
                <h2 className="font-display text-lg font-bold uppercase leading-tight text-ink">
                  {t("rotation.recommendedNext")}
                </h2>
              </div>
              <div className="space-y-3">
                {rule.recommendations.map((rec, i) => (
                  <RecCard
                    key={rec.crop}
                    crop={rec.crop}
                    icon={CROP_ICONS[rec.crop]}
                    label={cropLabel(rec.crop)}
                    reason={pickLocalized(rec.reason)}
                    isBest={rec.isBest}
                    bestLabel={t("rotation.bestChoice")}
                    delay={60 + i * 60}
                  />
                ))}
              </div>
            </StickerCard>
          )}

          {/* ============ Avoid ============ */}
          {rule && rule.avoid.length > 0 && (
            <StickerCard
              className="plantio-pop-in bg-warn/20"
              style={{ animationDelay: "120ms" }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span
                  aria-hidden
                  className="shrink-0 w-9 h-9 rounded-xl bg-warn border-[2px] border-ink flex items-center justify-center"
                >
                  <AlertTriangle
                    className="w-5 h-5 text-white"
                    strokeWidth={2.5}
                  />
                </span>
                <h2 className="font-display text-lg font-bold uppercase leading-tight text-ink">
                  {t("rotation.avoidNext")}
                </h2>
              </div>
              <div className="space-y-3">
                {rule.avoid.map((a) => (
                  <AvoidRow
                    key={a.crop}
                    icon={CROP_ICONS[a.crop]}
                    label={cropLabel(a.crop)}
                    reason={pickLocalized(a.reason)}
                  />
                ))}
              </div>
            </StickerCard>
          )}

          {/* ============ Why Rotate + Soil Benefit ============ */}
          {rule && (
            <StickerCard
              className="plantio-pop-in bg-leaf/40"
              style={{ animationDelay: "180ms" }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span
                  aria-hidden
                  className="shrink-0 w-9 h-9 rounded-xl bg-forest border-[2px] border-ink flex items-center justify-center"
                >
                  <Leaf className="w-5 h-5 text-white" strokeWidth={2.5} />
                </span>
                <h2 className="font-display text-lg font-bold uppercase leading-tight text-ink">
                  {t("rotation.whyRotate")}
                </h2>
              </div>
              <p className="text-sm text-ink/85 leading-relaxed">
                {t("rotation.whyRotateDesc")}
              </p>
              {/* Specific soil benefit for this crop */}
              <div className="mt-3 bg-white border-[2.5px] border-ink rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    aria-hidden
                    className="shrink-0 w-7 h-7 rounded-lg bg-leaf border-[2px] border-ink flex items-center justify-center"
                  >
                    <Info className="w-4 h-4 text-ink" strokeWidth={2.5} />
                  </span>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wide text-ink">
                    {t("rotation.soilBenefit")}
                  </h3>
                </div>
                <p className="text-sm text-ink/85 leading-snug pl-9">
                  {pickLocalized(rule.soilBenefit)}
                </p>
              </div>
            </StickerCard>
          )}

          {/* ============ 3-Year Rotation Plan ============ */}
          {rule && threeYearCrops && (
            <StickerCard
              className="plantio-pop-in bg-white"
              style={{ animationDelay: "240ms" }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <span
                  aria-hidden
                  className="shrink-0 w-9 h-9 rounded-xl bg-gold border-[2px] border-ink flex items-center justify-center"
                >
                  <CalendarDays
                    className="w-5 h-5 text-ink"
                    strokeWidth={2.5}
                  />
                </span>
                <h2 className="font-display text-lg font-bold uppercase leading-tight text-ink">
                  {t("rotation.samplePlan")}
                </h2>
              </div>
              <div className="flex items-start justify-between gap-1 sm:gap-3">
                {threeYearCrops.map((c, i) => (
                  <Fragment key={`${c}-${i}`}>
                    <YearNode
                      year={i + 1}
                      crop={c}
                      icon={CROP_ICONS[c]}
                      label={cropLabel(c)}
                    />
                    {i < threeYearCrops.length - 1 && <YearConnector />}
                  </Fragment>
                ))}
              </div>
              <p className="mt-4 text-xs text-ink/70 leading-snug">
                {t("rotation.year")} 1 = {cropLabel(selected!)} →{" "}
                {t("rotation.year")} 2 = {cropLabel(threeYearCrops[1])} →{" "}
                {t("rotation.year")} 3 = {cropLabel(threeYearCrops[2])}
              </p>
            </StickerCard>
          )}

          {/* ============ Rotation History ============ */}
          <StickerCard
            className="plantio-pop-in bg-cream"
            style={{ animationDelay: rule ? "300ms" : "60ms" }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <span
                aria-hidden
                className="shrink-0 w-9 h-9 rounded-xl bg-forest border-[2px] border-ink flex items-center justify-center"
              >
                <History className="w-5 h-5 text-white" strokeWidth={2.5} />
              </span>
              <h2 className="font-display text-lg font-bold uppercase leading-tight text-ink">
                {t("rotation.history")}
              </h2>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-ink/70 leading-snug">
                  {t("rotation.noHistory")}
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-2 max-h-72 overflow-y-auto scroll-plantio pr-1">
                  {history.map((entry, i) => {
                    const Icon =
                      CROP_ICONS[entry.crop as AnyCrop] ?? Sprout;
                    return (
                      <li
                        key={entry.id}
                        className="flex items-center gap-3 bg-white border-[2px] border-ink rounded-xl p-2.5 shadow-[2px_2px_0px_0px_#161611]"
                      >
                        <span
                          aria-hidden
                          className="shrink-0 w-8 h-8 rounded-lg bg-cream border-[2px] border-ink flex items-center justify-center font-display text-xs font-bold text-ink"
                        >
                          {i + 1}
                        </span>
                        <span
                          aria-hidden
                          className="shrink-0 w-9 h-9 rounded-xl bg-leaf border-[2px] border-ink flex items-center justify-center"
                        >
                          <Icon
                            className="w-5 h-5 text-ink"
                            strokeWidth={2.5}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-sm font-bold uppercase leading-tight text-ink">
                            {cropLabel(entry.crop as AnyCrop)}
                          </p>
                          <p className="text-xs text-ink/60 leading-snug">
                            {relativeTime(entry.createdAt, t)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3">
                  <StickerButton
                    variant="warn"
                    size="sm"
                    onClick={handleClearHistory}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                    {t("rotation.clearHistory")}
                  </StickerButton>
                </div>
              </>
            )}
          </StickerCard>

          {/* Footer note */}
          <p className="text-center text-xs text-ink/60 font-display uppercase tracking-wide pt-1">
            {t("common.madeForGrowers")}
          </p>
        </div>
      </section>
    </main>
  );
}
