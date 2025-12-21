
import customtkinter
import threading

class AIAnalysisTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(2, weight=1)
        
        customtkinter.CTkLabel(self.tab, text="Get AI-Powered Insights on Your Diet", font=customtkinter.CTkFont(size=18, weight="bold")).grid(row=0, column=0, padx=20, pady=10)
        
        self.ai_prompt_entry = customtkinter.CTkTextbox(self.tab, height=80)
        self.ai_prompt_entry.insert("1.0", "Based on my consumption today, what is one healthy change I could make tomorrow?")
        self.ai_prompt_entry.grid(row=1, column=0, sticky="ew", padx=20, pady=10)
        
        self.ai_ask_button = customtkinter.CTkButton(self.tab, text="Ask Gemini", command=self.get_ai_analysis)
        self.ai_ask_button.grid(row=1, column=1, padx=20, pady=10)
        
        self.ai_response_box = customtkinter.CTkTextbox(self.tab, state="disabled", wrap="word")
        self.ai_response_box.grid(row=2, column=0, columnspan=2, sticky="nsew", padx=20, pady=10)
        
        self.ai_progress = customtkinter.CTkProgressBar(self.tab, mode="indeterminate")
        self.ai_progress.grid(row=3, column=0, columnspan=2, padx=20, pady=10)

    def get_ai_analysis(self):
        prompt = self.ai_prompt_entry.get("1.0", "end-1c")
        if not prompt:
            self.app.message_user("Input Error", "Please enter a question for the AI.", "warning")
            return
            
        self.ai_response_box.configure(state="normal")
        self.ai_response_box.delete("1.0", "end")
        self.ai_response_box.insert("1.0", "AI is thinking...")
        self.ai_response_box.configure(state="disabled")
        self.ai_progress.start()
        
        threading.Thread(target=self._get_ai_analysis_worker, args=(prompt,), daemon=True).start()

    def _get_ai_analysis_worker(self, user_prompt):
        try:
            # Construct context from app state
            totals = self.app.totals
            context = f"""
            Here is my nutritional intake for today so far:
            - Calories: {totals['calories']:.0f} / {self.app.target_calories:.0f} kcal
            - Protein: {totals['protein']:.1f} / {self.app.target_protein:.1f} g
            - Fat: {totals['fat']:.1f} / {self.app.target_fat:.1f} g
            - Carbs: {totals['carbs']:.1f} / {self.app.target_carbs:.1f} g
            - Water: {totals['water']:.0f} / {self.app.target_water:.0f} ml
            - Exercise: {totals['exercise']:.0f} / {self.app.target_exercise:.0f} min

            Additional information about my dietary needs:
            - Restrictions: {self.app.dietary_restrictions if self.app.dietary_restrictions else "None"}
            - Preferences/Dislikes: {self.app.food_preferences if self.app.food_preferences else "None"}

            Based on this data, please answer: "{user_prompt}"
            """
            response_text = self.app.ai.get_contextual_analysis(context)
            self.app.after(0, self._update_ai_response_box, response_text)
        except Exception as e:
            self.app.after(0, self._update_ai_response_box, f"An error occurred: {e}")
        finally:
            self.app.after(0, self.ai_progress.stop)

    def _update_ai_response_box(self, text):
        self.ai_response_box.configure(state="normal")
        self.ai_response_box.delete("1.0", "end")
        self.ai_response_box.insert("1.0", text)
        self.ai_response_box.configure(state="disabled")
