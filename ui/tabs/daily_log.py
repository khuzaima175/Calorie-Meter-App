
import customtkinter
from tkinter import messagebox

class DailyLogTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app # The main app instance
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(2, weight=1)
        
        # 1. Summary Cards Frame
        self.cards_frame = customtkinter.CTkFrame(self.tab, fg_color="transparent")
        self.cards_frame.grid(row=0, column=0, sticky="new", padx=10, pady=10)
        self.cards_frame.grid_columnconfigure((0, 1, 2, 3), weight=1)
        
        # Initialize Card Widgets
        self.card_cals = self.create_info_card(self.cards_frame, "Calories", "0 / 2500", "#e74c3c", 0)
        self.card_protein = self.create_info_card(self.cards_frame, "Protein", "0 / 80g", "#3498db", 1)
        self.card_water = self.create_info_card(self.cards_frame, "Water", "0 / 2L", "#2ecc71", 2)
        self.card_exercise = self.create_info_card(self.cards_frame, "Exercise", "0 min", "#9b59b6", 3)

        # 2. Daily Log List
        self.food_entries_frame = customtkinter.CTkScrollableFrame(self.tab, label_text="Your Meals Today", label_font=customtkinter.CTkFont(size=16, weight="bold"))
        self.food_entries_frame.grid(row=2, column=0, sticky="nsew", padx=10, pady=10)
        self.food_entries_frame.grid_columnconfigure(0, weight=1)

    def create_info_card(self, parent, title, value, color, col_idx):
        card = customtkinter.CTkFrame(parent, fg_color=color, corner_radius=10)
        card.grid(row=0, column=col_idx, padx=5, pady=5, sticky="ew")
        
        title_lbl = customtkinter.CTkLabel(card, text=title, font=customtkinter.CTkFont(size=12), text_color="white")
        title_lbl.pack(padx=10, pady=(5, 0))
        
        value_lbl = customtkinter.CTkLabel(card, text=value, font=customtkinter.CTkFont(size=18, weight="bold"), text_color="white")
        value_lbl.pack(padx=10, pady=(0, 5))
        
        return value_lbl

    def update_views(self):
        """Updates the dashboard cards and log display."""
        self.update_cards()
        self.update_log_display()

    def update_cards(self):
        totals = self.app.totals
        
        net_cals = totals['calories'] - totals['exercise_calories']
        self.card_cals.configure(text=f"{net_cals:,.0f} / {self.app.target_calories:,.0f}")
        self.card_protein.configure(text=f"{totals['protein']:.0f} / {self.app.target_protein:.0f}g")
        self.card_water.configure(text=f"{totals['water']:.0f} / {self.app.target_water:.0f}ml")
        self.card_exercise.configure(text=f"{totals['exercise']:.0f} min")

    def update_log_display(self):
        for widget in self.food_entries_frame.winfo_children():
            widget.destroy()
            
        meals = self.app.db.get_meals_by_date(self.app.current_date)
        if not meals:
            customtkinter.CTkLabel(self.food_entries_frame, text="No meals logged yet. Start eating!", font=customtkinter.CTkFont(size=14)).pack(pady=40)
            return

        # Load Icons
        from PIL import Image, ImageOps, ImageDraw
        import os
        try:
            # Resolve absolute paths
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            assets_dir = os.path.join(project_root, "assets")
            
            print(f"DEBUG: Loading icons from: {assets_dir}")

            def load_circular_icon(name):
                path = os.path.join(assets_dir, f"{name}.png")
                img = Image.open(path).convert("RGBA")
                
                # Create mask
                size = img.size
                mask = Image.new('L', size, 0)
                draw = ImageDraw.Draw(mask)
                draw.ellipse((0, 0) + size, fill=255)
                
                # Apply mask
                output = ImageOps.fit(img, mask.size, centering=(0.5, 0.5))
                output.putalpha(mask)
                return customtkinter.CTkImage(output, size=(40, 40))

            self.icons = {
                "breakfast": load_circular_icon("breakfast"),
                "lunch": load_circular_icon("lunch"),
                "dinner": load_circular_icon("dinner"),
                "snack": load_circular_icon("snack"),
            }
        except Exception as e:
            print(f"Error loading icons: {e}")
            self.icons = {} # Fallback if images missing

        for i, meal in enumerate(meals):
            # Meal tuple indices: 11=meal_type, 3=desc, 4=cals, 5=protein...
            m_type = meal[11].lower() if meal[11] else "snack"
            
            entry_frame = customtkinter.CTkFrame(self.food_entries_frame, corner_radius=10)
            entry_frame.grid(row=i, column=0, sticky="ew", pady=5, padx=5)
            entry_frame.grid_columnconfigure(1, weight=1)
            
            # Icon
            if m_type in self.icons:
                 customtkinter.CTkLabel(entry_frame, text="", image=self.icons[m_type]).grid(row=0, column=0, rowspan=2, padx=10, pady=10)
            else:
                 customtkinter.CTkLabel(entry_frame, text="🍽️", font=("Arial", 30)).grid(row=0, column=0, rowspan=2, padx=10, pady=10)

            # Text Details
            header = f"{m_type.capitalize()} - {meal[3]}"
            details = f"🔥 {meal[4]:.0f} kcal  |  🥩 {meal[5]:.1f}g Protein  |  🕒 {meal[2]}"
            
            customtkinter.CTkLabel(entry_frame, text=header, anchor="w", font=customtkinter.CTkFont(size=14, weight="bold")).grid(row=0, column=1, padx=5, pady=(10, 0), sticky="ew")
            customtkinter.CTkLabel(entry_frame, text=details, anchor="w", text_color="gray").grid(row=1, column=1, padx=5, pady=(0, 10), sticky="ew")
            
            delete_btn = customtkinter.CTkButton(entry_frame, text="🗑️", width=30, fg_color="#c0392b", hover_color="#e74c3c", command=lambda id=meal[0]: self.delete_meal(id))
            delete_btn.grid(row=0, column=2, rowspan=2, padx=10)

    def delete_meal(self, meal_id):
        if messagebox.askyesno("Confirm Delete", "Are you sure you want to delete this meal entry?"):
            self.app.db.delete_meal(meal_id)
            self.app.refresh_data()
