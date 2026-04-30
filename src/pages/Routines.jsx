import { useState, useEffect } from "react";
import { Quest } from "@/entities/Quest";
import { User } from "@/entities/User";
import CompassPro from "../components/compass/CompassPro";
import QuestRevealCard from "../components/compass/QuestRevealCard";
import { Button } from "@/components/ui/button";
import { RotateCcw, Globe } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { saveCareEvent } from "@/lib/careEvents";

const WEDGES_NL = [
  { key: "morning", label: "Ochtend", color: "#F59E0B", icon: "🌅" },
  { key: "midday", label: "Middag", color: "#2563EB", icon: "☀️" },
  { key: "afternoon", label: "Namiddag", color: "#10B981", icon: "🌿" },
  { key: "evening", label: "Avond", color: "#EC4899", icon: "🌙" },
];

const WEDGES_EN = [
  { key: "morning", label: "Morning", color: "#F59E0B", icon: "🌅" },
  { key: "midday", label: "Midday", color: "#2563EB", icon: "☀️" },
  { key: "afternoon", label: "Afternoon", color: "#10B981", icon: "🌿" },
  { key: "evening", label: "Evening", color: "#EC4899", icon: "🌙" },
];

const WEDGE_MAP = {
  morning: 0,
  midday: 1,
  afternoon: 2,
  evening: 3,
};

// NEW: Integrated knowledge base of daily challenges for context engineering
const DAILY_CHALLENGES = [
    { time: 7, problem: "Opstaan", problem_desc: "Ik kom moeilijk uit bed, mijn rug doet pijn.", icf: ["d410", "b280"], dementia_specific: false },
    { time: 7, problem: "Opstaan (Dementie)", problem_desc: "Ik weet niet meer waarom ik ben opgestaan.", icf: ["b144", "d410"], dementia_specific: true },
    { time: 7, problem: "Toilet", problem_desc: "Ik heb moeite met opstaan van het toilet.", icf: ["d530", "b620"], dementia_specific: false },
    { time: 7, problem: "Douchen", problem_desc: "Ik ben bang uit te glijden in de douche.", icf: ["d510", "d520"], dementia_specific: false },
    { time: 7, problem: "Aankleden", problem_desc: "Mijn armen zijn te stijf om mijn trui aan te trekken.", icf: ["d540", "b710"], dementia_specific: false },
    { time: 7, problem: "Aankleden (Dementie)", problem_desc: "Ik trek mijn kleren in verkeerde volgorde aan.", icf: ["d540", "b164"], dementia_specific: true },
    { time: 8, problem: "Medicatie", problem_desc: "Ik vergeet vaak mijn pillen.", icf: ["d570", "b144"], dementia_specific: true },
    { time: 8, problem: "Ontbijt", problem_desc: "Ik heb geen trek meer in brood.", icf: ["b530", "d630"], dementia_specific: false },
    { time: 8, problem: "Ontbijt (Dementie)", problem_desc: "Ik weet niet of ik al gegeten heb.", icf: ["d630", "b144"], dementia_specific: true },
    { time: 8, problem: "Koffie zetten", problem_desc: "Ik tril en mors vaak bij het inschenken.", icf: ["d640", "b765"], dementia_specific: false },
    { time: 9, problem: "Post lezen", problem_desc: "Ik zie de kleine letters niet meer goed.", icf: ["b210", "d166"], dementia_specific: false },
    { time: 9, problem: "Boodschappenlijst maken", problem_desc: "Ik vergeet wat ik nodig heb.", icf: ["b144", "d177"], dementia_specific: true },
    { time: 10, problem: "Wandelen", problem_desc: "Ik loop langzaam en ben bang te vallen.", icf: ["d450", "b755"], dementia_specific: false },
    { time: 10, problem: "Wandelen (Dementie)", problem_desc: "Ik raak de weg kwijt in mijn eigen straat.", icf: ["d450", "b114"], dementia_specific: true },
    { time: 10, problem: "Traplopen", problem_desc: "De trap op gaan kost me veel moeite.", icf: ["d455", "b730"], dementia_specific: false },
    { time: 11, problem: "Burencontact", problem_desc: "Ik mis de praatjes bij de voordeur.", icf: ["d910", "e355"], dementia_specific: false },
    { time: 12, problem: "Fietsen", problem_desc: "Ik durf niet meer op de fiets te stappen.", icf: ["d450", "b710"], dementia_specific: false },
    { time: 12, problem: "Lunch", problem_desc: "Ik eet snel een boterham, te moe om te koken.", icf: ["d630", "b530"], dementia_specific: false },
    { time: 13, problem: "Nieuws kijken", problem_desc: "Ik hoor de TV niet goed meer.", icf: ["b230", "d310"], dementia_specific: false },
    { time: 13, problem: "Huishouden", problem_desc: "Stofzuigen lukt niet meer, te zwaar.", icf: ["d640", "b455"], dementia_specific: false },
    { time: 14, problem: "Administratie", problem_desc: "Ik snap de brieven van de gemeente niet.", icf: ["d360", "b140"], dementia_specific: true },
    { time: 15, problem: "Middagdutje", problem_desc: "Ik val vaak in slaap in de stoel.", icf: ["b134", "d240"], dementia_specific: false },
    { time: 17, problem: "Koken", problem_desc: "Ik raak in de war met recepten.", icf: ["d630", "b164"], dementia_specific: true },
    { time: 18, problem: "Avondeten", problem_desc: "Alleen eten voelt ongezellig.", icf: ["d630", "d920"], dementia_specific: false },
    { time: 18, problem: "Medicatie avond", problem_desc: "Ik weet niet of ik mijn pil al heb ingenomen.", icf: ["d570", "b144"], dementia_specific: true },
    { time: 23, problem: "Naar bed", problem_desc: "Ik kan niet goed inslapen, lig te piekeren.", icf: ["b134", "b152"], dementia_specific: false },
    { time: 23, problem: "Nachttoilet", problem_desc: "Ik moet vaak 's nachts naar de wc.", icf: ["d530", "b620"], dementia_specific: false }
];

export default function RoutinesPage() {
  const [quests, setQuests] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("nl");
  
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [targetWedgeIndex, setTargetWedgeIndex] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showQuestCard, setShowQuestCard] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [questData, userData] = await Promise.all([
        Quest.list(),
        User.me().catch(() => null)
      ]);
      setQuests(questData);
      
      // FOR DEMONSTRATION: If no user is logged in, create a default one.
      if (userData) {
        setUser(userData);
      } else {
        setUser({
          display_name: "Gebruiker",
          dementia_stage: "mild",
          icf_profile: {
            b144_memory_functions: "light_support",
            d230_daily_routine: "light_support",
            d450_walking: "independent",
            d5_self_care: "independent",
            d3_communication: "independent",
            d7_interpersonal: "independent",
            d9_community_leisure: "light_support"
          }
        });
      }

    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const handleSpinRequest = () => {
    if (quests.length === 0 || isSpinning || !user) return;

    setIsSpinning(true);

    // --- NEW: Hyper-Personalized Quest Selection Logic ---
    const now = new Date();
    const hour = now.getHours();
    let timeTag = 'evening';
    if (hour >= 5 && hour < 12) timeTag = 'morning';
    else if (hour >= 12 && hour < 17) timeTag = 'midday';
    else if (hour >= 17 && hour < 21) timeTag = 'afternoon';
    
    // 1. Identify user's support needs from their ICF profile
    const supportDomains = Object.entries(user.icf_profile || {})
      .filter(([, value]) => value !== 'independent')
      .map(([key]) => key.split('_')[0]); // e.g., ['b144', 'd230']

    // 2. Find potential challenges for the user at this time of day
    const potentialChallenges = DAILY_CHALLENGES.filter(challenge => 
      challenge.time === hour && 
      challenge.icf.some(code => supportDomains.includes(code.substring(0, 4)))
    );
    const problemIcfCodes = [...new Set(potentialChallenges.flatMap(c => c.icf))];

    // 3. Filter quests by dementia stage
    const stageAppropriateQuests = quests.filter(q => q.dementia_stage === user.dementia_stage);
    
    // 4. Find quests that match the time and/or solve a potential problem
    const problemSolvingQuests = stageAppropriateQuests.filter(q => 
        q.icf_codes && q.icf_codes.some(code => problemIcfCodes.includes(code))
    );
    
    const timeAppropriateQuests = stageAppropriateQuests.filter(q => 
        q.tags?.includes(timeTag)
    );

    // 5. Prioritize quests: problem-solving quests for this time are best.
    let candidates = problemSolvingQuests.filter(q => q.tags?.includes(timeTag));
    if (candidates.length === 0) candidates = problemSolvingQuests; // Any problem-solving quest
    if (candidates.length === 0) candidates = timeAppropriateQuests; // Any time-appropriate quest
    if (candidates.length === 0) candidates = stageAppropriateQuests; // Any stage-appropriate quest
    if (candidates.length === 0) candidates = quests; // Fallback

    const chosenQuest = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : quests[Math.floor(Math.random() * quests.length)];
    
    const questTimeTag = chosenQuest.tags?.find(t => WEDGE_MAP[t] !== undefined) || 'morning';
    const targetIndex = WEDGE_MAP[questTimeTag];

    const reasons = {
      nl: {
        good: "Een goede keuze voor nu",
        helpful: "Deze activiteit kan je vandaag helpen",
        timely: `Perfect voor de ${timeTag}`,
      },
      en: {
        good: "A great choice for right now",
        helpful: "This activity can help you today",
        timely: `Perfect for the ${timeTag}`,
      },
    };
    const r = reasons[lang];
    let reason = r.good;
    if (problemSolvingQuests.includes(chosenQuest)) reason = r.helpful;
    else if (timeAppropriateQuests.includes(chosenQuest)) reason = r.timely;
    
    setSelectedQuest({ ...chosenQuest, reason });
    setTargetWedgeIndex(targetIndex);
  };

  const handleSpinEnd = () => {
    setIsSpinning(false);
    setShowQuestCard(true);
  };

  const resetCompass = () => {
    setShowQuestCard(false);
    setSelectedQuest(null);
    setTargetWedgeIndex(null);
    // Add a key to CompassPro to force re-render if needed
  };

  const handleQuestStart = async (quest) => {
    try {
      // Log the quest start event for caregiver dashboard
      const questStartEvent = {
        type: "quest_started",
        icf_tags: quest.icf_codes || [],
        confidence: 1.0,
        data: {
          quest_id: quest.quest_id,
          quest_title: quest.title,
          quest_description: quest.description,
          quest_category: quest.category,
          dementia_stage: quest.dementia_stage,
          difficulty: quest.difficulty,
          user_id: user?.id || "demo_user",
          timestamp: new Date().toISOString()
        }
      };

      await saveCareEvent({
        user_id: user?.id || "demo_user",
        ...questStartEvent,
        source: "routines",
      });
      
      console.log("✅ Quest start logged for caregiver dashboard:", questStartEvent);
      
      // Show success message to user
      alert(`Gestart: ${quest.title}\n\nDit is geregistreerd voor je mantelzorger.`);
      
    } catch (error) {
      console.error("Error logging quest start:", error);
      // Still show success to user even if logging fails
      alert(`Gestart: ${quest.title}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="font-lato text-lg text-gray-600">Het kompas wordt voorbereid...</p>
        </div>
      </div>
    );
  }

  const WEDGES = lang === "en" ? WEDGES_EN : WEDGES_NL;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-pink-50 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12 relative">
          <button
            onClick={() => setLang(l => l === "nl" ? "en" : "nl")}
            className="absolute right-0 top-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <Globe className="w-4 h-4" />
            {lang === "nl" ? "English" : "Nederlands"}
          </button>
          <h1 className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
            {lang === "en" ? "Daily Routines" : "Dagelijkse Routines"}
          </h1>
          <p className="font-lato text-xl text-gray-600 max-w-2xl mx-auto">
            {lang === "en"
              ? "Spin the compass to discover a personalised activity for your day."
              : "Draai het kompas om een persoonlijke activiteit te ontdekken die past bij jouw dag."}
          </p>
        </div>
        
        <div className="relative min-h-[500px] flex items-center justify-center">
          <AnimatePresence>
            {!showQuestCard ? (
              <motion.div
                key="compass"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex flex-col items-center space-y-8"
              >
                <CompassPro
                  key={targetWedgeIndex}
                  wedges={WEDGES}
                  targetIndex={targetWedgeIndex}
                  onSpinStart={() => setIsSpinning(true)}
                  onSpinEnd={handleSpinEnd}
                />
                <Button
                  onClick={handleSpinRequest}
                  disabled={isSpinning || !user}
                  className={`tap-target px-8 py-4 text-xl font-bold rounded-2xl transition-all transform focus-strong shadow-xl ${
                    isSpinning || !user
                      ? 'bg-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 hover:shadow-blue-300'
                  } text-white`}
                >
                  {isSpinning ? (
                    <>
                      <div className="animate-spin w-6 h-6 mr-3 border-2 border-white border-t-transparent rounded-full"></div>
                      {lang === "en" ? "Spinning..." : "Aan het draaien..."}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-6 h-6 mr-3" />
                      {lang === "en" ? "Spin the Compass" : "Draai het Kompas"}
                    </>
                  )}
                </Button>
                <p className="font-lato text-sm text-gray-500">
                  {lang === "en" ? `${quests.length} activities available` : `${quests.length} activiteiten beschikbaar`}
                </p>
              </motion.div>
            ) : (
              <motion.div key="quest-card" className="w-full">
                <QuestRevealCard
                  quest={selectedQuest}
                  onReset={resetCompass}
                  onStart={() => handleQuestStart(selectedQuest)}
                  lang={lang}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
