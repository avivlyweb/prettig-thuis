---
name: prettig-thuis-frontend
description: Create distinctive, dementia-friendly frontend interfaces for Prettig Thuis. Use when user asks to build pages, components, dashboards, voice interfaces, or any UI for the app. Generates production-grade React code with consistent accessible design patterns for elderly users with cognitive impairments.
metadata:
  author: prettig-thuis
  version: 1.0.0
  category: frontend-design
---

# Prettig Thuis Frontend Design Skill

## Core Design Philosophy

Every interface in Prettig Thuis must be **safe, calm, and clear** for older adults with mild-to-moderate dementia. Design choices are clinical decisions — confusing UI causes real distress.

## Instructions

### Step 1: Identify the Component Type

Before writing code, classify what you're building:

| Type | Examples | Key Constraints |
|---|---|---|
| **Voice interface** | VoiceHome, Talk2_0 | Minimal controls, huge touch targets, real-time status |
| **Patient-facing page** | Routines, MemoryAlbum | Simple navigation, calming colors, no cognitive overload |
| **Caregiver dashboard** | Caregiver, ICFInterviewDashboard | Data-dense but scannable, alerts prominent |
| **Admin tool** | Upload pages, data management | Standard UI, power-user patterns OK |
| **Shared component** | Cards, buttons, status indicators | Must work across all contexts |

### Step 2: Apply Design System

#### Tech Stack (ALWAYS use these)

```javascript
// Core imports pattern
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Icons from Lucide
import { Mic, Heart, Activity, AlertTriangle } from 'lucide-react';
```

- **React 18** with functional components and hooks
- **TailwindCSS 3** for all styling (no inline styles, no CSS modules)
- **Radix UI** via `@/components/ui/` for accessible primitives
- **Lucide React** for icons
- **No external UI libraries** — use only what's in `src/components/ui/`

#### Color Palette

```
Patient-facing:
- Primary actions:    bg-blue-600 hover:bg-blue-700 text-white
- Success/calm:       bg-green-50 border-green-200 text-green-600
- Warning/attention:  bg-amber-50 border-amber-200 text-amber-600
- Error/urgent:       bg-red-50 border-red-200 text-red-600
- Neutral/idle:       bg-gray-50 border-gray-200 text-gray-500
- Page background:    bg-slate-50
- Card background:    bg-white

Caregiver dashboards:
- Same palette but denser layout is acceptable
- Use Badge components for ICF codes and status labels
```

#### Typography & Sizing

```
Patient-facing text:
- Status/heading:     text-2xl font-semibold font-inter
- Body/captions:      text-xl font-medium font-lato
- Instructions:       text-lg font-lato
- Small labels:       text-sm text-gray-600

Touch targets (CRITICAL):
- Primary buttons:    min px-8 py-6 text-xl rounded-2xl
- Secondary buttons:  min px-6 py-3 text-base rounded-lg
- All interactive:    minimum 48x48px tap area (tap-target class)
```

#### Layout Patterns

```
Page wrapper:
  <div className="min-h-screen bg-slate-50 font-lato flex items-center justify-center p-4">

Main card:
  <Card className="w-full max-w-2xl border-2 border-blue-100 shadow-xl rounded-3xl">
    <CardContent className="p-6 sm:p-8 space-y-6">

Status indicator:
  <div className={`text-center p-6 rounded-2xl border-2 transition-all duration-300 ${bgColor} ${borderColor}`}>
    <StatusIcon className={`w-16 h-16 ${color} ${pulse ? 'animate-pulse' : ''}`} />

Button grid:
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

### Step 3: Apply Dementia-Friendly UX Rules

CRITICAL — these are non-negotiable for patient-facing interfaces:

1. **Maximum 2 choices at a time** — Never present more than 2 options. Use "X of Y?" not "Pick from A, B, C, D, E"

2. **Short text only** — Headings max 5 words. Body text max 15 words per line. Use the patient's name when possible.

3. **No cognitive load** — No dropdowns, no multi-step forms, no pagination. One screen = one task.

4. **Visual status always visible** — Users must always know what state the app is in. Use icon + color + text together (never rely on color alone).

5. **Large, obvious touch targets** — Primary actions: `px-8 py-6 text-xl rounded-2xl`. Full-width on mobile. High contrast.

6. **Calm animations only** — `animate-pulse` for "listening" states. `transition-all duration-300` for state changes. No bouncing, sliding, or fast motion.

7. **Repetition is OK** — If the user needs a "Repeat" button, include it. If status was shown before, show it again.

8. **Dutch language only** — All user-facing text in Dutch. Button labels, status messages, headings — everything.

9. **Greeting by time of day** — Morning: "Goedemorgen", Midday: "Goedemiddag", Evening: "Goedenavond"

10. **No error jargon** — Instead of "Error 500: Internal Server Error" → "Er is iets fout gegaan. Probeer het opnieuw."

### Step 4: Follow Existing Component Patterns

#### Voice Interface Pattern (reference: `RealtimeVoiceAssistant2_0.jsx`)

```jsx
// Status map pattern — map internal states to visual indicators
const statusMap = {
  'Ik luister...': {
    icon: Mic,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    pulse: true,
    text: 'Ik luister...'
  },
  // ... more states
};

// Three-zone layout: Status → Content → Actions
return (
  <div className="min-h-screen bg-slate-50 font-lato flex items-center justify-center p-4">
    <Card className="w-full max-w-2xl border-2 border-blue-100 shadow-xl rounded-3xl">
      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Zone 1: Visual Status */}
        <StatusIndicator />
        {/* Zone 2: Content (captions, transcript, etc.) */}
        <ContentArea />
        {/* Zone 3: Actions (start/stop, quick actions) */}
        <ActionButtons />
      </CardContent>
    </Card>
  </div>
);
```

#### Dashboard Pattern (reference: `Caregiver.jsx`, `ICFInterviewDashboard.jsx`)

```jsx
// Tab-based layout for multiple data views
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overzicht</TabsTrigger>
    <TabsTrigger value="analytics">Analyse</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    {/* Summary cards in grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard title="Alerts" icon={AlertTriangle} value={count} />
    </div>
    {/* Activity feed */}
    <ActivityFeed events={events} />
  </TabsContent>
</Tabs>
```

#### Care Event Integration Pattern

```jsx
// All patient-facing components should log care events
import { CareEventBackend } from '../services/voiceAssistant';

const careEventBackend = useRef(new CareEventBackend());

// Log interactions
await careEventBackend.current.postEvent(userId, {
  type: "checkin",
  icf_tags: detectedCodes,
  confidence: score,
  session_id: sessionId,
  data: {
    source: "component_name",
    speaker: "user",
    user_text: text,
    timestamp: new Date().toISOString(),
  },
});
```

### Step 5: Validate Before Delivering

Checklist before presenting any frontend code:

- [ ] All text is in Dutch
- [ ] Touch targets are minimum 48x48px
- [ ] Maximum 2 choices presented to patient at once
- [ ] Status is always visually indicated (icon + color + text)
- [ ] Uses only `@/components/ui/` primitives (no external libraries)
- [ ] Responsive: works on mobile (`sm:` breakpoints used)
- [ ] No dropdowns, multi-step forms, or pagination for patient views
- [ ] Error states show friendly Dutch messages
- [ ] Component follows existing file structure in `src/components/` or `src/pages/`
- [ ] Care events are logged for clinical interactions

## Examples

### Example 1: New patient-facing card

User says: "Add a medication reminder card"

```jsx
<Card className="border-2 border-blue-100 rounded-3xl shadow-lg">
  <CardContent className="p-6 text-center space-y-4">
    <Heart className="w-12 h-12 text-blue-600 mx-auto" />
    <h3 className="font-inter font-semibold text-2xl text-gray-800">
      Medicijntijd
    </h3>
    <p className="font-lato text-xl text-gray-600">
      Heb je je ochtendmedicijnen al genomen?
    </p>
    <div className="grid grid-cols-2 gap-4 pt-2">
      <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-xl rounded-2xl">
        Ja
      </Button>
      <Button className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-6 text-xl rounded-2xl">
        Nog niet
      </Button>
    </div>
  </CardContent>
</Card>
```

### Example 2: ICF code badge display

```jsx
<div className="flex flex-wrap gap-2">
  {icfCodes.map(code => (
    <Badge key={code} variant="outline" className="text-sm px-3 py-1 rounded-full border-purple-200 bg-purple-50 text-purple-700">
      {code}
    </Badge>
  ))}
</div>
```

## File Organization

New pages go in: `src/pages/`
New components go in: `src/components/` (grouped by feature)
New UI primitives go in: `src/components/ui/`
Service logic goes in: `src/components/services/` or `src/lib/`

## References

Key files to study for patterns:
- `src/components/voice/RealtimeVoiceAssistant2_0.jsx` — Voice UI gold standard
- `src/pages/Caregiver.jsx` — Dashboard pattern
- `src/pages/ICFInterviewDashboard.jsx` — Analytics pattern
- `src/components/caregiver/AlertSystem.jsx` — Alert feed pattern
- `src/lib/careEvents.js` — Event persistence pattern
