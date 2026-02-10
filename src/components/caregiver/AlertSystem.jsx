
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Phone,
  X
} from 'lucide-react';
import {
  dismissCaregiverAlert,
  listCareEvents,
  listCaregiverAlerts,
  markCaregiverAlertRead,
} from '@/lib/careEvents';

export default function AlertSystem() {
  const [alerts, setAlerts] = useState([]);
  const [careEvents, setCareEvents] = useState([]);

  useEffect(() => {
    loadAlerts();
    loadCareEvents();

    // Poll for new alerts every 30 seconds
    const interval = setInterval(() => {
      loadAlerts();
      loadCareEvents();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    const loaded = await listCaregiverAlerts({ limit: 300 });
    setAlerts(loaded);
  };

  const loadCareEvents = async () => {
    const loaded = await listCareEvents({ limit: 300 });
    setCareEvents(loaded);
  };

  const markAlertRead = async (alert) => {
    if (!alert) return;
    await markCaregiverAlertRead(alert);
    await loadAlerts();
  };

  const dismissAlert = async (alert) => {
    if (!alert) return;
    await dismissCaregiverAlert(alert);
    await loadAlerts();
  };

  const getRecentActivity = () => {
    const today = new Date().toDateString();
    return careEvents.filter(event => {
      const eventDate = new Date(event.timestamp).toDateString();
      return eventDate === today;
    }).slice(-10);
  };

  const unreadAlerts = alerts.filter(alert => !alert.read);
  const recentActivity = getRecentActivity();

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      {unreadAlerts.length > 0 && (
        <Card className="border-2 border-red-200 bg-red-50 rounded-2xl">
          <CardHeader>
            <CardTitle className="font-inter flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              Actieve Waarschuwingen ({unreadAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {unreadAlerts.map((alert) => (
              <div key={alert.id || `${alert.timestamp}-${alert.title}`} className="bg-white rounded-xl p-4 border border-red-200">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        alert.level === 'urgent' ? 'bg-red-100 text-red-800' :
                        alert.level === 'attention' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {alert.level === 'urgent' ? 'Urgent' :
                         alert.level === 'attention' ? 'Aandacht' : 'Info'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString('nl-NL')}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{alert.title}</h3>
                    <p className="text-gray-700 text-sm">{alert.message}</p>
                  </div>
                  <div className="flex gap-2">
                    {alert.level === 'urgent' && (
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                        <Phone className="w-3 h-3 mr-1" />
                        Bel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAlertRead(alert)}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Gelezen
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissAlert(alert)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Stream */}
      <Card className="border-2 border-gray-200 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-inter flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Recente Activiteit (Vandaag)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nog geen activiteit vandaag</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.reverse().map((event, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    event.type === 'quest_started' ? 'bg-green-500' :
                    event.type === 'incident' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {getEventDescription(event)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(event.timestamp).toLocaleTimeString('nl-NL')} •
                          {event.icf_tags && event.icf_tags.length > 0 && (
                            <span className="ml-1">
                              ICF: {event.icf_tags.join(', ')} •
                            </span>
                          )}
                          Vertrouwen: {Math.round(event.confidence * 100)}%
                        </p>
                        {event.type === 'quest_started' && event.data && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              {event.data.difficulty}
                            </span>
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {event.data.dementia_stage}
                            </span>
                            {event.icf_tags?.map(code => (
                              <span key={code} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                                {code}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                    {event.data && Object.keys(event.data).length > 0 && event.type !== 'quest_started' && (
                      <div className="mt-2 text-xs text-gray-600 bg-white rounded p-2">
                        {JSON.stringify(event.data, null, 1)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <Card className="border-2 border-green-100 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-inter flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            Dagelijkse Samenvatting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {recentActivity.filter(e => e.type === 'quest_started').length}
              </p>
              <p className="text-sm text-gray-600">Activiteiten Gestart</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {recentActivity.filter(e => e.type === 'adl_complete' && e.data?.result === 'skipped').length}
              </p>
              <p className="text-sm text-gray-600">Overgeslagen</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {recentActivity.filter(e => e.type === 'memory_view').length}
              </p>
              <p className="text-sm text-gray-600">Herinneringen</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {recentActivity.filter(e => e.type === 'compass_choice').length}
              </p>
              <p className="text-sm text-gray-600">Kompas Draaien</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getEventDescription(event) {
  switch (event.type) {
    case 'quest_started':
      return `Activiteit gestart: "${event.data?.quest_title}" (${event.data?.quest_category})`;
    case 'greeting':
      return event.data?.is_dark_outside ?
        'Ochtendgroet (donker buiten)' :
        'Dagelijkse groet';
    case 'adl_complete':
      return `ADL ${event.data?.step_id} ${event.data?.result === 'done' ? 'voltooid' : 'overgeslagen'}`;
    case 'compass_choice':
      return `Kompas activiteit gekozen: ${event.data?.quest_id}`;
    case 'memory_view':
      return `Herinnering bekeken: ${event.data?.category || 'Onbekend'}`;
    case 'safety_prompt':
      return `Veiligheidswaarschuwing: ${event.data?.topic}`;
    case 'incident':
      return `Incident: ${event.data?.kind} (${event.data?.severity || 'onbekend'})`;
    default:
      return `${event.type} gebeurtenis`;
  }
}
