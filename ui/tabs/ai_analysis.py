
import customtkinter
import threading
from ui.theme import (
    Colors, Fonts, Layout,
    create_styled_card, create_accent_button, create_styled_textbox,
    create_progress_bar, create_gradient_header, add_hover_highlight
)


class AIAnalysisTab:
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
            self.tab, "AI Diet Insights", "🤖", "#8E44AD", "#E91E8C"
        )
        self.header.grid(row=0, column=0, columnspan=2, sticky="ew",
                         padx=Layout.PAD_MD, pady=(Layout.PAD_MD, Layout.PAD_SM))

        # ── Info Strip ──
        info_strip = customtkinter.CTkFrame(self.tab, fg_color=Colors.SURFACE,
                                             corner_radius=Layout.CORNER_RADIUS,
                                             border_color=Colors.BORDER, border_width=1,
                                             height=36)
        info_strip.grid(row=1, column=0, columnspan=2, sticky="ew",
                        padx=Layout.PAD_MD, pady=(0, Layout.PAD_SM))
        info_strip.grid_propagate(False)

        inner = customtkinter.CTkFrame(info_strip, fg_color="transparent")
        inner.place(relx=0, rely=0, relwidth=1, relheight=1)

        customtkinter.CTkLabel(
            inner, text="✨  Powered by Gemini AI — ask anything about your diet",
            font=Fonts.small(), text_color=Colors.ACCENT_PURPLE, anchor="w"
        ).pack(side="left", padx=Layout.PAD_LG, pady=6)

        # ── Prompt Card ──
        prompt_card = create_styled_card(self.tab)
        prompt_card.grid(row=2, column=0, columnspan=2, sticky="ew",
                         padx=Layout.PAD_MD, pady=Layout.PAD_SM)
        prompt_card.grid_columnconfigure(0, weight=1)
        add_hover_highlight(prompt_card, hover_border=Colors.ACCENT_PURPLE)

        customtkinter.CTkLabel(
            prompt_card, text="💬  Ask a question about your diet:",
            font=Fonts.body_bold(), text_color=Colors.TEXT_PRIMARY, anchor="w"
        ).grid(row=0, column=0, padx=Layout.PAD_MD, pady=(Layout.PAD_MD, Layout.PAD_XS), sticky="w")

        self.ai_prompt_entry = create_styled_textbox(prompt_card, height=70)
        self.ai_prompt_entry.insert("1.0", "Based on my consumption today, what is one healthy change I could make tomorrow?")
        self.ai_prompt_entry.grid(row=1, column=0, sticky="ew", padx=Layout.PAD_MD, pady=Layout.PAD_XS)

        btn_frame = customtkinter.CTkFrame(prompt_card, fg_color="transparent")
        btn_frame.grid(row=2, column=0, sticky="e", padx=Layout.PAD_MD, pady=Layout.PAD_MD)

        # Glowing ask button
        self.ai_ask_button = customtkinter.CTkButton(
            btn_frame, text="✨  Ask Gemini", command=self.get_ai_analysis,
            fg_color=Colors.ACCENT_PURPLE, hover_color="#A57AE8",
            corner_radius=20, height=42, width=180,
            font=Fonts.body_bold(), text_color=Colors.TEXT_WHITE,
            border_color="#D4A5FF", border_width=2
        )
        self.ai_ask_button.pack(side="right")
        # Add subtle glow animation on hover
        self._setup_button_glow(self.ai_ask_button, Colors.ACCENT_PURPLE, "#D4A5FF")

        # ── Response Card ──
        response_card = create_styled_card(self.tab)
        response_card.grid(row=3, column=0, columnspan=2, sticky="nsew",
                           padx=Layout.PAD_MD, pady=Layout.PAD_SM)
        response_card.grid_columnconfigure(0, weight=1)
        response_card.grid_rowconfigure(1, weight=1)
        add_hover_highlight(response_card, hover_border=Colors.ACCENT_PURPLE)

        response_header = customtkinter.CTkFrame(response_card, fg_color="transparent")
        response_header.grid(row=0, column=0, sticky="ew", padx=Layout.PAD_MD, pady=(Layout.PAD_MD, 0))

        customtkinter.CTkLabel(
            response_header, text="🤖  AI Response",
            font=Fonts.body_bold(), text_color=Colors.ACCENT_PURPLE, anchor="w"
        ).pack(side="left")

        self.ai_response_box = create_styled_textbox(response_card, editable=False)
        self.ai_response_box.grid(row=1, column=0, sticky="nsew", padx=Layout.PAD_MD, pady=Layout.PAD_MD)

        # ── Progress ──
        self.ai_progress = create_progress_bar(self.tab, color=Colors.ACCENT_PURPLE)
        self.ai_progress.grid(row=4, column=0, columnspan=2, sticky="ew",
                              padx=Layout.PAD_MD, pady=(0, Layout.PAD_MD))

    def _setup_button_glow(self, btn, normal_color, glow_color):
        """Add glow border swap on hover for premium effect."""
        def on_enter(e):
            try:
                btn.configure(border_color=glow_color, border_width=2)
            except Exception:
                pass
        def on_leave(e):
            try:
                btn.configure(border_color=normal_color, border_width=1)
            except Exception:
                pass
        btn.bind("<Enter>", on_enter)
        btn.bind("<Leave>", on_leave)

    def get_ai_analysis(self):
        prompt = self.ai_prompt_entry.get("1.0", "end-1c")
        if not prompt:
            self.app.message_user("Input Error", "Please enter a question for the AI.", "warning")
            return

        # Cancel any existing typing animation
        if self._typing_job:
            self.ai_response_box.after_cancel(self._typing_job)
            self._typing_job = None

        self.ai_response_box.configure(state="normal")
        self.ai_response_box.delete("1.0", "end")
        self.ai_response_box.insert("1.0", "✨ AI is thinking...")
        self.ai_response_box.configure(state="disabled")
        self.ai_progress.start()
        self.ai_ask_button.configure(state="disabled", text="⏳  Thinking...")

        threading.Thread(target=self._get_ai_analysis_worker, args=(prompt,), daemon=True).start()

    def _get_ai_analysis_worker(self, user_prompt):
        try:
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
            self.app.after(0, self._typewriter_effect, response_text)
        except Exception as e:
            self.app.after(0, self._update_ai_response_box, f"An error occurred: {e}")
        finally:
            self.app.after(0, self.ai_progress.stop)
            self.app.after(0, lambda: self.ai_ask_button.configure(state="normal", text="✨  Ask Gemini"))

    def _typewriter_effect(self, full_text, idx=0):
        """Animate text appearing character-by-character for a premium feel."""
        if idx == 0:
            self.ai_response_box.configure(state="normal")
            self.ai_response_box.delete("1.0", "end")

        if idx < len(full_text):
            self.ai_response_box.configure(state="normal")
            self.ai_response_box.insert("end", full_text[idx])
            self.ai_response_box.configure(state="disabled")
            self.ai_response_box.see("end")
            # Speed: faster chunks for longer text
            speed = 2 if len(full_text) > 500 else 8
            self._typing_job = self.ai_response_box.after(speed, self._typewriter_effect, full_text, idx + 1)
        else:
            self.ai_response_box.configure(state="disabled")
            self._typing_job = None

    def _update_ai_response_box(self, text):
        self.ai_response_box.configure(state="normal")
        self.ai_response_box.delete("1.0", "end")
        self.ai_response_box.insert("1.0", text)
        self.ai_response_box.configure(state="disabled")
