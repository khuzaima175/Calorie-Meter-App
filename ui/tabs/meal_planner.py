
import customtkinter
import threading
from ui.theme import (
    Colors, Fonts, Layout,
    create_styled_card, create_accent_button, create_styled_entry,
    create_styled_textbox, create_option_menu, create_progress_bar,
    create_gradient_header, add_hover_highlight
)


class MealPlannerTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self._typing_job = None
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(2, weight=1)

        # ── Gradient Header ──
        self.header = create_gradient_header(
            self.tab, "AI Meal Planner", "🍽️", "#27AE60", "#F1C40F"
        )
        self.header.grid(row=0, column=0, sticky="ew",
                         padx=Layout.PAD_MD, pady=(Layout.PAD_MD, Layout.PAD_SM))

        # ── Controls Card ──
        controls_card = create_styled_card(self.tab)
        controls_card.grid(row=1, column=0, sticky="ew",
                           padx=Layout.PAD_MD, pady=(0, Layout.PAD_SM))
        controls_card.grid_columnconfigure(0, weight=1)
        add_hover_highlight(controls_card, hover_border=Colors.ACCENT_GREEN)

        controls_inner = customtkinter.CTkFrame(controls_card, fg_color="transparent")
        controls_inner.pack(padx=Layout.PAD_LG, pady=Layout.PAD_MD, fill="x")

        # Info strip
        info_row = customtkinter.CTkFrame(controls_inner, fg_color="transparent")
        info_row.pack(fill="x", pady=(0, Layout.PAD_MD))

        customtkinter.CTkLabel(
            info_row, text="✨  Generate personalized meal plans powered by Gemini AI",
            font=Fonts.small(), text_color=Colors.ACCENT_GREEN, anchor="w"
        ).pack(side="left")

        # Options row
        options_frame = customtkinter.CTkFrame(controls_inner, fg_color="transparent")
        options_frame.pack(fill="x")

        # Target Calories
        cal_frame = customtkinter.CTkFrame(options_frame, fg_color="transparent")
        cal_frame.pack(side="left", padx=(0, Layout.PAD_LG))

        customtkinter.CTkLabel(
            cal_frame, text="🔥  Target Calories",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
        ).pack(anchor="w", pady=(0, Layout.PAD_XS))

        self.plan_cal_entry = create_styled_entry(
            cal_frame, placeholder=str(int(self.app.target_calories)), width=140
        )
        self.plan_cal_entry.pack()

        # Diet Type
        diet_frame = customtkinter.CTkFrame(options_frame, fg_color="transparent")
        diet_frame.pack(side="left", padx=(0, Layout.PAD_LG))

        customtkinter.CTkLabel(
            diet_frame, text="🥗  Diet Type",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
        ).pack(anchor="w", pady=(0, Layout.PAD_XS))

        self.plan_diet_var = customtkinter.StringVar(value="Balanced")
        self.plan_diet_menu = create_option_menu(
            diet_frame,
            values=["Balanced", "High-Protein", "Low-Carb", "Vegetarian", "Vegan", "Keto", "Mediterranean"],
            variable=self.plan_diet_var, width=160
        )
        self.plan_diet_menu.pack()

        # Generate Button (animated pill style)
        self.generate_plan_btn = customtkinter.CTkButton(
            options_frame, text="✨  Generate Plan", command=self.generate_meal_plan,
            fg_color=Colors.SURFACE_LIGHT, hover_color=Colors.SURFACE_HOVER,
            corner_radius=10, height=44, width=200,
            font=Fonts.body_bold(), text_color=Colors.TEXT_PRIMARY,
            border_color=Colors.BORDER, border_width=1
        )
        self.generate_plan_btn.pack(side="right")
        self.app._setup_glow(self.generate_plan_btn, Colors.BORDER, Colors.ACCENT_GREEN)

        # ── Result Card ──
        result_card = create_styled_card(self.tab)
        result_card.grid(row=2, column=0, sticky="nsew",
                         padx=Layout.PAD_MD, pady=(0, Layout.PAD_SM))
        result_card.grid_columnconfigure(0, weight=1)
        result_card.grid_rowconfigure(1, weight=1)
        add_hover_highlight(result_card, hover_border=Colors.ACCENT_GREEN)

        result_header = customtkinter.CTkFrame(result_card, fg_color="transparent")
        result_header.grid(row=0, column=0, sticky="ew", padx=Layout.PAD_MD, pady=(Layout.PAD_MD, 0))

        customtkinter.CTkLabel(
            result_header, text="📋  Your Personalized Meal Plan",
            font=Fonts.body_bold(), text_color=Colors.ACCENT_GREEN, anchor="w"
        ).pack(side="left")

        self.meal_plan_textbox = create_styled_textbox(result_card, editable=False)
        self.meal_plan_textbox.grid(row=1, column=0, sticky="nsew",
                                     padx=Layout.PAD_MD, pady=Layout.PAD_MD)

        # ── Progress ──
        self.plan_progress = create_progress_bar(self.tab, color=Colors.ACCENT_GREEN)
        self.plan_progress.grid(row=3, column=0, sticky="ew",
                                padx=Layout.PAD_MD, pady=(0, Layout.PAD_MD))

    def generate_meal_plan(self):
        cals = self.plan_cal_entry.get() or str(int(self.app.target_calories))
        diet = self.plan_diet_var.get()

        # Cancel any existing typing animation
        if self._typing_job:
            self.meal_plan_textbox.after_cancel(self._typing_job)
            self._typing_job = None

        self.meal_plan_textbox.configure(state="normal")
        self.meal_plan_textbox.delete("1.0", "end")
        self.meal_plan_textbox.insert("1.0", "✨ Generating your personalized meal plan...")
        self.meal_plan_textbox.configure(state="disabled")
        self.plan_progress.start()
        self.generate_plan_btn.configure(state="disabled", text="⏳  Generating...")

        threading.Thread(target=self._generate_meal_plan_worker, args=(cals, diet), daemon=True).start()

    def _generate_meal_plan_worker(self, cals, diet):
        try:
            response_text = self.app.ai.generate_meal_plan(cals, diet, self.app.dietary_restrictions, self.app.food_preferences)
            self.app.after(0, self._typewriter_effect, response_text)
        except Exception as e:
            self.app.after(0, self._update_meal_plan_box, f"An error occurred: {e}")
        finally:
            self.app.after(0, self.plan_progress.stop)
            self.app.after(0, lambda: self.generate_plan_btn.configure(state="normal", text="✨  Generate Plan"))

    def _typewriter_effect(self, full_text, idx=0):
        """Animate text appearing character-by-character."""
        if idx == 0:
            self.meal_plan_textbox.configure(state="normal")
            self.meal_plan_textbox.delete("1.0", "end")

        if idx < len(full_text):
            self.meal_plan_textbox.configure(state="normal")
            self.meal_plan_textbox.insert("end", full_text[idx])
            self.meal_plan_textbox.configure(state="disabled")
            self.meal_plan_textbox.see("end")
            speed = 2 if len(full_text) > 500 else 8
            self._typing_job = self.meal_plan_textbox.after(speed, self._typewriter_effect, full_text, idx + 1)
        else:
            self.meal_plan_textbox.configure(state="disabled")
            self._typing_job = None

    def _update_meal_plan_box(self, text):
        self.meal_plan_textbox.configure(state="normal")
        self.meal_plan_textbox.delete("1.0", "end")
        self.meal_plan_textbox.insert("1.0", text)
        self.meal_plan_textbox.configure(state="disabled")
