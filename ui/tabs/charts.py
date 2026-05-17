
import customtkinter
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import numpy as np
import datetime
from ui.theme import (
    Colors, Fonts, Layout,
    create_gradient_header, create_styled_card, create_pill_button,
    add_hover_highlight
)


class ChartsTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(2, weight=1)

        # ── Gradient Header ──
        self.header = create_gradient_header(
            self.tab, "Charts & Analytics", "📊", "#27AE60", "#1ABC9C"
        )
        self.header.grid(row=0, column=0, sticky="ew", padx=Layout.PAD_MD,
                         pady=(Layout.PAD_MD, Layout.PAD_SM))

        # ── Chart Type Selector Pills ──
        pills_frame = customtkinter.CTkFrame(self.tab, fg_color="transparent")
        pills_frame.grid(row=1, column=0, sticky="ew", padx=Layout.PAD_MD, pady=(0, Layout.PAD_SM))

        self.chart_views = ["All Charts", "Macros", "Trends", "Meals", "Goals"]
        self.active_view = "All Charts"

        for view_name in self.chart_views:
            is_active = view_name == self.active_view
            btn = create_pill_button(
                pills_frame, text=view_name,
                command=lambda v=view_name: self._switch_view(v),
                fg_color=Colors.ACCENT_GREEN if is_active else Colors.SURFACE_LIGHT,
                hover_color="#2EA043" if is_active else Colors.SURFACE_HOVER,
                width=100
            )
            btn.pack(side="left", padx=3)
            if not is_active:
                add_hover_highlight(
                    btn, normal_fg=Colors.SURFACE_LIGHT,
                    hover_fg=Colors.SURFACE_HOVER,
                    normal_border=Colors.BORDER,
                    hover_border=Colors.ACCENT_GREEN
                )

        # ── Chart Canvas Card ──
        self.chart_card = create_styled_card(self.tab)
        self.chart_card.grid(row=2, column=0, sticky="nsew", padx=Layout.PAD_MD, pady=(0, Layout.PAD_MD))
        self.chart_card.grid_columnconfigure(0, weight=1)
        self.chart_card.grid_rowconfigure(0, weight=1)

        # Modern dark chart colors
        self.fig, self.axs = plt.subplots(2, 2, figsize=(12, 8))
        self.fig.patch.set_facecolor('#0D1117')
        self.fig.subplots_adjust(hspace=0.35, wspace=0.30, left=0.08, right=0.96, top=0.95, bottom=0.08)

        self.canvas = FigureCanvasTkAgg(self.fig, master=self.chart_card)
        self.canvas.get_tk_widget().grid(row=0, column=0, sticky="nsew", padx=4, pady=4)

    def _switch_view(self, view_name):
        """Switch chart view (placeholder for future per-view filtering)."""
        self.active_view = view_name
        # Rebuild pills to reflect active state
        for widget in self.tab.grid_slaves(row=1):
            widget.destroy()
        pills_frame = customtkinter.CTkFrame(self.tab, fg_color="transparent")
        pills_frame.grid(row=1, column=0, sticky="ew", padx=Layout.PAD_MD, pady=(0, Layout.PAD_SM))
        for vn in self.chart_views:
            is_active = vn == self.active_view
            btn = create_pill_button(
                pills_frame, text=vn,
                command=lambda v=vn: self._switch_view(v),
                fg_color=Colors.ACCENT_GREEN if is_active else Colors.SURFACE_LIGHT,
                hover_color="#2EA043" if is_active else Colors.SURFACE_HOVER,
                width=100
            )
            btn.pack(side="left", padx=3)

    def _style_axis(self, ax, title=""):
        """Applies modern dark styling to a matplotlib axis."""
        ax.clear()
        ax.set_facecolor("#161B22")
        ax.set_title(title, color="#E6EDF3", fontsize=12, fontweight='bold', pad=12)

        # Spine styling
        for spine in ax.spines.values():
            spine.set_color('#30363D')
            spine.set_linewidth(0.5)

        # Tick styling
        ax.tick_params(colors='#8B949E', labelsize=9)
        ax.xaxis.label.set_color('#8B949E')
        ax.yaxis.label.set_color('#8B949E')

        # Grid
        ax.grid(True, alpha=0.15, color='#30363D', linestyle='--')
        ax.set_axisbelow(True)

    def update_charts(self):
        # ── 1. Macronutrients Donut Chart ──
        ax = self.axs[0, 0]
        self._style_axis(ax, "Macronutrient Distribution")
        ax.grid(False)

        macros = [self.app.totals['protein'] * 4, self.app.totals['fat'] * 9, self.app.totals['carbs'] * 4]
        labels = ['Protein', 'Fat', 'Carbs']
        colors = ['#58A6FF', '#E3B341', '#F85149']
        non_zero = [(m, l, c) for m, l, c in zip(macros, labels, colors) if m > 0]

        if non_zero:
            vals, labs, cols = zip(*non_zero)
            wedges, texts, autotexts = ax.pie(
                vals, labels=labs, autopct='%1.1f%%', startangle=90, colors=cols,
                textprops={'color': "#E6EDF3", 'fontsize': 10},
                pctdistance=0.8, wedgeprops=dict(width=0.4, edgecolor='#0D1117', linewidth=2)
            )
            for autotext in autotexts:
                autotext.set_fontsize(9)
                autotext.set_fontweight('bold')

        # ── 2. Calorie Trend (Last 7 Days) ──
        ax = self.axs[0, 1]
        self._style_axis(ax, "Calorie Trend (7 Days)")

        end_date = datetime.datetime.strptime(self.app.current_date, "%Y-%m-%d")
        start_date = end_date - datetime.timedelta(days=6)
        stats = self.app.db.get_date_range_stats(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))

        if stats:
            dates, cals, _, _, _ = zip(*stats)
            short_dates = [d[5:] for d in dates]  # Show MM-DD
            ax.fill_between(range(len(cals)), cals, alpha=0.15, color='#3FB950')
            ax.plot(range(len(cals)), cals, marker='o', linestyle='-', color='#3FB950',
                    linewidth=2, markersize=6, markerfacecolor='#3FB950', markeredgecolor='#0D1117', markeredgewidth=2)
            ax.axhline(y=self.app.target_calories, color='#F85149', linestyle='--', alpha=0.7, linewidth=1.5, label='Goal')
            ax.set_xticks(range(len(short_dates)))
            ax.set_xticklabels(short_dates, rotation=45, ha='right')
            ax.legend(facecolor='#161B22', edgecolor='#30363D', labelcolor='#8B949E', fontsize=9)

        # ── 3. Calories by Meal Type ──
        ax = self.axs[1, 0]
        self._style_axis(ax, "Calories by Meal Type")

        meals = self.app.db.get_meals_by_date(self.app.current_date)
        meal_cals = {'Breakfast': 0, 'Lunch': 0, 'Dinner': 0, 'Snack': 0}
        type_map = {'breakfast': 'Breakfast', 'lunch': 'Lunch', 'dinner': 'Dinner', 'snack': 'Snack'}
        for meal in meals:
            key = type_map.get(meal[11], 'Snack')
            meal_cals[key] += meal[4]

        bar_colors = ['#F0883E', '#58A6FF', '#BC8CFF', '#39D2C0']
        if any(meal_cals.values()):
            bars = ax.bar(meal_cals.keys(), meal_cals.values(), color=bar_colors,
                         width=0.6, edgecolor='#0D1117', linewidth=1.5)
            # Add value labels on bars
            for bar in bars:
                height = bar.get_height()
                if height > 0:
                    ax.text(bar.get_x() + bar.get_width()/2., height + 5,
                           f'{height:.0f}', ha='center', va='bottom',
                           color='#8B949E', fontsize=9, fontweight='bold')

        # ── 4. Water & Exercise vs Goals ──
        ax = self.axs[1, 1]
        self._style_axis(ax, "Progress vs Goals")

        items = ['Water (ml)', 'Exercise (min)']
        currents = [self.app.totals['water'], self.app.totals['exercise']]
        targets = [self.app.target_water, self.app.target_exercise]
        x = np.arange(len(items))
        width = 0.3

        ax.bar(x - width/2, currents, width, label='Current', color='#39D2C0',
               edgecolor='#0D1117', linewidth=1.5)
        ax.bar(x + width/2, targets, width, label='Goal', color='#30363D',
               edgecolor='#3B4A5C', linewidth=1.5)
        ax.set_xticks(x, items)
        ax.legend(facecolor='#161B22', edgecolor='#30363D', labelcolor='#8B949E', fontsize=9)

        self.canvas.draw()
