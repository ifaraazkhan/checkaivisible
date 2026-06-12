import type { Category } from "./types.js";

// Keyword lexicons per category. First strong hit wins; ties broken by order in CATEGORY_PRIORITY.
const KEYWORDS: Record<Category, string[]> = {
  restaurant: [
    "menu", "reservation", "reservations", "cuisine", "dine", "dining",
    "appetizer", "entree", "entrée", "chef", "tasting", "wine list",
    "delivery", "takeout", "bistro", "trattoria", "ristorante", "brunch",
    "happy hour", "cocktail", "pizzeria", "steakhouse",
  ],
  dentist: [
    "dental", "dentist", "dentistry", "orthodontic", "orthodontist",
    "teeth", "tooth", "cavity", "cleaning", "invisalign", "implant",
    "crown", "veneer", "endodontic", "periodontal", "hygienist",
    "smile", "oral surgery", "dds", "dmd",
  ],
  lawyer: [
    "attorney", "attorneys", "lawyer", "lawyers", "law firm", "law office",
    "litigation", "counsel", "legal services", "consultation",
    "personal injury", "divorce", "estate planning", "criminal defense",
    "esquire", "esq.", "bar association", "practice areas",
  ],
  plumber: [
    "plumber", "plumbing", "drain", "sewer", "water heater", "leak",
    "pipe", "faucet", "toilet repair", "garbage disposal", "sump pump",
    "emergency plumbing", "licensed plumber", "rooter",
  ],
  spa: [
    "spa", "massage", "facial", "salon", "manicure", "pedicure",
    "wellness", "aromatherapy", "waxing", "esthetician", "esthetic",
    "skincare", "body treatment", "deep tissue", "swedish massage",
    "day spa", "med spa", "medspa",
  ],
};

const CATEGORY_PRIORITY: Category[] = ["dentist", "lawyer", "plumber", "spa", "restaurant"];

type Input = {
  title: string | null;
  description: string | null;
  text: string;
};

export function inferCategory(input: Input): Category | null {
  const haystack = [input.title ?? "", input.description ?? "", input.text]
    .join(" ")
    .toLowerCase();

  const scores: Record<Category, number> = {
    restaurant: 0,
    dentist: 0,
    lawyer: 0,
    plumber: 0,
    spa: 0,
  };

  for (const cat of CATEGORY_PRIORITY) {
    for (const kw of KEYWORDS[cat]) {
      // word-boundary match to avoid "menu" inside "menstruation" etc.
      const pattern = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
      const matches = haystack.match(pattern);
      if (matches) scores[cat] += matches.length;
    }
  }

  // Require at least 2 keyword hits to claim a category.
  let best: Category | null = null;
  let bestScore = 1;
  for (const cat of CATEGORY_PRIORITY) {
    if (scores[cat] > bestScore) {
      bestScore = scores[cat];
      best = cat;
    }
  }
  return best;
}
