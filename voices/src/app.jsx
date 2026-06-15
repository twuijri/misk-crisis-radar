import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, Quote, Tags, Lightbulb, Compass, FileText, Archive,
  Plus, Search, Download, Upload, Settings, X, Check, CheckCheck, Sparkles,
  Star, TrendingUp, TrendingDown, Minus, Globe, Trash2, Pencil, Filter,
  ShieldCheck, AlertCircle, Loader2, Users, Layers, Building2, Link2, Printer,
  LogOut, KeyRound, Server, ArrowLeft, ChevronDown, FileDown, SlidersHorizontal
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { kvGet, kvPut, aiComplete, aiGetConfig, aiPutConfig, brandGet, brandPut, clearCode } from "./api.js";

/* ============================================================
   Voice of Beneficiaries Library  ·  مكتبة أصوات المستفيدين
   Misk Foundation — Strategic Communications
   Version 1.0  ·  Arabic-first bilingual evidence repository
   ============================================================ */

const KEY = "vobl:data:v1";

/* Build stamp injected at Docker build time (esbuild `define`).
   Shared with the radar so both systems show the same version. */
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

/* Palette aligned with the Crisis Radar identity (radar primary #1B7D5C,
   teal #2DB89F, light #F5F9F8, border #E8EDEB) so the two systems read as
   one product. The dark forest-green of the "Quote of the Week" panel and
   the report/modal headers is preserved via the dedicated `quote` tokens. */
const C = {
  green: "#1B7D5C",      // radar primary — headings, buttons, sidebar
  greenDeep: "#146145",  // deeper primary for active/hover
  greenLine: "#2E9476",  // hairline on the green sidebar
  quote: "#0F3D30",      // dark forest-green panels (kept as-is)
  quoteLine: "#0A2C22",  // chips inside the dark panels
  lime: "#C4D600",
  limeSoft: "#E4EE9A",
  teal: "#2DB89F",       // radar teal
  tealSoft: "#9FD9CB",
  ink: "#1B1B1B",
  paper: "#FFFFFF",
  mist: "#F5F9F8",       // radar light background
  card: "#FFFFFF",
  line: "#E8EDEB",       // radar border
  muted: "#5A5A5A",
  amber: "#B5852A",
  amberSoft: "#F6ECCF",
};

/* ---------------------- bilingual UI strings ---------------------- */
const UI = {
  appName: { ar: "مكتبة أصوات المستفيدين", en: "Voice of Beneficiaries Library" },
  appSub: { ar: "الاتصال المؤسسي · مؤسسة مسك", en: "Corporate Communications · Misk Foundation" },
  dashboard: { ar: "لوحة المعلومات", en: "Dashboard" },
  library: { ar: "مكتبة الاقتباسات", en: "Quote Library" },
  themes: { ar: "الموضوعات والرؤى", en: "Themes & Insights" },
  insights: { ar: "الرؤى الاستراتيجية", en: "Strategic Insights" },
  considerations: { ar: "الاعتبارات الاستراتيجية", en: "Strategic Considerations" },
  reports: { ar: "مولّد التقارير", en: "Report Generator" },
  archive: { ar: "الأرشيف", en: "Archive" },
  settings: { ar: "الإعدادات", en: "Settings" },
  totalQuotes: { ar: "إجمالي الاقتباسات", en: "Total Quotes" },
  totalSources: { ar: "إجمالي المصادر", en: "Total Sources" },
  highImpact: { ar: "اقتباسات عالية الأثر", en: "High-Impact Quotes" },
  verified: { ar: "اقتباسات موثّقة", en: "Verified Quotes" },
  topPrograms: { ar: "أكثر البرامج ذكراً", en: "Most Mentioned Programs" },
  topThemes: { ar: "أكثر الموضوعات ذكراً", en: "Most Mentioned Themes" },
  topEntities: { ar: "أكثر الجهات ذكراً", en: "Most Mentioned Entities" },
  qotw: { ar: "اقتباس الأسبوع", en: "Quote of the Week" },
  sortBy: { ar: "الترتيب", en: "Sort" },
  sortScore: { ar: "الأعلى نتيجة", en: "Highest score" },
  sortNewest: { ar: "الأحدث", en: "Newest" },
  sortOldest: { ar: "الأقدم", en: "Oldest" },
  recent: { ar: "أحدث الإضافات", en: "Recent Additions" },
  addQuote: { ar: "إضافة اقتباس", en: "Add Quote" },
  search: { ar: "بحث في الاقتباسات…", en: "Search quotes…" },
  source: { ar: "المصدر", en: "Source" },
  sourceType: { ar: "نوع المصدر", en: "Source Type" },
  sourceSubtype: { ar: "تصنيف الدليل الداخلي", en: "Internal Evidence Kind" },
  entity: { ar: "الجهة", en: "Entity" },
  program: { ar: "البرنامج", en: "Program" },
  track: { ar: "المسار", en: "Track" },
  themeF: { ar: "الموضوعات", en: "Themes" },
  priority: { ar: "الأولوية المؤسسية", en: "Organizational Priority" },
  strategicValue: { ar: "القيمة الاستراتيجية", en: "Strategic Value" },
  date: { ar: "التاريخ", en: "Date" },
  link: { ar: "الرابط", en: "Link" },
  impact: { ar: "مستوى الأثر", en: "Impact Level" },
  engagement: { ar: "مستوى التفاعل", en: "Engagement Level" },
  classification: { ar: "التصنيف", en: "Classification" },
  notes: { ar: "ملاحظات داخلية", en: "Internal Notes" },
  status: { ar: "الحالة", en: "Status" },
  score: { ar: "النتيجة", en: "Score" },
  quoteAr: { ar: "نص الاقتباس (عربي)", en: "Quote (Arabic)" },
  quoteEn: { ar: "نص الاقتباس (إنجليزي)", en: "Quote (English)" },
  originalLang: { ar: "لغة النص الأصلي", en: "Original Language" },
  High: { ar: "عالٍ", en: "High" },
  Medium: { ar: "متوسط", en: "Medium" },
  Low: { ar: "منخفض", en: "Low" },
  NA: { ar: "لا ينطبق", en: "N/A" },
  Draft: { ar: "مسودة", en: "Draft" },
  Verified: { ar: "موثّق", en: "Verified" },
  Featured: { ar: "مميّز", en: "Featured" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  delete: { ar: "حذف", en: "Delete" },
  edit: { ar: "تعديل", en: "Edit" },
  all: { ar: "الكل", en: "All" },
  frequency: { ar: "التكرار", en: "Frequency" },
  trend: { ar: "الاتجاه", en: "Trend" },
  relatedQuotes: { ar: "اقتباسات مرتبطة", en: "Related Quotes" },
  generate: { ar: "توليد بمساعدة الذكاء", en: "Generate with AI" },
  approve: { ar: "اعتماد", en: "Approve" },
  original: { ar: "نص أصلي", en: "Original" },
  humanVerified: { ar: "موثّق بشرياً", en: "Human Verified" },
  aiDraft: { ar: "مسودة ذكاء اصطناعي", en: "AI Draft" },
  suggestThemes: { ar: "اقتراح موضوعات", en: "Suggest Themes" },
  translate: { ar: "ترجمة مسودة", en: "Draft Translation" },
  reportType: { ar: "دورية التقرير", en: "Report Cadence" },
  reportFormat: { ar: "صيغة التقرير", en: "Report Format" },
  reportLang: { ar: "لغة التقرير", en: "Report Language" },
  Weekly: { ar: "أسبوعي", en: "Weekly" },
  Monthly: { ar: "شهري", en: "Monthly" },
  Quarterly: { ar: "ربع سنوي", en: "Quarterly" },
  Annual: { ar: "سنوي", en: "Annual" },
  ExecSummary: { ar: "ملخص تنفيذي", en: "Executive Summary" },
  LeadershipBrief: { ar: "موجز قيادي", en: "Leadership Brief" },
  FullReport: { ar: "تقرير كامل", en: "Full Report" },
  buildReport: { ar: "إنشاء التقرير", en: "Build Report" },
  exportPdf: { ar: "تصدير PDF", en: "Export PDF" },
  exportJson: { ar: "تصدير البيانات (JSON)", en: "Export Data (JSON)" },
  exportCsv: { ar: "تصدير الاقتباسات (CSV)", en: "Export Quotes (CSV)" },
  importJson: { ar: "استيراد بيانات", en: "Import Data" },
  assetType: { ar: "نوع الأصل", en: "Asset Type" },
  title: { ar: "العنوان", en: "Title" },
  linkedQuotes: { ar: "الاقتباسات المرتبطة", en: "Linked Quotes" },
  addAsset: { ar: "إضافة أصل", en: "Add Asset" },
  scoringMethod: { ar: "منهجية احتساب النتيجة", en: "Scoring Methodology" },
  weights: { ar: "الأوزان", en: "Weights" },
  internalNoPenalty: { ar: "عدم خصم نتيجة الأدلة الداخلية بسبب غياب التفاعل العام", en: "Don't penalize Internal Evidence for missing public engagement" },
  considerationsTitle: { ar: "اعتبارات استراتيجية", en: "Strategic Considerations" },
  insightsTitle: { ar: "رؤى استراتيجية", en: "Strategic Insights" },
  noData: { ar: "لا توجد بيانات بعد", en: "No data yet" },
  metricsSnapshot: { ar: "لمحة عن المؤشرات", en: "Metrics Snapshot" },
  curatedQuotes: { ar: "اقتباسات مختارة", en: "Curated Quotes" },
  period: { ar: "الفترة", en: "Period" },
  scope: { ar: "النطاق", en: "Scope" },
  aiUnavailable: { ar: "المساعدة الذكية غير متاحة حالياً — يمكنك الكتابة يدوياً.", en: "AI assist is unavailable right now — you can write manually." },
  reset: { ar: "إعادة تعيين البيانات", en: "Reset all data" },
  commImplications: { ar: "تداعيات اتصالية", en: "Communication implications" },
  repImplications: { ar: "تداعيات على السمعة", en: "Reputation implications" },
  opportunities: { ar: "فرص ناشئة", en: "Emerging opportunities" },
  signals: { ar: "إشارات متكررة من المستفيدين", en: "Recurring beneficiary signals" },
  aiConfig: { ar: "إعدادات الذكاء الاصطناعي", en: "AI Configuration" },
  aiConfigSub: { ar: "اربط خادماً متوافقاً مع OpenAI (مثل LiteLLM). تُحفظ جميع البيانات داخل الخادم بأمان — لا في المتصفح.", en: "Connect an OpenAI-compatible server (e.g. LiteLLM). All data is stored securely on the server — never in the browser." },
  aiBaseUrl: { ar: "عنوان الخادم (Base URL)", en: "Server Base URL" },
  aiModel: { ar: "اسم الموديل", en: "Model name" },
  aiKey: { ar: "مفتاح الـ API", en: "API Key" },
  aiKeySet: { ar: "مفتاح محفوظ — اتركه فارغاً للإبقاء عليه", en: "Key saved — leave blank to keep it" },
  aiKeyNone: { ar: "لا يوجد مفتاح محفوظ", en: "No key saved" },
  aiClearKey: { ar: "مسح المفتاح", en: "Clear key" },
  aiSaved: { ar: "تم الحفظ", en: "Saved" },
  aiTest: { ar: "اختبار الاتصال", en: "Test connection" },
  aiTestOk: { ar: "نجح الاتصال", en: "Connection OK" },
  aiTestFail: { ar: "فشل الاتصال", en: "Connection failed" },
  brand: { ar: "الشعار", en: "Logo" },
  brandSub: { ar: "يُطبَّق الشعار على النظامين (المكتبة ورادار الأزمات). يُفضَّل صورة مربعة بخلفية شفافة.", en: "Applies to both systems (Library & Crisis Radar). A square image with a transparent background works best." },
  brandUpload: { ar: "رفع شعار", en: "Upload logo" },
  brandRemove: { ar: "إزالة الشعار", en: "Remove logo" },
  brandSaved: { ar: "تم تحديث الشعار", en: "Logo updated" },
  brandNone: { ar: "لا يوجد شعار مخصص — يظهر الشعار الافتراضي", en: "No custom logo — the default mark is shown" },
  addOption: { ar: "إضافة خيار جديد", en: "Add new option" },
  optionAr: { ar: "الاسم بالعربية", en: "Name (Arabic)" },
  optionEn: { ar: "الاسم بالإنجليزية", en: "Name (English)" },
  add: { ar: "إضافة", en: "Add" },
  manageList: { ar: "تعديل القائمة", en: "Edit list" },
  addSource: { ar: "إضافة مصدر جديد", en: "Add new source" },
  sourcePick: { ar: "اختر المصدر", en: "Select source" },
  sourceEmpty: { ar: "لا توجد مصادر بعد — أضف واحداً", en: "No sources yet — add one" },
  reportSections: { ar: "أقسام التقرير", en: "Report sections" },
  editContent: { ar: "تحرير النص", en: "Edit text" },
  doneEditing: { ar: "إنهاء التحرير", en: "Done editing" },
  secMetrics: { ar: "لمحة المؤشرات", en: "Metrics snapshot" },
  secQuotes: { ar: "الاقتباسات المختارة", en: "Curated quotes" },
  secThemes: { ar: "أكثر الموضوعات", en: "Top themes" },
  secInsights: { ar: "الرؤى الاستراتيجية", en: "Strategic insights" },
  secConsiderations: { ar: "الاعتبارات الاستراتيجية", en: "Strategic considerations" },
  secAppendix: { ar: "ملحق المصادر", en: "Source appendix" },
  secIntro: { ar: "تمهيد تنفيذي", en: "Executive intro" },
  introPlaceholder: { ar: "اكتب تمهيداً اختيارياً يظهر أعلى التقرير…", en: "Optional intro paragraph shown at the top of the report…" },
  preparingPdf: { ar: "جاري تجهيز ملف PDF…", en: "Preparing PDF…" },
  editHint: { ar: "يمكنك تعديل أي نص في التقرير مباشرة قبل التصدير.", en: "You can edit any text in the report directly before exporting." },
  copyHtml: { ar: "نسخ كبريد منسّق", en: "Copy as formatted email" },
  copied: { ar: "تم النسخ", en: "Copied" },
};

/* ---------------------- controlled vocabularies ---------------------- */
const seedVocab = () => ({
  entities: [
    { k: "misk_foundation", ar: "مؤسسة مسك", en: "Misk Foundation" },
    { k: "misk_academy", ar: "أكاديمية مسك", en: "Misk Academy" },
    { k: "misk_art", ar: "معهد مسك للفنون", en: "Misk Art Institute" },
    { k: "misk_forum", ar: "منتدى مسك العالمي", en: "Misk Global Forum" },
    { k: "misk_schools", ar: "مدارس مسك", en: "Misk Schools" },
  ],
  programs: [
    { k: "leadership_accel", ar: "برنامج تسريع القيادات", en: "Leadership Accelerator" },
    { k: "fellowship", ar: "زمالة مسك", en: "Misk Fellowship" },
    { k: "ent_lab", ar: "مختبر ريادة الأعمال", en: "Entrepreneurship Lab" },
    { k: "bootcamp", ar: "معسكرات المهارات", en: "Skills Bootcamp" },
    { k: "future_skills", ar: "مهارات المستقبل", en: "Future Skills" },
  ],
  tracks: [
    { k: "capacity", ar: "بناء القدرات", en: "Capacity Building" },
    { k: "talent", ar: "تنمية المواهب", en: "Talent Development" },
    { k: "community", ar: "المشاركة المجتمعية", en: "Community Engagement" },
    { k: "innovation", ar: "الابتكار", en: "Innovation" },
  ],
  impactLevels: [
    { k: "High", ar: "عالٍ", en: "High", value: 100 },
    { k: "Medium", ar: "متوسط", en: "Medium", value: 60 },
    { k: "Low", ar: "منخفض", en: "Low", value: 30 },
  ],
  engagementLevels: [
    { k: "High", ar: "عالٍ", en: "High", value: 100 },
    { k: "Medium", ar: "متوسط", en: "Medium", value: 60 },
    { k: "Low", ar: "منخفض", en: "Low", value: 30 },
    { k: "NA", ar: "لا ينطبق", en: "N/A", value: null },
  ],
  themes: [
    { k: "youth", ar: "تمكين الشباب", en: "Youth Empowerment" },
    { k: "skills", ar: "تنمية المهارات", en: "Skills Development" },
    { k: "leadership", ar: "القيادة", en: "Leadership" },
    { k: "entrepreneurship", ar: "ريادة الأعمال", en: "Entrepreneurship" },
    { k: "community", ar: "الأثر المجتمعي", en: "Community Impact" },
    { k: "culture", ar: "الأثر الثقافي", en: "Cultural Impact" },
    { k: "inspiration", ar: "الإلهام", en: "Inspiration" },
    { k: "opportunity", ar: "صناعة الفرص", en: "Opportunity Creation" },
  ],
  sourceTypes: [
    { k: "beneficiary", ar: "مستفيد", en: "Beneficiary" },
    { k: "alumnus", ar: "خريج", en: "Alumnus" },
    { k: "trainee", ar: "متدرّب", en: "Trainee" },
    { k: "mentor", ar: "موجّه", en: "Mentor" },
    { k: "partner", ar: "شريك", en: "Partner" },
    { k: "media", ar: "إعلام", en: "Media" },
    { k: "internal_evidence", ar: "دليل داخلي", en: "Internal Evidence" },
  ],
  internalKinds: [
    { k: "focus_group", ar: "مجموعات تركيز", en: "Focus Groups" },
    { k: "interview", ar: "مقابلات", en: "Interviews" },
    { k: "research", ar: "بحوث داخلية", en: "Internal Research" },
    { k: "survey", ar: "استطلاعات", en: "Surveys" },
    { k: "workshop", ar: "ورش عمل", en: "Workshops" },
    { k: "archived", ar: "محتوى مؤسسي مؤرشف", en: "Archived Institutional Content" },
  ],
  priorities: [
    { k: "leadership", ar: "القيادة", en: "Leadership" },
    { k: "entrepreneurship", ar: "ريادة الأعمال", en: "Entrepreneurship" },
    { k: "skills", ar: "المهارات", en: "Skills" },
    { k: "community", ar: "المجتمع", en: "Community" },
    { k: "culture", ar: "الثقافة", en: "Culture" },
    { k: "innovation", ar: "الابتكار", en: "Innovation" },
    { k: "future_work", ar: "مستقبل العمل", en: "Future of Work" },
  ],
  assetTypes: [
    { k: "interview", ar: "مقابلة", en: "Interview" },
    { k: "video", ar: "فيديو", en: "Video" },
    { k: "screenshot", ar: "لقطة شاشة", en: "Screenshot" },
    { k: "report", ar: "تقرير", en: "Report" },
    { k: "article", ar: "مقال", en: "Article" },
    { k: "internal", ar: "دليل داخلي", en: "Internal Evidence" },
  ],
});

const seedConfig = () => ({
  scoring: {
    weights: { impact: 0.4, engagement: 0.25, classification: 0.25, verification: 0.1 },
    levelValues: { High: 100, Medium: 60, Low: 30 },
    verificationValues: { Draft: 30, Verified: 80, Featured: 100 },
    internalEvidenceNeutralizesEngagement: true,
  },
});

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

/* ---------------------- seed quotes ---------------------- */
const seedQuotes = () => ([
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "قبل التحاقي ببرنامج تسريع القيادات لم أكن أملك الثقة لقيادة فريق. اليوم أدير مبادرة تطوعية تخدم أكثر من ٣٠٠ شاب في منطقتي.",
    quote_en: "Before joining the Leadership Accelerator, I lacked the confidence to lead a team. Today I run a volunteer initiative serving more than 300 young people in my region.",
    translationSource: "human",
    sourceName_ar: "فيصل المطيري", sourceName_en: "Faisal Al-Mutairi",
    sourceType: "beneficiary", sourceSubtype: "",
    entity: "misk_academy", program: "leadership_accel", track: "capacity",
    themes: ["leadership", "youth"], priority: "leadership",
    strategicValue_ar: "دليل مباشر على تحويل الثقة الفردية إلى أثر مجتمعي قابل للقياس.",
    strategicValue_en: "Direct evidence of individual confidence translating into measurable community impact.",
    date: daysAgo(3), link: "",
    impactLevel: "High", engagementLevel: "High", classification: "High",
    notes: "مرشّح قوي لاقتباس الأسبوع.", status: "Featured",
  },
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "تعلّمت في زمالة مسك كيف أحوّل فكرتي إلى مشروع حقيقي، والآن لديّ شركة ناشئة توظّف خمسة أشخاص.",
    quote_en: "At the Misk Fellowship I learned how to turn my idea into a real venture, and I now run a startup employing five people.",
    translationSource: "human",
    sourceName_ar: "ندى العتيبي", sourceName_en: "Nada Al-Otaibi",
    sourceType: "alumnus", sourceSubtype: "",
    entity: "misk_foundation", program: "fellowship", track: "talent",
    themes: ["entrepreneurship", "opportunity"], priority: "entrepreneurship",
    strategicValue_ar: "يربط البرنامج بخلق الوظائف، وهي رسالة قوية للقيادة وصنّاع السياسات.",
    strategicValue_en: "Links the program to job creation — a strong message for leadership and policymakers.",
    date: daysAgo(6), link: "",
    impactLevel: "High", engagementLevel: "High", classification: "High",
    notes: "", status: "Verified",
  },
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "المهارات الرقمية التي اكتسبتها في المعسكر غيّرت مساري المهني بالكامل خلال أشهر.",
    quote_en: "The digital skills I gained at the bootcamp completely changed my career path within months.",
    translationSource: "human",
    sourceName_ar: "ريان الزهراني", sourceName_en: "Rayan Al-Zahrani",
    sourceType: "trainee", sourceSubtype: "",
    entity: "misk_academy", program: "bootcamp", track: "talent",
    themes: ["skills", "opportunity"], priority: "skills",
    strategicValue_ar: "يدعم سردية الجاهزية المهنية والتحول السريع.",
    strategicValue_en: "Supports the narrative of employability and fast transformation.",
    date: daysAgo(9), link: "",
    impactLevel: "Medium", engagementLevel: "Medium", classification: "Medium",
    notes: "", status: "Verified",
  },
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "أجمع المشاركون في مجموعة التركيز على أن البرامج منحتهم إحساساً بالانتماء وفرصاً لم تكن متاحة لهم من قبل.",
    quote_en: "Focus group participants agreed that the programs gave them a sense of belonging and opportunities previously out of reach.",
    translationSource: "human",
    sourceName_ar: "مجموعة تركيز الخريجين ٢٠٢٥", sourceName_en: "Alumni Focus Group 2025",
    sourceType: "internal_evidence", sourceSubtype: "focus_group",
    entity: "misk_foundation", program: "fellowship", track: "community",
    themes: ["community", "opportunity"], priority: "community",
    strategicValue_ar: "دليل داخلي مجمّع يعزّز رسائل الانتماء والفرص دون الاعتماد على التفاعل العام.",
    strategicValue_en: "Aggregated internal evidence reinforcing belonging and opportunity, independent of public engagement.",
    date: daysAgo(12), link: "",
    impactLevel: "High", engagementLevel: "Low", classification: "High",
    notes: "مثال على عدم خصم نتيجة الأدلة الداخلية.", status: "Verified",
  },
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "ما يميّز مستفيدي مسك هو شغفهم بالأثر المجتمعي وليس فقط الإنجاز الفردي.",
    quote_en: "What sets Misk beneficiaries apart is their passion for community impact, not just individual achievement.",
    translationSource: "human",
    sourceName_ar: "د. سارة القحطاني", sourceName_en: "Dr. Sarah Al-Qahtani",
    sourceType: "mentor", sourceSubtype: "",
    entity: "misk_academy", program: "leadership_accel", track: "community",
    themes: ["community", "inspiration"], priority: "community",
    strategicValue_ar: "صوت طرف ثالث موثوق يدعم سمعة البرامج.",
    strategicValue_en: "Credible third-party voice that strengthens program reputation.",
    date: daysAgo(15), link: "",
    impactLevel: "Medium", engagementLevel: "Medium", classification: "Medium",
    notes: "", status: "Verified",
  },
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "منحني معهد مسك للفنون مساحة لأعبّر عن هويتي الثقافية بثقة وأقدّمها للعالم.",
    quote_en: "The Misk Art Institute gave me a space to express my cultural identity with confidence and share it with the world.",
    translationSource: "human",
    sourceName_ar: "لمياء الدوسري", sourceName_en: "Lamia Al-Dosari",
    sourceType: "beneficiary", sourceSubtype: "",
    entity: "misk_art", program: "future_skills", track: "talent",
    themes: ["culture", "inspiration"], priority: "culture",
    strategicValue_ar: "يدعم سردية التأثير الثقافي والقوة الناعمة.",
    strategicValue_en: "Supports the cultural impact and soft-power narrative.",
    date: daysAgo(18), link: "",
    impactLevel: "High", engagementLevel: "Medium", classification: "High",
    notes: "", status: "Verified",
  },
  {
    id: uid(), originalLanguage: "en",
    quote_ar: "منحني مسك المنصة لأقدّم بحثي على مسرح عالمي للمرة الأولى.",
    quote_en: "Misk gave me the platform to present my research on a global stage for the first time.",
    translationSource: "ai_draft",
    sourceName_ar: "عمر السالم", sourceName_en: "Omar Al-Salem",
    sourceType: "alumnus", sourceSubtype: "",
    entity: "misk_forum", program: "fellowship", track: "innovation",
    themes: ["inspiration", "opportunity"], priority: "innovation",
    strategicValue_ar: "يبرز البعد العالمي والقوة الناعمة لمسك.",
    strategicValue_en: "Highlights Misk's global reach and soft power.",
    date: daysAgo(20), link: "",
    impactLevel: "High", engagementLevel: "High", classification: "High",
    notes: "الترجمة العربية مسودة ذكاء اصطناعي — بانتظار المراجعة.", status: "Verified",
  },
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "أظهر استطلاع الخريجين أن ٨٧٪ يرون أن مسك أسهمت في تطوير مهاراتهم القيادية.",
    quote_en: "An alumni survey showed that 87% believe Misk contributed to developing their leadership skills.",
    translationSource: "human",
    sourceName_ar: "استطلاع أثر الخريجين", sourceName_en: "Alumni Impact Survey",
    sourceType: "internal_evidence", sourceSubtype: "survey",
    entity: "misk_foundation", program: "leadership_accel", track: "capacity",
    themes: ["leadership", "skills"], priority: "leadership",
    strategicValue_ar: "رقم قابل للاقتباس في التقارير القيادية.",
    strategicValue_en: "A quotable statistic for leadership reporting.",
    date: daysAgo(24), link: "",
    impactLevel: "High", engagementLevel: "Low", classification: "High",
    notes: "", status: "Featured",
  },
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "تدريبي على مهارات المستقبل جعلني جاهزاً لوظائف لم تكن موجودة قبل سنوات قليلة.",
    quote_en: "My future-skills training prepared me for jobs that didn't exist just a few years ago.",
    translationSource: "human",
    sourceName_ar: "تركي الشمري", sourceName_en: "Turki Al-Shammari",
    sourceType: "trainee", sourceSubtype: "",
    entity: "misk_academy", program: "future_skills", track: "innovation",
    themes: ["skills", "opportunity"], priority: "future_work",
    strategicValue_ar: "يربط البرامج بمستقبل سوق العمل ورؤية ٢٠٣٠.",
    strategicValue_en: "Connects programs to the future labor market and Vision 2030.",
    date: daysAgo(27), link: "",
    impactLevel: "Medium", engagementLevel: "High", classification: "High",
    notes: "", status: "Verified",
  },
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "في مختبر ريادة الأعمال طوّرنا حلاً تقنياً لمشكلة بيئية حقيقية في مدينتنا.",
    quote_en: "At the Entrepreneurship Lab we developed a tech solution to a real environmental problem in our city.",
    translationSource: "human",
    sourceName_ar: "هيا الغامدي", sourceName_en: "Haya Al-Ghamdi",
    sourceType: "beneficiary", sourceSubtype: "",
    entity: "misk_foundation", program: "ent_lab", track: "innovation",
    themes: ["entrepreneurship", "community"], priority: "innovation",
    strategicValue_ar: "يجمع بين الابتكار والأثر المجتمعي في سردية واحدة.",
    strategicValue_en: "Combines innovation and community impact in a single narrative.",
    date: daysAgo(31), link: "",
    impactLevel: "High", engagementLevel: "Medium", classification: "High",
    notes: "", status: "Featured",
  },
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "البرنامج فتح لي أبواباً لم أكن أتخيّلها، وغيّر نظرتي لقدراتي.",
    quote_en: "The program opened doors I never imagined and changed how I see my own potential.",
    translationSource: "ai_draft",
    sourceName_ar: "مشارك جديد", sourceName_en: "New Participant",
    sourceType: "beneficiary", sourceSubtype: "",
    entity: "misk_schools", program: "bootcamp", track: "talent",
    themes: ["youth", "opportunity"], priority: "skills",
    strategicValue_ar: "بانتظار التحقق من المصدر والترجمة.",
    strategicValue_en: "Pending source verification and translation review.",
    date: daysAgo(2), link: "",
    impactLevel: "Medium", engagementLevel: "Medium", classification: "Medium",
    notes: "مسودة — لم تُراجع بعد.", status: "Draft",
  },
  {
    id: uid(), originalLanguage: "ar",
    quote_ar: "شراكتنا مع مسك مكّنتنا من الوصول إلى جيل جديد من المواهب الواعدة.",
    quote_en: "Our partnership with Misk enabled us to reach a new generation of promising talent.",
    translationSource: "human",
    sourceName_ar: "شركة تقنية شريكة", sourceName_en: "Partner Technology Company",
    sourceType: "partner", sourceSubtype: "",
    entity: "misk_foundation", program: "future_skills", track: "talent",
    themes: ["opportunity", "skills"], priority: "future_work",
    strategicValue_ar: "صوت شريك يعزّز مصداقية النظام البيئي للمواهب.",
    strategicValue_en: "Partner voice that reinforces the credibility of the talent ecosystem.",
    date: daysAgo(34), link: "",
    impactLevel: "Medium", engagementLevel: "High", classification: "Medium",
    notes: "", status: "Verified",
  },
]);

const seedArchive = (quotes) => ([
  { id: uid(), type: "video", title_ar: "مقابلة فيديو مع فيصل المطيري", title_en: "Video Interview — Faisal Al-Mutairi", link: "", date: daysAgo(3), linkedQuoteIds: [quotes[0].id], notes: "" },
  { id: uid(), type: "report", title_ar: "تقرير مجموعة تركيز الخريجين ٢٠٢٥", title_en: "Alumni Focus Group Report 2025", link: "", date: daysAgo(12), linkedQuoteIds: [quotes[3].id], notes: "" },
  { id: uid(), type: "internal", title_ar: "نتائج استطلاع أثر الخريجين", title_en: "Alumni Impact Survey Results", link: "", date: daysAgo(24), linkedQuoteIds: [quotes[7].id], notes: "" },
  { id: uid(), type: "article", title_ar: "تغطية إعلامية لمنتدى مسك العالمي", title_en: "Media Coverage — Misk Global Forum", link: "", date: daysAgo(20), linkedQuoteIds: [quotes[6].id], notes: "" },
  { id: uid(), type: "screenshot", title_ar: "لقطة من منصة التواصل", title_en: "Social Platform Screenshot", link: "", date: daysAgo(6), linkedQuoteIds: [quotes[1].id], notes: "" },
]);

const seedInsights = () => ([
  {
    id: uid(), status: "Verified",
    ar: "يبرز التطوير المهني وبناء القدرات القيادية كأكثر الموضوعات تكراراً بين المستفيدين، ما يعكس ارتباطاً قوياً بين برامج مسك والنمو الوظيفي والقيادي.",
    en: "Professional development and leadership capacity emerge as the most recurring themes among beneficiaries, reflecting a strong association between Misk programs and career and leadership growth.",
  },
  {
    id: uid(), status: "ai_draft",
    ar: "تُظهر أصوات المستفيدين تحوّلاً تدريجياً من سردية الإنجاز الفردي نحو سردية الأثر المجتمعي، وهي فرصة لإعادة تأطير رسائل مسك حول القيمة الجماعية.",
    en: "Beneficiary voices show a gradual shift from an individual-achievement narrative toward a community-impact narrative — an opportunity to reframe Misk's messaging around collective value.",
  },
]);

const seedConsiderations = () => ([
  {
    id: uid(), status: "Verified",
    commAr: "تتوفّر مادة سردية قوية تربط البرامج بخلق الوظائف والأثر المجتمعي، ويُنصح بترقيتها في الرسائل القيادية بدل الاكتفاء بمؤشرات المشاركة.",
    commEn: "There is strong narrative material linking programs to job creation and community impact; it should be elevated in leadership messaging rather than relying on participation metrics alone.",
    repAr: "تنوّع المصادر (مستفيدون، موجّهون، شركاء، أدلة داخلية) يعزّز مصداقية سردية الأثر ويقلّل الاعتماد على صوت واحد.",
    repEn: "The diversity of sources (beneficiaries, mentors, partners, internal evidence) strengthens the credibility of the impact narrative and reduces reliance on a single voice.",
    oppAr: "البعد الثقافي والعالمي (معهد الفنون، المنتدى) يمثّل فرصة قوة ناعمة غير مستثمرة بالكامل في التقارير الحالية.",
    oppEn: "The cultural and global dimension (Art Institute, Forum) represents an under-leveraged soft-power opportunity in current reporting.",
    sigAr: "تتكرّر إشارة الانتماء والثقة بالقدرات الذاتية، ما يدل على أثر نفسي واجتماعي يتجاوز المهارات التقنية.",
    sigEn: "Signals of belonging and self-confidence recur, indicating a psychological and social impact that extends beyond technical skills.",
  },
]);

const seed = () => {
  const quotes = seedQuotes();
  return {
    schema: 1,
    quotes,
    archive: seedArchive(quotes),
    vocab: seedVocab(),
    config: seedConfig(),
    insights: seedInsights(),
    considerations: seedConsiderations(),
  };
};

/* Forward-compat normalization. Older saved blobs predate some vocab lists
   (e.g. the editable "sources" list). Fill any missing list from the seed,
   and — the first time only — build the Source list from the names already
   typed into existing quotes so nothing is lost. */
function normalizeData(d) {
  const base = seedVocab();
  const vocab = { ...base, ...(d.vocab || {}) };
  for (const k of Object.keys(base)) if (!Array.isArray(vocab[k])) vocab[k] = base[k];
  const hadSources = d.vocab && Array.isArray(d.vocab.sources);
  if (!hadSources) {
    const seen = new Map();
    (d.quotes || []).forEach((q) => {
      const ar = (q.sourceName_ar || "").trim();
      const en = (q.sourceName_en || "").trim();
      if (!ar && !en) return;
      const id = ar + "||" + en;
      if (!seen.has(id)) seen.set(id, { k: "s_" + uid(), ar: ar || en, en: en || ar });
    });
    vocab.sources = Array.from(seen.values());
  }
  return { ...d, vocab };
}

/* ---------------------- scoring ---------------------- */
/* Resolve a level key to its numeric weight. Built-in High/Medium/Low come
   from config; custom levels added to the editable lists carry their own
   `value`, defaulting to the Medium value when unspecified. */
function levelVal(key, vocabList, config) {
  const base = config.scoring.levelValues;
  if (base[key] != null) return base[key];
  const o = (vocabList || []).find((x) => x.k === key);
  return o && typeof o.value === "number" ? o.value : (base.Medium ?? 60);
}
function computeScore(q, config, vocab) {
  const vv = config.scoring.verificationValues;
  const w = { ...config.scoring.weights };
  const isInternal = q.sourceType === "internal_evidence";
  const naEngagement = q.engagementLevel === "NA";
  const impact = levelVal(q.impactLevel, vocab && vocab.impactLevels, config);
  let engagement = naEngagement ? 0 : levelVal(q.engagementLevel, vocab && vocab.engagementLevels, config);
  const classification = levelVal(q.classification, null, config);
  const verification = vv[q.status] ?? 0;
  let wI = w.impact, wE = w.engagement, wC = w.classification, wV = w.verification;
  // Engagement doesn't apply (internal evidence, or explicitly N/A): drop its
  // weight and redistribute it so the score isn't unfairly dragged to zero.
  if (naEngagement || (isInternal && config.scoring.internalEvidenceNeutralizesEngagement)) {
    const redis = wE / 2;
    wI += redis; wC += redis; wE = 0; engagement = 0;
  }
  return Math.round(impact * wI + engagement * wE + classification * wC + verification * wV);
}
const scoreBand = (s) => (s >= 80 ? "High" : s >= 55 ? "Medium" : "Low");

/* ---------------------- small helpers ---------------------- */
const lookup = (list, k) => list.find((x) => x.k === k);
const Lv = (vocabList, k, lang) => { const o = lookup(vocabList, k); return o ? o[lang] : "—"; };
/* Quote text for display: prefer the current language, but fall back to the
   other language so a quote that exists in only one language is never blank. */
const qt = (q, lang) => (q["quote_" + lang] || q["quote_" + (lang === "ar" ? "en" : "ar")] || "");

/* ========================================================================
   APP
   ======================================================================== */
export default function App({ canEdit = false, onAuthExpired, onLogout, onRequestEdit }) {
  const [data, setData] = useState(null);
  const [lang, setLang] = useState("ar");
  const [view, setView] = useState("dashboard");
  const [editing, setEditing] = useState(null);     // quote object or null
  const [editingAsset, setEditingAsset] = useState(null);
  const [brandLogo, setBrandLogo] = useState(null); // shared logo data URL or null
  const loadedRef = useRef(false);

  useEffect(() => {
    brandGet().then((b) => setBrandLogo((b && b.logo) || null)).catch(() => {});
  }, []);

  // If editing is turned off (logout) while on the editor-only Settings view,
  // fall back to the dashboard.
  useEffect(() => { if (!canEdit && view === "settings") setView("dashboard"); }, [canEdit, view]);

  const t = (k) => (UI[k] ? UI[k][lang] : k);
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontStack = isAr
    ? "'IBM Plex Sans Arabic', 'DM Sans', 'Segoe UI', Tahoma, sans-serif"
    : "'DM Sans', 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif";

  /* ---- load / persist ---- */
  useEffect(() => {
    (async () => {
      let loaded = null;
      try {
        const r = await kvGet(KEY);
        if (r && r.value) loaded = r.value;
      } catch (e) {
        // 401 means the session expired — bounce back to the login gate.
        if (e && e.unauthorized && onAuthExpired) { onAuthExpired(); return; }
        loaded = null;
      }
      let fresh = false;
      if (!loaded || !loaded.quotes) { loaded = seed(); fresh = true; }
      loaded = normalizeData(loaded);
      if (fresh && canEdit) { try { await kvPut(KEY, loaded); } catch (e) {} }
      setData(loaded);
      loadedRef.current = true;
    })();
  }, []);

  useEffect(() => {
    // Only editors persist changes; public viewers never write (and the
    // server would reject them anyway).
    if (!loadedRef.current || !data || !canEdit) return;
    const id = setTimeout(() => {
      kvPut(KEY, data).catch((e) => {
        if (e && e.unauthorized && onAuthExpired) onAuthExpired();
      });
    }, 500);
    return () => clearTimeout(id);
  }, [data, canEdit]);

  if (!data) {
    return (
      <div style={{ minHeight: 480, display: "flex", alignItems: "center", justifyContent: "center", background: C.mist, fontFamily: fontStack }}>
        <Loader2 size={26} style={{ color: C.teal, animation: "vobl-spin 1s linear infinite" }} />
        <style>{baseCss}</style>
      </div>
    );
  }

  const { quotes, archive, vocab, config, insights, considerations } = data;
  const scored = quotes.map((q) => ({ ...q, _score: computeScore(q, config, vocab) }));

  /* ---- mutations ---- */
  const setQuotes = (fn) => setData((d) => ({ ...d, quotes: typeof fn === "function" ? fn(d.quotes) : fn }));
  const setArchive = (fn) => setData((d) => ({ ...d, archive: typeof fn === "function" ? fn(d.archive) : fn }));
  const setInsights = (fn) => setData((d) => ({ ...d, insights: typeof fn === "function" ? fn(d.insights) : fn }));
  const setConsiderations = (fn) => setData((d) => ({ ...d, considerations: typeof fn === "function" ? fn(d.considerations) : fn }));
  const setConfig = (fn) => setData((d) => ({ ...d, config: typeof fn === "function" ? fn(d.config) : fn }));
  const mutateVocab = (listName, fn) => setData((d) => ({ ...d, vocab: { ...d.vocab, [listName]: fn(d.vocab[listName] || []) } }));

  const saveQuote = (q) => {
    setQuotes((list) => {
      const exists = list.some((x) => x.id === q.id);
      return exists ? list.map((x) => (x.id === q.id ? q : x)) : [q, ...list];
    });
    setEditing(null);
  };
  const removeQuote = (id) => { setQuotes((list) => list.filter((x) => x.id !== id)); setEditing(null); };
  const saveAsset = (a) => {
    setArchive((list) => {
      const exists = list.some((x) => x.id === a.id);
      return exists ? list.map((x) => (x.id === a.id ? a : x)) : [a, ...list];
    });
    setEditingAsset(null);
  };
  const removeAsset = (id) => { setArchive((list) => list.filter((x) => x.id !== id)); setEditingAsset(null); };

  /* ---- export / import ---- */
  const download = (filename, text, type = "application/json") => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const exportJson = () => download("voice-of-beneficiaries.json", JSON.stringify(data, null, 2));
  const exportCsv = () => {
    const cols = ["id", "originalLanguage", "quote_ar", "quote_en", "translationSource", "sourceName_ar", "sourceName_en", "sourceType", "sourceSubtype", "entity", "program", "track", "themes", "impactLevel", "engagementLevel", "classification", "status", "score", "date", "link"];
    const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""').replace(/\n/g, " ") + '"';
    const rows = scored.map((q) => cols.map((c) => esc(c === "themes" ? q.themes.join("|") : c === "score" ? q._score : q[c])).join(","));
    download("voice-of-beneficiaries-quotes.csv", [cols.join(","), ...rows].join("\n"), "text/csv");
  };
  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed && parsed.quotes) { setData(parsed); setView("dashboard"); }
      } catch (e) { alert(isAr ? "ملف غير صالح" : "Invalid file"); }
    };
    reader.readAsText(file);
  };
  const resetData = () => { if (confirm(isAr ? "إعادة تعيين جميع البيانات إلى الوضع الافتراضي؟" : "Reset all data to defaults?")) { const s = seed(); setData(s); } };

  /* ---- AI assist ---- */
  // Routed through the backend proxy (/api/ai/complete). The OpenAI-compatible
  // server, model and key live server-side in the volume — never in the browser.
  const callClaude = async (system, prompt) => {
    try {
      return await aiComplete(system, prompt);
    } catch (e) {
      if (e && e.unauthorized && onAuthExpired) onAuthExpired();
      throw e;
    }
  };

  const navItems = [
    { k: "dashboard", icon: LayoutDashboard },
    { k: "library", icon: Quote },
    { k: "themes", icon: Tags },
    { k: "insights", icon: Lightbulb },
    { k: "considerations", icon: Compass },
    { k: "reports", icon: FileText },
    { k: "archive", icon: Archive },
    // Settings (logo + AI config) is editor-only.
    ...(canEdit ? [{ k: "settings", icon: Settings }] : []),
  ];

  const ctx = { data, lang, t, isAr, scored, vocab, config, quotes, archive, insights, considerations,
    setQuotes, setArchive, setInsights, setConsiderations, setConfig, mutateVocab,
    saveQuote, removeQuote, saveAsset, removeAsset, setEditing, setEditingAsset,
    callClaude, exportJson, exportCsv, importJson, resetData,
    brandLogo, setBrandLogo, canEdit };

  return (
    <div dir={dir} style={{ fontFamily: fontStack, background: C.mist, color: C.ink, height: "100vh", display: "flex", overflow: "hidden" }}>
      <style>{baseCss}</style>

      {/* Sidebar */}
      <aside className="no-print" style={{ width: 248, background: C.green, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ position: "relative", padding: "20px 18px 18px", borderBottom: `1px solid ${C.greenLine}`, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, [isAr ? "left" : "right"]: 0, width: 90, height: 60, background: `repeating-linear-gradient(115deg, ${C.lime} 0 7px, transparent 7px 16px)`, opacity: 0.85, transform: isAr ? "scaleX(-1)" : "none" }} />
          <LogoMark logo={brandLogo} />
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 12, lineHeight: 1.3 }}>{t("appName")}</div>
          <div style={{ fontSize: 11, color: C.tealSoft, marginTop: 3 }}>{t("appSub")}</div>
        </div>
        <nav style={{ padding: 12, flex: 1 }}>
          {navItems.map(({ k, icon: Icon }) => {
            const active = view === k;
            return (
              <button key={k} onClick={() => setView(k)} className="vobl-nav"
                style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "10px 12px", marginBottom: 3, borderRadius: 9, border: "none", cursor: "pointer", textAlign: isAr ? "right" : "left",
                  background: active ? C.greenDeep : "transparent", color: active ? "#fff" : C.tealSoft,
                  fontFamily: "inherit", fontSize: 13.5, fontWeight: active ? 600 : 500, position: "relative" }}>
                {active && <span style={{ position: "absolute", [isAr ? "right" : "left"]: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: C.lime }} />}
                <Icon size={17} style={{ color: active ? C.lime : C.tealSoft, flexShrink: 0 }} />
                <span>{t(k)}</span>
              </button>
            );
          })}
          <div style={{ height: 1, background: C.greenLine, margin: "10px 6px" }} />
          <a href="/" className="vobl-nav"
            style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "10px 12px", marginBottom: 3, borderRadius: 9, textDecoration: "none", textAlign: isAr ? "right" : "left", color: C.tealSoft, fontFamily: "inherit", fontSize: 13.5, fontWeight: 500 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>
            <span>{isAr ? "رادار الأزمات" : "Crisis Radar"}</span>
          </a>
        </nav>
        <div style={{ padding: 14, borderTop: `1px solid ${C.greenLine}`, fontSize: 10.5, color: C.tealSoft }}>
          {isAr ? `النسخة ${APP_VERSION}` : `Version ${APP_VERSION}`}
          <div style={{ marginTop: 2, opacity: 0.7 }}>{isAr ? "مستودع الأدلة" : "Evidence Repository"}</div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {/* Topbar */}
        <header className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 22px", background: C.paper, borderBottom: `1px solid ${C.line}` }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.green }}>{t(view)}</div>
            <div style={{ fontSize: 11.5, color: C.muted }}>{t("appSub")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setLang(isAr ? "en" : "ar")} className="vobl-btn-ghost" title="Toggle language"
              style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Globe size={15} /> {isAr ? "EN" : "ع"}
            </button>
            {canEdit ? (
              <button onClick={() => onLogout && onLogout()} className="vobl-btn-ghost" title={isAr ? "تسجيل الخروج" : "Log out"}
                style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <LogOut size={15} />
              </button>
            ) : (
              <button onClick={() => onRequestEdit && onRequestEdit()} className="vobl-btn-ghost" title={isAr ? "دخول المحرّر" : "Editor sign-in"}
                style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <KeyRound size={15} /> {isAr ? "دخول المحرّر" : "Sign in"}
              </button>
            )}
            {canEdit && (
              <button onClick={() => setEditing(blankQuote(vocab))} className="vobl-btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={15} /> {t("addQuote")}
              </button>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="vobl-scroll" style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          <div key={view} className="vobl-fade">
            {view === "dashboard" && <Dashboard ctx={ctx} setView={setView} />}
            {view === "library" && <Library ctx={ctx} />}
            {view === "themes" && <Themes ctx={ctx} />}
            {view === "insights" && <Insights ctx={ctx} />}
            {view === "considerations" && <Considerations ctx={ctx} />}
            {view === "reports" && <Reports ctx={ctx} />}
            {view === "archive" && <ArchiveView ctx={ctx} />}
            {view === "settings" && <SettingsView ctx={ctx} />}
          </div>
        </div>
      </main>

      {editing && <QuoteEditor ctx={ctx} quote={editing} onSave={saveQuote} onDelete={removeQuote} onClose={() => setEditing(null)} />}
      {editingAsset && <AssetEditor ctx={ctx} asset={editingAsset} onSave={saveAsset} onDelete={removeAsset} onClose={() => setEditingAsset(null)} />}
    </div>
  );
}

/* ---------------------- Logo mark (abstract growth canopy) ---------------------- */
function LogoMark({ logo }) {
  if (logo) {
    return <img src={logo} alt="" style={{ width: 42, height: 42, objectFit: "contain", borderRadius: 9, background: "#fff", padding: 3, position: "relative" }} />;
  }
  const dots = [[18, 6], [11, 11], [25, 11], [7, 18], [18, 14], [29, 18], [13, 22], [23, 22], [18, 20]];
  return (
    <svg width="40" height="40" viewBox="0 0 36 40" aria-hidden>
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.1" fill={i % 3 === 0 ? C.lime : C.tealSoft} opacity={0.9} />
      ))}
      <rect x="16.6" y="22" width="2.8" height="13" rx="1.4" fill={C.lime} />
    </svg>
  );
}

/* ---------------------- shared atoms ---------------------- */
function Card({ children, style, className }) {
  return <div className={className} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, ...style }}>{children}</div>;
}
function SectionTitle({ icon: Icon, children, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: C.green }}>
        {Icon && <Icon size={17} style={{ color: C.teal }} />} {children}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
function Badge({ children, bg, color, dashed }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: bg, color, border: dashed ? `1px dashed ${color}` : "none", whiteSpace: "nowrap" }}>{children}</span>;
}
function statusBadge(status, t) {
  const map = {
    Draft: { bg: "#EEE", color: "#666" },
    Verified: { bg: "#E3F2EC", color: C.teal },
    Featured: { bg: C.limeSoft, color: "#5C6B00" },
  };
  const m = map[status] || map.Draft;
  return <Badge bg={m.bg} color={m.color}>{status === "Featured" && <Star size={10} />}{t(status)}</Badge>;
}
function provenanceBadge(q, t) {
  // shows provenance of the non-original (translated) text
  if (q.translationSource === "ai_draft") return <Badge bg={C.amberSoft} color={C.amber} dashed><Sparkles size={10} />{t("aiDraft")}</Badge>;
  if (q.translationSource === "human") return <Badge bg="#E3F2EC" color={C.teal}><CheckCheck size={10} />{t("humanVerified")}</Badge>;
  return <Badge bg="#EEF1ED" color={C.muted}>{t("original")}</Badge>;
}
function levelChip(level, label) {
  const map = { High: { bg: "#E3F2EC", c: C.teal }, Medium: { bg: "#FBF4DF", c: C.amber }, Low: { bg: "#F0F0F0", c: "#888" } };
  const m = map[level] || { bg: C.mist, c: C.muted };
  return <Badge bg={m.bg} color={m.c}>{label}</Badge>;
}
function Bar({ label, value, max, color }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5, color: C.ink }}>
        <span style={{ fontWeight: 500 }}>{label}</span><span style={{ color: C.muted, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 8, background: C.mist, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: 6, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}
const firstKey = (list, fallback) => (list && list[0] ? list[0].k : fallback);
const blankQuote = (vocab) => ({
  id: uid(), originalLanguage: "ar", quote_ar: "", quote_en: "", translationSource: "human",
  sourceName_ar: "", sourceName_en: "", sourceType: firstKey(vocab.sourceTypes, "beneficiary"), sourceSubtype: "",
  entity: firstKey(vocab.entities), program: firstKey(vocab.programs), track: firstKey(vocab.tracks),
  themes: [],
  date: new Date().toISOString().slice(0, 10), link: "",
  impactLevel: "Medium", engagementLevel: "Medium", classification: "Medium", notes: "", status: "Draft",
});

/* ---------------------- editable form atoms (module-level so inputs keep focus) ----
   Defining these inside a component body recreates them on every keystroke, which
   remounts their inputs and drops focus — so they live at module scope. */
function EditorField({ label, children }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.green, display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
function LevelSelect({ value, onChange, t, options }) {
  const opts = options || ["High", "Medium", "Low"];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="vobl-input" style={{ width: "100%" }}>
      {opts.map((x) => <option key={x} value={x}>{t(x)}</option>)}
    </select>
  );
}

/* A select-style dropdown backed by an editable controlled vocabulary. Users pick
   an option, add a new one (Arabic + English) inline, or toggle an edit mode to
   delete options. Vocabulary edits persist through ctx.mutateVocab → data autosave. */
function EditableSelect({ value, onChange, list, listName, mutateVocab, lang, isAr, t, placeholder }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [manage, setManage] = useState(false);
  const [ar, setAr] = useState("");
  const [en, setEn] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setAdding(false); setManage(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const current = list.find((o) => o.k === value);
  const label = current ? current[lang] : (placeholder || "—");

  const confirmAdd = () => {
    const a = ar.trim(), e = en.trim();
    if (!a && !e) return;
    const k = "u_" + uid();
    mutateVocab(listName, (arr) => [...arr, { k, ar: a || e, en: e || a }]);
    onChange(k);
    setAr(""); setEn(""); setAdding(false); setOpen(false);
  };
  const del = (k) => {
    if (list.length <= 1) return;
    const remaining = list.filter((o) => o.k !== k);
    mutateVocab(listName, () => remaining);
    if (value === k) onChange(remaining[0] ? remaining[0].k : "");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="vobl-input"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "#fff", textAlign: isAr ? "right" : "left" }}>
        <span style={{ color: current ? C.ink : C.muted }}>{label}</span>
        <ChevronDown size={15} style={{ color: C.muted, flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 4px)", insetInlineStart: 0, width: "100%", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, boxShadow: "0 10px 30px rgba(0,0,0,0.14)", maxHeight: 280, overflowY: "auto", padding: 5 }}>
          {list.map((o) => (
            <div key={o.k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button type="button" onClick={() => { onChange(o.k); setOpen(false); }}
                style={{ flex: 1, textAlign: isAr ? "right" : "left", padding: "8px 10px", border: "none", background: o.k === value ? C.mist : "transparent", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ flex: 1 }}>{o[lang]}</span>
                {o.k === value && <Check size={13} style={{ color: C.teal }} />}
              </button>
              {manage && list.length > 1 && (
                <button type="button" onClick={() => del(o.k)} title={t("delete")}
                  style={{ padding: 6, border: "none", background: "transparent", color: "#B33", cursor: "pointer", borderRadius: 6 }}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 5, paddingTop: 5 }}>
            {adding ? (
              <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                <input autoFocus value={ar} onChange={(e) => setAr(e.target.value)} dir="rtl" placeholder={t("optionAr")} className="vobl-input" style={{ width: "100%" }} />
                <input value={en} onChange={(e) => setEn(e.target.value)} dir="ltr" placeholder={t("optionEn")} className="vobl-input" style={{ width: "100%" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={confirmAdd} className="vobl-btn-primary" style={{ flex: 1, justifyContent: "center" }}><Check size={14} /> {t("add")}</button>
                  <button type="button" onClick={() => { setAdding(false); setAr(""); setEn(""); }} className="vobl-btn-ghost">{t("cancel")}</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => { setAdding(true); setManage(false); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", border: "none", background: "transparent", color: C.green, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>
                  <Plus size={14} /> {t("addOption")}
                </button>
                <button type="button" onClick={() => setManage((m) => !m)} title={t("manageList")}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 10px", border: "none", background: manage ? C.mist : "transparent", color: manage ? C.teal : C.muted, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, borderRadius: 7 }}>
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* The Source field: one bilingual dropdown (instead of two free-text inputs).
   Each option carries an Arabic + English name; picking one fills both the
   sourceName_ar and sourceName_en fields on the quote. New sources are added
   inline (Arabic + English) and persist to the editable `sources` vocabulary. */
function SourceSelect({ arValue, enValue, onPick, list, mutateVocab, lang, isAr, t }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [manage, setManage] = useState(false);
  const [ar, setAr] = useState("");
  const [en, setEn] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setAdding(false); setManage(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const curAr = (arValue || "").trim(), curEn = (enValue || "").trim();
  const display = (isAr ? curAr || curEn : curEn || curAr);
  const isCurrent = (o) => (o.ar || "").trim() === curAr && (o.en || "").trim() === curEn;

  const confirmAdd = () => {
    const a = ar.trim(), e = en.trim();
    if (!a && !e) return;
    mutateVocab("sources", (arr) => [...arr, { k: "s_" + uid(), ar: a || e, en: e || a }]);
    onPick(a || e, e || a);
    setAr(""); setEn(""); setAdding(false); setOpen(false);
  };
  const del = (k) => mutateVocab("sources", (arr) => arr.filter((o) => o.k !== k));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="vobl-input"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "#fff", textAlign: isAr ? "right" : "left" }}>
        <span style={{ color: display ? C.ink : C.muted }}>{display || t("sourcePick")}</span>
        <ChevronDown size={15} style={{ color: C.muted, flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 4px)", insetInlineStart: 0, width: "100%", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, boxShadow: "0 10px 30px rgba(0,0,0,0.14)", maxHeight: 280, overflowY: "auto", padding: 5 }}>
          {list.length === 0 && <div style={{ padding: "8px 10px", fontSize: 12.5, color: C.muted }}>{t("sourceEmpty")}</div>}
          {list.map((o) => (
            <div key={o.k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button type="button" onClick={() => { onPick(o.ar, o.en); setOpen(false); }}
                style={{ flex: 1, textAlign: isAr ? "right" : "left", padding: "8px 10px", border: "none", background: isCurrent(o) ? C.mist : "transparent", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ flex: 1 }}>{o[lang]}<span style={{ color: C.muted, fontSize: 11 }}> · {lang === "ar" ? o.en : o.ar}</span></span>
                {isCurrent(o) && <Check size={13} style={{ color: C.teal }} />}
              </button>
              {manage && (
                <button type="button" onClick={() => del(o.k)} title={t("delete")}
                  style={{ padding: 6, border: "none", background: "transparent", color: "#B33", cursor: "pointer", borderRadius: 6 }}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 5, paddingTop: 5 }}>
            {adding ? (
              <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                <input autoFocus value={ar} onChange={(e) => setAr(e.target.value)} dir="rtl" placeholder={t("optionAr")} className="vobl-input" style={{ width: "100%" }} />
                <input value={en} onChange={(e) => setEn(e.target.value)} dir="ltr" placeholder={t("optionEn")} className="vobl-input" style={{ width: "100%" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={confirmAdd} className="vobl-btn-primary" style={{ flex: 1, justifyContent: "center" }}><Check size={14} /> {t("add")}</button>
                  <button type="button" onClick={() => { setAdding(false); setAr(""); setEn(""); }} className="vobl-btn-ghost">{t("cancel")}</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => { setAdding(true); setManage(false); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", border: "none", background: "transparent", color: C.green, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>
                  <Plus size={14} /> {t("addSource")}
                </button>
                <button type="button" onClick={() => setManage((m) => !m)} title={t("manageList")}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 10px", border: "none", background: manage ? C.mist : "transparent", color: manage ? C.teal : C.muted, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, borderRadius: 7 }}>
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Editable, multi-select theme picker (chips). Add/delete persists to vocab. */
function ThemeEditor({ themes, selected, toggle, mutateVocab, lang, t }) {
  const [adding, setAdding] = useState(false);
  const [manage, setManage] = useState(false);
  const [ar, setAr] = useState("");
  const [en, setEn] = useState("");
  const add = () => {
    const a = ar.trim(), e = en.trim();
    if (!a && !e) return;
    const k = "u_" + uid();
    mutateVocab("themes", (arr) => [...arr, { k, ar: a || e, en: e || a }]);
    toggle(k);
    setAr(""); setEn(""); setAdding(false);
  };
  const del = (k) => mutateVocab("themes", (arr) => arr.filter((o) => o.k !== k));
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {themes.map((th) => {
          const on = selected.includes(th.k);
          return (
            <span key={th.k} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <button type="button" onClick={() => toggle(th.k)} className="vobl-pill"
                style={{ background: on ? C.teal : C.mist, color: on ? "#fff" : C.ink, fontSize: 11.5 }}>{th[lang]}</button>
              {manage && themes.length > 1 && (
                <button type="button" onClick={() => del(th.k)} title={t("delete")}
                  style={{ marginInlineStart: -2, border: "none", background: "transparent", color: "#B33", cursor: "pointer", padding: 2, display: "inline-flex" }}><X size={13} /></button>
              )}
            </span>
          );
        })}
        <button type="button" onClick={() => { setAdding((a) => !a); setManage(false); }} className="vobl-pill"
          style={{ background: "#fff", color: C.green, border: `1px dashed ${C.line}`, fontSize: 11.5, display: "inline-flex", gap: 4, alignItems: "center" }}><Plus size={12} /> {t("add")}</button>
        <button type="button" onClick={() => { setManage((m) => !m); setAdding(false); }} className="vobl-pill"
          style={{ background: manage ? C.mist : "transparent", color: manage ? C.teal : C.muted, fontSize: 11.5, display: "inline-flex", gap: 4, alignItems: "center" }}><Pencil size={11} /></button>
      </div>
      {adding && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <input autoFocus value={ar} onChange={(e) => setAr(e.target.value)} dir="rtl" placeholder={t("optionAr")} className="vobl-input" style={{ flex: 1, minWidth: 130 }} />
          <input value={en} onChange={(e) => setEn(e.target.value)} dir="ltr" placeholder={t("optionEn")} className="vobl-input" style={{ flex: 1, minWidth: 130 }} />
          <button type="button" onClick={add} className="vobl-btn-primary"><Check size={14} /></button>
        </div>
      )}
    </div>
  );
}

/* ---------------------- frequency util ---------------------- */
function freqBy(items, keyFn) {
  const m = {};
  items.forEach((it) => { const ks = keyFn(it); (Array.isArray(ks) ? ks : [ks]).forEach((k) => { if (k) m[k] = (m[k] || 0) + 1; }); });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function pickQuoteOfWeek(scored) {
  const featured = scored.filter((q) => q.status === "Featured");
  const pool = featured.length ? featured : scored.filter((q) => q.status === "Verified");
  if (!pool.length) return null;
  const byScore = (a, b) => b._score - a._score;
  // Prefer a quote actually from the current week, then the last month, and
  // only then fall back to the best of all time — so it feels timely.
  const win = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); };
  const week = pool.filter((q) => q.date >= win(7)).sort(byScore);
  if (week.length) return week[0];
  const month = pool.filter((q) => q.date >= win(31)).sort(byScore);
  if (month.length) return month[0];
  return [...pool].sort(byScore)[0];
}

/* ======================================================================== */
/* DASHBOARD */
function Dashboard({ ctx, setView }) {
  const { scored, vocab, lang, t, isAr } = ctx;
  const totalQuotes = scored.length;
  const totalSources = new Set(scored.map((q) => q["sourceName_" + (q.originalLanguage)] || q.sourceName_ar)).size;
  const highImpact = scored.filter((q) => q.impactLevel === "High").length;
  const verified = scored.filter((q) => q.status === "Verified" || q.status === "Featured").length;
  const progFreq = freqBy(scored, (q) => q.program).slice(0, 5);
  const themeFreq = freqBy(scored, (q) => q.themes).slice(0, 6);
  const qotw = pickQuoteOfWeek(scored);
  const recent = [...scored].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  const maxProg = progFreq[0]?.[1] || 1;
  const maxTheme = themeFreq[0]?.[1] || 1;

  const kpis = [
    { label: t("totalQuotes"), value: totalQuotes, icon: Quote, color: C.teal },
    { label: t("totalSources"), value: totalSources, icon: Users, color: C.green },
    { label: t("highImpact"), value: highImpact, icon: TrendingUp, color: C.amber },
    { label: t("verified"), value: verified + "/" + totalQuotes, icon: ShieldCheck, color: C.teal },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        {kpis.map((k, i) => (
          <Card key={i} style={{ padding: 16, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", [isAr ? "left" : "right"]: 0, width: 4, top: 0, bottom: 0, background: k.color, opacity: 0.85 }} />
            <k.icon size={18} style={{ color: k.color }} />
            <div style={{ fontSize: 28, fontWeight: 700, color: C.green, marginTop: 8, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={Layers}>{t("topPrograms")}</SectionTitle>
          {progFreq.map(([k, v]) => <Bar key={k} label={Lv(vocab.programs, k, lang)} value={v} max={maxProg} color={C.green} />)}
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={Tags}>{t("topThemes")}</SectionTitle>
          {themeFreq.map(([k, v]) => <Bar key={k} label={Lv(vocab.themes, k, lang)} value={v} max={maxTheme} color={C.teal} />)}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14, alignItems: "start" }}>
        {/* Quote of the week */}
        <div style={{ background: C.quote, borderRadius: 13, padding: 22, color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: -10, [isAr ? "left" : "right"]: 16, display: "flex", gap: 6, opacity: 0.5 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 14, height: 46, background: C.teal, borderRadius: 2 }} />)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: C.lime, marginBottom: 12 }}>
            <Star size={14} /> {t("qotw")}
          </div>
          {qotw ? (
            <>
              <Quote size={22} style={{ color: C.tealSoft, opacity: 0.6 }} />
              <div style={{ fontSize: 16, lineHeight: 1.7, fontWeight: 500, margin: "8px 0 14px" }}>
                {qt(qotw, lang)}
              </div>
              <div style={{ fontSize: 12.5, color: C.tealSoft }}>
                {qotw["sourceName_" + lang] || qotw.sourceName_ar} · {Lv(vocab.programs, qotw.program, lang)}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                {qotw.themes.slice(0, 3).map((th) => (
                  <span key={th} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: C.quoteLine, color: C.tealSoft }}>{Lv(vocab.themes, th, lang)}</span>
                ))}
              </div>
            </>
          ) : <div style={{ color: C.tealSoft }}>{t("noData")}</div>}
        </div>

        {/* Recent additions */}
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={Plus}>{t("recent")}</SectionTitle>
          <div>
            {recent.map((q) => (
              <div key={q.id} onClick={() => { setView("library"); if (ctx.canEdit) setTimeout(() => ctx.setEditing(q), 50); }}
                className="vobl-row" style={{ padding: "9px 0", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {qt(q, lang)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5, fontSize: 11, color: C.muted }}>
                  <span>{q["sourceName_" + lang] || q.sourceName_ar}</span>
                  <span>·</span><span>{q.date}</span>
                  <span style={{ marginInlineStart: "auto" }}>{statusBadge(q.status, t)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ======================================================================== */
/* LIBRARY */
function Library({ ctx }) {
  const { scored, vocab, lang, t, isAr, setEditing, canEdit } = ctx;
  const [q, setQ] = useState("");
  const [fEntity, setFEntity] = useState("");
  const [fTheme, setFTheme] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [sort, setSort] = useState("score");

  const filtered = useMemo(() => {
    const cmp = sort === "newest" ? (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
      : sort === "oldest" ? (a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0)
      : (a, b) => b._score - a._score;
    return scored.filter((it) => {
      if (fEntity && it.entity !== fEntity) return false;
      if (fTheme && !it.themes.includes(fTheme)) return false;
      if (fStatus && it.status !== fStatus) return false;
      if (q) {
        const hay = (it.quote_ar + " " + it.quote_en + " " + it.sourceName_ar + " " + it.sourceName_en).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    }).sort(cmp);
  }, [scored, q, fEntity, fTheme, fStatus, sort]);

  const Sel = ({ value, onChange, list, placeholder }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="vobl-input" style={{ minWidth: 120, fontSize: 12.5 }}>
      <option value="">{placeholder}</option>
      {list.map((o) => <option key={o.k} value={o.k}>{o[lang]}</option>)}
    </select>
  );

  return (
    <div>
      {/* Filter bar */}
      <Card style={{ padding: 12, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={15} style={{ position: "absolute", top: 10, [isAr ? "right" : "left"]: 10, color: C.muted }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="vobl-input" style={{ width: "100%", paddingInlineStart: 32 }} />
        </div>
        <Sel value={fEntity} onChange={setFEntity} list={vocab.entities} placeholder={t("entity")} />
        <Sel value={fTheme} onChange={setFTheme} list={vocab.themes} placeholder={t("themeF")} />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="vobl-input" style={{ fontSize: 12.5 }}>
          <option value="">{t("status")}</option>
          {["Draft", "Verified", "Featured"].map((x) => <option key={x} value={x}>{t(x)}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="vobl-input" style={{ fontSize: 12.5 }} title={t("sortBy")}>
          <option value="score">{t("sortScore")}</option>
          <option value="newest">{t("sortNewest")}</option>
          <option value="oldest">{t("sortOldest")}</option>
        </select>
      </Card>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{filtered.length} {isAr ? "اقتباس" : "quotes"}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((it) => (
          <Card key={it.id} className="vobl-row" style={{ padding: 16, cursor: canEdit ? "pointer" : "default" }} >
            <div onClick={() => canEdit && setEditing(it)}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: C.ink, fontWeight: 500 }}>
                    {qt(it, lang)}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <strong style={{ color: C.green }}>{it["sourceName_" + lang] || it.sourceName_ar}</strong>
                    <span>· {Lv(vocab.sourceTypes, it.sourceType, lang)}</span>
                    <span>· {Lv(vocab.entities, it.entity, lang)}</span>
                    <span>· {Lv(vocab.programs, it.program, lang)}</span>
                    <span>· {it.date}</span>
                  </div>
                </div>
                <div style={{ textAlign: "center", flexShrink: 0, minWidth: 54 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.green }}>{it._score}</div>
                  <div style={{ fontSize: 9.5, color: C.muted }}>{t("score")}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, alignItems: "center" }}>
                {statusBadge(it.status, t)}
                {provenanceBadge(it, t)}
                <span style={{ display: "inline-flex", gap: 5 }}>{levelChip(it.impactLevel, Lv(vocab.impactLevels, it.impactLevel, lang))}</span>
                {it.themes.map((th) => (
                  <span key={th} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: C.mist, color: C.green, border: `1px solid ${C.line}` }}>
                    {Lv(vocab.themes, th, lang)}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
        {!filtered.length && <Card style={{ padding: 30, textAlign: "center", color: C.muted }}>{t("noData")}</Card>}
      </div>
    </div>
  );
}

/* ======================================================================== */
/* QUOTE EDITOR */
function QuoteEditor({ ctx, quote, onSave, onDelete, onClose }) {
  const { vocab, lang, t, isAr, callClaude, config, mutateVocab } = ctx;
  const [f, setF] = useState({ ...quote });
  const [aiBusy, setAiBusy] = useState("");
  const [aiErr, setAiErr] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleTheme = (k) => setF((p) => ({ ...p, themes: p.themes.includes(k) ? p.themes.filter((x) => x !== k) : [...p.themes, k] }));
  const score = computeScore(f, config, vocab);

  const doTranslate = async () => {
    setAiBusy("translate"); setAiErr(false);
    try {
      const src = f.originalLanguage === "ar" ? f.quote_ar : f.quote_en;
      const target = f.originalLanguage === "ar" ? "English" : "Arabic";
      const out = await callClaude(
        "You are a professional translator for an executive communications team. Translate faithfully and naturally. Return ONLY the translation, no preamble.",
        `Translate the following beneficiary testimonial into ${target}:\n\n"${src}"`
      );
      if (!out) throw new Error();
      if (f.originalLanguage === "ar") set("quote_en", out); else set("quote_ar", out);
      set("translationSource", "ai_draft");
    } catch (e) { setAiErr(true); }
    setAiBusy("");
  };
  const doSuggestThemes = async () => {
    setAiBusy("themes"); setAiErr(false);
    try {
      const list = vocab.themes.map((th) => `${th.k}: ${th.en}`).join(", ");
      const out = await callClaude(
        "You tag testimonials with themes. Respond ONLY with a comma-separated list of theme keys from the provided set, nothing else.",
        `Themes available (key: label): ${list}\n\nTestimonial: "${f.quote_ar || f.quote_en}"\n\nReturn the 1-3 most relevant theme keys, comma-separated.`
      );
      const keys = out.split(/[,\s]+/).map((s) => s.trim()).filter((k) => vocab.themes.some((th) => th.k === k));
      if (keys.length) set("themes", Array.from(new Set([...f.themes, ...keys])));
      else throw new Error();
    } catch (e) { setAiErr(true); }
    setAiBusy("");
  };

  const Field = EditorField;

  return (
    <Drawer onClose={onClose} isAr={isAr} title={quote.quote_ar || quote.quote_en ? t("edit") : t("addQuote")}>
      {/* AI bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={doTranslate} disabled={!!aiBusy} className="vobl-btn-ai">
          {aiBusy === "translate" ? <Loader2 size={13} className="vobl-spin" /> : <Sparkles size={13} />} {t("translate")}
        </button>
        <button onClick={doSuggestThemes} disabled={!!aiBusy} className="vobl-btn-ai">
          {aiBusy === "themes" ? <Loader2 size={13} className="vobl-spin" /> : <Sparkles size={13} />} {t("suggestThemes")}
        </button>
        <div style={{ marginInlineStart: "auto", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: C.muted }}>{t("score")} </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{score}</span>
        </div>
      </div>
      {aiErr && <div style={{ fontSize: 11.5, color: C.amber, background: C.amberSoft, padding: "7px 10px", borderRadius: 7, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}><AlertCircle size={13} />{t("aiUnavailable")}</div>}

      <Field label={t("originalLang")}>
        <div style={{ display: "flex", gap: 8 }}>
          {["ar", "en"].map((l) => (
            <button key={l} onClick={() => set("originalLanguage", l)} className="vobl-pill" style={{ background: f.originalLanguage === l ? C.green : C.mist, color: f.originalLanguage === l ? "#fff" : C.ink }}>
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      </Field>

      <Field label={<span>{t("quoteAr")} {f.originalLanguage === "ar" && <Badge bg="#EEF1ED" color={C.muted}>{t("original")}</Badge>}</span>}>
        <textarea value={f.quote_ar} onChange={(e) => set("quote_ar", e.target.value)} dir="rtl" rows={3} className="vobl-input" style={{ width: "100%", resize: "vertical" }} />
      </Field>
      <Field label={<span>{t("quoteEn")} {f.originalLanguage === "en" ? <Badge bg="#EEF1ED" color={C.muted}>{t("original")}</Badge> : provenanceBadge(f, t)}</span>}>
        <textarea value={f.quote_en} onChange={(e) => { set("quote_en", e.target.value); if (f.originalLanguage === "ar") set("translationSource", "human"); }} dir="ltr" rows={3} className="vobl-input" style={{ width: "100%", resize: "vertical" }} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("source")}>
          <SourceSelect arValue={f.sourceName_ar} enValue={f.sourceName_en}
            onPick={(ar, en) => setF((p) => ({ ...p, sourceName_ar: ar, sourceName_en: en }))}
            list={vocab.sources || []} mutateVocab={mutateVocab} lang={lang} isAr={isAr} t={t} />
        </Field>
        <Field label={t("sourceType")}>
          <EditableSelect value={f.sourceType} onChange={(v) => set("sourceType", v)} list={vocab.sourceTypes} listName="sourceTypes" mutateVocab={mutateVocab} lang={lang} isAr={isAr} t={t} placeholder="—" />
        </Field>
        {f.sourceType === "internal_evidence"
          ? <Field label={t("sourceSubtype")}><EditableSelect value={f.sourceSubtype} onChange={(v) => set("sourceSubtype", v)} list={vocab.internalKinds} listName="internalKinds" mutateVocab={mutateVocab} lang={lang} isAr={isAr} t={t} placeholder="—" /></Field>
          : <Field label={t("entity")}><EditableSelect value={f.entity} onChange={(v) => set("entity", v)} list={vocab.entities} listName="entities" mutateVocab={mutateVocab} lang={lang} isAr={isAr} t={t} placeholder="—" /></Field>}
        {f.sourceType === "internal_evidence" && <Field label={t("entity")}><EditableSelect value={f.entity} onChange={(v) => set("entity", v)} list={vocab.entities} listName="entities" mutateVocab={mutateVocab} lang={lang} isAr={isAr} t={t} placeholder="—" /></Field>}
        <Field label={t("program")}><EditableSelect value={f.program} onChange={(v) => set("program", v)} list={vocab.programs} listName="programs" mutateVocab={mutateVocab} lang={lang} isAr={isAr} t={t} placeholder="—" /></Field>
        <Field label={t("track")}><EditableSelect value={f.track} onChange={(v) => set("track", v)} list={vocab.tracks} listName="tracks" mutateVocab={mutateVocab} lang={lang} isAr={isAr} t={t} placeholder="—" /></Field>
      </div>

      <Field label={t("themeF")}>
        <ThemeEditor themes={vocab.themes} selected={f.themes} toggle={toggleTheme} mutateVocab={mutateVocab} lang={lang} t={t} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("impact")}><EditableSelect value={f.impactLevel} onChange={(v) => set("impactLevel", v)} list={vocab.impactLevels} listName="impactLevels" mutateVocab={mutateVocab} lang={lang} isAr={isAr} t={t} placeholder="—" /></Field>
        <Field label={t("engagement")}><EditableSelect value={f.engagementLevel} onChange={(v) => set("engagementLevel", v)} list={vocab.engagementLevels} listName="engagementLevels" mutateVocab={mutateVocab} lang={lang} isAr={isAr} t={t} placeholder="—" /></Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("date")}><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className="vobl-input" style={{ width: "100%" }} /></Field>
        <Field label={t("link")}><input value={f.link} onChange={(e) => set("link", e.target.value)} dir="ltr" className="vobl-input" style={{ width: "100%" }} placeholder="https://" /></Field>
      </div>
      <Field label={t("status")}>
        <div style={{ display: "flex", gap: 8 }}>
          {["Draft", "Verified", "Featured"].map((s) => (
            <button key={s} onClick={() => set("status", s)} className="vobl-pill" style={{ background: f.status === s ? C.green : C.mist, color: f.status === s ? "#fff" : C.ink }}>{t(s)}</button>
          ))}
        </div>
      </Field>
      <Field label={t("notes")}><textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="vobl-input" style={{ width: "100%", resize: "vertical" }} /></Field>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => onSave(f)} className="vobl-btn-primary" style={{ flex: 1 }}><Check size={15} /> {t("save")}</button>
        <button onClick={() => onDelete(f.id)} className="vobl-btn-danger"><Trash2 size={15} /></button>
      </div>
    </Drawer>
  );
}

/* ======================================================================== */
/* THEMES */
function Themes({ ctx }) {
  const { scored, vocab, lang, t, isAr } = ctx;
  const recentCut = daysAgo(14);
  const rows = vocab.themes.map((th) => {
    const all = scored.filter((q) => q.themes.includes(th.k));
    const recent = all.filter((q) => q.date >= recentCut).length;
    const older = all.length - recent;
    const trend = recent > older ? "up" : recent < older ? "down" : "flat";
    return { th, count: all.length, trend, quotes: all };
  }).sort((a, b) => b.count - a.count);
  const max = rows[0]?.count || 1;

  return (
    <div>
      <SectionTitle icon={Tags} sub={isAr ? "تتحدّث الموضوعات تلقائياً مع كل اقتباس جديد" : "Themes recompute automatically with every new quote"}>{t("themes")}</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(({ th, count, trend, quotes }) => (
          <Card key={th.k} style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <strong style={{ color: C.green, fontSize: 14 }}>{th[lang]}</strong>
                  <TrendIcon trend={trend} />
                  <span style={{ marginInlineStart: "auto", fontSize: 12, color: C.muted }}>{count} · {t("frequency")}</span>
                </div>
                <div style={{ height: 8, background: C.mist, borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: (count / max) * 100 + "%", height: "100%", background: C.teal, borderRadius: 6 }} />
                </div>
              </div>
            </div>
            {quotes.length > 0 && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: 12, color: C.teal, cursor: "pointer", fontWeight: 600 }}>{t("relatedQuotes")} ({quotes.length})</summary>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {quotes.slice(0, 4).map((q) => (
                    <div key={q.id} style={{ fontSize: 12, color: C.ink, padding: "7px 10px", background: C.mist, borderRadius: 7, lineHeight: 1.6 }}>
                      “{(q["quote_" + lang] || q.quote_ar).slice(0, 120)}{(q["quote_" + lang] || q.quote_ar).length > 120 ? "…" : ""}”
                      <span style={{ color: C.muted }}> — {q["sourceName_" + lang] || q.sourceName_ar}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
function TrendIcon({ trend }) {
  if (trend === "up") return <TrendingUp size={15} style={{ color: C.teal }} />;
  if (trend === "down") return <TrendingDown size={15} style={{ color: C.amber }} />;
  return <Minus size={15} style={{ color: C.muted }} />;
}

/* ======================================================================== */
/* INSIGHTS */
function Insights({ ctx }) {
  const { insights, setInsights, scored, vocab, lang, t, isAr, callClaude, canEdit } = ctx;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  const generate = async () => {
    setBusy(true); setErr(false);
    try {
      const themeFreq = freqBy(scored, (q) => q.themes).slice(0, 5).map(([k, v]) => `${Lv(vocab.themes, k, "en")} (${v})`).join(", ");
      const progFreq = freqBy(scored, (q) => q.program).slice(0, 3).map(([k, v]) => `${Lv(vocab.programs, k, "en")} (${v})`).join(", ");
      const out = await callClaude(
        "You are a strategic communications analyst at Misk Foundation. Write ONE concise, executive-level strategic insight based on beneficiary evidence. Avoid generic motivational language. Respond as JSON only: {\"ar\":\"...\",\"en\":\"...\"} with the Arabic as primary.",
        `Top themes: ${themeFreq}. Top programs: ${progFreq}. Total quotes: ${scored.length}. Write one sharp insight (2 sentences max) about what beneficiary voices reveal.`
      );
      const clean = out.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setInsights((list) => [{ id: uid(), status: "ai_draft", ar: parsed.ar, en: parsed.en }, ...list]);
    } catch (e) { setErr(true); }
    setBusy(false);
  };
  const approve = (id) => setInsights((list) => list.map((x) => x.id === id ? { ...x, status: "Verified" } : x));
  const remove = (id) => setInsights((list) => list.filter((x) => x.id !== id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <SectionTitle icon={Lightbulb} sub={isAr ? "ملاحظات تنفيذية مبنية على الأدلة — تتطلب اعتماداً بشرياً قبل النشر" : "Evidence-based executive observations — require human approval before publishing"}>{t("insightsTitle")}</SectionTitle>
        {canEdit && <button onClick={generate} disabled={busy} className="vobl-btn-ai">{busy ? <Loader2 size={13} className="vobl-spin" /> : <Sparkles size={13} />} {t("generate")}</button>}
      </div>
      {err && <div style={{ fontSize: 11.5, color: C.amber, background: C.amberSoft, padding: "7px 10px", borderRadius: 7, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}><AlertCircle size={13} />{t("aiUnavailable")}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {insights.map((ins) => (
          <Card key={ins.id} style={{ padding: 16, borderInlineStart: `3px solid ${ins.status === "Verified" ? C.teal : C.amber}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div dir="rtl" style={{ fontSize: 14, lineHeight: 1.8, color: C.ink, fontWeight: 500 }}>{ins.ar}</div>
                <div dir="ltr" style={{ fontSize: 12.5, lineHeight: 1.7, color: C.muted, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.line}` }}>{ins.en}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              {ins.status === "Verified" ? <Badge bg="#E3F2EC" color={C.teal}><CheckCheck size={10} />{t("humanVerified")}</Badge> : <Badge bg={C.amberSoft} color={C.amber} dashed><Sparkles size={10} />{t("aiDraft")}</Badge>}
              {canEdit && ins.status !== "Verified" && <button onClick={() => approve(ins.id)} className="vobl-btn-mini"><Check size={12} /> {t("approve")}</button>}
              {canEdit && <button onClick={() => remove(ins.id)} className="vobl-btn-mini" style={{ color: "#B33", marginInlineStart: "auto" }}><Trash2 size={12} /></button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ======================================================================== */
/* CONSIDERATIONS */
function Considerations({ ctx }) {
  const { considerations, setConsiderations, scored, vocab, t, isAr, callClaude, canEdit } = ctx;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  const generate = async () => {
    setBusy(true); setErr(false);
    try {
      const themeFreq = freqBy(scored, (q) => q.themes).slice(0, 5).map(([k, v]) => `${Lv(vocab.themes, k, "en")} (${v})`).join(", ");
      const srcFreq = freqBy(scored, (q) => q.sourceType).map(([k, v]) => `${Lv(vocab.sourceTypes, k, "en")} (${v})`).join(", ");
      const out = await callClaude(
        "You are a senior reputation & communications strategist at Misk Foundation. Produce executive-level strategic considerations from beneficiary evidence — NOT generic recommendations. Respond as JSON only with bilingual fields (Arabic primary): {\"commAr\",\"commEn\",\"repAr\",\"repEn\",\"oppAr\",\"oppEn\",\"sigAr\",\"sigEn\"}.",
        `Top themes: ${themeFreq}. Source mix: ${srcFreq}. Cover: communication implications, reputation implications, emerging opportunities, recurring beneficiary signals. Keep each to one sharp sentence.`
      );
      const parsed = JSON.parse(out.replace(/```json|```/g, "").trim());
      setConsiderations((list) => [{ id: uid(), status: "ai_draft", ...parsed }, ...list]);
    } catch (e) { setErr(true); }
    setBusy(false);
  };
  const approve = (id) => setConsiderations((list) => list.map((x) => x.id === id ? { ...x, status: "Verified" } : x));
  const remove = (id) => setConsiderations((list) => list.filter((x) => x.id !== id));

  const block = (icon, label, ar, en) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.teal, marginBottom: 4 }}>{label}</div>
      <div dir="rtl" style={{ fontSize: 13.5, lineHeight: 1.8, color: C.ink }}>{ar}</div>
      <div dir="ltr" style={{ fontSize: 12, lineHeight: 1.6, color: C.muted, marginTop: 3 }}>{en}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.green, display: "flex", gap: 8, alignItems: "center" }}><Compass size={17} style={{ color: C.teal }} /> {UI.considerationsTitle.en} · {UI.considerationsTitle.ar}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{isAr ? "تداعيات اتصالية وسمعة وفرص ناشئة — لا توصيات عامة" : "Communication, reputation & opportunity implications — not generic advice"}</div>
        </div>
        {canEdit && <button onClick={generate} disabled={busy} className="vobl-btn-ai">{busy ? <Loader2 size={13} className="vobl-spin" /> : <Sparkles size={13} />} {t("generate")}</button>}
      </div>
      {err && <div style={{ fontSize: 11.5, color: C.amber, background: C.amberSoft, padding: "7px 10px", borderRadius: 7, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}><AlertCircle size={13} />{t("aiUnavailable")}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {considerations.map((c) => (
          <Card key={c.id} style={{ padding: 18, borderInlineStart: `3px solid ${c.status === "Verified" ? C.teal : C.amber}` }}>
            {block(null, t("commImplications"), c.commAr, c.commEn)}
            {block(null, t("repImplications"), c.repAr, c.repEn)}
            {block(null, t("opportunities"), c.oppAr, c.oppEn)}
            {block(null, t("signals"), c.sigAr, c.sigEn)}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
              {c.status === "Verified" ? <Badge bg="#E3F2EC" color={C.teal}><CheckCheck size={10} />{t("humanVerified")}</Badge> : <Badge bg={C.amberSoft} color={C.amber} dashed><Sparkles size={10} />{t("aiDraft")}</Badge>}
              {canEdit && c.status !== "Verified" && <button onClick={() => approve(c.id)} className="vobl-btn-mini"><Check size={12} /> {t("approve")}</button>}
              {canEdit && <button onClick={() => remove(c.id)} className="vobl-btn-mini" style={{ color: "#B33", marginInlineStart: "auto" }}><Trash2 size={12} /></button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ======================================================================== */
/* REPORTS */
function Reports({ ctx }) {
  const { scored, vocab, insights, considerations, t, isAr } = ctx;
  const [cadence, setCadence] = useState("Monthly");
  // Report format selector was removed; always build the full report.
  const [format] = useState("FullReport");
  const [rlang, setRlang] = useState("ar");
  const [built, setBuilt] = useState(null);
  const [sections, setSections] = useState({ intro: false, metrics: true, quotes: true, highImpact: true, themes: true, insights: true, considerations: true, appendix: false });
  const [intro, setIntro] = useState("");
  const [editable, setEditable] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [reportKey, setReportKey] = useState(0);

  const cadenceDays = { Weekly: 7, Monthly: 30, Quarterly: 92, Annual: 366 };
  const toggleSection = (k) => setSections((s) => ({ ...s, [k]: !s[k] }));

  // Inline editing is driven through the DOM (not React state) so that manual
  // tweaks survive re-renders; the memoized, keyed ReportPreview is never
  // reconciled away underneath the edits.
  const toggleEdit = () => {
    const el = document.getElementById("vobl-print");
    if (!el) return;
    const on = !editable;
    el.setAttribute("contenteditable", on ? "true" : "false");
    el.style.outline = on ? `2px dashed ${C.teal}` : "none";
    el.style.outlineOffset = on ? "4px" : "0";
    setEditable(on);
  };

  const build = () => {
    setReportKey((k) => k + 1);
    const cut = daysAgo(cadenceDays[cadence]);
    const inPeriod = scored.filter((q) => q.date >= cut && (q.status === "Verified" || q.status === "Featured"));
    const curated = [...inPeriod].sort((a, b) => b._score - a._score);
    const limit = format === "ExecSummary" ? 4 : format === "LeadershipBrief" ? 8 : curated.length;
    const themeFreq = freqBy(inPeriod, (q) => q.themes).slice(0, 6);
    const entityFreq = freqBy(inPeriod, (q) => q.entity).slice(0, 6);
    const highQuotes = [...inPeriod].filter((q) => q.impactLevel === "High").sort((a, b) => b._score - a._score);
    setEditable(false);
    setBuilt({
      cadence, format, rlang,
      sections: { ...sections },
      intro: intro.trim(),
      generatedAt: new Date().toISOString().slice(0, 10),
      metrics: {
        total: inPeriod.length,
        sources: new Set(inPeriod.map((q) => q.sourceName_ar)).size,
        highImpact: highQuotes.length,
      },
      quotes: curated.slice(0, limit),
      highQuotes,
      themeFreq,
      entityFreq,
      insights: insights.filter((i) => i.status === "Verified"),
      considerations: considerations.filter((c) => c.status === "Verified"),
    });
  };

  // Render the live report DOM to a multi-page A4 PDF file (no print dialog).
  const exportPdf = async () => {
    const el = document.getElementById("vobl-print");
    if (!el) return;
    setPdfBusy(true);
    const prevOutline = el.style.outline;
    el.style.outline = "none";
    try {
      // Make sure the Arabic webfont is fully loaded before rasterizing, else
      // html2canvas can fall back to a non-shaping font and break letter joins.
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: el.scrollWidth });
      const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const img = canvas.toDataURL("image/jpeg", 0.95);
      let position = 0, heightLeft = imgH;
      pdf.addImage(img, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(img, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save("voice-of-beneficiaries-report.pdf");
    } catch (e) {
      alert(isAr ? "تعذّر إنشاء ملف PDF" : "Could not generate the PDF");
    }
    el.style.outline = prevOutline;
    setPdfBusy(false);
  };

  const Opt = ({ value, setValue, options }) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button key={o} onClick={() => setValue(o)} className="vobl-pill" style={{ background: value === o ? C.green : C.mist, color: value === o ? "#fff" : C.ink }}>{t(o)}</button>
      ))}
    </div>
  );

  const sectionDefs = [
    ["intro", t("secIntro")], ["metrics", t("secMetrics")], ["quotes", t("secQuotes")],
    ["highImpact", t("highImpact")], ["themes", t("secThemes")], ["insights", t("secInsights")], ["considerations", t("secConsiderations")], ["appendix", t("secAppendix")],
  ];

  return (
    <div>
      <Card className="no-print" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 7 }}>{t("reportType")}</div><Opt value={cadence} setValue={setCadence} options={["Weekly", "Monthly", "Quarterly", "Annual"]} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 7 }}>{t("reportLang")}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["ar", "en"].map((l) => <button key={l} onClick={() => setRlang(l)} className="vobl-pill" style={{ background: rlang === l ? C.green : C.mist, color: rlang === l ? "#fff" : C.ink }}>{l === "ar" ? "العربية" : "English"}</button>)}
            </div>
          </div>
        </div>

        {/* Section selection */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><SlidersHorizontal size={14} /> {t("reportSections")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {sectionDefs.map(([k, lab]) => (
              <button key={k} onClick={() => toggleSection(k)} className="vobl-pill"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: sections[k] ? C.teal : C.mist, color: sections[k] ? "#fff" : C.ink, fontSize: 12 }}>
                {sections[k] ? <Check size={12} /> : <Plus size={12} />} {lab}
              </button>
            ))}
          </div>
        </div>

        {sections.intro && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 6 }}>{t("secIntro")}</div>
            <textarea value={intro} onChange={(e) => setIntro(e.target.value)} dir={isAr ? "rtl" : "ltr"} rows={3}
              placeholder={t("introPlaceholder")} className="vobl-input" style={{ width: "100%", resize: "vertical" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={build} className="vobl-btn-primary"><FileText size={15} /> {t("buildReport")}</button>
          {built && <button onClick={exportPdf} disabled={pdfBusy} className="vobl-btn-primary">{pdfBusy ? <Loader2 size={15} className="vobl-spin" /> : <FileDown size={15} />} {t("exportPdf")}</button>}
          {built && <button onClick={toggleEdit} className="vobl-btn-ghost"><Pencil size={15} /> {editable ? t("doneEditing") : t("editContent")}</button>}
          {built && editable && <span style={{ fontSize: 11.5, color: C.muted }}>{t("editHint")}</span>}
        </div>
      </Card>

      {built && <ReportPreview key={reportKey} built={built} vocab={vocab} />}
    </div>
  );
}

const ReportPreview = React.memo(function ReportPreview({ built, vocab }) {
  const l = built.rlang;
  const isAr = l === "ar";
  const L = (k) => UI[k][l];
  const maxTheme = built.themeFreq[0]?.[1] || 1;
  const entityFreq = built.entityFreq || [];
  const maxEntity = entityFreq[0]?.[1] || 1;
  const S = built.sections || { metrics: true, quotes: true, highImpact: true, themes: true, insights: true, considerations: true, appendix: false, intro: false };
  const H = ({ children }) => <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 12 }}>{children}</div>;
  return (
   <div style={{ maxWidth: 820, margin: "0 auto" }}>
    <div id="vobl-print" dir={isAr ? "rtl" : "ltr"} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
      {/* cover band */}
      <div style={{ background: C.quote, color: "#fff", padding: "26px 30px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, [isAr ? "left" : "right"]: 0, width: 140, height: 70, background: `repeating-linear-gradient(115deg, ${C.lime} 0 9px, transparent 9px 20px)`, opacity: 0.9 }} />
        <div style={{ fontSize: 11, color: C.lime, fontWeight: 700, letterSpacing: isAr ? 0 : 1 }}>{isAr ? "مؤسسة مسك · الاتصال المؤسسي" : "MISK FOUNDATION · CORPORATE COMMUNICATIONS"}</div>
        <div style={{ fontSize: 23, fontWeight: 700, marginTop: 8 }}>{L("appName")}</div>
        <div style={{ fontSize: 14, color: C.tealSoft, marginTop: 4 }}>{L(built.cadence)}</div>
        <div style={{ fontSize: 11.5, color: C.tealSoft, marginTop: 10 }}>{L("period")}: {built.cadence} · {built.generatedAt}</div>
      </div>

      <div style={{ padding: 30 }}>
        {/* intro */}
        {S.intro && built.intro && (
          <div style={{ marginBottom: 24, fontSize: 13.5, lineHeight: 1.9, color: C.ink, whiteSpace: "pre-wrap" }}>{built.intro}</div>
        )}

        {/* high-impact quotes — featured first, on a green panel */}
        {S.highImpact && (built.highQuotes || []).length > 0 && (
          <div style={{ background: C.quote, borderRadius: 12, padding: "20px 22px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, [isAr ? "left" : "right"]: 0, width: 100, height: 54, background: `repeating-linear-gradient(115deg, ${C.lime} 0 7px, transparent 7px 16px)`, opacity: 0.55 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: C.lime, marginBottom: 14, position: "relative" }}>{UI.highImpact[l]}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
              {built.highQuotes.map((q) => (
                <div key={q.id} style={{ borderInlineStart: `3px solid ${C.lime}`, paddingInlineStart: 14 }}>
                  <div style={{ fontSize: 14.5, lineHeight: 1.8, color: "#fff", fontWeight: 500 }}>“{qt(q, l)}”</div>
                  <div style={{ fontSize: 12, color: C.tealSoft, marginTop: 6 }}>— {q["sourceName_" + l] || q.sourceName_ar} · {Lv(vocab.sourceTypes, q.sourceType, l)} · {Lv(vocab.programs, q.program, l)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* metrics */}
        {S.metrics && <>
          <H>{L("metricsSnapshot")}</H>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            {[[L("totalQuotes"), built.metrics.total], [L("totalSources"), built.metrics.sources], [L("highImpact"), built.metrics.highImpact]].map(([lab, v], i) => (
              <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.green }}>{v}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>{lab}</div>
              </div>
            ))}
          </div>
        </>}

        {/* curated quotes */}
        {S.quotes && <>
          <H>{L("curatedQuotes")}</H>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {built.quotes.map((q) => (
              <div key={q.id} style={{ borderInlineStart: `3px solid ${C.lime}`, paddingInlineStart: 14, paddingTop: 2, paddingBottom: 2 }}>
                <div style={{ fontSize: 14.5, lineHeight: 1.8, color: C.ink, fontWeight: 500 }}>“{qt(q, l)}”</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>— {q["sourceName_" + l] || q.sourceName_ar} · {Lv(vocab.sourceTypes, q.sourceType, l)} · {Lv(vocab.programs, q.program, l)}</div>
              </div>
            ))}
            {!built.quotes.length && <div style={{ color: C.muted, fontSize: 13 }}>{UI.noData[l]}</div>}
          </div>
        </>}

        {/* themes + entities, side by side */}
        {S.themes && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 24, alignItems: "start" }}>
            <div>
              <H>{UI.topThemes[l]}</H>
              {built.themeFreq.map(([k, v]) => <Bar key={k} label={Lv(vocab.themes, k, l)} value={v} max={maxTheme} color={C.teal} />)}
              {!built.themeFreq.length && <div style={{ color: C.muted, fontSize: 13 }}>{UI.noData[l]}</div>}
            </div>
            <div>
              <H>{UI.topEntities[l]}</H>
              {entityFreq.map(([k, v]) => <Bar key={k} label={Lv(vocab.entities, k, l)} value={v} max={maxEntity} color={C.green} />)}
              {!entityFreq.length && <div style={{ color: C.muted, fontSize: 13 }}>{UI.noData[l]}</div>}
            </div>
          </div>
        </>}

        {/* insights */}
        {S.insights && built.insights.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <H>{UI.insightsTitle[l]}</H>
            {built.insights.map((i) => <div key={i.id} style={{ fontSize: 13.5, lineHeight: 1.8, color: C.ink, marginBottom: 8, paddingInlineStart: 14, borderInlineStart: `3px solid ${C.teal}` }}>{i[l]}</div>)}
          </div>
        )}

        {/* strategic considerations */}
        {S.considerations && built.considerations.length > 0 && (
          <div style={{ background: C.mist, borderRadius: 10, padding: 18, marginBottom: S.appendix ? 24 : 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 14 }}>{UI.considerationsTitle.en} · {UI.considerationsTitle.ar}</div>
            {built.considerations.map((c) => (
              <div key={c.id}>
                {[["commImplications", c["comm" + (isAr ? "Ar" : "En")]], ["repImplications", c["rep" + (isAr ? "Ar" : "En")]], ["opportunities", c["opp" + (isAr ? "Ar" : "En")]], ["signals", c["sig" + (isAr ? "Ar" : "En")]]].map(([lab, txt], i) => (
                  <div key={i} style={{ marginBottom: 11 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.teal, marginBottom: 3 }}>{UI[lab][l]}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.75, color: C.ink }}>{txt}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* appendix */}
        {S.appendix && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 10 }}>{isAr ? "ملحق: قائمة المصادر" : "Appendix: Source Register"}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead><tr style={{ background: C.quote, color: "#fff" }}>
                {[isAr ? "المصدر" : "Source", isAr ? "البرنامج" : "Program", isAr ? "التصنيف" : "Class.", isAr ? "النتيجة" : "Score"].map((h, i) => <th key={i} style={{ padding: "7px 9px", textAlign: isAr ? "right" : "left" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {built.quotes.map((q) => (
                  <tr key={q.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: "6px 9px" }}>{q["sourceName_" + l] || q.sourceName_ar}</td>
                    <td style={{ padding: "6px 9px" }}>{Lv(vocab.programs, q.program, l)}</td>
                    <td style={{ padding: "6px 9px" }}>{UI[q.classification][l]}</td>
                    <td style={{ padding: "6px 9px", fontWeight: 700, color: C.green }}>{q._score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${C.line}`, fontSize: 10.5, color: C.muted, display: "flex", justifyContent: "space-between" }}>
          <span>{isAr ? "مكتبة أصوات المستفيدين · مؤسسة مسك" : "Voice of Beneficiaries Library · Misk Foundation"}</span>
          <span>{built.generatedAt}</span>
        </div>
      </div>
    </div>
   </div>
  );
});

/* ======================================================================== */
/* ARCHIVE */
function ArchiveView({ ctx }) {
  const { archive, scored, vocab, lang, t, isAr, setEditingAsset, canEdit } = ctx;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <SectionTitle icon={Archive} sub={isAr ? "أدلة داعمة مرتبطة بالاقتباسات" : "Supporting evidence linked to quotes"}>{t("archive")}</SectionTitle>
        {canEdit && <button onClick={() => setEditingAsset({ id: uid(), type: "interview", title_ar: "", title_en: "", link: "", date: new Date().toISOString().slice(0, 10), linkedQuoteIds: [], notes: "" })} className="vobl-btn-primary"><Plus size={15} /> {t("addAsset")}</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {archive.map((a) => {
          const linked = scored.filter((q) => a.linkedQuoteIds.includes(q.id));
          return (
            <Card key={a.id} className="vobl-row" style={{ padding: 16, cursor: canEdit ? "pointer" : "default" }} >
              <div onClick={() => canEdit && setEditingAsset(a)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Badge bg={C.green} color="#fff">{Lv(vocab.assetTypes, a.type, lang)}</Badge>
                  <span style={{ fontSize: 11, color: C.muted, marginInlineStart: "auto" }}>{a.date}</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.green }}>{a["title_" + lang] || a.title_ar}</div>
                {linked.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 11.5, color: C.muted }}>
                    <Link2 size={12} style={{ verticalAlign: "middle" }} /> {linked.length} {t("linkedQuotes")}
                    <div style={{ marginTop: 6, fontSize: 11.5, color: C.ink, background: C.mist, padding: "7px 10px", borderRadius: 7, lineHeight: 1.6 }}>
                      “{qt(linked[0], lang).slice(0, 90)}…”
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
function AssetEditor({ ctx, asset, onSave, onDelete, onClose }) {
  const { scored, vocab, lang, t, isAr, mutateVocab } = ctx;
  const [f, setF] = useState({ ...asset });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleQuote = (id) => setF((p) => ({ ...p, linkedQuoteIds: p.linkedQuoteIds.includes(id) ? p.linkedQuoteIds.filter((x) => x !== id) : [...p.linkedQuoteIds, id] }));
  return (
    <Drawer onClose={onClose} isAr={isAr} title={t("addAsset")}>
      <div style={{ marginBottom: 13 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.green, display: "block", marginBottom: 5 }}>{t("assetType")}</label>
        <EditableSelect value={f.type} onChange={(v) => set("type", v)} list={vocab.assetTypes} listName="assetTypes" mutateVocab={mutateVocab} lang={lang} isAr={isAr} t={t} placeholder="—" />
      </div>
      <div style={{ marginBottom: 13 }}><label style={{ fontSize: 12, fontWeight: 600, color: C.green, display: "block", marginBottom: 5 }}>{t("title")} (ع)</label><input value={f.title_ar} onChange={(e) => set("title_ar", e.target.value)} dir="rtl" className="vobl-input" style={{ width: "100%" }} /></div>
      <div style={{ marginBottom: 13 }}><label style={{ fontSize: 12, fontWeight: 600, color: C.green, display: "block", marginBottom: 5 }}>{t("title")} (EN)</label><input value={f.title_en} onChange={(e) => set("title_en", e.target.value)} dir="ltr" className="vobl-input" style={{ width: "100%" }} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ marginBottom: 13 }}><label style={{ fontSize: 12, fontWeight: 600, color: C.green, display: "block", marginBottom: 5 }}>{t("date")}</label><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className="vobl-input" style={{ width: "100%" }} /></div>
        <div style={{ marginBottom: 13 }}><label style={{ fontSize: 12, fontWeight: 600, color: C.green, display: "block", marginBottom: 5 }}>{t("link")}</label><input value={f.link} onChange={(e) => set("link", e.target.value)} dir="ltr" className="vobl-input" style={{ width: "100%" }} placeholder="https://" /></div>
      </div>
      <div style={{ marginBottom: 13 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.green, display: "block", marginBottom: 5 }}>{t("linkedQuotes")}</label>
        <div style={{ maxHeight: 200, overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 8, padding: 8 }}>
          {scored.map((q) => (
            <label key={q.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 4px", cursor: "pointer", fontSize: 12 }}>
              <input type="checkbox" checked={f.linkedQuoteIds.includes(q.id)} onChange={() => toggleQuote(q.id)} style={{ marginTop: 3 }} />
              <span style={{ lineHeight: 1.5 }}>{qt(q, lang).slice(0, 70)}…</span>
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => onSave(f)} className="vobl-btn-primary" style={{ flex: 1 }}><Check size={15} /> {t("save")}</button>
        <button onClick={() => onDelete(f.id)} className="vobl-btn-danger"><Trash2 size={15} /></button>
      </div>
    </Drawer>
  );
}

/* ======================================================================== */
/* SETTINGS */
function SettingsView({ ctx }) {
  const { config, setConfig, t, isAr, exportJson, exportCsv, importJson, resetData } = ctx;
  const w = config.scoring.weights;
  const setWeight = (k, v) => setConfig((c) => ({ ...c, scoring: { ...c.scoring, weights: { ...c.scoring.weights, [k]: Number(v) } } }));
  const total = (w.impact + w.engagement + w.classification + w.verification).toFixed(2);
  const fileRef = useRef();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Card style={{ padding: 18 }}>
        <SectionTitle icon={Settings} sub={isAr ? "يمكن تحديث المنهجية لاحقاً دون إعادة تصميم الهيكل" : "Methodology can be updated later without structural redesign"}>{t("scoringMethod")}</SectionTitle>
        {[["impact", t("impact")], ["engagement", t("engagement")], ["classification", t("classification")], ["verification", isAr ? "التوثيق" : "Verification"]].map(([k, lab]) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}><span>{lab}</span><span style={{ fontWeight: 700, color: C.green }}>{w[k]}</span></div>
            <input type="range" min="0" max="1" step="0.05" value={w[k]} onChange={(e) => setWeight(k, e.target.value)} style={{ width: "100%", accentColor: C.teal }} />
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: total === "1.00" ? C.teal : C.amber, marginTop: 4 }}>
          {isAr ? "مجموع الأوزان" : "Total weight"}: {total} {total !== "1.00" && (isAr ? "(يُفضّل أن يساوي 1)" : "(should equal 1)")}
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 16, fontSize: 12.5, cursor: "pointer", lineHeight: 1.5 }}>
          <input type="checkbox" checked={config.scoring.internalEvidenceNeutralizesEngagement} onChange={(e) => setConfig((c) => ({ ...c, scoring: { ...c.scoring, internalEvidenceNeutralizesEngagement: e.target.checked } }))} style={{ marginTop: 2 }} />
          {t("internalNoPenalty")}
        </label>
      </Card>

      <Card style={{ padding: 18 }}>
        <SectionTitle icon={Download} sub={isAr ? "البيانات قابلة للتصدير والترحيل إلى أي نظام مستقبلي" : "Data is portable and migration-ready for any future backend"}>{isAr ? "البيانات والتصدير" : "Data & Export"}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button onClick={exportJson} className="vobl-btn-ghost" style={{ justifyContent: "flex-start" }}><Download size={15} /> {t("exportJson")}</button>
          <button onClick={exportCsv} className="vobl-btn-ghost" style={{ justifyContent: "flex-start" }}><Download size={15} /> {t("exportCsv")}</button>
          <button onClick={() => fileRef.current?.click()} className="vobl-btn-ghost" style={{ justifyContent: "flex-start" }}><Upload size={15} /> {t("importJson")}</button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => e.target.files[0] && importJson(e.target.files[0])} />
          <button onClick={resetData} className="vobl-btn-ghost" style={{ justifyContent: "flex-start", color: "#B33", borderColor: "#F0D0D0" }}><Trash2 size={15} /> {t("reset")}</button>
        </div>
      </Card>

      <div style={{ gridColumn: "1 / -1" }}>
        <BrandCard ctx={ctx} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <AiConfigCard ctx={ctx} />
      </div>
    </div>
  );
}

/* ---------------------- Shared logo (both systems) ---------------------- */
// Downscale any uploaded image to a small square PNG data URL so it stays
// well under the request limit and loads fast on both pages.
function fileToLogoDataUrl(file, max = 240) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const cx = canvas.getContext("2d");
        cx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function BrandCard({ ctx }) {
  const { t, isAr, brandLogo, setBrandLogo } = ctx;
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const onFile = async (file) => {
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      const out = await brandPut(dataUrl);
      setBrandLogo(out.logo || null);
      setMsg({ kind: "ok", text: t("brandSaved") });
    } catch (e) {
      setMsg({ kind: "err", text: e.message || "error" });
    }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true); setMsg(null);
    try {
      await brandPut("");
      setBrandLogo(null);
      setMsg({ kind: "ok", text: t("brandSaved") });
    } catch (e) {
      setMsg({ kind: "err", text: e.message || "error" });
    }
    setBusy(false);
  };

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={Sparkles} sub={t("brandSub")}>{t("brand")}</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 72, height: 72, borderRadius: 14, border: `1px solid ${C.line}`, background: brandLogo ? "#fff" : C.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
          {brandLogo
            ? <img src={brandLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6, boxSizing: "border-box" }} />
            : <LogoMark />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="vobl-btn-primary">
              {busy ? <Loader2 size={14} className="vobl-spin" /> : <Upload size={15} />} {t("brandUpload")}
            </button>
            {brandLogo && (
              <button onClick={remove} disabled={busy} className="vobl-btn-ghost" style={{ color: "#B33", borderColor: "#F0D0D0" }}>
                <Trash2 size={15} /> {t("brandRemove")}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; onFile(f); }} />
          </div>
          <div style={{ fontSize: 11.5, marginTop: 8, color: msg ? (msg.kind === "ok" ? C.teal : "#B33") : C.muted }}>
            {msg ? msg.text : (brandLogo ? "" : t("brandNone"))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------- AI server configuration ---------------------- */
function AiConfigCard({ ctx }) {
  const { t, isAr } = ctx;
  const [cfg, setCfg] = useState(null);          // {baseUrl, model, hasKey}
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);          // {kind:'ok'|'err', text}
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    aiGetConfig().then(setCfg).catch(() => setCfg({ baseUrl: "", model: "", hasKey: false }));
  }, []);

  const save = async (extra) => {
    setBusy(true); setMsg(null);
    try {
      const payload = { baseUrl: cfg.baseUrl, model: cfg.model, ...(extra || {}) };
      if (extra && "apiKey" in extra) {
        // explicit (clear)
      } else if (keyInput.trim()) {
        payload.apiKey = keyInput.trim();
      }
      const next = await aiPutConfig(payload);
      setCfg(next); setKeyInput("");
      setMsg({ kind: "ok", text: t("aiSaved") });
    } catch (e) {
      setMsg({ kind: "err", text: e.message });
    }
    setBusy(false);
  };

  const clearKey = () => save({ apiKey: "__clear__" });

  const test = async () => {
    setTesting(true); setMsg(null);
    try {
      const out = await aiComplete("You are a connection test. Reply with the single word: OK.", "Reply with OK.", 16);
      setMsg({ kind: out ? "ok" : "err", text: out ? t("aiTestOk") + " — \"" + out.slice(0, 40) + "\"" : t("aiTestFail") });
    } catch (e) {
      setMsg({ kind: "err", text: t("aiTestFail") + ": " + e.message });
    }
    setTesting(false);
  };

  if (!cfg) {
    return <Card style={{ padding: 18 }}><Loader2 size={16} className="vobl-spin" style={{ color: C.teal }} /></Card>;
  }

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={Server} sub={t("aiConfigSub")}>{t("aiConfig")}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.green, display: "block", marginBottom: 5 }}>{t("aiBaseUrl")}</label>
          <input className="vobl-input" dir="ltr" style={{ width: "100%" }} placeholder="https://litellm.example.com/v1"
            value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.green, display: "block", marginBottom: 5 }}>{t("aiModel")}</label>
          <input className="vobl-input" dir="ltr" style={{ width: "100%" }} placeholder="gpt-4o-mini"
            value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.green, display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
          <KeyRound size={13} /> {t("aiKey")}
        </label>
        <input className="vobl-input" dir="ltr" type="password" autoComplete="new-password" style={{ width: "100%" }}
          placeholder={cfg.hasKey ? "••••••••••••" : "sk-…"}
          value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 5, display: "flex", gap: 10, alignItems: "center" }}>
          <span>{cfg.hasKey ? t("aiKeySet") : t("aiKeyNone")}</span>
          {cfg.hasKey && <button onClick={clearKey} disabled={busy} className="vobl-btn-mini" style={{ color: "#B33" }}>{t("aiClearKey")}</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 9, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => save()} disabled={busy} className="vobl-btn-primary">{busy ? <Loader2 size={14} className="vobl-spin" /> : <Check size={15} />} {t("save")}</button>
        <button onClick={test} disabled={testing || busy} className="vobl-btn-ghost">{testing ? <Loader2 size={14} className="vobl-spin" /> : <Sparkles size={14} />} {t("aiTest")}</button>
        {msg && <span style={{ fontSize: 12, fontWeight: 600, color: msg.kind === "ok" ? C.teal : "#B33" }}>{msg.text}</span>}
      </div>
    </Card>
  );
}

/* ======================================================================== */
/* DRAWER */
function Drawer({ children, onClose, title, isAr }) {
  return (
    <div className="no-print" style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: isAr ? "flex-start" : "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,30,24,0.45)", backdropFilter: "blur(2px)" }} />
      <div className="vobl-drawer vobl-scroll" dir={isAr ? "rtl" : "ltr"} style={{ position: "relative", width: 520, maxWidth: "92vw", background: C.paper, height: "100%", overflowY: "auto", boxShadow: "0 0 40px rgba(0,0,0,0.2)" }}>
        <div style={{ position: "sticky", top: 0, background: C.quote, color: "#fff", padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

/* ======================================================================== */
const AR_RANGE = "U+0600-06FF,U+0750-077F,U+0870-088E,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+FB50-FDFF,U+FE70-FEFF";
const fontFaceCss = [400, 500, 600, 700].map((w) => `
@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:${w};font-display:swap;src:url('/assets/fonts/ibm-plex-sans-arabic-arabic-${w}.woff2') format('woff2');unicode-range:${AR_RANGE}}
@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:${w};font-display:swap;src:url('/assets/fonts/ibm-plex-sans-arabic-latin-${w}.woff2') format('woff2')}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:${w};font-display:swap;src:url('/assets/fonts/ibm-plex-sans-arabic-latin-${w}.woff2') format('woff2')}
@font-face{font-family:'DM Sans';font-style:normal;font-weight:${w};font-display:swap;src:url('/assets/fonts/dm-sans-latin-${w}.woff2') format('woff2')}`).join("");

const baseCss = `
${fontFaceCss}
@keyframes vobl-spin { to { transform: rotate(360deg); } }
@keyframes vobl-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.vobl-spin { animation: vobl-spin 1s linear infinite; }
.vobl-fade { animation: vobl-fade .35s ease; }
.vobl-scroll::-webkit-scrollbar { width: 9px; height: 9px; }
.vobl-scroll::-webkit-scrollbar-thumb { background: #C6D2C9; border-radius: 8px; }
.vobl-scroll::-webkit-scrollbar-track { background: transparent; }
.vobl-input { padding: 9px 11px; border: 1px solid ${C.line}; border-radius: 9px; font-family: inherit; font-size: 13px; color: ${C.ink}; background: #fff; outline: none; }
.vobl-input:focus { border-color: ${C.teal}; box-shadow: 0 0 0 3px rgba(45,161,136,0.12); }
.vobl-btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; background: linear-gradient(135deg, ${C.green}, ${C.teal}); color: #fff; border: none; border-radius: 9px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: box-shadow .18s, transform .18s; }
.vobl-btn-primary:hover { box-shadow: 0 4px 16px rgba(27,125,92,0.22); transform: translateY(-1px); }
.vobl-btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; background: #fff; color: ${C.green}; border: 1px solid ${C.line}; border-radius: 9px; font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all .15s; }
.vobl-btn-ghost:hover { border-color: ${C.teal}; background: ${C.mist}; }
.vobl-btn-ai { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: ${C.amberSoft}; color: ${C.amber}; border: 1px dashed ${C.amber}; border-radius: 9px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.vobl-btn-ai:hover { background: #F2E4C0; }
.vobl-btn-ai:disabled { opacity: 0.6; cursor: default; }
.vobl-btn-danger { display: inline-flex; align-items: center; justify-content: center; padding: 9px 13px; background: #fff; color: #B33; border: 1px solid #F0D0D0; border-radius: 9px; cursor: pointer; }
.vobl-btn-danger:hover { background: #FBEEEE; }
.vobl-btn-mini { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; background: ${C.mist}; color: ${C.green}; border: 1px solid ${C.line}; border-radius: 7px; font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; }
.vobl-btn-mini:hover { background: #E8EEE9; }
.vobl-pill { padding: 7px 13px; border: none; border-radius: 20px; font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all .15s; }
.vobl-nav:hover { background: ${C.greenDeep} !important; }
.vobl-row { transition: box-shadow .15s, transform .15s; }
.vobl-row:hover { box-shadow: 0 4px 16px rgba(27,125,92,0.10); }
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
  #vobl-print { border: none !important; }
  @page { margin: 14mm; }
}
`;
