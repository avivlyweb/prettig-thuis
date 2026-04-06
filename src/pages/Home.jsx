import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { RotateCcw, Volume2, ClipboardList, Heart, Footprints, Camera, Sparkles, ChevronRight, Play } from "lucide-react";
import ICFQuestSuggestions from "@/components/compass/ICFQuestSuggestions";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";

export default function Home() {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("");
  const [hour, setHour] = useState(new Date().getHours());

  useEffect(() => {
    base44.auth.me().then(u => {
      setUserId(u?.id);
      setUserName(u?.full_name?.split(" ")[0] || "");
    }).catch(() => {});
    setHour(new Date().getHours());
  }, []);

  const greeting = hour < 12 ? "Goedemorgen" : hour < 17 ? "Goedemiddag" : "Goedenavond";

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] } })
  };

  return (
    <div className="min-h-screen bg-[#FDF8F3] overflow-hidden">
      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-amber-200 to-orange-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-indigo-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-gradient-to-br from-pink-200 to-rose-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 pt-10 pb-20 space-y-8">

        {/* Hero */}
        <motion.div initial="hidden" animate="visible" className="text-center space-y-4 pt-4">
          <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-amber-200 px-4 py-2 rounded-full text-sm font-medium text-amber-800 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {greeting}{userName ? `, ${userName}` : ""}! Fijne dag gewenst 🌿
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="font-inter font-bold text-4xl md:text-6xl text-gray-900 leading-[1.15] tracking-tight">
            Uw dag,
            <span className="block bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400 bg-clip-text text-transparent">
              rustig en vertrouwd.
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="font-lato text-lg md:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
            Vriendelijke begeleiding en slimme activiteiten, afgestemd op uw dag.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={createPageUrl("Routines")}>
              <Button className="group tap-target bg-gray-900 hover:bg-gray-800 text-white px-8 py-5 text-lg font-semibold rounded-2xl transition-all shadow-xl shadow-gray-900/20 flex items-center gap-3">
                <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                Draai het Kompas
              </Button>
            </Link>
            <Link to="/StepByStepRoutine">
              <Button variant="outline" className="tap-target px-8 py-5 text-lg font-semibold rounded-2xl border-2 border-gray-200 hover:border-gray-300 bg-white/80 flex items-center gap-3">
                <Footprints className="w-5 h-5 text-indigo-500" />
                Stap-voor-Stap
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Bento Grid */}
        <motion.div initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] gap-4">

          {/* Large card — Voice */}
          <motion.div variants={fadeUp} custom={4} className="col-span-2 row-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-8 flex flex-col justify-between shadow-lg shadow-amber-200">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Volume2 className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="font-inter font-bold text-2xl text-white">Spraak begeleiding</h3>
              <p className="text-white/80 text-sm leading-relaxed">Warme stem begeleidt u door elke stap van de dag.</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          </motion.div>

          {/* Memory Album */}
          <motion.div variants={fadeUp} custom={5} className="col-span-2 row-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-400 to-rose-500 p-6 flex items-center gap-5 shadow-lg shadow-pink-200">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-inter font-bold text-lg text-white">Memory Album</h3>
              <p className="text-white/80 text-xs">Foto's en herinneringen dichtbij</p>
            </div>
            <Link to={createPageUrl("MemoryAlbum")} className="ml-auto">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </Link>
          </motion.div>

          {/* Gouden Momenten */}
          <motion.div variants={fadeUp} custom={6} className="col-span-2 row-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-400 to-indigo-500 p-6 flex items-center gap-5 shadow-lg shadow-purple-200">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Play className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-inter font-bold text-lg text-white">Gouden Momenten</h3>
              <p className="text-white/80 text-xs">Diashow van uw mooiste momenten</p>
            </div>
            <Link to={createPageUrl("GoudenMomenten")} className="ml-auto">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </Link>
          </motion.div>

          {/* Step by step */}
          <motion.div variants={fadeUp} custom={7} className="col-span-2 row-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-400 to-emerald-500 p-6 flex items-center gap-5 shadow-lg shadow-teal-200">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-inter font-bold text-lg text-white">Dagelijkse Routines</h3>
              <p className="text-white/80 text-xs">Aankleden, wassen, medicatie</p>
            </div>
            <Link to="/StepByStepRoutine" className="ml-auto">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </Link>
          </motion.div>

          {/* Caregiver card */}
          <motion.div variants={fadeUp} custom={8} className="col-span-2 row-span-1 relative overflow-hidden rounded-3xl bg-white border-2 border-gray-100 p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-inter font-bold text-lg text-gray-900">Mantelzorger Dashboard</h3>
              <p className="text-gray-500 text-xs">Activiteiten volgen en instellen</p>
            </div>
            <Link to={createPageUrl("Caregiver")}>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>
            </Link>
          </motion.div>

        </motion.div>

        {/* Personalized suggestions */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={9} className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="font-inter font-semibold text-lg text-gray-900">Voor u aanbevolen</h2>
          </div>
          <ICFQuestSuggestions userId={userId} onQuestSelect={() => {
            window.location.href = createPageUrl("Routines");
          }} />
        </motion.div>

      </div>
    </div>
  );
}