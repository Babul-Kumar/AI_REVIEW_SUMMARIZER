import { GoogleGenAI, Type } from "@google/genai";

type ReviewQuality = "high" | "medium" | "low";
type SentimentLabel = "positive" | "neutral" | "negative";

export interface FeatureGroup {
  category: string;
  items: string[];
}

function parseApiKeys(rawValue?: string): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(/[\r\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

const CONFIGURED_API_KEYS = Array.from(
  new Set([
    ...parseApiKeys(process.env.GEMINI_API_KEY),
    ...parseApiKeys(process.env.GEMINI_API_KEYS),
  ])
);

if (CONFIGURED_API_KEYS.length === 0) {
  throw new Error("Missing GEMINI_API_KEY or GEMINI_API_KEYS in environment variables.");
}

const aiClients = CONFIGURED_API_KEYS.map((apiKey) => new GoogleGenAI({ apiKey }));
let preferredApiKeyIndex = 0;

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini-flash-latest"];
const MAX_CACHE_SIZE = 100;

export interface AnalysisResult {
  summary: string;
  aiInsight: string;
  pros: string[];
  cons: string[];
  features: string[];
  featureGroups: FeatureGroup[];
  neutralPoints: string[];
  comparisons: string[];
  observations: string[];
  bestFor: string[];
  notIdealFor: string[];
  majorIssues: string[];
  minorIssues: string[];
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  score: number;
  confidence: number;
  out_of_scope: boolean;
  detected_category?: string;
  review_quality?: ReviewQuality;
}

interface ExtractionResult {
  sentiment_label: SentimentLabel;
  positive_points: string[];
  negative_points: string[];
  neutral_points: string[];
  features: string[];
  comparisons: string[];
  observations: string[];
  best_for: string[];
  not_ideal_for: string[];
  major_issues: string[];
  minor_issues: string[];
  category: string;
  out_of_scope: boolean;
}

const SYSTEM_INSTRUCTION = `
You are a Product Review Extractor.

Task: Extract structured facts from the review.

Rules:
- sentiment_label: Choose one from "positive", "neutral", "negative".
- positive_points: Extract short evidence phrases describing benefits.
- negative_points: Extract short evidence phrases describing drawbacks or failures.
- neutral_points: Extract neutral product facts, conditions, or caveats that are neither clearly positive nor clearly negative.
- features: Extract product features or capabilities mentioned in the review.
- comparisons: Extract mentions of competing brands, products, or versions.
- observations: Write 2 or 3 short observations that connect the review evidence to real-world usage such as commuting, calls, travel, workouts, office use, or long sessions. Avoid repeating the exact same wording from the evidence lists.
- best_for: Write 2 or 3 short use cases or buyer types this product seems best suited for.
- not_ideal_for: Write 1 to 3 short use cases or buyer types this product seems poorly suited for.
- major_issues: Extract the most serious problems that would meaningfully affect buying decisions or daily reliability.
- minor_issues: Extract lower-severity annoyances or secondary drawbacks.
- category: Classify the product type.
- out_of_scope: true only if the input is not a product review.

Strict output requirements:
- Return only valid JSON.
- Do not include markdown.
- Do not include commentary.
- Keep evidence close to the original phrasing.
`;

const analysisCache = new Map<string, AnalysisResult>();

function setCache(key: string, value: AnalysisResult) {
  if (analysisCache.size >= MAX_CACHE_SIZE) {
    const firstKey = analysisCache.keys().next().value;
    if (firstKey !== undefined) {
      analysisCache.delete(firstKey);
    }
  }
  analysisCache.set(key, value);
}

function normalizePoint(value: string): string {
  return value
    .trim()
    .replace(/^[\-\u2022]\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/^["']+|["']+$/g, "")
    .replace(/[;,\s]+$/g, "")
    .trim();
}

function dedupeList(items: string[] = []): string[] {
  const seen = new Set<string>();
  const normalizedItems: string[] = [];

  for (const item of items) {
    const normalized = normalizePoint(item);
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalizedItems.push(normalized);
  }

  return normalizedItems;
}

function compactOverlappingItems(items: string[]): string[] {
  return [...items]
    .sort((a, b) => b.length - a.length)
    .filter(
      (item, index, allItems) =>
        !allItems.some(
          (candidate, candidateIndex) =>
            candidateIndex < index &&
            candidate.toLowerCase().includes(item.toLowerCase())
        )
    )
    .sort((a, b) => items.indexOf(a) - items.indexOf(b));
}

function formatList(items: string[], maxItems = items.length): string {
  const visibleItems = items.slice(0, maxItems);

  if (visibleItems.length === 0) {
    return "";
  }

  if (visibleItems.length === 1) {
    return visibleItems[0];
  }

  if (visibleItems.length === 2) {
    return `${visibleItems[0]} and ${visibleItems[1]}`;
  }

  return `${visibleItems.slice(0, -1).join(", ")}, and ${visibleItems.at(-1)}`;
}

function safeParseJSON(text: string): ExtractionResult {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Invalid JSON response");
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      throw new Error("Malformed JSON from AI");
    }
  }
}

function sanitizeExtraction(data: ExtractionResult): ExtractionResult {
  return {
    ...data,
    positive_points: dedupeList(data.positive_points),
    negative_points: dedupeList(data.negative_points),
    neutral_points: dedupeList(data.neutral_points),
    features: dedupeList(data.features),
    comparisons: dedupeList(data.comparisons),
    observations: dedupeList(data.observations),
    best_for: dedupeList(data.best_for),
    not_ideal_for: dedupeList(data.not_ideal_for),
    major_issues: dedupeList(data.major_issues),
    minor_issues: dedupeList(data.minor_issues),
    category: normalizePoint(data.category) || "Uncategorized",
  };
}

const FEATURE_GROUP_MATCHERS: Array<{ category: string; pattern: RegExp }> = [
  { category: "Audio", pattern: /\baudio|sound|bass|vocal|treble|noise cancellation|noise-cancellation|mic|speaker\b/i },
  { category: "Battery", pattern: /\bbattery|charging|charge|power\b/i },
  { category: "Connectivity", pattern: /\bbluetooth|wireless|wifi|wi-fi|connect|pairing|signal|latency\b/i },
  { category: "Design", pattern: /\bdesign|build|look|style|premium|material|finish\b/i },
  { category: "Comfort", pattern: /\bcomfort|comfortable|fit|cushion|weight|wear\b/i },
  { category: "Performance", pattern: /\bperformance|speed|fast|autofocus|response|smooth\b/i },
  { category: "Display", pattern: /\bdisplay|screen|brightness|color|resolution|refresh\b/i },
  { category: "Camera", pattern: /\bcamera|photo|image|video|lens\b/i },
  { category: "Software", pattern: /\bsoftware|app|ui|firmware|os|update\b/i },
];

const MAJOR_ISSUE_PATTERN =
  /\bdrop|disconnect|unreliable|fail|failing|weak|poor|struggle|drain|crash|overheat|lag|broken|problem|issue|worse|wobbly|unstable|flicker\b/i;

const MINOR_ISSUE_PATTERN =
  /\bwarm|slight|minor|average|okay|moderate|a bit|plasticky|bulky|heavier|small\b/i;

function detectFeatureCategory(feature: string): string {
  const match = FEATURE_GROUP_MATCHERS.find(({ pattern }) => pattern.test(feature));
  return match?.category ?? "General";
}

function buildFeatureGroups(features: string[]): FeatureGroup[] {
  const groups = new Map<string, string[]>();

  for (const feature of features) {
    const category = detectFeatureCategory(feature);
    const existing = groups.get(category) ?? [];

    if (!existing.some((item) => item.toLowerCase() === feature.toLowerCase())) {
      existing.push(feature);
    }

    groups.set(category, existing);
  }

  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    items,
  }));
}

function buildIssueSeverity(data: ExtractionResult) {
  let majorIssues = [...data.major_issues];
  let minorIssues = [...data.minor_issues];

  if (majorIssues.length === 0 && minorIssues.length === 0) {
    for (const issue of data.negative_points) {
      if (MAJOR_ISSUE_PATTERN.test(issue)) {
        majorIssues.push(issue);
      } else if (MINOR_ISSUE_PATTERN.test(issue)) {
        minorIssues.push(issue);
      } else if (majorIssues.length === 0) {
        majorIssues.push(issue);
      } else {
        minorIssues.push(issue);
      }
    }
  }

  const covered = new Set([...majorIssues, ...minorIssues].map((item) => item.toLowerCase()));

  for (const issue of data.negative_points) {
    if (!covered.has(issue.toLowerCase())) {
      minorIssues.push(issue);
      covered.add(issue.toLowerCase());
    }
  }

  return {
    majorIssues: compactOverlappingItems(dedupeList(majorIssues)),
    minorIssues: compactOverlappingItems(dedupeList(minorIssues)),
  };
}

function capitalizeFirst(text: string): string {
  if (!text) {
    return text;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function simplifyStrengthPhrase(phrase: string): string {
  const normalized = normalizePoint(phrase)
    .replace(/^(?:this product|these headphones|the headphones|the earbuds|they|it)\s+/i, "")
    .replace(/^(?:deliver|delivers|offer|offers|provide|provides|has|have|feature|features)\s+/i, "");

  if (/^looks good$/i.test(normalized)) {
    return "good design";
  }

  if (/^feels premium$/i.test(normalized)) {
    return "premium build";
  }

  return normalized;
}

function simplifyIssuePhrase(phrase: string): string {
  const normalized = normalizePoint(phrase).replace(
    /^(?:this product|these headphones|the headphones|the earbuds|they|it)\s+/i,
    ""
  );

  if (/^(.+?) is weak$/i.test(normalized)) {
    return normalized.replace(/^(.+?) is weak$/i, "weak $1");
  }

  if (/^(.+?) is only average$/i.test(normalized)) {
    return normalized.replace(/^(.+?) is only average$/i, "average $1");
  }

  if (/^(.+?) drops during (.+)$/i.test(normalized)) {
    return normalized.replace(/^(.+?) drops during (.+)$/i, "unstable $1 during $2");
  }

  if (/^(.+?) get warm(.*)$/i.test(normalized)) {
    return normalized.replace(/^(.+?) get warm(.*)$/i, "warm $1$2");
  }

  if (/^(.+?) gets warm(.*)$/i.test(normalized)) {
    return normalized.replace(/^(.+?) gets warm(.*)$/i, "warm $1$2");
  }

  return normalized;
}

function inferPositiveUseCase(data: ExtractionResult): string {
  const signal = `${data.features.join(" ")} ${data.positive_points.join(" ")}`.toLowerCase();

  if (/\bsound|bass|vocal|audio|music\b/.test(signal)) {
    return "music and everyday listening";
  }

  if (/\bbattery|charging|power\b/.test(signal) && /\btravel|portable|wireless\b/.test(signal)) {
    return "travel and portable use";
  }

  if (/\bcamera|photo|image|video\b/.test(signal)) {
    return "casual photography and content capture";
  }

  if (/\bperformance|speed|autofocus|smooth\b/.test(signal)) {
    return "fast everyday use";
  }

  return "everyday use";
}

function inferNegativeUseCase(data: ExtractionResult, majorIssues: string[], minorIssues: string[]): string {
  const signal = `${majorIssues.join(" ")} ${minorIssues.join(" ")} ${data.not_ideal_for.join(" ")}`.toLowerCase();

  if (/\bcall|video call|bluetooth|connect|pairing\b/.test(signal)) {
    return "calls and work";
  }

  if (/\bnoise cancellation|noise-cancellation|noisy|travel|commut/i.test(signal)) {
    return "travel and noisy environments";
  }

  if (/\bcomfort|warm|wear|extended|long sessions?\b/.test(signal)) {
    return "extended daily sessions";
  }

  return "demanding daily use";
}

function buildSummary(data: ExtractionResult): string {
  const positives = data.positive_points.slice(0, 2).map(simplifyStrengthPhrase);
  const { majorIssues } = buildIssueSeverity(data);
  const { minorIssues } = buildIssueSeverity(data);
  const majorProblems = majorIssues.slice(0, 2);
  const standoutStrengths = positives.length > 0 ? positives : data.features.slice(0, 2);
  const limitingIssues =
    (majorProblems.length > 0 ? majorProblems : data.negative_points.slice(0, 2)).map(
      simplifyIssuePhrase
    );
  const positiveUseCase = inferPositiveUseCase(data);
  const negativeUseCase = inferNegativeUseCase(data, majorIssues, minorIssues);

  if (standoutStrengths.length > 0 && limitingIssues.length > 0) {
    return `${capitalizeFirst(formatList(standoutStrengths))} ${
      standoutStrengths.length > 1 ? "make" : "makes"
    } this a good choice for ${positiveUseCase}, but ${formatList(limitingIssues)} ${
      limitingIssues.length > 1 ? "limit" : "limits"
    } its reliability for ${negativeUseCase}.`;
  }

  if (standoutStrengths.length > 0) {
    return `${capitalizeFirst(formatList(standoutStrengths))} ${
      standoutStrengths.length > 1 ? "stand out" : "stands out"
    }, making this a strong choice for ${positiveUseCase}.`;
  }

  if (limitingIssues.length > 0) {
    return `${capitalizeFirst(formatList(limitingIssues))} ${
      limitingIssues.length > 1 ? "create" : "creates"
    } the main concern here, especially for ${negativeUseCase}.`;
  }

  return "The review provides a mixed picture, but the evidence is not specific enough to support a sharper summary.";
}

function buildInsight(data: ExtractionResult): string {
  const bestFor = data.best_for.slice(0, 2);
  const notIdealFor = data.not_ideal_for.slice(0, 2);
  const comparisons = data.comparisons.slice(0, 1);

  if (bestFor.length > 0 && notIdealFor.length > 0) {
    return `Recommended for ${formatList(bestFor)}. It is less suitable for ${formatList(notIdealFor)}${comparisons.length > 0 ? `, especially against ${formatList(comparisons)}.` : "."}`;
  }

  if (bestFor.length > 0) {
    return `Recommended for ${formatList(bestFor)}.`;
  }

  if (notIdealFor.length > 0) {
    return `The review suggests caution for ${formatList(notIdealFor)}.`;
  }

  return "The review does not provide enough clear evidence to support a sharper buying recommendation.";
}

function buildObservations(data: ExtractionResult): string[] {
  const curated = dedupeList(data.observations).slice(0, 3);

  if (curated.length >= 2) {
    return curated;
  }

  const fallback: string[] = [];
  const { majorIssues, minorIssues } = buildIssueSeverity(data);

  if (data.best_for.length > 0) {
    fallback.push(`Best experience is likely for ${formatList(data.best_for.slice(0, 2))}.`);
  }

  if (majorIssues.length > 0) {
    fallback.push(`${formatList(majorIssues.slice(0, 2))} ${majorIssues.length > 1 ? "are" : "is"} the main reliability concern.`);
  }

  if (data.comparisons.length > 0) {
    fallback.push(`The review frames expectations against ${formatList(data.comparisons.slice(0, 1))}.`);
  } else if (minorIssues.length > 0) {
    fallback.push(`Secondary tradeoffs include ${formatList(minorIssues.slice(0, 2))}.`);
  }

  return dedupeList([...curated, ...fallback]).slice(0, 3);
}

function computeSentiment(data: ExtractionResult) {
  const positiveCount = data.positive_points.length;
  const negativeCount = data.negative_points.length;
  const neutralCount = data.neutral_points.length;
  const positiveWeight = positiveCount * 1.25;
  const negativeWeight = negativeCount * 0.85;
  const neutralWeight = neutralCount > 0 ? neutralCount : 0.8;
  const totalEvidence = positiveWeight + negativeWeight + neutralWeight;

  if (totalEvidence === 0) {
    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      total: 0,
    };
  }

  const positive = Math.round((positiveWeight / totalEvidence) * 100);
  const negative = Math.round((negativeWeight / totalEvidence) * 100);
  const neutral = Math.max(0, 100 - positive - negative);

  return {
    positive,
    neutral,
    negative,
    total: 100,
  };
}

function computeScore(data: ExtractionResult): number {
  const positiveCount = data.positive_points.length;
  const negativeCount = data.negative_points.length;
  const neutralCount = Math.max(data.neutral_points.length, 1);
  const positiveWeight = positiveCount * 1.35;
  const negativeWeight = negativeCount * 0.75;
  const totalSignals = positiveWeight + negativeWeight + neutralCount;

  if (totalSignals === 0) {
    return 0;
  }

  const positive = Math.round((positiveWeight / totalSignals) * 100);
  const negative = Math.round((negativeWeight / totalSignals) * 100);
  const neutral = Math.max(0, 100 - positive - negative);

  let score = (positive * 5 + neutral * 3 + negative * 1) / 100;

  if (negativeCount >= 2) {
    score -= 0.5;
  }

  score += Math.min(data.positive_points.length, 3) * 0.08;
  score += Math.min(data.features.length, 3) * 0.04;

  if (data.sentiment_label === "positive") {
    score += 0.05;
  }

  return Math.max(1, Math.min(5, Math.round(score * 10) / 10));
}

function computeConfidence(text: string, data: ExtractionResult): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const extractionDepth =
    data.positive_points.length +
    data.negative_points.length +
    data.neutral_points.length +
    data.features.length +
    data.comparisons.length +
    data.observations.length +
    data.best_for.length +
    data.not_ideal_for.length;

  const textLengthFactor = Math.min(14, Math.round(wordCount / 6));
  const extractionDepthFactor = Math.min(15, Math.round(extractionDepth * 1.35));
  const balanceBonus =
    data.positive_points.length > 0 && data.negative_points.length > 0 ? 4 : 0;
  const detailBonus =
    (data.comparisons.length > 0 ? 2 : 0) +
    (data.neutral_points.length > 0 ? 2 : 0) +
    (data.observations.length > 0 ? 2 : 0);
  const penalty =
    (data.features.length === 0 ? 4 : 0) +
    (wordCount < 12 ? 3 : 0) +
    (extractionDepth < 6 ? 2 : 0);

  const score =
    60 + textLengthFactor + extractionDepthFactor + balanceBonus + detailBonus - penalty;

  return Math.max(65, Math.min(90, Math.round(score)));
}

function detectQuality(text: string): ReviewQuality {
  const words = text.split(/\s+/).filter(Boolean).length;

  if (words < 8) return "low";
  if (words < 20) return "medium";
  return "high";
}

function getKeyRotationOrder(): number[] {
  return aiClients.map((_, offset) => (preferredApiKeyIndex + offset) % aiClients.length);
}

function getErrorMessage(error: any): string {
  return String(error?.message ?? "").toLowerCase();
}

function isMissingModelError(error: any): boolean {
  const message = getErrorMessage(error);

  return (
    error?.status === 404 ||
    (message.includes("not found") && message.includes("model"))
  );
}

function isQuotaError(error: any): boolean {
  const message = getErrorMessage(error);

  return (
    error?.status === 429 ||
    message.includes("resource_exhausted") ||
    message.includes("quota exceeded") ||
    message.includes("rate limit")
  );
}

function isApiKeyError(error: any): boolean {
  const message = getErrorMessage(error);

  return (
    error?.status === 401 ||
    error?.status === 403 ||
    message.includes("api key not valid") ||
    message.includes("invalid api key") ||
    message.includes("permission denied")
  );
}

async function generateWithRetry(
  request: Record<string, unknown>,
  retries = 3,
  delay = 500
): Promise<any> {
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: unknown;

  modelLoop: for (const model of modelsToTry) {
    keyLoop: for (const keyIndex of getKeyRotationOrder()) {
      const ai = aiClients[keyIndex];

      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          const response = await ai.models.generateContent({
            ...request,
            model,
          });

          preferredApiKeyIndex = keyIndex;
          return response;
        } catch (error: any) {
          lastError = error;

          if (isMissingModelError(error)) {
            continue modelLoop;
          }

          if (isQuotaError(error) || isApiKeyError(error)) {
            preferredApiKeyIndex = (keyIndex + 1) % aiClients.length;
            continue keyLoop;
          }

          if (attempt === retries) {
            throw error;
          }

          await new Promise((resolve) => setTimeout(resolve, delay * 2 ** attempt));
        }
      }
    }
  }

  if (lastError && (isQuotaError(lastError) || isApiKeyError(lastError))) {
    throw new Error(
      `All configured Gemini API keys failed or ran out of quota. ${String((lastError as any)?.message ?? "")}`
    );
  }

  throw lastError;
}

export async function analyzeReview(text: string): Promise<AnalysisResult> {
  if (!text || !text.trim()) {
    throw new Error("Input text cannot be empty.");
  }

  const normalizedText = text.trim().replace(/\s+/g, " ");
  const cacheKey = normalizedText.toLowerCase();

  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey)!;
  }

  try {
    const response = await generateWithRetry({
      contents: normalizedText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0,
        topP: 0.1,
        responseSchema: {
          type: Type.OBJECT,
          required: [
            "sentiment_label",
            "positive_points",
            "negative_points",
            "neutral_points",
            "features",
            "comparisons",
            "observations",
            "best_for",
            "not_ideal_for",
            "major_issues",
            "minor_issues",
            "category",
            "out_of_scope",
          ],
          properties: {
            sentiment_label: {
              type: Type.STRING,
              enum: ["positive", "neutral", "negative"],
            },
            positive_points: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            negative_points: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            neutral_points: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            features: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            comparisons: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            observations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            best_for: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            not_ideal_for: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            major_issues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            minor_issues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            category: {
              type: Type.STRING,
            },
            out_of_scope: {
              type: Type.BOOLEAN,
            },
          },
        },
      },
    });

    const rawText = response?.text;

    if (!rawText) {
      throw new Error("Empty response from AI.");
    }

    const extraction = sanitizeExtraction(safeParseJSON(rawText));

    if (extraction.out_of_scope) {
      return {
        summary: "Input is not a product review.",
        aiInsight:
          "Try pasting a real customer opinion about a product so the analyzer can identify strengths, issues, and feature mentions.",
        pros: [],
        cons: [],
        features: [],
        featureGroups: [],
        neutralPoints: [],
        comparisons: [],
        observations: [],
        bestFor: [],
        notIdealFor: [],
        majorIssues: [],
        minorIssues: [],
        sentiment: {
          positive: 0,
          neutral: 0,
          negative: 0,
          total: 0,
        },
        score: 0,
        confidence: 80,
        out_of_scope: true,
        detected_category: extraction.category,
        review_quality: detectQuality(normalizedText),
      };
    }

    const featureGroups = buildFeatureGroups(extraction.features);
    const { majorIssues, minorIssues } = buildIssueSeverity(extraction);

    const result: AnalysisResult = {
      summary: buildSummary(extraction),
      aiInsight: buildInsight(extraction),
      pros: extraction.positive_points,
      cons: extraction.negative_points,
      features: extraction.features,
      featureGroups,
      neutralPoints: extraction.neutral_points,
      comparisons: extraction.comparisons,
      observations: buildObservations(extraction),
      bestFor: extraction.best_for,
      notIdealFor: extraction.not_ideal_for,
      majorIssues,
      minorIssues,
      sentiment: computeSentiment(extraction),
      score: computeScore(extraction),
      confidence: computeConfidence(normalizedText, extraction),
      out_of_scope: false,
      detected_category: extraction.category,
      review_quality: detectQuality(normalizedText),
    };

    setCache(cacheKey, result);

    return result;
  } catch (error: any) {
    const message = error?.message || "Failed to analyze review.";
    console.error("Analysis Error:", message);
    throw new Error(message);
  }
}
