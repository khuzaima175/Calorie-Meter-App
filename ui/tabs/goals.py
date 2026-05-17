
import customtkinter
from tkinter import messagebox
from ui.theme import (
    Colors, Fonts, Layout,
    create_styled_card, create_accent_button, create_styled_entry,
    create_gradient_header, add_hover_highlight, animate_value
)


class GoalsTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(1, weight=1)

        # ── Gradient Header ──
        self.header = create_gradient_header(
            self.tab, "Goals & Settings", "⚙️", "#E91E63", "#FF6F00"
        )
        self.header.grid(row=0, column=0, sticky="ew",
                         padx=Layout.PAD_MD, pady=(Layout.PAD_MD, Layout.PAD_SM))

        # Scrollable container for the goals form
        scroll_frame = customtkinter.CTkScrollableFrame(
            self.tab, fg_color="transparent",
            scrollbar_button_color=Colors.SURFACE_HOVER,
            scrollbar_button_hover_color=Colors.ACCENT_PRIMARY,
        )
        scroll_frame.grid(row=1, column=0, sticky="nsew", padx=Layout.PAD_MD, pady=(0, Layout.PAD_MD))
        scroll_frame.grid_columnconfigure(0, weight=1)

        # ── Nutrition Goals Card ──
        nutrition_card = create_styled_card(scroll_frame)
        nutrition_card.grid(row=0, column=0, sticky="ew", pady=(0, Layout.PAD_MD))
        nutrition_card.grid_columnconfigure((1, 3), weight=1)
        add_hover_highlight(nutrition_card, hover_border=Colors.ACCENT_PINK)

        # Card header with icon
        nh_frame = customtkinter.CTkFrame(nutrition_card, fg_color="transparent")
        nh_frame.grid(row=0, column=0, columnspan=4, padx=Layout.PAD_LG, pady=Layout.PAD_LG, sticky="ew")

        customtkinter.CTkLabel(
            nh_frame, text="🍎  Nutrition Targets",
            font=Fonts.h3(), text_color=Colors.TEXT_PRIMARY
        ).pack(side="left")

        customtkinter.CTkLabel(
            nh_frame, text="Set your daily macros",
            font=Fonts.tiny(), text_color=Colors.TEXT_TERTIARY
        ).pack(side="right")

        # Accent divider
        customtkinter.CTkFrame(nutrition_card, height=2, fg_color=Colors.ACCENT_PINK).grid(
            row=1, column=0, columnspan=4, sticky="ew", padx=Layout.PAD_LG
        )

        # Goal entries in 2-column grid
        goal_defs = [
            ("🔥  Calories (kcal)", "target_calories", self.app.target_calories),
            ("🥩  Protein (g)", "target_protein", self.app.target_protein),
            ("🧈  Fat (g)", "target_fat", self.app.target_fat),
            ("🍞  Carbs (g)", "target_carbs", self.app.target_carbs),
        ]

        self.entries = {}
        for i, (label, key, default) in enumerate(goal_defs):
            row = 2 + (i // 2)
            col_offset = (i % 2) * 2

            customtkinter.CTkLabel(
                nutrition_card, text=label,
                font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
            ).grid(row=row, column=col_offset, padx=(Layout.PAD_LG, Layout.PAD_SM),
                   pady=Layout.PAD_MD, sticky="e")

            entry = create_styled_entry(nutrition_card, placeholder=str(int(default)), width=140)
            entry.grid(row=row, column=col_offset + 1, padx=(0, Layout.PAD_LG),
                      pady=Layout.PAD_MD, sticky="w")
            self.entries[key] = entry

        # ── Fitness Goals Card ──
        fitness_card = create_styled_card(scroll_frame)
        fitness_card.grid(row=1, column=0, sticky="ew", pady=(0, Layout.PAD_MD))
        fitness_card.grid_columnconfigure((1, 3), weight=1)
        add_hover_highlight(fitness_card, hover_border=Colors.ACCENT_CYAN)

        fh_frame = customtkinter.CTkFrame(fitness_card, fg_color="transparent")
        fh_frame.grid(row=0, column=0, columnspan=4, padx=Layout.PAD_LG, pady=Layout.PAD_LG, sticky="ew")

        customtkinter.CTkLabel(
            fh_frame, text="🏃  Fitness & Hydration",
            font=Fonts.h3(), text_color=Colors.TEXT_PRIMARY
        ).pack(side="left")

        customtkinter.CTkLabel(
            fh_frame, text="Stay active & hydrated",
            font=Fonts.tiny(), text_color=Colors.TEXT_TERTIARY
        ).pack(side="right")

        # Accent divider
        customtkinter.CTkFrame(fitness_card, height=2, fg_color=Colors.ACCENT_CYAN).grid(
            row=1, column=0, columnspan=4, sticky="ew", padx=Layout.PAD_LG
        )

        fitness_defs = [
            ("💧  Water (ml)", "target_water", self.app.target_water),
            ("⏱️  Exercise (min)", "target_exercise", self.app.target_exercise),
        ]

        for i, (label, key, default) in enumerate(fitness_defs):
            col_offset = i * 2

            customtkinter.CTkLabel(
                fitness_card, text=label,
                font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
            ).grid(row=2, column=col_offset, padx=(Layout.PAD_LG, Layout.PAD_SM),
                   pady=Layout.PAD_LG, sticky="e")

            entry = create_styled_entry(fitness_card, placeholder=str(int(default)), width=140)
            entry.grid(row=2, column=col_offset + 1, padx=(0, Layout.PAD_LG),
                      pady=Layout.PAD_LG, sticky="w")
            self.entries[key] = entry

        # ── Preferences Card ──
        pref_card = create_styled_card(scroll_frame)
        pref_card.grid(row=2, column=0, sticky="ew", pady=(0, Layout.PAD_MD))
        pref_card.grid_columnconfigure(1, weight=1)
        add_hover_highlight(pref_card, hover_border=Colors.ACCENT_YELLOW)

        ph_frame = customtkinter.CTkFrame(pref_card, fg_color="transparent")
        ph_frame.grid(row=0, column=0, columnspan=2, padx=Layout.PAD_LG, pady=Layout.PAD_LG, sticky="ew")

        customtkinter.CTkLabel(
            ph_frame, text="🌿  Dietary Preferences",
            font=Fonts.h3(), text_color=Colors.TEXT_PRIMARY
        ).pack(side="left")

        customtkinter.CTkLabel(
            ph_frame, text="Personalize your experience",
            font=Fonts.tiny(), text_color=Colors.TEXT_TERTIARY
        ).pack(side="right")

        customtkinter.CTkFrame(pref_card, height=2, fg_color=Colors.ACCENT_YELLOW).grid(
            row=1, column=0, columnspan=2, sticky="ew", padx=Layout.PAD_LG
        )

        customtkinter.CTkLabel(
            pref_card, text="Restrictions",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
        ).grid(row=2, column=0, padx=(Layout.PAD_LG, Layout.PAD_SM), pady=Layout.PAD_MD, sticky="e")

        self.diet_restrict_entry = create_styled_entry(pref_card, placeholder="e.g., Vegetarian, Gluten-Free")
        self.diet_restrict_entry.grid(row=2, column=1, padx=(0, Layout.PAD_LG), pady=Layout.PAD_MD, sticky="ew")

        customtkinter.CTkLabel(
            pref_card, text="Preferences",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
        ).grid(row=3, column=0, padx=(Layout.PAD_LG, Layout.PAD_SM), pady=(0, Layout.PAD_LG), sticky="e")

        self.food_pref_entry = create_styled_entry(pref_card, placeholder="e.g., No seafood, Likes spicy")
        self.food_pref_entry.grid(row=3, column=1, padx=(0, Layout.PAD_LG), pady=(0, Layout.PAD_LG), sticky="ew")

        # ── Save Button (animated pill style) ──
        btn_frame = customtkinter.CTkFrame(scroll_frame, fg_color="transparent")
        btn_frame.grid(row=3, column=0, sticky="ew", pady=Layout.PAD_SM)

        self.update_goals_button = customtkinter.CTkButton(
            btn_frame, text="💾  Save Goals", command=self.update_goals,
            fg_color=Colors.ACCENT_GREEN, hover_color="#2EA043",
            corner_radius=20, height=48, width=220,
            font=Fonts.h3(), text_color=Colors.TEXT_WHITE,
            border_color="#5FE87D", border_width=2
        )
        self.update_goals_button.pack(anchor="center")

    def update_goals(self):
        try:
            self.app.target_calories = float(self.entries["target_calories"].get() or self.app.target_calories)
            self.app.target_protein = float(self.entries["target_protein"].get() or self.app.target_protein)
            self.app.target_fat = float(self.entries["target_fat"].get() or self.app.target_fat)
            self.app.target_carbs = float(self.entries["target_carbs"].get() or self.app.target_carbs)
            self.app.target_water = float(self.entries["target_water"].get() or self.app.target_water)
            self.app.target_exercise = float(self.entries["target_exercise"].get() or self.app.target_exercise)

            self.app.dietary_restrictions = self.diet_restrict_entry.get()
            self.app.food_preferences = self.food_pref_entry.get()

            # Visual feedback - brief button color flash
            self.update_goals_button.configure(text="✅  Goals Saved!", fg_color=Colors.ACCENT_CYAN)
            self.update_goals_button.after(
                1500,
                lambda: self.update_goals_button.configure(text="💾  Save Goals", fg_color=Colors.ACCENT_GREEN)
            )

            self.app.refresh_data()
        except ValueError:
            messagebox.showerror("Input Error", "Please enter valid numbers for all goals.")
