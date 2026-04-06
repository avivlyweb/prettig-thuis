import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { caregiverInsights } from "@/functions/caregiverInsights";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle,
  CheckCircle, Lightbulb, RefreshCw, Activity
} from "lucide-react";

const ROUTINE_LABELS = {
  morning_routine: "Ochtend",
  dressing: "Aankleden",
  washing: "Wassen",
  medication: "Medicijnen",
  toileting: "Toilet",
  eating: "Eten",
  walking: "Bewegen",
  light_housework: "Huishouden",
};

export default function RoutineTrendsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await caregiverInsights({});
      setData(res.data || res);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500">AI analyseert gegevens...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="text-center py-12 text-red-500">
      <p>Kon gegevens niet laden: {error}</p>
      <Button onClick={load} className="mt-4" variant="outline">Opnieuw proberen</Button>
    </div>
  );

  if (!data) return null;

  const { insights, chartData, completionsByRoutine, escalationsByRoutine, totals } = data;

  const trendIcon = {
    verbeterend: <TrendingUp className="w-5 h-5 text-green-600" />,
    stabiel: <Minus className="w-5 h-5 text-blue-500" />,
    aandacht_nodig: <TrendingDown className="w-5 h-5 text-red-500" />,
  }[insights?.overall_trend] || <Minus className="w-5 h-5 text-gray-400" />;

  const trendColor = {
    verbeterend: "bg-green-50 border-green-200",
    stabiel: "bg-blue-50 border-blue-200",
    aandacht_nodig: "bg-red-50 border-red-200",
  }[insights?.overall_trend] || "bg-gray-50 border-gray-200";

  const formattedChartData = (chartData || []).map(d => ({
    dag: new Date(d.day).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" }),
    Routines: d.routines,
    Escalaties: d.escalations,
  }));

  const routineBarData = Object.entries(completionsByRoutine || {}).map(([k, v]) => ({
    name: ROUTINE_LABELS[k] || k,
    Voltooid: v,
    Moeite: escalationsByRoutine?.[k] || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-900">{totals?.events || 0}</p>
          <p className="text-xs text-blue-700 mt-1">Totale activiteiten</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-900">{totals?.completions || 0}</p>
          <p className="text-xs text-green-700 mt-1">Routines voltooid</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-900">{totals?.escalations || 0}</p>
          <p className="text-xs text-amber-700 mt-1">Moeilijke momenten</p>
        </div>
      </div>

      {/* AI Summary */}
      {insights && (
        <Card className={`border-2 rounded-2xl ${trendColor}`}>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-800">AI Samenvatting</span>
              {trendIcon}
              <Badge variant="outline" className="ml-auto capitalize">{insights.overall_trend?.replace("_", " ")}</Badge>
            </div>
            <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* 7-day activity chart */}
      <Card className="border-2 border-gray-100 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="font-inter text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Activiteit afgelopen 7 dagen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formattedChartData} barCategoryGap="30%">
              <XAxis dataKey="dag" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Routines" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Escalaties" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Per-routine chart */}
      {routineBarData.length > 0 && (
        <Card className="border-2 border-gray-100 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-inter text-base">Per routine</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={routineBarData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Voltooid" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Moeite" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Positief */}
          <Card className="border-2 border-green-100 rounded-2xl bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Positief
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(insights.positive_observations || []).map((obs, i) => (
                <p key={i} className="text-sm text-green-900 leading-snug">• {obs}</p>
              ))}
            </CardContent>
          </Card>

          {/* Aandachtspunten */}
          <Card className="border-2 border-amber-100 rounded-2xl bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Aandacht
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(insights.concerns || []).map((c, i) => (
                <p key={i} className="text-sm text-amber-900 leading-snug">• {c}</p>
              ))}
            </CardContent>
          </Card>

          {/* Aanbevelingen */}
          <Card className="border-2 border-purple-100 rounded-2xl bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> Aanbevelingen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(insights.recommendations || []).map((r, i) => (
                <p key={i} className="text-sm text-purple-900 leading-snug">• {r}</p>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Prediction */}
      {insights?.prediction && (
        <Card className="border-2 border-indigo-100 rounded-2xl bg-indigo-50">
          <CardContent className="p-4 flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-indigo-800 text-sm">Vooruitblik</p>
              <p className="text-sm text-indigo-900 mt-1">{insights.prediction}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={load} variant="outline" className="gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Analyse vernieuwen
        </Button>
      </div>
    </div>
  );
}