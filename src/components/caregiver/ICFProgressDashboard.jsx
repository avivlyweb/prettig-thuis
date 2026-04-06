import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { TrendingDown, TrendingUp, Minus, AlertTriangle, Brain, Activity } from "lucide-react";

// Priority domains per EBP evidence (Alzheimer's Association + KNGF)
const PRIORITY_DOMAINS = [
  { code: "d230", label: "Dagelijkse routine", stage: "mild", emoji: "📅" },
  { code: "d5702", label: "Medicatiebeheer", stage: "mild", emoji: "💊" },
  { code: "d540", label: "Aankleden", stage: "moderate", emoji: "👕" },
  { code: "d510", label: "Wassen", stage: "moderate", emoji: "🚿" },
  { code: "d530", label: "Toiletgang", stage: "moderate", emoji: "🚽" },
  { code: "d450", label: "Lopen/Mobiliteit", stage: "severe", emoji: "🚶" },
  { code: "d550", label: "Eten", stage: "severe", emoji: "🍽️" },
];

const SEVERITY_CONFIG = {
  0: { label: "Geen", color: "bg-green-100 text-green-800", bar: "bg-green-400" },
  1: { label: "Licht", color: "bg-yellow-100 text-yellow-800", bar: "bg-yellow-400" },
  2: { label: "Matig", color: "bg-orange-100 text-orange-800", bar: "bg-orange-400" },
  3: { label: "Ernstig", color: "bg-red-100 text-red-800", bar: "bg-red-500" },
  4: { label: "Volledig", color: "bg-red-900 text-white", bar: "bg-red-900" },
};

function computeDomainSeverity(logs) {
  // Per-session severity per domain code, weighted by recency (30-day window)
  const now = Date.now();
  const domainScores = {};

  for (const log of logs) {
    const codes = log.inferred_icf_codes || [];
    const daysAgo = (now - new Date(log.session_start || log.created_date).getTime()) / 86400000;
    const weight = Math.max(0.1, 1 - daysAgo / 30);

    for (const code of codes) {
      const normalized = code.toLowerCase().replace(/\s/g, "");
      if (!domainScores[normalized]) domainScores[normalized] = { total: 0, count: 0, sessions: [] };
      domainScores[normalized].total += weight;
      domainScores[normalized].count += 1;
      domainScores[normalized].sessions.push({ date: log.session_start || log.created_date, weight });
    }
  }

  // Convert to WHO 0-4 severity
  return Object.fromEntries(
    Object.entries(domainScores).map(([code, data]) => {
      let severity;
      if (data.total >= 4) severity = 3;
      else if (data.total >= 2.5) severity = 2;
      else if (data.total >= 1) severity = 1;
      else severity = 0;
      return [code, { severity, count: data.count, sessions: data.sessions }];
    })
  );
}

function computeTrend(logs, code) {
  if (logs.length < 2) return "stable";
  const sorted = [...logs].sort((a, b) => new Date(a.session_start) - new Date(b.session_start));
  const half = Math.ceil(sorted.length / 2);
  const earlyLogs = sorted.slice(0, half);
  const recentLogs = sorted.slice(half);

  const countIn = (arr) => arr.filter(l => (l.inferred_icf_codes || []).some(c => c.toLowerCase().includes(code))).length;
  const earlyCount = countIn(earlyLogs);
  const recentCount = countIn(recentLogs);

  if (recentCount > earlyCount + 0.5) return "worsening";
  if (recentCount < earlyCount - 0.5) return "improving";
  return "stable";
}

export default function ICFProgressDashboard({ userId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainSeverity, setDomainSeverity] = useState({});

  useEffect(() => {
    loadLogs();
  }, [userId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const filter = userId ? { user_id: userId } : {};
      const results = await base44.entities.ICFInterviewLog.filter(filter, "-session_start", 30);
      setLogs(results);
      setDomainSeverity(computeDomainSeverity(results));
    } catch (err) {
      console.error("Error loading ICF logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const TrendIcon = ({ trend }) => {
    if (trend === "worsening") return <TrendingDown className="w-4 h-4 text-red-500" />;
    if (trend === "improving") return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const alertDomains = PRIORITY_DOMAINS.filter(d => {
    const sev = domainSeverity[d.code]?.severity || 0;
    return sev >= 2;
  });

  if (loading) {
    return (
      <Card className="border-2 border-indigo-100 rounded-2xl">
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border border-indigo-100 rounded-xl">
          <CardContent className="p-4 text-center">
            <Brain className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-indigo-900">{logs.length}</p>
            <p className="text-xs text-gray-500">ICF gesprekken</p>
          </CardContent>
        </Card>
        <Card className="border border-purple-100 rounded-xl">
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 text-purple-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-900">{Object.keys(domainSeverity).length}</p>
            <p className="text-xs text-gray-500">Domeinen gedetecteerd</p>
          </CardContent>
        </Card>
        <Card className="border border-red-100 rounded-xl">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-900">{alertDomains.length}</p>
            <p className="text-xs text-gray-500">Aandachtsgebieden</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alertDomains.length > 0 && (
        <Card className="border-2 border-red-100 bg-red-50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="font-semibold text-red-800">Aandacht vereist</span>
              <Badge className="bg-red-100 text-red-700 text-xs">Lokale drempel: ernst ≥ 2</Badge>
            </div>
            <div className="space-y-1">
              {alertDomains.map(d => (
                <div key={d.code} className="flex items-center gap-2 text-sm text-red-800">
                  <span>{d.emoji}</span>
                  <span className="font-medium">{d.label}</span>
                  <span className="text-xs text-red-600">({d.code})</span>
                  <Badge className={`text-xs ml-auto ${SEVERITY_CONFIG[domainSeverity[d.code]?.severity || 0].color}`}>
                    {SEVERITY_CONFIG[domainSeverity[d.code]?.severity || 0].label}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Progress Bars */}
      <Card className="border-2 border-gray-100 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-500" />
            ICF Domeinstatus (WHO 0–4 schaal)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length === 0 && (
            <p className="text-sm text-gray-500 italic">Nog geen ICF-gesprekken beschikbaar.</p>
          )}
          {PRIORITY_DOMAINS.map(domain => {
            const data = domainSeverity[domain.code];
            const severity = data?.severity || 0;
            const config = SEVERITY_CONFIG[severity];
            const trend = computeTrend(logs, domain.code);
            const observed = !!data;

            return (
              <div key={domain.code} className={`rounded-xl p-3 ${observed ? "bg-gray-50" : "bg-gray-50 opacity-50"}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{domain.emoji}</span>
                    <span className="text-sm font-medium text-gray-800">{domain.label}</span>
                    <span className="text-xs text-gray-400 font-mono">{domain.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={trend} />
                    <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${config.bar}`}
                    style={{ width: `${(severity / 4) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0 Geen</span>
                  <span>{observed ? `${data.count} sessies` : "Niet gedetecteerd"}</span>
                  <span>4 Volledig</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-center">
        Drempelwaarden zijn lokale alertlogica, geen gevalideerde klinische MCID (WHO ICF 2001)
      </p>
    </div>
  );
}