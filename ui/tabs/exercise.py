
import customtkinter
from tkinter import messagebox
import datetime
from ui.theme import (
    Colors, Fonts, Layout,
    create_styled_card, create_section_header, create_accent_button,
    create_styled_entry, create_delete_button, create_scrollable_frame,
    create_gradient_header, add_hover_highlight
)


class ExerciseTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=0)
        self.tab.grid_columnconfigure(1, weight=1)
        self.tab.grid_rowconfigure(1, weight=1)

        # ── Gradient Header (spans full width) ──
        self.header = create_gradient_header(
            self.tab, "Exercise Tracker", "🏃", "#2980B9", "#3498DB"
        )
        self.header.grid(row=0, column=0, columnspan=2, sticky="ew",
                         padx=Layout.PAD_MD, pady=(Layout.PAD_MD, Layout.PAD_SM))

        # ── Add Exercise Form Card ──
        add_card = create_styled_card(self.tab)
        add_card.grid(row=1, column=0, padx=(Layout.PAD_MD, Layout.PAD_SM), pady=(0, Layout.PAD_MD), sticky="nsew")
        add_card.grid_columnconfigure(0, weight=1)
        add_hover_highlight(add_card, hover_border=Colors.ACCENT_CYAN)

        # Form Header
        form_header = customtkinter.CTkFrame(add_card, fg_color="transparent")
        form_header.grid(row=0, column=0, columnspan=2, padx=Layout.PAD_LG, pady=Layout.PAD_LG, sticky="ew")

        customtkinter.CTkLabel(
            form_header, text="🏋️  Log New Exercise",
            font=Fonts.h3(), text_color=Colors.TEXT_PRIMARY
        ).pack(side="left")

        customtkinter.CTkLabel(
            form_header, text="Track your workout",
            font=Fonts.tiny(), text_color=Colors.TEXT_TERTIARY
        ).pack(side="right")

        # Divider with accent
        divider = customtkinter.CTkFrame(add_card, height=2, fg_color=Colors.ACCENT_CYAN)
        divider.grid(row=1, column=0, columnspan=2, sticky="ew", padx=Layout.PAD_LG)

        # Exercise Name
        customtkinter.CTkLabel(
            add_card, text="Exercise Name",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
        ).grid(row=2, column=0, columnspan=2, padx=Layout.PAD_LG, pady=(Layout.PAD_LG, Layout.PAD_XS), sticky="w")

        self.ex_name_entry = create_styled_entry(add_card, placeholder="e.g., Running, Swimming...")
        self.ex_name_entry.grid(row=3, column=0, columnspan=2, padx=Layout.PAD_LG, pady=(0, Layout.PAD_SM), sticky="ew")

        # Duration
        customtkinter.CTkLabel(
            add_card, text="Duration (minutes)",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
        ).grid(row=4, column=0, columnspan=2, padx=Layout.PAD_LG, pady=(Layout.PAD_SM, Layout.PAD_XS), sticky="w")

        self.ex_duration_entry = create_styled_entry(add_card, placeholder="e.g., 30")
        self.ex_duration_entry.grid(row=5, column=0, columnspan=2, padx=Layout.PAD_LG, pady=(0, Layout.PAD_SM), sticky="ew")

        vcmd = self.tab.register(self.validate_number)
        self.ex_duration_entry.configure(validate="key", validatecommand=(vcmd, '%P'))

        # Calories Burned
        customtkinter.CTkLabel(
            add_card, text="Calories Burned (optional)",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
        ).grid(row=6, column=0, columnspan=2, padx=Layout.PAD_LG, pady=(Layout.PAD_SM, Layout.PAD_XS), sticky="w")

        self.ex_calories_entry = create_styled_entry(add_card, placeholder="Auto-estimated if blank")
        self.ex_calories_entry.grid(row=7, column=0, columnspan=2, padx=Layout.PAD_LG, pady=(0, Layout.PAD_LG), sticky="ew")
        self.ex_calories_entry.configure(validate="key", validatecommand=(vcmd, '%P'))

        # Submit Button (glowing pill style)
        self.add_exercise_button = customtkinter.CTkButton(
            add_card, text="✚  Log Exercise", command=self.add_exercise,
            fg_color=Colors.ACCENT_CYAN, hover_color="#2BB5A5",
            corner_radius=20, height=44, width=200,
            font=Fonts.body_bold(), text_color=Colors.TEXT_WHITE,
            border_color="#5BE8D5", border_width=2
        )
        self.add_exercise_button.grid(row=8, column=0, columnspan=2, padx=Layout.PAD_LG, pady=(0, Layout.PAD_XL))

        # ── Exercise Log ──
        self.exercise_log_frame = create_scrollable_frame(
            self.tab, label_text=f"  Exercise Log — {self.app.current_date}"
        )
        self.exercise_log_frame.grid(row=1, column=1, padx=(Layout.PAD_SM, Layout.PAD_MD), pady=(0, Layout.PAD_MD), sticky="nsew")
        self.exercise_log_frame.grid_columnconfigure(0, weight=1)

    def validate_number(self, P):
        return P == "" or P.isdigit()

    def add_exercise(self):
        name = self.ex_name_entry.get()
        duration_str = self.ex_duration_entry.get()
        calories_str = self.ex_calories_entry.get()

        if not name or not duration_str:
            messagebox.showerror("Input Error", "Please provide an exercise name and duration.")
            return

        try:
            duration = float(duration_str)
            calories_burned = float(calories_str) if calories_str else duration * 7.5
        except ValueError:
            messagebox.showerror("Input Error", "Please enter valid numbers for duration and calories.")
            return

        date = self.app.current_date
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        self.app.db.save_exercise(date, timestamp, name, duration, calories_burned)
        self.app.refresh_data()

        self.ex_name_entry.delete(0, 'end')
        self.ex_duration_entry.delete(0, 'end')
        self.ex_calories_entry.delete(0, 'end')
        self.app.status_label.configure(text=f"🏃  Added exercise: {name}")

    def update_log_display(self):
        self.exercise_log_frame.configure(label_text=f"  Exercise Log — {self.app.current_date}")
        for widget in self.exercise_log_frame.winfo_children():
            widget.destroy()

        exercises = self.app.db.get_exercises_by_date(self.app.current_date)
        if not exercises:
            empty_frame = customtkinter.CTkFrame(self.exercise_log_frame, fg_color="transparent")
            empty_frame.pack(fill="x", pady=40)
            customtkinter.CTkLabel(
                empty_frame, text="🏃",
                font=customtkinter.CTkFont(size=48)
            ).pack()
            customtkinter.CTkLabel(
                empty_frame, text="No exercise logged for this day",
                font=Fonts.h3(), text_color=Colors.TEXT_SECONDARY
            ).pack(pady=Layout.PAD_SM)
            customtkinter.CTkLabel(
                empty_frame, text="Use the form on the left to log your workouts!",
                font=Fonts.small(), text_color=Colors.TEXT_TERTIARY
            ).pack(pady=4)
            return

        # Exercise type icons
        exercise_icons = {
            "running": "🏃", "walking": "🚶", "swimming": "🏊",
            "cycling": "🚴", "yoga": "🧘", "gym": "🏋️",
            "weight": "🏋️", "cardio": "❤️", "hiit": "🔥",
        }

        for i, ex in enumerate(exercises):
            entry_frame = customtkinter.CTkFrame(
                self.exercise_log_frame,
                fg_color=Colors.SURFACE_LIGHT,
                border_color=Colors.BORDER,
                border_width=1,
                corner_radius=Layout.CORNER_RADIUS
            )
            entry_frame.pack(fill="x", pady=4, padx=4)
            entry_frame.grid_columnconfigure(2, weight=1)

            # Hover effect
            add_hover_highlight(entry_frame, hover_border=Colors.ACCENT_CYAN)

            # Accent strip
            accent_strip = customtkinter.CTkFrame(
                entry_frame, width=4, fg_color=Colors.ACCENT_CYAN, corner_radius=0
            )
            accent_strip.grid(row=0, column=0, rowspan=2, sticky="ns")

            # Smart icon based on exercise name
            ex_name_lower = ex[3].lower()
            icon = "🏋️"
            for key, emoji in exercise_icons.items():
                if key in ex_name_lower:
                    icon = emoji
                    break

            customtkinter.CTkLabel(
                entry_frame, text=icon, font=Fonts.emoji_large()
            ).grid(row=0, column=1, rowspan=2, padx=Layout.PAD_MD, pady=Layout.PAD_SM)

            # Details
            name_text = f"{ex[3]}"
            customtkinter.CTkLabel(
                entry_frame, text=name_text, anchor="w",
                font=Fonts.body_bold(), text_color=Colors.TEXT_PRIMARY
            ).grid(row=0, column=2, padx=Layout.PAD_XS, pady=(Layout.PAD_SM, 0), sticky="w")

            details = f"⏱️ {ex[4]:.0f} min   ·   🔥 {ex[5]:.0f} kcal burned   ·   🕒 {ex[2]}"
            customtkinter.CTkLabel(
                entry_frame, text=details, anchor="w",
                font=Fonts.small(), text_color=Colors.TEXT_SECONDARY
            ).grid(row=1, column=2, padx=Layout.PAD_XS, pady=(0, Layout.PAD_SM), sticky="w")

            delete_btn = create_delete_button(
                entry_frame, command=lambda id=ex[0]: self.delete_exercise(id)
            )
            delete_btn.grid(row=0, column=3, rowspan=2, padx=Layout.PAD_MD)

    def delete_exercise(self, exercise_id):
        if messagebox.askyesno("Confirm Delete", "Are you sure you want to delete this exercise entry?"):
            self.app.db.delete_exercise(exercise_id)
            self.app.refresh_data()
