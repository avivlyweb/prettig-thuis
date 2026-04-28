import { useState } from "react";
import { Activity, AlertCircle, CheckCircle2, Clock, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { saveCareEvent } from "@/lib/careEvents";
import * as patientDayEvents from "@/lib/patientDayEvents";

const DEFAULT_PATIENT_ID = "demo_patient";

function formatEventTime(timestamp) {
  if (!timestamp) return "Geen tijd";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getIcfTags(event) {
  const tags = event.icf_tags || event.data?.interpreted_icf_codes || [];
  return Array.isArray(tags) ? tags.filter(Boolean) : [];
}

function buildEventsForDay({ userId, startDate }) {
  if (typeof patientDayEvents.buildPatientDayEvents === "function") {
    return patientDayEvents.buildPatientDayEvents({ userId, startDate });
  }

  if (typeof patientDayEvents.buildPatientDayEventPlan === "function") {
    return patientDayEvents.buildPatientDayEventPlan({ userId, date: startDate });
  }

  throw new Error("No patient day event builder is available.");
}

export default function PatientDaySimulator() {
  const [patientId, setPatientId] = useState(DEFAULT_PATIENT_ID);
  const [savedEvents, setSavedEvents] = useState([]);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const runSimulation = async () => {
    const userId = patientId.trim() || DEFAULT_PATIENT_ID;
    const startDate = new Date().toISOString();

    setStatus("running");
    setErrorMessage("");
    setSavedEvents([]);

    try {
      const events = buildEventsForDay({ userId, startDate });
      const saved = [];

      for (const event of events) {
        const savedEvent = await saveCareEvent({
          ...event,
          user_id: event.user_id || userId,
        });
        saved.push(savedEvent);
        setSavedEvents([...saved]);
      }

      setStatus("complete");
    } catch (error) {
      console.error("Patient day simulation failed:", error);
      setErrorMessage(error?.message || "Simulatie kon niet worden opgeslagen.");
      setStatus("error");
    }
  };

  const hasEvents = savedEvents.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3">
          <Badge className="bg-slate-800 text-white hover:bg-slate-800">Demo / monitoring</Badge>
          <div className="space-y-2">
            <h1 className="font-inter text-3xl font-bold text-slate-950">Patient Day Simulator</h1>
            <p className="max-w-3xl text-slate-600">
              Genereer een volledige testdag voor monitoring en professional dashboards. Deze route is bedoeld voor
              demo- en admingebruik, niet voor patienten.
            </p>
          </div>
        </div>

        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <Activity className="h-5 w-5 text-blue-700" />
              Simulatie uitvoeren
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Patient id</span>
              <Input
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                placeholder={DEFAULT_PATIENT_ID}
                className="max-w-md"
              />
            </label>
            <Button onClick={runSimulation} disabled={status === "running"} className="bg-blue-700 hover:bg-blue-800">
              {status === "running" ? "Opslaan..." : "Run patient day"}
            </Button>
          </CardContent>
        </Card>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="flex items-center gap-3 p-5">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-slate-500">Opgeslagen events</p>
                <p className="text-2xl font-bold text-slate-950">{savedEvents.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm md:col-span-2">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-slate-700">Status</p>
              <p className="mt-1 text-slate-600">
                {status === "idle" && "Klaar om een demo dag te genereren."}
                {status === "running" && "Events worden gegenereerd en opgeslagen via saveCareEvent."}
                {status === "complete" && "Simulatie voltooid."}
                {status === "error" && "Simulatie gestopt door een fout."}
              </p>
              {errorMessage && (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {errorMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-950">Event lijst</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasEvents ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                Nog geen events opgeslagen in deze sessie.
              </div>
            ) : (
              <div className="space-y-3">
                {savedEvents.map((event, index) => {
                  const icfTags = getIcfTags(event);
                  return (
                    <div
                      key={event.id || `${event.type}-${event.timestamp}-${index}`}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">{event.type || "care_event"}</p>
                          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <Clock className="h-4 w-4" />
                            {formatEventTime(event.timestamp)}
                          </p>
                        </div>
                        <Badge variant="outline" className="w-fit border-slate-300 text-slate-700">
                          {event.source || event.data?.source || "unknown source"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Tags className="h-4 w-4 text-slate-400" />
                        {icfTags.length > 0 ? (
                          icfTags.map((tag) => (
                            <Badge key={tag} className="bg-blue-50 text-blue-800 hover:bg-blue-50">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">Geen ICF tags</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
