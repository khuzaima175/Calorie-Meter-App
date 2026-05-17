
import customtkinter
import threading
from ui.theme import (
    Colors, Fonts, Layout,
    create_styled_card, create_accent_button, create_styled_textbox,
    create_progress_bar, create_gradient_header, create_pill_button,
    add_hover_highlight
)


class NutritionQATab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self._typing_job = None
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(3, weight=1)

        # ── Gradient Header ──
        self.header = create_gradient_header(
            self.tab, "Nutrition Q&A", "❓", "#1ABC9C", "#27AE60"
        )
        self.header.grid(row=0, column=0, columnspan=2, sticky="ew",
                         padx=Layout.PAD_MD, pady=(Layout.PAD_MD, Layout.PAD_SM))

        # ── Suggested Questions ──
        suggestions_frame = customtkinter.CTkFrame(self.tab, fg_color="transparent")
        suggestions_frame.grid(row=1, column=0, columnspan=2, sticky="ew",
                               padx=Layout.PAD_MD, pady=(0, Layout.PAD_SM))

        customtkinter.CTkLabel(
            suggestions_frame, text="💡  Try asking:",
            font=Fonts.small(), text_color=Colors.TEXT_TERTIARY
        ).pack(side="left", padx=(0, Layout.PAD_SM))

        suggested_qs = [
            "Calories in a banana?",
            "Best protein sources?",
            "Is rice healthy?",
            "How much water daily?",
        ]

        for q in suggested_qs:
            pill = create_pill_button(
                suggestions_frame, text=q,
                command=lambda question=q: self._insert_question(question),
                width=150
            )
            pill.pack(side="left", padx=3)

        # ── Prompt Card ──
        prompt_card = create_styled_card(self.tab)
        prompt_card.grid(row=2, column=0, columnspan=2, sticky="ew",
                         padx=Layout.PAD_MD, pady=Layout.PAD_SM)
        prompt_card.grid_columnconfigure(0, weight=1)
        add_hover_highlight(prompt_card, hover_border=Colors.ACCENT_CYAN)

        customtkinter.CTkLabel(
            prompt_card, text="💬  Your Question:",
            font=Fonts.body_bold(), text_color=Colors.TEXT_PRIMARY, anchor="w"
        ).grid(row=0, column=0, padx=Layout.PAD_MD, pady=(Layout.PAD_MD, Layout.PAD_XS), sticky="w")

        self.qa_prompt_entry = create_styled_textbox(prompt_card, height=70)
        self.qa_prompt_entry.insert("1.0", "e.g., How many calories in a medium-sized banana?")
        self.qa_prompt_entry.grid(row=1, column=0, sticky="ew", padx=Layout.PAD_MD, pady=Layout.PAD_XS)

        # Focus – clear default text on click
        self.qa_prompt_entry.bind("<FocusIn>", self._clear_placeholder)

        btn_frame = customtkinter.CTkFrame(prompt_card, fg_color="transparent")
        btn_frame.grid(row=2, column=0, sticky="e", padx=Layout.PAD_MD, pady=Layout.PAD_MD)

        # Animated ask button
        self.qa_ask_button = customtkinter.CTkButton(
            btn_frame, text="🔍  Ask Gemini", command=self.get_nutrition_qa,
            fg_color=Colors.ACCENT_CYAN, hover_color="#2BB5A5",
            corner_radius=20, height=42, width=180,
            font=Fonts.body_bold(), text_color=Colors.TEXT_WHITE,
            border_color="#5BE8D5", border_width=2
        )
        self.qa_ask_button.pack(side="right")

        # ── Response Card ──
        response_card = create_styled_card(self.tab)
        response_card.grid(row=3, column=0, columnspan=2, sticky="nsew",
                           padx=Layout.PAD_MD, pady=Layout.PAD_SM)
        response_card.grid_columnconfigure(0, weight=1)
        response_card.grid_rowconfigure(1, weight=1)
        add_hover_highlight(response_card, hover_border=Colors.ACCENT_CYAN)

        response_header = customtkinter.CTkFrame(response_card, fg_color="transparent")
        response_header.grid(row=0, column=0, sticky="ew", padx=Layout.PAD_MD, pady=(Layout.PAD_MD, 0))

        customtkinter.CTkLabel(
            response_header, text="💡  Answer",
            font=Fonts.body_bold(), text_color=Colors.ACCENT_CYAN, anchor="w"
        ).pack(side="left")

        self.qa_response_box = create_styled_textbox(response_card, editable=False)
        self.qa_response_box.grid(row=1, column=0, sticky="nsew",
                                   padx=Layout.PAD_MD, pady=Layout.PAD_MD)

        # ── Progress ──
        self.qa_progress = create_progress_bar(self.tab, color=Colors.ACCENT_CYAN)
        self.qa_progress.grid(row=4, column=0, columnspan=2, sticky="ew",
                              padx=Layout.PAD_MD, pady=(0, Layout.PAD_MD))

    def _clear_placeholder(self, event=None):
        """Clear default text on first focus."""
        content = self.qa_prompt_entry.get("1.0", "end-1c")
        if content.startswith("e.g.,"):
            self.qa_prompt_entry.delete("1.0", "end")

    def _insert_question(self, question):
        """Insert a suggested question into the prompt."""
        self.qa_prompt_entry.delete("1.0", "end")
        self.qa_prompt_entry.insert("1.0", question)

    def get_nutrition_qa(self):
        prompt = self.qa_prompt_entry.get("1.0", "end-1c")
        if not prompt or prompt.startswith("e.g.,"):
            self.app.message_user("Input Error", "Please enter a question.", "warning")
            return

        # Cancel any existing typing animation
        if self._typing_job:
            self.qa_response_box.after_cancel(self._typing_job)
            self._typing_job = None

        self.qa_response_box.configure(state="normal")
        self.qa_response_box.delete("1.0", "end")
        self.qa_response_box.insert("1.0", "🔍 Asking Gemini...")
        self.qa_response_box.configure(state="disabled")
        self.qa_progress.start()
        self.qa_ask_button.configure(state="disabled", text="⏳  Thinking...")

        threading.Thread(target=self._get_nutrition_qa_worker, args=(prompt,), daemon=True).start()

    def _get_nutrition_qa_worker(self, user_prompt):
        try:
            response_text = self.app.ai.get_nutrition_answer(user_prompt)
            self.app.after(0, self._typewriter_effect, response_text)
        except Exception as e:
            self.app.after(0, self._update_qa_response_box, f"An error occurred: {e}")
        finally:
            self.app.after(0, self.qa_progress.stop)
            self.app.after(0, lambda: self.qa_ask_button.configure(state="normal", text="🔍  Ask Gemini"))

    def _typewriter_effect(self, full_text, idx=0):
        """Animate text appearing character-by-character."""
        if idx == 0:
            self.qa_response_box.configure(state="normal")
            self.qa_response_box.delete("1.0", "end")

        if idx < len(full_text):
            self.qa_response_box.configure(state="normal")
            self.qa_response_box.insert("end", full_text[idx])
            self.qa_response_box.configure(state="disabled")
            self.qa_response_box.see("end")
            speed = 2 if len(full_text) > 500 else 8
            self._typing_job = self.qa_response_box.after(speed, self._typewriter_effect, full_text, idx + 1)
        else:
            self.qa_response_box.configure(state="disabled")
            self._typing_job = None

    def _update_qa_response_box(self, text):
        self.qa_response_box.configure(state="normal")
        self.qa_response_box.delete("1.0", "end")
        self.qa_response_box.insert("1.0", text)
        self.qa_response_box.configure(state="disabled")
