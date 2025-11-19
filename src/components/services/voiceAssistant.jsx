import { InvokeLLM } from "@/integrations/Core";

const SYSTEM_MESSAGE = `Je bent Prettig Thuis, een rustige spraakassistent voor een Nederlandse oudere met lichte dementie. Spreek langzaam, in korte zinnen. Bied aan om te herhalen of het anders te zeggen. Elke reactie moet twee sleutels bevatten:
1) speak_text: één tot drie korte zinnen voor de gebruiker.
2) care_event: een JSON-object dat overeenkomt met het verstrekte schema. Voeg nooit persoonlijke identificatoren toe aan care_event. Gebruik geschikte icf_tags. Voor elke ADL, emit adl_step events en eindig met adl_complete. Als de gebruiker verward is over dag of nacht, erken dit voorzichtig en log incident met soort "confused". Als de gebruiker vraagt om te stoppen, stop en log incident met notities.

Wees altijd warm en geduldig. Gebruik de weergavenaam van de gebruiker bij begroeting. Houd zinnen onder de 15 woorden elk.`;

// Realtime client using InvokeLLM integration
export class PrettigThuisRealtimeClient {
  async sendMessage(msg) {
    try {
      const context = msg;
      
      // Build prompt with context
      const prompt = this.buildPromptFromContext(context);
      
      const response = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          required: ["speak_text", "care_event"],
          properties: {
            speak_text: { type: "string" },
            care_event: {
              type: "object",
              required: ["type", "icf_tags", "confidence", "data"],
              properties: {
                type: { 
                  type: "string", 
                  enum: [
                    "greeting", "orientation_check", "preference_choice", "memory_view",
                    "compass_choice", "adl_step", "adl_complete", "medication_prompt",
                    "hydration_prompt", "safety_prompt", "checkin", "incident",
                    "goodbye", "sleep_mode"
                  ]
                },
                icf_tags: { type: "array", items: { type: "string" } },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                data: { type: "object" }
              }
            },
            next_state: { type: "string" }
          }
        }
      });

      return response;
    } catch (error) {
      console.error("Error in voice assistant:", error);
      // Fallback response
      return {
        speak_text: "Ik begrijp het niet helemaal. Zou je het opnieuw kunnen zeggen?",
        care_event: {
          type: "incident",
          icf_tags: ["b144"],
          confidence: 0.5,
          data: { kind: "technical_error", notes: "AI response failed" }
        }
      };
    }
  }

  buildPromptFromContext(context) {
    const { 
      state, 
      time_of_day, 
      local_time, 
      is_dark_outside, 
      user_display_name,
      icf_profile,
      text_input 
    } = context;

    let prompt = `${SYSTEM_MESSAGE}\n\nContext:\n`;
    
    if (user_display_name) {
      prompt += `Gebruiker: ${user_display_name}\n`;
    }
    
    prompt += `Staat: ${state}\n`;
    prompt += `Tijd: ${local_time} (${time_of_day})\n`;
    
    if (is_dark_outside !== undefined) {
      prompt += `Donker buiten: ${is_dark_outside ? 'ja' : 'nee'}\n`;
    }
    
    if (icf_profile) {
      prompt += `ICF profiel: ${JSON.stringify(icf_profile)}\n`;
    }

    // Add specific prompts based on state and context
    switch (state) {
      case "greeting":
        if (time_of_day === "morning" && is_dark_outside) {
          prompt += `\nScenario: Ochtendgroet wanneer het nog donker is. Erken dat dit normaal is, bied geruststelling over de tijd, en stel voor om lichten aan te doen voor veiligheid. Vraag dan naar geheugen of activiteitvoorkeur.`;
        } else {
          prompt += `\nScenario: ${time_of_day} groet. Wees warm en bied keuze tussen het bekijken van een herinnering of het doen van een activiteit.`;
        }
        break;
        
      case "orientation_check":
        prompt += `\nScenario: Controleer voorzichtig of gebruiker weet welke dag en tijd het is. Indien verward, bied voorzichtige correctie zonder hen te laten voelen dat ze fout zijn.`;
        break;
        
      case "adl_step":
        prompt += `\nScenario: Begeleid door één stap van dagelijkse levensactiviteit. Wees bemoedigend en geduldig.`;
        break;
        
      case "bedtime":
        prompt += `\nScenario: Afsluiting routine. Wees kalm en rustgevend. Begeleid naar bedtijd activiteiten en slaap modus.`;
        break;
    }
    
    if (text_input) {
      prompt += `\nGebruiker invoer: "${text_input}"`;
    }
    
    prompt += `\nReageer met speak_text in het Nederlands en juiste care_event.`;
    
    return prompt;
  }
}

// Backend integration for care events
export class CareEventBackend {
  async postEvent(userId, ev) {
    try {
      // Store in localStorage and log
      const events = JSON.parse(localStorage.getItem('care_events') || '[]');
      events.push({
        user_id: userId,
        ...ev,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('care_events', JSON.stringify(events));
      
      console.log(`[CareEvent] ${userId}:`, ev);
      
      // Check for alert conditions
      this.checkAlertConditions(userId, events);
    } catch (error) {
      console.error("Error posting care event:", error);
    }
  }
  
  checkAlertConditions(userId, events) {
    const recent = events.slice(-10); // Last 10 events
    
    // Check for multiple ADL skips
    const skippedADLs = recent.filter(e => 
      e.type === 'adl_complete' && e.data?.result === 'skipped'
    );
    
    if (skippedADLs.length >= 2) {
      this.triggerCaregiverAlert(userId, {
        level: "attention",
        title: "Meerdere activiteiten overgeslagen",
        message: "Er zijn vandaag al meerdere dagelijkse activiteiten overgeslagen.",
        data: { skipped_count: skippedADLs.length }
      });
    }
    
    // Check for incidents
    const incidents = recent.filter(e => e.type === 'incident');
    if (incidents.some(i => i.data?.severity === 'high')) {
      this.triggerCaregiverAlert(userId, {
        level: "urgent",
        title: "Belangrijke incident",
        message: "Er heeft zich een incident voorgedaan dat aandacht vereist.",
        data: { incident_type: incidents[0].data?.kind }
      });
    }
  }
  
  triggerCaregiverAlert(userId, alert) {
    // Store alert for caregiver dashboard
    const alerts = JSON.parse(localStorage.getItem('caregiver_alerts') || '[]');
    alerts.push({
      user_id: userId,
      ...alert,
      timestamp: new Date().toISOString(),
      read: false
    });
    localStorage.setItem('caregiver_alerts', JSON.stringify(alerts));
    
    console.log(`[ALERT] ${userId}:`, alert);
    
    // In production, this would trigger push notifications, SMS, etc.
  }
}