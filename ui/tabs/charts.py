
import customtkinter
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import numpy as np
import datetime

class ChartsTab:
    def __init__(self, tab, app):
        self.tab = tab
        self.app = app
        self.setup_ui()

    def setup_ui(self):
        self.tab.grid_columnconfigure(0, weight=1)
        self.tab.grid_rowconfigure(0, weight=1)
        
        self.chart_frame = customtkinter.CTkFrame(self.tab)
        self.chart_frame.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
        self.chart_frame.grid_columnconfigure(0, weight=1)
        self.chart_frame.grid_rowconfigure(0, weight=1)
        
        self.fig, self.axs = plt.subplots(2, 2, figsize=(12, 8), tight_layout=True)
        self.fig.patch.set_facecolor('#2B2B2B')
        
        self.canvas = FigureCanvasTkAgg(self.fig, master=self.chart_frame)
        self.canvas.get_tk_widget().grid(row=0, column=0, sticky="nsew")

    def update_charts(self):
        for i in range(2):
            for j in range(2):
                self.axs[i, j].clear()
                self.axs[i, j].set_facecolor("#3D3D3D")
                plt.setp(self.axs[i, j].get_xticklabels(), color="white")
                plt.setp(self.axs[i, j].get_yticklabels(), color="white")
                self.axs[i, j].spines['bottom'].set_color('white')
                self.axs[i, j].spines['top'].set_color('white')
                self.axs[i, j].spines['right'].set_color('white')
                self.axs[i, j].spines['left'].set_color('white')
                self.axs[i, j].title.set_color('white')
                self.axs[i, j].xaxis.label.set_color('white')
                self.axs[i, j].yaxis.label.set_color('white')
                
        # 1. Macronutrients Pie Chart
        macros = [self.app.totals['protein'] * 4, self.app.totals['fat'] * 9, self.app.totals['carbs'] * 4]
        labels = ['Protein', 'Fat', 'Carbs']
        colors = ['#3498db', '#f1c40f', '#e74c3c']
        non_zero_macros = [(m, l, c) for m, l, c in zip(macros, labels, colors) if m > 0]
        
        if non_zero_macros:
            macros, labels, colors = zip(*non_zero_macros)
            self.axs[0, 0].pie(macros, labels=labels, autopct='%1.1f%%', startangle=90, colors=colors, textprops={'color': "w"})
        self.axs[0, 0].set_title("Daily Macronutrient Distribution (by kcal)")
        
        # 2. Calorie Trend (Last 7 Days)
        end_date = datetime.datetime.strptime(self.app.current_date, "%Y-%m-%d")
        start_date = end_date - datetime.timedelta(days=6)
        stats = self.app.db.get_date_range_stats(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
        
        if stats:
            dates, cals, _, _, _ = zip(*stats)
            self.axs[0, 1].plot(dates, cals, marker='o', linestyle='-', color='#2ecc71')
            self.axs[0, 1].axhline(y=self.app.target_calories, color='r', linestyle='--', label='Goal')
            self.axs[0, 1].legend()
        self.axs[0, 1].set_title("Calorie Intake (Last 7 Days)")
        self.axs[0, 1].tick_params(axis='x', rotation=45)
        
        # 3. Calories by Meal Type
        meals = self.app.db.get_meals_by_date(self.app.current_date)
        meal_cals = {'breakfast': 0, 'lunch': 0, 'dinner': 0, 'snack': 0}
        for meal in meals:
            meal_cals[meal[11]] += meal[4] # Index 11 is meal_type, 4 is calories
            
        if any(meal_cals.values()):
            self.axs[1, 0].bar(meal_cals.keys(), meal_cals.values(), color=['#e67e22', '#3498db', '#9b59b6', '#2c3e50'])
        self.axs[1, 0].set_title("Calories by Meal Type")
        
        # 4. Water & Exercise vs Goals
        items = ['Water (ml)', 'Exercise (min)']
        currents = [self.app.totals['water'], self.app.totals['exercise']]
        targets = [self.app.target_water, self.app.target_exercise]
        x = np.arange(len(items))
        width = 0.35
        
        self.axs[1, 1].bar(x - width / 2, currents, width, label='Current', color='#1abc9c')
        self.axs[1, 1].bar(x + width / 2, targets, width, label='Goal', color='#34495e')
        self.axs[1, 1].set_ylabel('Amount')
        self.axs[1, 1].set_title('Water & Exercise Progress')
        self.axs[1, 1].set_xticks(x, items)
        self.axs[1, 1].legend()
        
        self.canvas.draw()
