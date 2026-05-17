
import customtkinter
from tkinter import messagebox
from ui.theme import (
    Colors, Fonts, Layout, MEAL_ICONS, MEAL_COLORS,
    create_styled_card, create_section_header, create_delete_button,
    create_scrollable_frame, create_progress_bar, create_gradient_header,
    CircularProgressRing, animate_value, add_hover_highlight,
    get_greeting, get_daily_tip
)


class DailyLogTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(2, weight=1)

        # ── Gradient Header ──
        self.header = create_gradient_header(
            self.tab, "Daily Log", "📋", "#C0392B", "#E67E22"
        )
        self.header.grid(row=0, column=0, sticky="ew", padx=Layout.PAD_MD, pady=(Layout.PAD_MD, Layout.PAD_SM))

        # ── Hero Dashboard with Rings ──
        self.hero_frame = customtkinter.CTkFrame(self.tab, fg_color=Colors.SURFACE,
                                                  border_color=Colors.BORDER, border_width=1,
                                                  corner_radius=Layout.CORNER_RADIUS)
        self.hero_frame.grid(row=1, column=0, sticky="ew", padx=Layout.PAD_MD, pady=(0, Layout.PAD_SM))
        self.hero_frame.grid_columnconfigure((0, 1, 2, 3), weight=1)

        # Greeting & Tip row
        greeting_frame = customtkinter.CTkFrame(self.hero_frame, fg_color="transparent")
        greeting_frame.grid(row=0, column=0, columnspan=4, sticky="ew", padx=Layout.PAD_LG, pady=(Layout.PAD_MD, 0))

        self.greeting_label = customtkinter.CTkLabel(
            greeting_frame, text=get_greeting(),
            font=Fonts.h2(), text_color=Colors.TEXT_WHITE, anchor="w"
        )
        self.greeting_label.pack(side="left")

        self.tip_label = customtkinter.CTkLabel(
            greeting_frame, text=get_daily_tip(),
            font=Fonts.small(), text_color=Colors.TEXT_SECONDARY, anchor="e",
            wraplength=400
        )
        self.tip_label.pack(side="right")

        # Stat cards: Calories, Protein, Water, Exercise
        ring_defs = [
            ("Calories", "🔥", Colors.CARD_CALORIES, Colors.CARD_CALORIES_BG),
            ("Protein", "🥩", Colors.CARD_PROTEIN, Colors.CARD_PROTEIN_BG),
            ("Water", "💧", Colors.CARD_WATER, Colors.CARD_WATER_BG),
            ("Exercise", "🏃", Colors.CARD_EXERCISE, Colors.CARD_EXERCISE_BG),
        ]

        self.ring_widgets = {}
        for i, (title, icon, accent, bg) in enumerate(ring_defs):
            card_frame = customtkinter.CTkFrame(
                self.hero_frame, fg_color=bg,
                border_color=Colors.BORDER, border_width=1,
                corner_radius=Layout.CORNER_RADIUS
            )
            card_frame.grid(row=1, column=i, padx=Layout.PAD_SM, pady=Layout.PAD_MD, sticky="ew")
            card_frame.grid_columnconfigure(0, weight=1)

            # Hover highlight
            add_hover_highlight(card_frame, normal_fg=bg, hover_fg=Colors.SURFACE_HOVER,
                                hover_border=accent)

            # Title
            customtkinter.CTkLabel(
                card_frame, text=f"{icon} {title}",
                font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
            ).grid(row=0, column=0, sticky="w", padx=Layout.PAD_MD, pady=(Layout.PAD_MD, 0))

            # Value label
            value_label = customtkinter.CTkLabel(
                card_frame, text="0",
                font=Fonts.h2(), text_color=Colors.TEXT_WHITE
            )
            value_label.grid(row=1, column=0, sticky="w", padx=Layout.PAD_MD, pady=(0, Layout.PAD_XS))

            # Progress Bar
            bar = create_progress_bar(card_frame, color=accent)
            bar.grid(row=2, column=0, sticky="ew", padx=Layout.PAD_MD, pady=(0, Layout.PAD_MD))
            bar.set(0)

            self.ring_widgets[title.lower()] = {
                "bar": bar, "value_label": value_label, "card": card_frame
            }

        # ── Daily Log List ──
        self.food_entries_frame = create_scrollable_frame(
            self.tab, label_text="  Your Meals Today"
        )
        self.food_entries_frame.grid(row=2, column=0, sticky="nsew", padx=Layout.PAD_MD, pady=(0, Layout.PAD_MD))
        self.food_entries_frame.grid_columnconfigure(0, weight=1)

    def _tk_color(self, hex_color):
        """Return the hex color for use in tk Canvas (strips leading transparency if any)."""
        return hex_color

    def update_views(self):
        """Updates the dashboard rings and log display."""
        self.update_rings()
        self.update_log_display()
        # Refresh greeting/tip
        self.greeting_label.configure(text=get_greeting())
        self.tip_label.configure(text=get_daily_tip())

    def update_rings(self):
        totals = self.app.totals

        # Calories
        net_cals = totals['calories'] - totals['exercise_calories']
        cal_pct = min(net_cals / self.app.target_calories, 1.0) if self.app.target_calories > 0 else 0
        self.ring_widgets["calories"]["bar"].set(max(0, cal_pct))
        self.ring_widgets["calories"]["value_label"].configure(text=f"{net_cals:,.0f}")

        # Protein
        prot_pct = min(totals['protein'] / self.app.target_protein, 1.0) if self.app.target_protein > 0 else 0
        self.ring_widgets["protein"]["bar"].set(max(0, prot_pct))
        self.ring_widgets["protein"]["value_label"].configure(text=f"{totals['protein']:.0f}g")

        # Water
        water_pct = min(totals['water'] / self.app.target_water, 1.0) if self.app.target_water > 0 else 0
        self.ring_widgets["water"]["bar"].set(max(0, water_pct))
        self.ring_widgets["water"]["value_label"].configure(text=f"{totals['water']:.0f}ml")

        # Exercise
        ex_pct = min(totals['exercise'] / self.app.target_exercise, 1.0) if self.app.target_exercise > 0 else 0
        self.ring_widgets["exercise"]["bar"].set(max(0, ex_pct))
        self.ring_widgets["exercise"]["value_label"].configure(text=f"{totals['exercise']:.0f}m")

    def update_log_display(self):
        for widget in self.food_entries_frame.winfo_children():
            widget.destroy()

        meals = self.app.db.get_meals_by_date(self.app.current_date)
        if not meals:
            empty_frame = customtkinter.CTkFrame(self.food_entries_frame, fg_color="transparent")
            empty_frame.pack(fill="x", pady=60)
            customtkinter.CTkLabel(
                empty_frame, text="🍽️",
                font=customtkinter.CTkFont(size=48)
            ).pack()
            customtkinter.CTkLabel(
                empty_frame, text="No meals logged yet",
                font=Fonts.h3(), text_color=Colors.TEXT_SECONDARY
            ).pack(pady=(Layout.PAD_SM, 0))
            customtkinter.CTkLabel(
                empty_frame, text="Use the input above to start tracking your meals!",
                font=Fonts.small(), text_color=Colors.TEXT_TERTIARY
            ).pack(pady=4)
            return

        # Load Icons
        from PIL import Image, ImageOps, ImageDraw
        import os
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            assets_dir = os.path.join(project_root, "assets")

            def load_circular_icon(name):
                path = os.path.join(assets_dir, f"{name}.png")
                img = Image.open(path).convert("RGBA")
                size = img.size
                mask = Image.new('L', size, 0)
                draw = ImageDraw.Draw(mask)
                draw.ellipse((0, 0) + size, fill=255)
                output = ImageOps.fit(img, mask.size, centering=(0.5, 0.5))
                output.putalpha(mask)
                return customtkinter.CTkImage(output, size=(56, 56))

            self.icons = {
                "breakfast": load_circular_icon("breakfast"),
                "lunch": load_circular_icon("lunch"),
                "dinner": load_circular_icon("dinner"),
                "snack": load_circular_icon("snack"),
            }
        except Exception as e:
            print(f"Error loading icons: {e}")
            self.icons = {}

        for i, meal in enumerate(meals):
            m_type = meal[11].lower() if meal[11] else "snack"
            accent = MEAL_COLORS.get(m_type, Colors.ACCENT_PRIMARY)

            entry_frame = customtkinter.CTkFrame(
                self.food_entries_frame,
                fg_color=Colors.SURFACE_LIGHT,
                border_color=Colors.BORDER,
                border_width=1,
                corner_radius=Layout.CORNER_RADIUS
            )
            entry_frame.grid(row=i, column=0, sticky="ew", pady=4, padx=4)
            entry_frame.grid_columnconfigure(2, weight=1)

            # Hover highlight on meal cards
            add_hover_highlight(entry_frame, hover_border=accent)

            # Accent strip on left side
            accent_strip = customtkinter.CTkFrame(
                entry_frame, width=4, fg_color=accent, corner_radius=0
            )
            accent_strip.grid(row=0, column=0, rowspan=2, sticky="ns", padx=(0, 0), pady=0)

            # Icon (larger: 56x56)
            if m_type in self.icons:
                customtkinter.CTkLabel(entry_frame, text="", image=self.icons[m_type]).grid(
                    row=0, column=1, rowspan=2, padx=Layout.PAD_MD, pady=Layout.PAD_SM
                )
            else:
                icon_text = MEAL_ICONS.get(m_type, "🍽️")
                customtkinter.CTkLabel(entry_frame, text=icon_text, font=Fonts.emoji_large()).grid(
                    row=0, column=1, rowspan=2, padx=Layout.PAD_MD, pady=Layout.PAD_SM
                )

            # Text Details
            header = f"{m_type.capitalize()}  ·  {meal[3]}"
            details = f"🔥 {meal[4]:.0f} kcal   ·   🥩 {meal[5]:.1f}g   ·   🕒 {meal[2]}"

            customtkinter.CTkLabel(
                entry_frame, text=header, anchor="w",
                font=Fonts.body_bold(), text_color=Colors.TEXT_PRIMARY
            ).grid(row=0, column=2, padx=Layout.PAD_XS, pady=(Layout.PAD_SM, 0), sticky="ew")

            customtkinter.CTkLabel(
                entry_frame, text=details, anchor="w",
                font=Fonts.small(), text_color=Colors.TEXT_SECONDARY
            ).grid(row=1, column=2, padx=Layout.PAD_XS, pady=(0, Layout.PAD_SM), sticky="ew")

            delete_btn = create_delete_button(
                entry_frame, command=lambda id=meal[0]: self.delete_meal(id)
            )
            delete_btn.grid(row=0, column=3, rowspan=2, padx=Layout.PAD_MD)

    def delete_meal(self, meal_id):
        if messagebox.askyesno("Confirm Delete", "Are you sure you want to delete this meal entry?"):
            self.app.db.delete_meal(meal_id)
            self.app.refresh_data()
