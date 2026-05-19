
import customtkinter
import datetime
import threading
from tkinter import messagebox, filedialog, simpledialog
from PIL import Image

from database import DatabaseManager
from ai_manager import AIManager
from ui.theme import (
    Colors, Fonts, Layout, MEAL_ICONS,
    create_styled_card, create_section_header, create_accent_button,
    create_styled_entry, create_pill_button, create_progress_bar,
    create_option_menu, create_delete_button, create_nav_icon_button,
    pulse_widget, add_hover_highlight, Tooltip, animate_value
)

# Import Tabs
from ui.tabs.daily_log import DailyLogTab
from ui.tabs.charts import ChartsTab
from ui.tabs.ai_analysis import AIAnalysisTab
from ui.tabs.exercise import ExerciseTab
from ui.tabs.history import HistoryTab
from ui.tabs.meal_planner import MealPlannerTab
from ui.tabs.goals import GoalsTab
from ui.tabs.nutrition_qa import NutritionQATab


class SmartCalorieTrackerApp(customtkinter.CTk):
    def __init__(self):
        super().__init__()
        self.db = DatabaseManager()
        self.ai = AIManager()

        self.setup_window()
        self.init_data_vars()
        self.setup_ui()
        self.change_date(self.current_date)

        self.bind_keys()
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def setup_window(self):
        self.title("Calorie Tracker Pro")
        customtkinter.set_appearance_mode("dark")
        customtkinter.set_default_color_theme("blue")
        self.configure(fg_color=Colors.BG_DARK)
        # Start maximized so it fits any screen
        self.state('zoomed')

    def init_data_vars(self):
        self.current_date = datetime.datetime.now().strftime("%Y-%m-%d")

        # Targets
        self.target_calories = 2500.0
        self.target_protein = 80.0
        self.target_fat = 80.0
        self.target_carbs = 300.0
        self.target_water = 1200.0
        self.target_exercise = 30.0

        self.dietary_restrictions = ""
        self.food_preferences = ""

        self.totals = {
            "calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0,
            "fiber": 0.0, "sugar": 0.0, "sodium": 0.0, "water": 0.0,
            "exercise": 0.0, "exercise_calories": 0.0
        }

        self.quick_add_foods = [
            {"name": "Banana", "calories": 105, "protein_g": 1.3, "fat_g": 0.4, "carbs_g": 27},
            {"name": "Apple", "calories": 95, "protein_g": 0.5, "fat_g": 0.3, "carbs_g": 25},
            {"name": "Egg", "calories": 70, "protein_g": 6, "fat_g": 5, "carbs_g": 0.5},
            {"name": "Chicken Breast", "calories": 165, "protein_g": 31, "fat_g": 3.6, "carbs_g": 0},
            {"name": "Rice (1 cup)", "calories": 205, "protein_g": 4.3, "fat_g": 0.4, "carbs_g": 45},
            {"name": "Milk (1 cup)", "calories": 150, "protein_g": 8, "fat_g": 8, "carbs_g": 12},
            {"name": "Ghee Paratha", "calories": 300, "protein_g": 5, "fat_g": 15, "carbs_g": 40}
        ]

    def bind_keys(self):
        self.bind("<Control-Left>", lambda e: self.prev_day())
        self.bind("<Control-Right>", lambda e: self.next_day())

    def on_closing(self):
        self.quit()
        self.destroy()

    # ═══════════════════════════════════════════════════════════
    # UI SETUP
    # ═══════════════════════════════════════════════════════════

    def setup_ui(self):
        self.grid_columnconfigure(0, weight=0, minsize=Layout.SIDEBAR_WIDTH)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.setup_sidebar()
        self.setup_main_area()

    def setup_sidebar(self):
        self.sidebar_frame = customtkinter.CTkFrame(
            self, corner_radius=0,
            fg_color=Colors.BG_SIDEBAR,
            border_color=Colors.BORDER, border_width=1
        )
        self.sidebar_frame.grid(row=0, column=0, rowspan=2, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(14, weight=1)
        self.sidebar_frame.grid_columnconfigure(0, weight=1)

        # ── Logo/Header ──
        logo_frame = customtkinter.CTkFrame(self.sidebar_frame, fg_color="transparent")
        logo_frame.grid(row=0, column=0, padx=Layout.PAD_MD, pady=(Layout.PAD_LG, Layout.PAD_XS), sticky="ew")

        self.logo_label = customtkinter.CTkLabel(
            logo_frame, text="🍎 Calorie Meter",
            font=Fonts.h3(), text_color=Colors.TEXT_WHITE
        )
        self.logo_label.pack(anchor="w")

        subtitle = customtkinter.CTkLabel(
            logo_frame, text="Smart Nutrition Tracking",
            font=Fonts.tiny(), text_color=Colors.TEXT_TERTIARY
        )
        subtitle.pack(anchor="w")

        # Divider
        customtkinter.CTkFrame(self.sidebar_frame, height=1, fg_color=Colors.BORDER).grid(
            row=1, column=0, sticky="ew", padx=Layout.PAD_MD, pady=Layout.PAD_XS
        )

        # ── Date Section ──
        date_frame = customtkinter.CTkFrame(self.sidebar_frame, fg_color="transparent")
        date_frame.grid(row=2, column=0, padx=Layout.PAD_MD, pady=Layout.PAD_XS, sticky="ew")
        date_frame.grid_columnconfigure(0, weight=1)

        customtkinter.CTkLabel(
            date_frame, text="📅 Date",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY, anchor="w"
        ).grid(row=0, column=0, sticky="w", pady=(0, 2))

        self.date_entry = create_styled_entry(date_frame, placeholder=self.current_date)
        self.date_entry.configure(height=34)
        self.date_entry.grid(row=1, column=0, sticky="ew", pady=(0, 4))
        self.date_entry.bind("<Return>", lambda e: self.change_date(self.date_entry.get()))

        # Navigation Buttons
        nav_frame = customtkinter.CTkFrame(date_frame, fg_color="transparent")
        nav_frame.grid(row=2, column=0, sticky="ew")
        nav_frame.grid_columnconfigure((0, 1), weight=1)

        self.prev_day_btn = customtkinter.CTkButton(
            nav_frame, text="◀ Prev", command=self.prev_day,
            fg_color=Colors.SURFACE_LIGHT, hover_color=Colors.SURFACE_HOVER,
            corner_radius=Layout.CORNER_RADIUS_SM, height=30,
            font=Fonts.small(), text_color=Colors.TEXT_SECONDARY,
            border_color=Colors.BORDER, border_width=1
        )
        self.prev_day_btn.grid(row=0, column=0, padx=(0, 2), sticky="ew")

        self.next_day_btn = customtkinter.CTkButton(
            nav_frame, text="Next ▶", command=self.next_day,
            fg_color=Colors.SURFACE_LIGHT, hover_color=Colors.SURFACE_HOVER,
            corner_radius=Layout.CORNER_RADIUS_SM, height=30,
            font=Fonts.small(), text_color=Colors.TEXT_SECONDARY,
            border_color=Colors.BORDER, border_width=1
        )
        self.next_day_btn.grid(row=0, column=1, padx=(2, 0), sticky="ew")

        # ── Quick Stats ──
        customtkinter.CTkFrame(self.sidebar_frame, height=1, fg_color=Colors.BORDER).grid(
            row=3, column=0, sticky="ew", padx=Layout.PAD_MD, pady=Layout.PAD_XS
        )

        stats_header = customtkinter.CTkLabel(
            self.sidebar_frame, text="📊 Progress",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY, anchor="w"
        )
        stats_header.grid(row=4, column=0, padx=Layout.PAD_MD, pady=(Layout.PAD_XS, 2), sticky="w")

        stats_frame = customtkinter.CTkFrame(self.sidebar_frame, fg_color="transparent")
        stats_frame.grid(row=5, column=0, padx=Layout.PAD_MD, sticky="ew")
        stats_frame.grid_columnconfigure(0, weight=1)

        # Calorie stat with progress bar
        self.quick_cal_label = self._create_stat_row(stats_frame, "🔥", "Cal", "0 / 2500", Colors.CARD_CALORIES, 0)
        # Protein stat with progress bar
        self.quick_protein_label = self._create_stat_row(stats_frame, "🥩", "Prot", "0 / 80g", Colors.CARD_PROTEIN, 1)
        # Water stat with progress bar
        self.quick_water_label = self._create_stat_row(stats_frame, "💧", "Water", "0 / 1200ml", Colors.CARD_WATER, 2)

        # ── Streak Badge ──
        streak_frame = create_styled_card(self.sidebar_frame, fg_color=Colors.SURFACE)
        streak_frame.grid(row=6, column=0, padx=Layout.PAD_MD, pady=Layout.PAD_XS, sticky="ew")

        self.streak_label = customtkinter.CTkLabel(
            streak_frame, text="🔥 Streak: 0 Days",
            font=Fonts.small_bold(), text_color=Colors.ACCENT_ORANGE
        )
        self.streak_label.pack(padx=Layout.PAD_SM, pady=Layout.PAD_XS)

        # ── Motivation ──
        self.motivational_label = customtkinter.CTkLabel(
            self.sidebar_frame, text="",
            font=Fonts.tiny(), text_color=Colors.TEXT_SECONDARY,
            wraplength=190, justify="center"
        )
        self.motivational_label.grid(row=7, column=0, padx=Layout.PAD_MD, pady=2, sticky="ew")

        # ── Tab Navigation Icons ──
        customtkinter.CTkFrame(self.sidebar_frame, height=1, fg_color=Colors.BORDER).grid(
            row=8, column=0, sticky="ew", padx=Layout.PAD_MD, pady=Layout.PAD_XS
        )

        customtkinter.CTkLabel(
            self.sidebar_frame, text="🧭 Navigate",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY, anchor="w"
        ).grid(row=9, column=0, padx=Layout.PAD_MD, pady=(Layout.PAD_XS, 2), sticky="w")

        nav_frame = customtkinter.CTkFrame(self.sidebar_frame, fg_color="transparent")
        nav_frame.grid(row=10, column=0, padx=Layout.PAD_SM, sticky="ew")
        nav_frame.grid_columnconfigure(0, weight=1)

        tab_nav_defs = [
            ("📋  Daily Log",     "daily_log",     Colors.ACCENT_RED),
            ("📊  Charts",        "charts",        Colors.ACCENT_GREEN),
            ("🤖  AI Analysis",   "ai_analysis",   Colors.ACCENT_PURPLE),
            ("🏃  Exercise",      "exercise",      Colors.ACCENT_CYAN),
            ("📈  History",       "history",       Colors.ACCENT_ORANGE),
            ("🍽️  Meal Planner",  "meal_planner",  Colors.ACCENT_GREEN),
            ("⚙️  Goals Target",  "goals",         Colors.ACCENT_PINK),
            ("❓  Nutrition Q&A",  "nutrition_qa",  Colors.ACCENT_PRIMARY),
        ]

        self.nav_buttons = {}
        for i, (label, key, color) in enumerate(tab_nav_defs):
            btn = customtkinter.CTkButton(
                nav_frame, text=label,
                command=lambda k=key: self.switch_tab(k),
                fg_color="transparent", hover_color=Colors.SURFACE_HOVER,
                border_width=0,
                corner_radius=8, height=36,
                font=Fonts.body_bold(), text_color=Colors.TEXT_SECONDARY,
                anchor="w"
            )
            self._setup_glow(btn, Colors.BORDER, color)
            btn.grid(row=i, column=0, padx=4, pady=2, sticky="ew")
            self.nav_buttons[key] = btn

        # ── Quick Actions ──
        customtkinter.CTkFrame(self.sidebar_frame, height=1, fg_color=Colors.BORDER).grid(
            row=11, column=0, sticky="ew", padx=Layout.PAD_MD, pady=Layout.PAD_XS
        )

        customtkinter.CTkLabel(
            self.sidebar_frame, text="⚡ Actions",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY, anchor="w"
        ).grid(row=12, column=0, padx=Layout.PAD_MD, pady=(Layout.PAD_XS, 2), sticky="w")

        actions_frame = customtkinter.CTkFrame(self.sidebar_frame, fg_color="transparent")
        actions_frame.grid(row=13, column=0, padx=Layout.PAD_MD, sticky="ew")
        actions_frame.grid_columnconfigure(0, weight=1)

        self.water_btn = customtkinter.CTkButton(
            actions_frame, text="💧 Add Water", command=self.quick_add_water,
            fg_color=Colors.SURFACE_LIGHT, hover_color=Colors.SURFACE_HOVER,
            corner_radius=10, height=32, font=Fonts.small_bold(),
            text_color=Colors.TEXT_PRIMARY,
            border_color=Colors.BORDER, border_width=1
        )
        self.water_btn.grid(row=0, column=0, pady=3, sticky="ew")
        self._setup_glow(self.water_btn, Colors.BORDER, Colors.ACCENT_CYAN)

        self.exercise_btn = customtkinter.CTkButton(
            actions_frame, text="🏃 Exercise",
            command=lambda: self.switch_tab("exercise"),
            fg_color=Colors.SURFACE_LIGHT, hover_color=Colors.SURFACE_HOVER,
            corner_radius=10, height=32, font=Fonts.small_bold(),
            text_color=Colors.TEXT_PRIMARY,
            border_color=Colors.BORDER, border_width=1
        )
        self.exercise_btn.grid(row=1, column=0, pady=2, sticky="ew")
        self._setup_glow(self.exercise_btn, Colors.BORDER, Colors.ACCENT_PURPLE)

        self.export_btn = customtkinter.CTkButton(
            actions_frame, text="📊 Export", command=self.export_data,
            fg_color=Colors.SURFACE_LIGHT, hover_color=Colors.SURFACE_HOVER,
            corner_radius=10, height=32, font=Fonts.small_bold(),
            text_color=Colors.TEXT_PRIMARY,
            border_color=Colors.BORDER, border_width=1
        )
        self.export_btn.grid(row=2, column=0, pady=2, sticky="ew")
        self._setup_glow(self.export_btn, Colors.BORDER, Colors.ACCENT_PRIMARY)

        # ── Settings ──
        self.setup_settings_area()

        # ── Add Tooltips to sidebar stats ──
        Tooltip(self.quick_cal_label.master, "Net calories = eaten − exercise burned")
        Tooltip(self.quick_protein_label.master, "Daily protein intake target")
        Tooltip(self.quick_water_label.master, "Track your hydration throughout the day")

    def _create_stat_row(self, parent, icon, label, value_text, bar_color, row_idx):
        """Creates a labeled stat row with a progress bar in the sidebar."""
        frame = customtkinter.CTkFrame(parent, fg_color="transparent")
        frame.grid(row=row_idx, column=0, sticky="ew", pady=4)
        frame.grid_columnconfigure(1, weight=1)

        customtkinter.CTkLabel(
            frame, text=f"{icon} {label}",
            font=Fonts.small(), text_color=Colors.TEXT_SECONDARY, anchor="w"
        ).grid(row=0, column=0, sticky="w")

        value_label = customtkinter.CTkLabel(
            frame, text=value_text,
            font=Fonts.small_bold(), text_color=Colors.TEXT_PRIMARY, anchor="e"
        )
        value_label.grid(row=0, column=1, sticky="e")

        bar = create_progress_bar(frame, color=bar_color)
        bar.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(2, 0))

        # Store the bar reference for updates
        value_label._progress_bar = bar
        # Add hover highlight on the stat row
        add_hover_highlight(frame, hover_border=bar_color)
        return value_label

    def setup_settings_area(self):
        customtkinter.CTkFrame(self.sidebar_frame, height=1, fg_color=Colors.BORDER).grid(
            row=14, column=0, sticky="sew", padx=Layout.PAD_MD, pady=Layout.PAD_XS
        )

        settings_frame = customtkinter.CTkFrame(self.sidebar_frame, fg_color="transparent")
        settings_frame.grid(row=15, column=0, padx=Layout.PAD_MD, pady=(0, Layout.PAD_MD), sticky="sew")
        settings_frame.grid_columnconfigure(0, weight=1)

        customtkinter.CTkLabel(
            settings_frame, text="🎨 Theme",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY, anchor="w"
        ).grid(row=0, column=0, sticky="w", pady=(0, 2))

        appearance_var = customtkinter.StringVar(value="Dark")
        appearance_menu = create_option_menu(
            settings_frame, values=["Light", "Dark"], variable=appearance_var
        )
        appearance_menu.configure(command=lambda mode: customtkinter.set_appearance_mode(mode.lower()))
        appearance_menu.grid(row=1, column=0, sticky="ew")

    def setup_main_area(self):
        self.main_frame = customtkinter.CTkFrame(self, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=(0, Layout.PAD_LG), pady=Layout.PAD_LG)
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(0, weight=1)

        self.setup_tabs()
        self.setup_status_bar()

    def create_food_input_card(self, parent_frame):
        top_frame = create_styled_card(parent_frame)
        top_frame.grid_columnconfigure(0, weight=1)

        # ── Main Input Row ──
        self.food_input_frame = customtkinter.CTkFrame(top_frame, fg_color="transparent")
        self.food_input_frame.grid(row=0, column=0, sticky="ew", padx=Layout.PAD_LG, pady=Layout.PAD_MD)
        self.food_input_frame.grid_columnconfigure(1, weight=1)

        # Header
        customtkinter.CTkLabel(
            self.food_input_frame, text="🍽️  What did you eat?",
            font=Fonts.h3(), text_color=Colors.TEXT_PRIMARY, anchor="w"
        ).grid(row=0, column=0, columnspan=4, sticky="w", pady=(0, Layout.PAD_SM))

        # Meal type selector
        self.meal_type_var = customtkinter.StringVar(value="snack")
        self.meal_type_menu = create_option_menu(
            self.food_input_frame,
            values=["breakfast", "lunch", "dinner", "snack"],
            variable=self.meal_type_var, width=130
        )
        self.meal_type_menu.grid(row=1, column=0, padx=(0, Layout.PAD_SM), pady=2)

        # Food entry
        self.food_entry = create_styled_entry(
            self.food_input_frame,
            placeholder="e.g., '2 large eggs, 1 slice of whole wheat toast with butter'"
        )
        self.food_entry.grid(row=1, column=1, sticky="ew", padx=Layout.PAD_SM, pady=2)
        self.food_entry.bind("<Return>", lambda e: self.process_food_entry())

        # Add button
        self.add_button = create_accent_button(
            self.food_input_frame, "Add Food", self.process_food_entry,
            icon="✚", width=130
        )
        self.add_button.grid(row=1, column=2, padx=Layout.PAD_SM, pady=2)

        # Photo button
        self.photo_button = create_accent_button(
            self.food_input_frame, "Photo", self.analyze_food_photo,
            color=Colors.ACCENT_PRIMARY, hover_color="#4A90D9",
            icon="📷", width=110
        )
        self.photo_button.grid(row=1, column=3, padx=(Layout.PAD_SM, 0), pady=2)

        # ── Quick Add Chips ──
        self.quick_add_frame = customtkinter.CTkFrame(top_frame, fg_color="transparent")
        self.quick_add_frame.grid(row=1, column=0, sticky="ew", padx=Layout.PAD_LG, pady=(0, Layout.PAD_MD))

        customtkinter.CTkLabel(
            self.quick_add_frame, text="Quick Add:",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
        ).pack(side="left", padx=(0, Layout.PAD_SM))

        for food in self.quick_add_foods:
            btn = create_pill_button(
                self.quick_add_frame, text=food["name"],
                command=lambda f=food: self.quick_add_food(f), width=110
            )
            btn.pack(side="left", padx=3)

        return top_frame

    def setup_tabs(self):
        self.tab_container = customtkinter.CTkFrame(self.main_frame, fg_color="transparent")
        self.tab_container.grid(row=0, column=0, sticky="nsew", pady=(0, Layout.PAD_SM))
        self.tab_container.grid_columnconfigure(0, weight=1)
        self.tab_container.grid_rowconfigure(0, weight=1)

        self.tabs = {}
        tab_keys = [
            "daily_log",
            "charts",
            "ai_analysis",
            "exercise",
            "history",
            "meal_planner",
            "goals",
            "nutrition_qa"
        ]

        for key in tab_keys:
            frame = customtkinter.CTkFrame(self.tab_container, fg_color="transparent")
            frame.grid(row=0, column=0, sticky="nsew")
            frame.grid_columnconfigure(0, weight=1)
            self.tabs[key] = frame

        # Initialize Tab Classes
        self.daily_log_tab = DailyLogTab(self.tabs["daily_log"], self)
        self.charts_tab = ChartsTab(self.tabs["charts"], self)
        self.ai_analysis_tab = AIAnalysisTab(self.tabs["ai_analysis"], self)
        self.exercise_tab = ExerciseTab(self.tabs["exercise"], self)
        self.history_tab = HistoryTab(self.tabs["history"], self)
        self.meal_planner_tab = MealPlannerTab(self.tabs["meal_planner"], self)
        self.goals_tab = GoalsTab(self.tabs["goals"], self)
        self.nutrition_qa_tab = NutritionQATab(self.tabs["nutrition_qa"], self)

        self.switch_tab("daily_log")

    def switch_tab(self, tab_key):
        self.active_tab_key = tab_key
        
        # Hide all tab frames
        for key, frame in self.tabs.items():
            frame.grid_remove()
            
        # Show active tab frame
        self.tabs[tab_key].grid()
        
        for key, btn in self.nav_buttons.items():
            if key == tab_key:
                btn.configure(
                    fg_color=Colors.SURFACE_LIGHT,
                    border_color=Colors.ACCENT_PRIMARY,
                    border_width=1,
                    text_color=Colors.TEXT_PRIMARY
                )
            else:
                btn.configure(
                    fg_color="transparent",
                    border_width=0,
                    text_color=Colors.TEXT_SECONDARY
                )

    def setup_status_bar(self):
        self.status_frame = customtkinter.CTkFrame(
            self, height=36, fg_color=Colors.BG_SIDEBAR,
            border_color=Colors.BORDER, border_width=1, corner_radius=0
        )
        self.status_frame.grid(row=1, column=0, columnspan=2, sticky="ew")
        self.status_frame.grid_columnconfigure(0, weight=1)

        self.status_label = customtkinter.CTkLabel(
            self.status_frame, text="✨  Ready to track your meals!",
            text_color=Colors.TEXT_TERTIARY, font=Fonts.small(), anchor="w"
        )
        self.status_label.grid(row=0, column=0, padx=Layout.PAD_LG, pady=6, sticky="w")

        self.progress_bar = customtkinter.CTkProgressBar(
            self.status_frame, width=200, mode="indeterminate",
            fg_color=Colors.SURFACE_LIGHT, progress_color=Colors.ACCENT_PRIMARY,
            height=4, corner_radius=2
        )
        self.progress_bar.grid(row=0, column=1, padx=Layout.PAD_LG, pady=6, sticky="e")
        self.progress_bar.set(0)

    def _setup_glow(self, btn, normal_color, glow_color):
        """Add hover glow effect to a button."""
        def on_enter(e):
            try:
                btn.configure(border_color=glow_color, border_width=2)
            except Exception:
                pass
        def on_leave(e):
            try:
                # If this button is a navigation menu item and is currently active, keep active accent border
                if hasattr(self, 'active_tab_key') and hasattr(self, 'nav_buttons') and btn in self.nav_buttons.values():
                    btn_key = next((k for k, b in self.nav_buttons.items() if b == btn), None)
                    if btn_key == self.active_tab_key:
                        btn.configure(border_color=Colors.ACCENT_PRIMARY, border_width=1)
                        return
                    else:
                        btn.configure(border_width=0)
                        return
                
                # For non-sidebar buttons or default inactive buttons
                fg = btn.cget("fg_color")
                if fg == "transparent":
                    btn.configure(border_width=0)
                else:
                    btn.configure(border_color=normal_color, border_width=1)
            except Exception:
                pass
        btn.bind("<Enter>", on_enter)
        btn.bind("<Leave>", on_leave)

    # ═══════════════════════════════════════════════════════════
    # LOGIC
    # ═══════════════════════════════════════════════════════════

    def refresh_data(self):
        """Reloads data and updates all UI components."""
        self.load_today_data()
        self.update_summary()
        self.daily_log_tab.update_views()
        self.charts_tab.update_charts()
        self.exercise_tab.update_log_display()
        self.update_motivational_message()

    def change_date(self, new_date):
        self.current_date = new_date
        self.date_entry.delete(0, 'end')
        self.date_entry.insert(0, self.current_date)

        self.refresh_data()
        self.status_label.configure(text=f"📅  Displaying data for {self.current_date}")

    def prev_day(self):
        current = datetime.datetime.strptime(self.current_date, "%Y-%m-%d")
        prev = current - datetime.timedelta(days=1)
        self.change_date(prev.strftime("%Y-%m-%d"))

    def next_day(self):
        current = datetime.datetime.strptime(self.current_date, "%Y-%m-%d")
        next_d = current + datetime.timedelta(days=1)
        self.change_date(next_d.strftime("%Y-%m-%d"))

    def load_today_data(self):
        meals = self.db.get_meals_by_date(self.current_date)
        exercises = self.db.get_exercises_by_date(self.current_date)
        water_intake = self.db.get_water_intake_by_date(self.current_date)

        self.totals = {
            "calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0,
            "fiber": 0.0, "sugar": 0.0, "sodium": 0.0,
            "water": water_intake, "exercise": 0.0, "exercise_calories": 0.0
        }

        for meal in meals:
            self.totals["calories"] += meal[4]
            self.totals["protein"] += meal[5]
            self.totals["fat"] += meal[6]
            self.totals["carbs"] += meal[7]
            self.totals["fiber"] += meal[8]
            self.totals["sugar"] += meal[9]
            self.totals["sodium"] += meal[10]

        for exercise in exercises:
            self.totals["exercise"] += exercise[4]
            self.totals["exercise_calories"] += exercise[5]

    def update_summary(self):
        net_calories = self.totals['calories'] - self.totals['exercise_calories']

        # Update Quick Stats in sidebar with animated progress bars
        cal_pct = min(net_calories / self.target_calories, 1.0) if self.target_calories > 0 else 0
        prot_pct = min(self.totals['protein'] / self.target_protein, 1.0) if self.target_protein > 0 else 0
        water_pct = min(self.totals['water'] / self.target_water, 1.0) if self.target_water > 0 else 0

        self.quick_cal_label.configure(text=f"{net_calories:,.0f} / {self.target_calories:,.0f}")
        self._animate_sidebar_bar(self.quick_cal_label._progress_bar, cal_pct)

        self.quick_protein_label.configure(text=f"{self.totals['protein']:.0f} / {self.target_protein:.0f}g")
        self._animate_sidebar_bar(self.quick_protein_label._progress_bar, prot_pct)

        self.quick_water_label.configure(text=f"{self.totals['water']:.0f} / {self.target_water:.0f}ml")
        self._animate_sidebar_bar(self.quick_water_label._progress_bar, water_pct)

        # Streak
        streak = self.db.calculate_streak()
        self.streak_label.configure(text=f"🔥  Streak: {streak} Day{'s' if streak != 1 else ''}")

        # Pulse the streak badge when active
        if streak > 0:
            pulse_widget(self.streak_label.master)

    def _animate_sidebar_bar(self, bar, target_pct):
        """Smoothly animate a sidebar progress bar to the target."""
        def _update(val):
            try:
                bar.set(max(0, min(val, 1.0)))
            except Exception:
                pass
        animate_value(bar, 0, target_pct, 600, _update)

    def update_motivational_message(self):
        yesterday = (datetime.datetime.strptime(self.current_date, "%Y-%m-%d") - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        yesterday_meals = self.db.get_meals_by_date(yesterday)
        yesterday_calories = sum(meal[4] for meal in yesterday_meals)
        today_calories = self.totals['calories']

        message = ""
        if yesterday_calories > 0:
            if yesterday_calories >= self.target_calories:
                message = "Great job yesterday! You met your calorie goal. Keep it up! 💪"
            else:
                message = f"Yesterday you were under your goal. Let's aim for {self.target_calories:,.0f} kcal today!"
        else:
            message = "Welcome! Let's start tracking for a healthier you. 🌟"

        if today_calories > self.target_calories:
            message += "\n\n⚠️ You've exceeded your calorie goal for today."

        self.motivational_label.configure(text=message)

    # ═══════════════════════════════════════════════════════════
    # ACTIONS
    # ═══════════════════════════════════════════════════════════

    def process_food_entry(self):
        food_text = self.food_entry.get()
        if not food_text:
            messagebox.showwarning("Input Error", "Please enter a food description.")
            return
        self._set_processing_state(True, "🔍  Analyzing food...")
        threading.Thread(target=self._get_nutrition_data_worker, args=(food_text,), daemon=True).start()

    def _get_nutrition_data_worker(self, food_text):
        try:
            nutrition_data = self.ai.analyze_food(food_text)
            self.after(0, self._add_meal_to_db, nutrition_data, food_text)
        except Exception as e:
            self.after(0, self.message_user, "Error", f"AI analysis failed. Please try a different description. Error: {e}", "error")
            self.after(0, self._set_processing_state, False, "Ready.")

    def _add_meal_to_db(self, nutrition_data, food_text):
        date = self.current_date
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        meal_type = self.meal_type_var.get()

        self.db.save_meal(date, timestamp, food_text, nutrition_data, meal_type)
        self.refresh_data()

        self.food_entry.delete(0, 'end')
        self._set_processing_state(False, "✅  Food added successfully!")

    def quick_add_food(self, food_data):
        date = self.current_date
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        meal_type = self.meal_type_var.get()
        wrapped_data = {"foods": [food_data]}

        self.db.save_meal(date, timestamp, food_data['name'], wrapped_data, meal_type)
        self.refresh_data()
        self.status_label.configure(text=f"✅  Quick added: {food_data['name']}")

    def analyze_food_photo(self):
        filepath = filedialog.askopenfilename(
            title="Select a Food Photo",
            filetypes=(("Image Files", "*.jpg *.jpeg *.png *.webp"), ("All files", "*.*"))
        )
        if not filepath:
            return

        try:
            self._set_processing_state(True, "📷  Analyzing photo...")
            image = Image.open(filepath)
            threading.Thread(target=self._analyze_photo_worker, args=(image,), daemon=True).start()
        except Exception as e:
            self.message_user("Error", f"Could not open image file. Error: {e}", "error")
            self._set_processing_state(False, "Ready.")

    def _analyze_photo_worker(self, image):
        try:
            description = self.ai.analyze_photo(image)
            self.after(0, self._update_entry_from_photo, description)
        except Exception as e:
            self.after(0, self.message_user, "Error", f"Photo analysis failed. Error: {e}", "error")
            self.after(0, self._set_processing_state, False, "Ready.")

    def _update_entry_from_photo(self, description):
        self.food_entry.delete(0, 'end')
        self.food_entry.insert(0, description.strip())
        self._set_processing_state(False, "📷  Photo analysis complete. Review and add the food.")

    def quick_add_water(self):
        amount = simpledialog.askinteger("Add Water", "Enter amount of water (ml):", parent=self, minvalue=1, maxvalue=5000)
        if amount:
            date = self.current_date
            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
            self.db.save_water_intake(date, timestamp, amount)
            self.refresh_data()
            self.status_label.configure(text=f"💧  Added {amount}ml of water.")

    def export_data(self):
        filepath = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv")],
            initialfile=f"calorie_log_{self.current_date}.csv",
            title="Save Daily Log As"
        )
        if not filepath:
            return
        try:
            meals = self.db.get_meals_by_date(self.current_date)
            exercises = self.db.get_exercises_by_date(self.current_date)
            import csv
            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([f"Data for Date:", self.current_date])
                writer.writerow(["Category", "Total", "Target"])
                writer.writerow(["Calories (kcal)", self.totals['calories'], self.target_calories])
            messagebox.showinfo("Export Successful", f"Data successfully exported to {filepath}")
        except Exception as e:
            messagebox.showerror("Export Error", f"An error occurred while exporting the data: {e}")

    # ═══════════════════════════════════════════════════════════
    # HELPERS
    # ═══════════════════════════════════════════════════════════

    def _set_processing_state(self, is_processing, message):
        self.status_label.configure(text=message)
        if is_processing:
            self.progress_bar.start()
            self.add_button.configure(state="disabled")
            self.photo_button.configure(state="disabled")
        else:
            self.progress_bar.stop()
            self.progress_bar.set(0)
            self.add_button.configure(state="normal")
            self.photo_button.configure(state="normal")

    def message_user(self, title, message, type="info"):
        if type == "error":
            messagebox.showerror(title, message)
        elif type == "warning":
            messagebox.showwarning(title, message)
        else:
            messagebox.showinfo(title, message)
