
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  Mic, 
  Heart, 
  Shield, 
  Sparkles, 
  ArrowRight, 
  Users,
  BarChart3,
  Volume2,
  Camera,
  User,
  Clock,
  Home as HomeIcon,
  Scale,
  Lock,
  Badge as BadgeIcon,
  Play,
  Video,
  Activity
} from 'lucide-react';

export default function About() {
  const [expandedPillar, setExpandedPillar] = useState(null);

  // Animation variants for staggered reveals
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: 'easeInOut' }
    }
  };

  const pillars = [
    {
      id: 'compass',
      icon: Compass,
      title: "Het Kompas",
      description: "Slimme, gepersonaliseerde dagelijkse activiteiten op maat van jouw ICF-profiel.",
      expanded: "Gebruikt geavanceerde algoritmes om de perfecte activiteit te kiezen gebaseerd op jouw ICF-profiel, tijdstip van de dag, en persoonlijke voorkeuren. Van ochtendactiviteiten tot ontspannen avondmomenten, elke keuze is betekenisvol en afgestemd op jouw behoeften.",
      color: "blue"
    },
    {
      id: 'voice',
      icon: Mic,
      title: "De Luisterende Stem",
      description: "Een real-time spraakassistent die echt begrijpt en natuurlijk reageert.",
      expanded: "Geavanceerde AI-gestuurde spraakassistent die real-time gesprekken voert, empathisch reageert op emoties, en helpt bij dagelijkse taken. Gebruikt OpenAI's nieuwste technologie voor natuurlijke, vloeiende conversaties in het Nederlands.",
      color: "green"
    },
    {
      id: 'memories',
      icon: Heart,
      title: "Het Multimedia Geheugenalbum",
      description: "Foto's, video's én herinneringsvragen die gesprekken op gang brengen.",
      expanded: "Bewaar kostbare herinneringen met foto's, video's en persoonlijke stemopnames. Inclusief slimme herinneringsprompts die gesprekken stimuleren en sociale verbinding bevorderen. Toegankelijk op elk moment voor troost en vreugde.",
      color: "pink"
    },
    {
      id: 'frame',
      icon: Play,
      title: "Gouden Momenten",
      description: "Een digitaal fotolijstje dat continue vreugde brengt met automatische diavoorstellingen.",
      expanded: "Net als een echte digitale fotolijst toont deze functie continu mooie herinneringen in een rustgevende slideshow. Ondersteunt zowel foto's als video's, perfect om de hele dag te laten draaien voor passieve genietvol kijken.",
      color: "amber"
    },
    {
      id: 'caregiver',
      icon: Shield,
      title: "Slimme Zorgondersteuning",
      description: "Mantelzorgers krijgen waardevolle inzichten via hun eigen dashboard met activiteitspatronen.",
      expanded: "Real-time inzichten in routines, welzijn en activiteitspatronen zonder 24/7 beschikbaarheid. Intelligente waarschuwingen, ICF-code tracking, en voortgangsrapportages helpen patronen herkennen voor betere zorg.",
      color: "indigo"
    }
  ];

  return (
    <div className="bg-slate-50 text-gray-800 overflow-hidden">
      {/* Dynamic Hero Section - Problem to Promise */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="relative min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50 flex items-center"
      >
        {/* Problem State */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 4, duration: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50"
        >
          <div className="text-center px-4 max-w-4xl">
            <motion.h1 
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="font-inter font-bold text-3xl md:text-5xl text-gray-800 mb-6"
            >
              Dementie in Nederland: Een Groeiende Uitdaging
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              className="space-y-4"
            >
              <p className="text-xl text-gray-600 font-medium">
                <span className="text-3xl font-bold text-red-600">300.000+</span> patiënten ervaren dagelijks uitdagingen
              </p>
              <p className="text-xl text-gray-600 font-medium">
                <span className="text-3xl font-bold text-orange-600">70%</span> van de mantelzorgers voelt zich overbelast
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Solution State */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5, duration: 1 }}
          className="w-full flex items-center justify-center px-4"
        >
          <div className="text-center max-w-5xl">
            <motion.h1 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 5.5, duration: 0.8 }}
              className="font-inter font-bold text-4xl md:text-6xl text-gray-900 leading-tight mb-6"
            >
              Prettig Thuis: <span className="text-blue-600">Een Complete Digitale Zorgomgeving</span>
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 6, duration: 0.8 }}
              className="font-lato text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10"
            >
              Een intelligente, alles-in-één zorgassistent die ouderen helpt langer zelfstandig te wonen door slimme personalisatie, empathische technologie en mantelzorgers gemoedsrust te geven.
            </motion.p>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 6.5, duration: 0.6 }}
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={createPageUrl('Routines')}>
                  <Button className="tap-target bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-2xl transition-all transform hover:scale-105 focus-strong shadow-xl">
                    <Compass className="w-6 h-6 mr-3" />
                    Ontdek het Kompas
                  </Button>
                </Link>
                <Link to={createPageUrl('GoudenMomenten')}>
                  <Button className="tap-target bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 text-lg font-semibold rounded-2xl transition-all transform hover:scale-105 focus-strong shadow-xl">
                    <Play className="w-6 h-6 mr-3" />
                    Gouden Momenten
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* The Story of Mevrouw Jansen & Anna */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.h2 variants={itemVariants} className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
              Het Verhaal van Mevrouw Jansen & Anna
            </motion.h2>
            <motion.p variants={itemVariants} className="font-lato text-lg text-gray-600 max-w-2xl mx-auto">
              Twee levens, één uitdaging. Ontdek hoe Prettig Thuis het verschil maakt.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={itemVariants}
            >
              <Card className="border-2 border-red-100 bg-red-50 rounded-2xl shadow-lg h-full">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <User className="w-8 h-8 text-red-700" />
                  </div>
                  <h3 className="font-inter font-bold text-2xl text-red-800 mb-4 text-center">
                    Mevrouw Jansen: Van Verwarring naar Vertrouwen
                  </h3>
                  <p className="font-lato text-gray-700 leading-relaxed text-center mb-4">
                    Mevrouw Jansen, 73 jaar uit Amsterdam, worstelde met dagelijkse taken. 
                    Kleine dingen werden steeds grotere uitdagingen.
                  </p>
                  <p className="font-lato text-green-700 leading-relaxed text-center font-medium">
                    <strong>Nu:</strong> Het Kompas kiest elke dag activiteiten die bij haar passen. 
                    Gouden Momenten toont continu mooie herinneringen, en de spraakassistent 
                    is altijd beschikbaar voor een vriendelijk gesprek.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={itemVariants}
            >
              <Card className="border-2 border-orange-100 bg-orange-50 rounded-2xl shadow-lg h-full">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="w-8 h-8 text-orange-700" />
                  </div>
                  <h3 className="font-inter font-bold text-2xl text-orange-800 mb-4 text-center">
                    Anna: Van Overbelasting naar Overzicht
                  </h3>
                  <p className="font-lato text-gray-700 leading-relaxed text-center mb-4">
                    Anna combineerde werk met zorg, voelde zich 24/7 verantwoordelijk en 
                    raakte steeds vaker uitgeput.
                  </p>
                  <p className="font-lato text-blue-700 leading-relaxed text-center font-medium">
                    <strong>Nu:</strong> Het caregivers dashboard toont haar precies welke activiteiten 
                    mama doet, herkent patronen via ICF-tracking, en waarschuwt alleen wanneer nodig. 
                    Anna heeft weer rust én overzicht.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={itemVariants}
            className="text-center mt-12"
          >
            <div className="inline-flex items-center gap-3 bg-green-100 px-6 py-3 rounded-full">
              <Sparkles className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Prettig Thuis: van uitdaging naar kansen</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Pillars Showcase - Enhanced */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.h2 variants={itemVariants} className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
              Vijf Pijlers van Innovatieve Zorg
            </motion.h2>
            <motion.p variants={itemVariants} className="font-lato text-lg text-gray-600 max-w-3xl mx-auto">
              Een complete digitale zorgomgeving die technologie combineert met empathie voor betekenisvolle dagelijkse ondersteuning.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {pillars.map((pillar, index) => (
              <motion.div
                key={pillar.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={itemVariants}
                custom={index}
                className="h-full"
              >
                <Card 
                  className={`text-center p-6 h-full border-2 transition-all duration-300 cursor-pointer rounded-2xl shadow-sm hover:shadow-xl ${
                    expandedPillar === pillar.id 
                      ? `border-${pillar.color}-300 bg-${pillar.color}-50` 
                      : `border-gray-100 hover:border-${pillar.color}-200 bg-white`
                  }`}
                  onClick={() => setExpandedPillar(expandedPillar === pillar.id ? null : pillar.id)}
                >
                  <div className={`w-16 h-16 bg-${pillar.color}-100 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform ${
                    expandedPillar === pillar.id ? 'scale-110' : ''
                  }`}>
                    <pillar.icon className={`w-8 h-8 text-${pillar.color}-600`} />
                  </div>
                  <h3 className="font-inter font-semibold text-lg text-gray-900 mb-3">
                    {pillar.title}
                  </h3>
                  <p className="font-lato text-gray-600 mb-4 text-sm">
                    {pillar.description}
                  </p>
                  
                  <AnimatePresence>
                    {expandedPillar === pillar.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className={`bg-${pillar.color}-100 rounded-lg p-4 mt-4`}>
                          <p className={`font-lato text-xs text-${pillar.color}-800 leading-relaxed`}>
                            {pillar.expanded}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="flex items-center justify-center mt-4 text-xs text-gray-500">
                    <span>Klik voor meer info</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How Prettig Thuis Works - Enhanced */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.h2 variants={itemVariants} className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
              Hoe Prettig Thuis Werkt: AI die Echt Begrijpt
            </motion.h2>
            <motion.p variants={itemVariants} className="font-lato text-lg text-gray-600 max-w-3xl mx-auto">
              Geavanceerde technologie die voelt als een vertrouwde vriend, compleet met slimme personalisatie en empathische interactie.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Activity,
                title: "ICF-Gebaseerde Personalisatie",
                description: "Het systeem gebruikt ICF (International Classification of Functioning) profielen om activiteiten perfect af te stemmen op individuele vaardigheden en behoeften."
              },
              {
                icon: Volume2,
                title: "Real-time Spraak AI",
                description: "Geavanceerde OpenAI technologie voor natuurlijke, empathische gesprekken die echt luisteren en begrijpen, niet alleen commando's uitvoeren."
              },
              {
                icon: Video,
                title: "Multimedia Herinneringen",
                description: "Ondersteunt zowel foto's als video's met slimme herinneringsprompts die gesprekken stimuleren en sociale verbinding bevorderen."
              },
              {
                icon: BarChart3,
                title: "Patroonherkenning & Voorspelling",
                description: "Analyseert activiteitspatronen om trends te herkennen, voorkeuren te leren, en mantelzorgers waardevolle inzichten te geven voor betere zorg."
              },
              {
                icon: Sparkles,
                title: "Zelflerend Systeem",
                description: "Het systeem leert continu van interacties, voorkeuren en successen om steeds betere, meer betekenisvolle ervaringen te bieden."
              },
              {
                icon: HomeIcon,
                title: "Alles-in-Één Zorgomgeving",
                description: "Van dagelijks kompas tot digitale fotolijst tot caregiver dashboard - alles naadloos geïntegreerd in één toegankelijke applicatie."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={itemVariants}
                custom={index}
              >
                <Card className="border-2 border-blue-100 hover:border-blue-200 transition-all rounded-2xl h-full">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-inter font-semibold text-lg text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="font-lato text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story - Founders */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.h2 variants={itemVariants} className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
              Ons Verhaal: Gedreven door Passie en Innovatie
            </motion.h2>
            <motion.p variants={itemVariants} className="font-lato text-lg text-gray-600 max-w-3xl mx-auto mb-8">
              Prettig Thuis is tot stand gekomen vanuit het <span className="font-semibold text-blue-600">Smart Health and Vitality Lab</span>, 
              een initiatief van Jesse Aarden en Aviv Hidrian.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={itemVariants}
            >
              <Card className="border-2 border-blue-200 bg-white rounded-2xl shadow-lg h-full">
                <CardContent className="p-8 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl font-bold text-white">JA</span>
                  </div>
                  <h3 className="font-inter font-bold text-2xl text-gray-900 mb-2">Jesse Aarden</h3>
                  <p className="font-medium text-blue-600 mb-4">Co-founder, Smart Health and Vitality Lab</p>
                  <p className="font-lato text-gray-700 leading-relaxed italic">
                    "Technologie moet zorg menselijker maken, niet gecompliceerder. Bij Prettig Thuis combineren we geavanceerde AI 
                    met echte empathie om families te ondersteunen in uitdagende tijden."
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={itemVariants}
            >
              <Card className="border-2 border-indigo-200 bg-white rounded-2xl shadow-lg h-full">
                <CardContent className="p-8 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl font-bold text-white">AH</span>
                  </div>
                  <h3 className="font-inter font-bold text-2xl text-gray-900 mb-2">Aviv Hidrian</h3>
                  <p className="font-medium text-indigo-600 mb-4">Co-founder, AVIVLY and PT-CHARLIE</p>
                  <p className="font-lato text-gray-700 leading-relaxed italic">
                    "Elke gebruiker verdient zorg die aanvoelt als een warme omhelzing. Door eenvoud en toegankelijkheid centraal te stellen, 
                    maken we slimme zorg beschikbaar voor iedereen."
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={itemVariants}
            className="text-center mt-12"
          >
            <p className="font-lato text-lg text-gray-700 max-w-2xl mx-auto">
              Samen werken we aan een toekomst waarin iedereen toegang heeft tot slimme zorgoplossingen, 
              <span className="font-semibold text-blue-600"> voor een prettig thuis</span>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Impact & Benefits - Enhanced */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.h2 variants={itemVariants} className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
              Bewezen Impact: Voor Wie Is Prettig Thuis?
            </motion.h2>
            <motion.p variants={itemVariants} className="font-lato text-lg text-gray-600 max-w-3xl mx-auto">
              Een complete digitale zorgomgeving ontworpen voor ouderen én mantelzorgers, met meetbare voordelen voor beiden.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={itemVariants}
            >
              <Card className="border-2 border-green-200 bg-green-50 rounded-2xl h-full">
                <CardHeader>
                  <CardTitle className="font-inter text-2xl text-green-800 flex items-center gap-3">
                    <Users className="w-7 h-7" />
                    Voor Ouderen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { icon: BadgeIcon, text: "Meer zelfstandigheid door gepersonaliseerde ICF-gebaseerde activiteiten" },
                    { icon: Sparkles, text: "Minder stress en verwarring dankzij slimme timing en voorkeuren" },
                    { icon: Heart, text: "Continue verbinding met herinneringen via Gouden Momenten slideshow" },
                    { icon: Volume2, text: "Real-time empathische conversaties met de spraakassistent" },
                    { icon: Activity, text: "Betekenisvolle dagelijkse activiteiten afgestemd op individuele vaardigheden" },
                    { icon: HomeIcon, text: "Langer thuis wonen met vertrouwen en ondersteuning" }
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <benefit.icon className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <p className="font-lato text-gray-700">{benefit.text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={itemVariants}
            >
              <Card className="border-2 border-blue-200 bg-blue-50 rounded-2xl h-full">
                <CardHeader>
                  <CardTitle className="font-inter text-2xl text-blue-800 flex items-center gap-3">
                    <Shield className="w-7 h-7" />
                    Voor Mantelzorgers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { icon: Scale, text: "Dramatisch minder belasting door slimme automatisering" },
                    { icon: BarChart3, text: "Real-time inzichten in activiteitspatronen en ICF-ontwikkeling" },
                    { icon: Lock, text: "Intelligente waarschuwingen alleen wanneer echt nodig" },
                    { icon: Clock, text: "Meer tijd voor kwaliteitsvolle momenten samen" },
                    { icon: Camera, text: "Gemakkelijk delen van herinneringen via multimedia album" },
                    { icon: Activity, text: "Patroonherkenning helpt bij vroege detectie van veranderingen" }
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <benefit.icon className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                      <p className="font-lato text-gray-700">{benefit.text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final Call to Action - Enhanced */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            <motion.h2 variants={itemVariants} className="font-inter font-bold text-3xl md:text-4xl mb-4">
              Ervaar de Toekomst van Digitale Zorg
            </motion.h2>
            <motion.p variants={itemVariants} className="font-lato text-xl opacity-90 mb-12 max-w-2xl mx-auto">
              Ontdek zelf hoe AI-gestuurde zorg kan ondersteunen. Elke functie is ontworpen voor gemak, comfort en betekenisvolle verbinding.
            </motion.p>
            
            <motion.div 
              variants={itemVariants}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto"
            >
              <Link to={createPageUrl('VoiceHome')}>
                <Button className="tap-target w-full bg-white text-indigo-600 hover:bg-blue-50 px-4 py-4 text-base font-semibold rounded-xl transition-all transform hover:scale-105 focus-strong">
                  <Mic className="w-5 h-5 mr-2" />
                  Spraakassistent
                </Button>
              </Link>
              
              <Link to={createPageUrl('Routines')}>
                <Button className="tap-target w-full bg-white text-indigo-600 hover:bg-blue-50 px-4 py-4 text-base font-semibold rounded-xl transition-all transform hover:scale-105 focus-strong">
                  <Compass className="w-5 h-5 mr-2" />
                  Het Kompas
                </Button>
              </Link>

              <Link to={createPageUrl('GoudenMomenten')}>
                <Button className="tap-target w-full bg-white text-indigo-600 hover:bg-blue-50 px-4 py-4 text-base font-semibold rounded-xl transition-all transform hover:scale-105 focus-strong">
                  <Play className="w-5 h-5 mr-2" />
                  Gouden Momenten
                </Button>
              </Link>
              
              <Link to={createPageUrl('Caregiver')}>
                <Button className="tap-target w-full bg-white text-indigo-600 hover:bg-blue-50 px-4 py-4 text-base font-semibold rounded-xl transition-all transform hover:scale-105 focus-strong">
                  <Shield className="w-5 h-5 mr-2" />
                  Zorg Dashboard
                </Button>
              </Link>
            </motion.div>
            
            <motion.div variants={itemVariants} className="mt-8">
              <p className="text-sm opacity-75">
                Geen downloads nodig. Begin vandaag nog in je browser.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
