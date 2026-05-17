
import customtkinter
import datetime
from tkinter import messagebox
from ui.theme import (
    Colors, Fonts, Layout,
    create_styled_card, create_accent_button, create_styled_entry,
    create_styled_textbox, create_gradient_header, create_pill_button,
    add_hover_highlight
)


class HistoryTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(2, weight=1)

        # ── Gradient Header ──
        self.header = create_gradient_header(
            self.tab, "Nutrition History", "📈", "#2C3E87", "#8E44AD"
        )
        self.header.grid(row=0, column=0, sticky="ew",
                         padx=Layout.PAD_MD, pady=(Layout.PAD_MD, Layout.PAD_SM))

        # ── Controls Card ──
        controls_card = create_styled_card(self.tab)
        controls_card.grid(row=1, column=0, sticky="ew",
                           padx=Layout.PAD_MD, pady=(0, Layout.PAD_SM))
        add_hover_highlight(controls_card, hover_border=Colors.ACCENT_PRIMARY)

        controls_inner = customtkinter.CTkFrame(controls_card, fg_color="transparent")
        controls_inner.pack(padx=Layout.PAD_LG, pady=Layout.PAD_MD, fill="x")

        # Date inputs row
        date_row = customtkinter.CTkFrame(controls_inner, fg_color="transparent")
        date_row.pack(fill="x")

        yesterday = (datetime.datetime.now() - datetime.timedelta(days=7)).strftime("%Y-%m-%d")

        customtkinter.CTkLabel(
            date_row, text="From:",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
        ).pack(side="left", padx=(0, Layout.PAD_SM))

        self.history_start_date = create_styled_entry(date_row, width=140)
        self.history_start_date.insert(0, yesterday)
        self.history_start_date.pack(side="left", padx=(0, Layout.PAD_LG))

        customtkinter.CTkLabel(
            date_row, text="To:",
            font=Fonts.small_bold(), text_color=Colors.TEXT_SECONDARY
        ).pack(side="left", padx=(0, Layout.PAD_SM))

        self.history_end_date = create_styled_entry(date_row, width=140)
        self.history_end_date.insert(0, self.app.current_date)
        self.history_end_date.pack(side="left", padx=(0, Layout.PAD_LG))

        self.show_history_btn = customtkinter.CTkButton(
            date_row, text="🔍  Show History", command=self.show_history,
            fg_color=Colors.ACCENT_PRIMARY, hover_color="#4A90D9",
            corner_radius=20, height=38, width=170,
            font=Fonts.body_bold(), text_color=Colors.TEXT_WHITE,
            border_color="#80BFFF", border_width=1
        )
        self.show_history_btn.pack(side="left")

        # ── Quick Range Pills ──
        range_row = customtkinter.CTkFrame(controls_inner, fg_color="transparent")
        range_row.pack(fill="x", pady=(Layout.PAD_SM, 0))

        customtkinter.CTkLabel(
            range_row, text="Quick Range:",
            font=Fonts.small(), text_color=Colors.TEXT_TERTIARY
        ).pack(side="left", padx=(0, Layout.PAD_SM))

        for label, days in [("7 Days", 7), ("14 Days", 14), ("30 Days", 30), ("90 Days", 90)]:
            pill = create_pill_button(
                range_row, text=label,
                command=lambda d=days: self._set_range(d),
                width=80
            )
            pill.pack(side="left", padx=3)

        # ── History Table Card ──
        table_card = create_styled_card(self.tab)
        table_card.grid(row=2, column=0, sticky="nsew",
                        padx=Layout.PAD_MD, pady=(0, Layout.PAD_MD))
        table_card.grid_columnconfigure(0, weight=1)
        table_card.grid_rowconfigure(1, weight=1)

        # Summary stat strip
        self.summary_frame = customtkinter.CTkFrame(table_card, fg_color="transparent")
        self.summary_frame.grid(row=0, column=0, sticky="ew", padx=Layout.PAD_MD, pady=(Layout.PAD_MD, 0))

        self.summary_labels = {}
        for label, icon, color in [
            ("avg_cal", "🔥 Avg Cal", Colors.CARD_CALORIES),
            ("total_cal", "📊 Total Cal", Colors.ACCENT_ORANGE),
            ("avg_prot", "🥩 Avg Protein", Colors.CARD_PROTEIN),
            ("days", "📅 Days", Colors.ACCENT_GREEN),
        ]:
            mini_card = customtkinter.CTkFrame(
                self.summary_frame, fg_color=Colors.SURFACE_LIGHT,
                corner_radius=Layout.CORNER_RADIUS_SM,
                border_color=Colors.BORDER, border_width=1
            )
            mini_card.pack(side="left", padx=4, pady=4, expand=True, fill="x")

            customtkinter.CTkLabel(
                mini_card, text=icon, font=Fonts.small(),
                text_color=Colors.TEXT_SECONDARY
            ).pack(padx=Layout.PAD_SM, pady=(Layout.PAD_XS, 0))

            val_label = customtkinter.CTkLabel(
                mini_card, text="—", font=Fonts.stat_value(),
                text_color=color
            )
            val_label.pack(padx=Layout.PAD_SM, pady=(0, Layout.PAD_XS))
            self.summary_labels[label] = val_label

        self.history_textbox = customtkinter.CTkTextbox(
            table_card, state="disabled", wrap="none",
            font=Fonts.mono(),
            fg_color=Colors.SURFACE_LIGHT,
            border_color=Colors.BORDER,
            border_width=1,
            corner_radius=Layout.CORNER_RADIUS_SM,
            text_color=Colors.TEXT_PRIMARY
        )
        self.history_textbox.grid(row=1, column=0, sticky="nsew",
                                  padx=Layout.PAD_MD, pady=Layout.PAD_MD)

    def _set_range(self, days):
        """Set date range from quick range pills."""
        end_date = datetime.datetime.now()
        start_date = end_date - datetime.timedelta(days=days)
        self.history_start_date.delete(0, 'end')
        self.history_start_date.insert(0, start_date.strftime("%Y-%m-%d"))
        self.history_end_date.delete(0, 'end')
        self.history_end_date.insert(0, end_date.strftime("%Y-%m-%d"))
        self.show_history()

    def show_history(self):
        start = self.history_start_date.get()
        end = self.history_end_date.get()
        try:
            stats = self.app.db.get_date_range_stats(start, end)
            self.history_textbox.configure(state="normal")
            self.history_textbox.delete("1.0", "end")

            if not stats:
                self.history_textbox.insert("1.0", "\n   📭  No data found for the selected date range.\n\n   Try adjusting the dates or logging some meals first!")
                # Reset summary labels
                for key in self.summary_labels:
                    self.summary_labels[key].configure(text="—")
            else:
                header = f"  {'Date':<14}{'Calories':>10}{'Protein (g)':>14}{'Fat (g)':>12}{'Carbs (g)':>12}\n"
                separator = "  " + "─" * 60 + "\n"
                self.history_textbox.insert("1.0", "\n" + header + separator)

                total_cals = total_prot = total_fat = total_carbs = 0
                for row in stats:
                    line = f"  {row[0]:<14}{row[1]:>10.0f}{row[2]:>14.1f}{row[3]:>12.1f}{row[4]:>12.1f}\n"
                    self.history_textbox.insert("end", line)
                    total_cals += row[1]
                    total_prot += row[2]
                    total_fat += row[3]
                    total_carbs += row[4]

                # Summary row
                self.history_textbox.insert("end", separator)
                avg_days = len(stats)
                summary = f"  {'TOTAL':<14}{total_cals:>10.0f}{total_prot:>14.1f}{total_fat:>12.1f}{total_carbs:>12.1f}\n"
                avg = f"  {'AVG/DAY':<14}{total_cals/avg_days:>10.0f}{total_prot/avg_days:>14.1f}{total_fat/avg_days:>12.1f}{total_carbs/avg_days:>12.1f}\n"
                self.history_textbox.insert("end", summary + avg)

                # Update summary cards
                self.summary_labels["avg_cal"].configure(text=f"{total_cals/avg_days:,.0f}")
                self.summary_labels["total_cal"].configure(text=f"{total_cals:,.0f}")
                self.summary_labels["avg_prot"].configure(text=f"{total_prot/avg_days:.1f}g")
                self.summary_labels["days"].configure(text=str(avg_days))

            self.history_textbox.configure(state="disabled")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to fetch history. Check date format (YYYY-MM-DD). Error: {e}")
