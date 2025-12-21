
import customtkinter
import threading

class NutritionQATab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(2, weight=1)
        
        customtkinter.CTkLabel(self.tab, text="Ask Gemini About Nutrition", font=customtkinter.CTkFont(size=18, weight="bold")).grid(row=0, column=0, padx=20, pady=10)
        
        self.qa_prompt_entry = customtkinter.CTkTextbox(self.tab, height=80)
        self.qa_prompt_entry.insert("1.0", "e.g., How many calories in a medium-sized banana?")
        self.qa_prompt_entry.grid(row=1, column=0, sticky="ew", padx=20, pady=10)
        
        self.qa_ask_button = customtkinter.CTkButton(self.tab, text="Ask Gemini", command=self.get_nutrition_qa)
        self.qa_ask_button.grid(row=1, column=1, padx=20, pady=10)
        
        self.qa_response_box = customtkinter.CTkTextbox(self.tab, state="disabled", wrap="word")
        self.qa_response_box.grid(row=2, column=0, columnspan=2, sticky="nsew", padx=20, pady=10)
        
        self.qa_progress = customtkinter.CTkProgressBar(self.tab, mode="indeterminate")
        self.qa_progress.grid(row=3, column=0, columnspan=2, padx=20, pady=10)

    def get_nutrition_qa(self):
        prompt = self.qa_prompt_entry.get("1.0", "end-1c")
        if not prompt:
            self.app.message_user("Input Error", "Please enter a question.", "warning")
            return
            
        self.qa_response_box.configure(state="normal")
        self.qa_response_box.delete("1.0", "end")
        self.qa_response_box.insert("1.0", "Asking Gemini...")
        self.qa_response_box.configure(state="disabled")
        self.qa_progress.start()
        
        threading.Thread(target=self._get_nutrition_qa_worker, args=(prompt,), daemon=True).start()

    def _get_nutrition_qa_worker(self, user_prompt):
        try:
            response_text = self.app.ai.get_nutrition_answer(user_prompt)
            self.app.after(0, self._update_qa_response_box, response_text)
        except Exception as e:
            self.app.after(0, self._update_qa_response_box, f"An error occurred: {e}")
        finally:
            self.app.after(0, self.qa_progress.stop)

    def _update_qa_response_box(self, text):
        self.qa_response_box.configure(state="normal")
        self.qa_response_box.delete("1.0", "end")
        self.qa_response_box.insert("1.0", text)
        self.qa_response_box.configure(state="disabled")
