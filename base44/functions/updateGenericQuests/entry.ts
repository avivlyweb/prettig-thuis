import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping of ICF codes to natural activities based on time of day
const ICF_TO_NATURAL_QUEST = {
  d175: {
    morning: { title: "Plan je Dag", desc: "Denk even na over wat je vandaag wilt doen. Een simpel plan helpt je de dag door." },
    midday: { title: "Los een Klein Probleem Op", desc: "Is er iets dat je aandacht vraagt? Kijk of je een eenvoudige oplossing kunt bedenken." },
    evening: { title: "Denk na over Morgen", desc: "Wat wil je morgen doen? Rustig nadenken voor het slapen gaan kan helpen." }
  },
  d310: {
    morning: { title: "Luister naar een Geluid", desc: "Wat hoor je nu? Vogels, verkeer, of de buren? Luisteren helpt je alert te blijven." },
    midday: { title: "Luister naar Muziek of Radio", desc: "Zet een leuk nummer of radioprogramma op en luister even aandachtig." },
    evening: { title: "Luister naar de Avondgeluiden", desc: "De wereld wordt rustiger. Welke geluiden hoor je nu het avond is?" }
  },
  d330: {
    morning: { title: "Zeg Goedemorgen", desc: "Zeg hardop 'Goedemorgen' tegen jezelf of iemand anders. Je stem gebruiken is goed!" },
    midday: { title: "Vertel een Verhaal Hardop", desc: "Denk aan een leuke herinnering en vertel het hardop, al is het alleen voor jezelf." },
    evening: { title: "Zeg Welterusten", desc: "Zeg hardop 'Welterusten' tegen jezelf of een dierbare. Het geeft een goed gevoel." }
  },
  d335: {
    morning: { title: "Gebaar Vrolijk", desc: "Zwaai naar jezelf in de spiegel of maak een blij gebaar. Lichaamstaal is communicatie!" },
    midday: { title: "Lach of Glimlach", desc: "Probeer te glimlachen, ook als je alleen bent. Het kan je humeur verbeteren." },
    evening: { title: "Maak een Rustgevend Gebaar", desc: "Leg je hand op je hart of adem diep in. Dit gebaar kalmeert." }
  },
  d345: {
    morning: { title: "Schrijf iets Op", desc: "Noteer wat je vandaag wilt doen, of gewoon je naam. Schrijven houdt je scherp." },
    midday: { title: "Maak een Kort Briefje", desc: "Schrijf een klein bericht, bijvoorbeeld een boodschappenlijstje of een groet." },
    evening: { title: "Schrijf over je Dag", desc: "Noteer één ding dat je vandaag deed. Een kort dagboekje kan fijn zijn." }
  },
  d350: {
    morning: { title: "Praat met Jezelf", desc: "Vertel hardop wat je van plan bent te doen. Een gesprekje met jezelf kan helpen." },
    midday: { title: "Voer een Kort Gesprek", desc: "Bel iemand, of praat even met een buur. Conversatie is belangrijk." },
    evening: { title: "Bespreek je Dag", desc: "Vertel aan jezelf of iemand anders hoe je dag was. Delen is goed." }
  },
  d410: {
    morning: { title: "Ga Rechtop Zitten", desc: "Zit eens even recht in je stoel. Goede houding geeft energie!" },
    midday: { title: "Verander van Zitpositie", desc: "Zit je al lang? Verander je houding of sta even op en ga weer zitten." },
    evening: { title: "Leun Comfortabel Achterover", desc: "Zoek een ontspannen zithouding. Je lichaam mag nu rusten." }
  },
  d415: {
    morning: { title: "Blijf Even Rechtop Staan", desc: "Sta een paar seconden stil, voel je voeten stevig op de grond." },
    midday: { title: "Houd je Balans", desc: "Sta stil en voel hoe je lichaam balanceert. Dit oefent je evenwicht." },
    evening: { title: "Sta Rustig bij het Aanrecht", desc: "Leun tegen het aanrecht en sta een moment stil. Het is ok om steun te zoeken." }
  },
  d450: {
    morning: { title: "Loop naar de Keuken", desc: "Maak een korte wandeling door je huis. Beweging in de ochtend is goed!" },
    midday: { title: "Wandel door de Kamer", desc: "Loop een rondje door je woonkamer. Blijf in beweging, dat is gezond." },
    evening: { title: "Loop naar je Slaapkamer", desc: "Maak een rustige wandeling naar waar je gaat slapen. Langzaam is prima." }
  },
  d510: {
    morning: { title: "Was je Gezicht", desc: "Spoel je gezicht met wat water. Een frisse start!" },
    midday: { title: "Was je Handen", desc: "Neem even de tijd om je handen goed te wassen. Hygiëne is belangrijk." },
    evening: { title: "Poets je Tanden", desc: "Maak je mond schoon voor de nacht. Een fris gevoel helpt je slapen." }
  },
  d520: {
    morning: { title: "Kam je Haar", desc: "Haal een kam door je haar. Verzorging geeft een goed gevoel." },
    midday: { title: "Verzorg je Nagels", desc: "Kijk naar je nagels, misschien kun je ze knippen of vijlen." },
    evening: { title: "Smeer je Handen in", desc: "Gebruik een beetje crème op je handen. Verzorging voor de nacht." }
  },
  d530: {
    morning: { title: "Ga naar het Toilet", desc: "Begin de dag met een toiletbezoek. Routine is belangrijk." },
    midday: { title: "Toiletpauze", desc: "Neem de tijd voor een toiletbezoek. Zorg goed voor jezelf." },
    evening: { title: "Laatste Toiletbezoek", desc: "Voor je gaat slapen, maak nog een toiletbezoek. Dat slaapt rustiger." }
  },
  d630: {
    morning: { title: "Bereid je Ontbijt", desc: "Maak iets lekkers om te eten. Een gezond ontbijt geeft je energie!" },
    midday: { title: "Maak je Lunch", desc: "Tijd om te lunchen! Zelfs een simpele boterham is goed." },
    evening: { title: "Kook je Avondeten", desc: "Bereid een warme maaltijd, of warm iets op. Lekker eten is belangrijk." }
  },
  d640: {
    morning: { title: "Ruim de Ontbijttafel Op", desc: "Zet je kopje en bord weg. Een opgeruimde ruimte geeft rust." },
    midday: { title: "Doe een Klein Klusje", desc: "Stofzuig een hoekje of ruim iets op. Elke kleine hulp telt!" },
    evening: { title: "Ruim de Woonkamer Op", desc: "Leg wat spullen op hun plek. Een nette kamer helpt je ontspannen." }
  },
  d660: {
    morning: { title: "Help Iemand Opstaan", desc: "Als er iemand hulp nodig heeft, bied aan te helpen. Samen is fijner." },
    midday: { title: "Ondersteun een Ander", desc: "Denk aan iemand die je hulp nodig heeft. Kun je iets voor hen doen?" },
    evening: { title: "Zorg voor een Ander", desc: "Help iemand met iets kleins voor het slapen. Zorg geven is mooi." }
  },
  d710: {
    morning: { title: "Begroet Iemand", desc: "Zeg hallo tegen een huisgenoot of buur. Een groet verbindt." },
    midday: { title: "Heb een Simpel Contact", desc: "Knik naar iemand, of geef een simpele reactie. Interactie is goed." },
    evening: { title: "Zeg Welterusten", desc: "Wens iemand een goede nacht. Een afscheid is een fijne afsluiting." }
  },
  d720: {
    morning: { title: "Plan Contact met Familie", desc: "Denk eraan om later iemand te bellen. Familie is belangrijk." },
    midday: { title: "Bel een Vriend of Kind", desc: "Neem de telefoon en bel iemand die je kent. Een gesprek doet goed!" },
    evening: { title: "Praat over je Gevoelens", desc: "Deel met iemand hoe je je voelt. Open zijn helpt." }
  },
  d910: {
    morning: { title: "Denk aan een Activiteit", desc: "Wat wil je vandaag doen? Misschien een club of activiteit?" },
    midday: { title: "Doe iets Sociaals", desc: "Ga naar buiten, bezoek een winkel, of doe iets in de gemeenschap." },
    evening: { title: "Herinner een Sociaal Moment", desc: "Denk terug aan een fijne activiteit die je deed met anderen." }
  },
  d920: {
    morning: { title: "Kies een Hobby", desc: "Wat is je hobby? Denk eraan om er vandaag tijd voor te maken." },
    midday: { title: "Geniet van een Activiteit", desc: "Doe iets leuks: lezen, puzzelen, tv kijken. Plezier is belangrijk!" },
    evening: { title: "Ontspan met je Hobby", desc: "Vind rust in een hobby die je leuk vindt. Genieten mag." }
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.email !== "avivlyweb@gmail.com") {
      return new Response(JSON.stringify({ error: 'Unauthorized - Admin only' }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log("🔄 Starting bulk quest transformation...");

    // Fetch all quests that match the pattern
    const allQuests = await base44.asServiceRole.entities.Quest.list();
    const genericQuests = allQuests.filter(q => 
      q.title && (
        q.title.includes('taak') ||
        q.description?.includes('Voer ICF-activiteit')
      )
    );

    console.log(`📊 Found ${genericQuests.length} generic quests to transform`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const quest of genericQuests) {
      try {
        const icfCode = quest.icf_codes && quest.icf_codes[0] ? quest.icf_codes[0] : null;
        const timeTag = quest.tags && quest.tags[0] ? quest.tags[0] : 'morning';
        
        if (!icfCode || !ICF_TO_NATURAL_QUEST[icfCode]) {
          console.log(`⚠️ No mapping for ICF code: ${icfCode} in quest ${quest.quest_id}`);
          results.push({
            quest_id: quest.quest_id,
            status: 'skipped',
            reason: `No mapping for ICF code: ${icfCode}`
          });
          continue;
        }

        const timeMapping = ICF_TO_NATURAL_QUEST[icfCode];
        const naturalQuest = timeMapping[timeTag] || timeMapping['morning'];

        const updateData = {
          quest_id: quest.quest_id,
          title: naturalQuest.title,
          description: naturalQuest.desc,
          icf_codes: quest.icf_codes || [],
          category: quest.category,
          dementia_stage: quest.dementia_stage || "mild",
          difficulty: quest.difficulty,
          cooldown_minutes: quest.cooldown_minutes,
          tags: quest.tags || [],
          quest_voice_url: null  // 🔥 CLEAR OLD AUDIO - NEW AUDIO WILL BE GENERATED
        };

        await base44.asServiceRole.entities.Quest.update(quest.id, updateData);
        
        successCount++;
        results.push({
          quest_id: quest.quest_id,
          old_title: quest.title,
          new_title: naturalQuest.title,
          status: 'success'
        });

        console.log(`✅ Updated: ${quest.quest_id} -> ${naturalQuest.title}`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating quest ${quest.quest_id}:`, error.message);
        results.push({
          quest_id: quest.quest_id,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`✅ Transformation complete: ${successCount} success, ${errorCount} errors`);

    return new Response(JSON.stringify({ 
      success: true,
      total: genericQuests.length,
      successCount,
      errorCount,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in updateGenericQuests function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});