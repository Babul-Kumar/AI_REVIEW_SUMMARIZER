import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  summary: string;
  pros: string[];
  cons: string[];
  neutralPoints: string[];
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
  review_quality?: "high" | "medium" | "low";
}

interface ExtractionResult {
  sentiment_label: "positive" | "neutral" | "negative";
  positive_points: string[];
  negative_points: string[];
  features: string[];
  comparisons: string[];
  category: string;
  out_of_scope: boolean;
}

const SYSTEM_INSTRUCTION = `
You are a Product Review Extractor.
Task: Extract structured facts from the review. Do NOT summarize or rephrase.

Rules:
- sentiment_label: Choose one from "positive", "neutral", "negative".
- positive_points: Extract exact descriptive phrases from text indicating benefits.
- negative_points: Extract exact descriptive phrases from text indicating drawbacks or issues.
- features: Extract specific product features or functions mentioned verbatim.
- comparisons: Extract any mentions of competing brands, models, or versions.
- category: Classify the product type (e.g., Electronics, Kitchenware).
- out_of_scope: Return true ONLY if input is not a product review.

Strict Logic:
- Extraction MUST be verbatim from the input text.
- Return ONLY valid JSON.
- Be consistent across runs.
`;

// Simple in-memory cache for deterministic results
const analysisCache = new Map<string, AnalysisResult>();

function safeParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        throw new Error("Invalid JSON response block");
      }
    }
    throw new Error("Invalid JSON response");
  }
}

function buildSummary(data: ExtractionResult): string {
  const qualityMap = {
    positive: "good quality",
    neutral: "average quality",
    negative: "below average quality"
  };

  const quality = qualityMap[data.sentiment_label] || "average quality";
  const featureList = data.features.length > 0 
    ? data.features.slice(0, 2).join(", ") 
    : "standard features";

  return `The product is ${quality} and includes features like ${featureList}.`;
}

function computeSentiment(label: string) {
  switch (label) {
    case "positive":
      return { positive: 85, neutral: 10, negative: 5, total: 100 };
    case "neutral":
      return { positive: 50, neutral: 40, negative: 10, total: 100 };
    default:
      return { positive: 20, neutral: 30, negative: 50, total: 100 };
  }
}

function computeScore(label: string): number {
  switch (label) {
    case "positive": return 4.5;
    case "neutral": return 3.0;
    default: return 2.0;
  }
}

function computeConfidence(text: string, data: ExtractionResult): number {
  let score = 0;
  if (text.length > 50) score += 30;
  if (data.positive_points.length > 0) score += 20;
  if (data.features.length > 0) score += 20;
  if (data.negative_points.length > 0) score += 20;
  if (data.sentiment_label) score += 10;
  return Math.min(score, 100);
}

function detectQuality(text: string): "high" | "medium" | "low" {
  if (text.length < 30) return "low";
  if (text.includes("very very") || text.split(" ").length < 10) return "low";
  if (text.length < 80) return "medium";
  return "high";
}

async function generateWithRetry(config: any, retries = 2): Promise<any> {
  try {
    return await ai.models.generateContent(config);
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise(res => setTimeout(res, 500));
    return generateWithRetry(config, retries - 1);
  }
}

export async function analyzeReview(text: string): Promise<AnalysisResult> {
  if (!text.trim()) {
    throw new Error("Input text cannot be empty.");
  }

  const cleanText = text.trim().replace(/\s+/g, " ").toLowerCase();
  
  if (analysisCache.has(cleanText)) {
    return analysisCache.get(cleanText)!;
  }

  try {
    const response = await generateWithRetry({
      model: "gemini-3.1-flash-lite-preview",
      contents: cleanText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
        generationConfig: {
          temperature: 0,
          topP: 0.1,
        },
        responseSchema: {
          type: Type.OBJECT,
          required: ["sentiment_label", "positive_points", "negative_points", "features", "comparisons", "category", "out_of_scope"],
          properties: {
            sentiment_label: { type: Type.STRING, enum: ["positive", "neutral", "negative"] },
            positive_points: { type: Type.ARRAY, items: { type: Type.STRING } },
            negative_points: { type: Type.ARRAY, items: { type: Type.STRING } },
            features: { type: Type.ARRAY, items: { type: Type.STRING } },
            comparisons: { type: Type.ARRAY, items: { type: Type.STRING } },
            category: { type: Type.STRING },
            out_of_scope: { type: Type.BOOLEAN },
          },
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("AI returned an empty response.");
    }

    const extraction = safeParseJSON(rawText) as ExtractionResult;

    let result: AnalysisResult;

    if (extraction.out_of_scope) {
      result = {
        summary: "Input is not a product review.",
        pros: [],
        cons: [],
        neutralPoints: [],
        sentiment: { positive: 0, neutral: 0, negative: 0, total: 0 },
        score: 0,
        confidence: 100,
        out_of_scope: true,
        detected_category: extraction.category
      };
    } else {
      result = {
        summary: buildSummary(extraction),
        pros: extraction.positive_points,
        cons: extraction.negative_points,
        neutralPoints: extraction.comparisons,
        sentiment: computeSentiment(extraction.sentiment_label),
        score: computeScore(extraction.sentiment_label),
        confidence: computeConfidence(text, extraction),
        out_of_scope: false,
        detected_category: extraction.category,
        review_quality: detectQuality(text)
      };
    }

    analysisCache.set(cleanText, result);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Analysis Error:", error.message);
      throw error;
    }
    console.error("Analysis Error:", error);
    throw new Error("An unknown error occurred during analysis.");
  }
}

