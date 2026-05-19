"""
Calorie Meter Pro - Design System & Theme
A centralized design system providing colors, fonts, and reusable UI helpers
for a premium dark glassmorphism aesthetic.
"""

import customtkinter


# ═══════════════════════════════════════════════════════════════
# COLOR PALETTE
# ═══════════════════════════════════════════════════════════════

class Colors:
    # Backgrounds
    BG_DARK = "#0D1117"          # Main window background
    BG_SIDEBAR = "#161B22"       # Sidebar background
    SURFACE = "#1C2333"          # Card/panel surface
    SURFACE_LIGHT = "#242D3D"    # Elevated surface (hovers, inputs)
    SURFACE_HOVER = "#2D3748"    # Hover state
    BORDER = "#30363D"           # Subtle borders
    BORDER_ACCENT = "#3B4A5C"    # Slightly brighter border

    # Text
    TEXT_PRIMARY = "#E6EDF3"     # Main text
    TEXT_SECONDARY = "#8B949E"   # Subtitles, labels
    TEXT_TERTIARY = "#6E7681"    # Placeholder, disabled
    TEXT_WHITE = "#FFFFFF"       # Pure white for high contrast

    # Accent Gradients (used as solid colors in CTk)
    ACCENT_PRIMARY = "#58A6FF"   # Primary blue accent
    ACCENT_GREEN = "#3FB950"     # Success / nutrition
    ACCENT_CYAN = "#39D2C0"      # Water / exercise
    ACCENT_PURPLE = "#BC8CFF"    # AI / insights
    ACCENT_ORANGE = "#F0883E"    # Warnings / streak
    ACCENT_PINK = "#F778BA"      # Goals
    ACCENT_RED = "#F85149"       # Errors / delete
    ACCENT_YELLOW = "#E3B341"    # Highlights

    # Semantic Cards
    CARD_CALORIES = "#F85149"
    CARD_CALORIES_BG = "#2D1B1B"
    CARD_PROTEIN = "#58A6FF"
    CARD_PROTEIN_BG = "#1B2638"
    CARD_WATER = "#39D2C0"
    CARD_WATER_BG = "#1B2D2A"
    CARD_EXERCISE = "#BC8CFF"
    CARD_EXERCISE_BG = "#251B38"

    # Meal type accent colors
    MEAL_BREAKFAST = "#F0883E"
    MEAL_LUNCH = "#58A6FF"
    MEAL_DINNER = "#BC8CFF"
    MEAL_SNACK = "#39D2C0"

    # Button specific
    BTN_PRIMARY = "#238636"
    BTN_PRIMARY_HOVER = "#2EA043"
    BTN_DANGER = "#DA3633"
    BTN_DANGER_HOVER = "#F85149"
    BTN_SECONDARY = "#30363D"
    BTN_SECONDARY_HOVER = "#3B4A5C"


# ═══════════════════════════════════════════════════════════════
# TYPOGRAPHY
# ═══════════════════════════════════════════════════════════════

class Fonts:
    """Font factory — must be called AFTER Tk root is created."""

    @staticmethod
    def logo():
        return customtkinter.CTkFont(family="Segoe UI", size=24, weight="bold")

    @staticmethod
    def h1():
        return customtkinter.CTkFont(family="Segoe UI", size=22, weight="bold")

    @staticmethod
    def h2():
        return customtkinter.CTkFont(family="Segoe UI", size=18, weight="bold")

    @staticmethod
    def h3():
        return customtkinter.CTkFont(family="Segoe UI", size=15, weight="bold")

    @staticmethod
    def body():
        return customtkinter.CTkFont(family="Segoe UI", size=13)

    @staticmethod
    def body_bold():
        return customtkinter.CTkFont(family="Segoe UI", size=13, weight="bold")

    @staticmethod
    def small():
        return customtkinter.CTkFont(family="Segoe UI", size=11)

    @staticmethod
    def small_bold():
        return customtkinter.CTkFont(family="Segoe UI", size=11, weight="bold")

    @staticmethod
    def tiny():
        return customtkinter.CTkFont(family="Segoe UI", size=10)

    @staticmethod
    def mono():
        return customtkinter.CTkFont(family="Cascadia Code", size=12)

    @staticmethod
    def card_value():
        return customtkinter.CTkFont(family="Segoe UI", size=26, weight="bold")

    @staticmethod
    def stat_value():
        return customtkinter.CTkFont(family="Segoe UI", size=16, weight="bold")

    @staticmethod
    def emoji_large():
        return customtkinter.CTkFont(size=28)


# ═══════════════════════════════════════════════════════════════
# LAYOUT CONSTANTS
# ═══════════════════════════════════════════════════════════════

class Layout:
    CORNER_RADIUS = 12
    CORNER_RADIUS_SM = 8
    CORNER_RADIUS_LG = 16
    PAD_XL = 24
    PAD_LG = 16
    PAD_MD = 12
    PAD_SM = 8
    PAD_XS = 4
    SIDEBAR_WIDTH = 220
    INPUT_HEIGHT = 42
    BUTTON_HEIGHT = 38
    CARD_HEIGHT = 100


# ═══════════════════════════════════════════════════════════════
# MEAL TYPE UTILITIES
# ═══════════════════════════════════════════════════════════════

MEAL_ICONS = {
    "breakfast": "🌅",
    "lunch": "☀️",
    "dinner": "🌙",
    "snack": "🍿",
}

MEAL_COLORS = {
    "breakfast": Colors.MEAL_BREAKFAST,
    "lunch": Colors.MEAL_LUNCH,
    "dinner": Colors.MEAL_DINNER,
    "snack": Colors.MEAL_SNACK,
}


# ═══════════════════════════════════════════════════════════════
# REUSABLE COMPONENT FACTORIES
# ═══════════════════════════════════════════════════════════════

def create_styled_card(parent, fg_color=None, border_color=None, **kwargs):
    """Creates a card frame with consistent styling."""
    return customtkinter.CTkFrame(
        parent,
        fg_color=fg_color or Colors.SURFACE,
        border_color=border_color or Colors.BORDER,
        border_width=1,
        corner_radius=Layout.CORNER_RADIUS,
        **kwargs
    )


def create_section_header(parent, text, icon="", **grid_kwargs):
    """Creates a styled section header label."""
    display_text = f"{icon}  {text}" if icon else text
    label = customtkinter.CTkLabel(
        parent,
        text=display_text,
        font=Fonts.h3(),
        text_color=Colors.TEXT_PRIMARY,
        anchor="w"
    )
    if grid_kwargs:
        label.grid(**grid_kwargs)
    return label


def create_accent_button(parent, text, command, color=None, hover_color=None, icon="", width=None, **kwargs):
    """Creates a styled accent button."""
    display_text = f"{icon} {text}" if icon else text
    btn = customtkinter.CTkButton(
        parent,
        text=display_text,
        command=command,
        fg_color=color or Colors.BTN_PRIMARY,
        hover_color=hover_color or Colors.BTN_PRIMARY_HOVER,
        corner_radius=Layout.CORNER_RADIUS_SM,
        height=Layout.BUTTON_HEIGHT,
        font=Fonts.body_bold(),
        width=width or 140,
        **kwargs
    )
    return btn


def create_styled_entry(parent, placeholder="", width=None, **kwargs):
    """Creates a styled entry field."""
    opts = dict(
        placeholder_text=placeholder,
        fg_color=Colors.SURFACE_LIGHT,
        border_color=Colors.BORDER,
        border_width=1,
        corner_radius=Layout.CORNER_RADIUS_SM,
        height=Layout.INPUT_HEIGHT,
        font=Fonts.body(),
        text_color=Colors.TEXT_PRIMARY,
        placeholder_text_color=Colors.TEXT_TERTIARY,
    )
    if width is not None:
        opts["width"] = width
    opts.update(kwargs)
    entry = customtkinter.CTkEntry(parent, **opts)
    return entry


def create_styled_textbox(parent, height=None, editable=True, **kwargs):
    """Creates a styled textbox."""
    opts = dict(
        fg_color=Colors.SURFACE_LIGHT,
        border_color=Colors.BORDER,
        border_width=1,
        corner_radius=Layout.CORNER_RADIUS_SM,
        font=Fonts.body(),
        text_color=Colors.TEXT_PRIMARY,
        state="normal" if editable else "disabled",
        wrap="word",
    )
    if height is not None:
        opts["height"] = height
    opts.update(kwargs)
    textbox = customtkinter.CTkTextbox(parent, **opts)
    return textbox


def create_pill_button(parent, text, command, fg_color=None, hover_color=None, width=None, **kwargs):
    """Creates a small pill-shaped button."""
    opts = dict(
        text=text,
        command=command,
        fg_color=fg_color or Colors.SURFACE_LIGHT,
        hover_color=hover_color or Colors.SURFACE_HOVER,
        corner_radius=20,
        height=32,
        font=Fonts.small(),
        text_color=Colors.TEXT_PRIMARY,
        border_color=Colors.BORDER,
        border_width=1,
    )
    if width is not None:
        opts["width"] = width
    opts.update(kwargs)
    btn = customtkinter.CTkButton(parent, **opts)
    return btn


def create_progress_bar(parent, color=None, **kwargs):
    """Creates a styled progress bar."""
    bar = customtkinter.CTkProgressBar(
        parent,
        fg_color=Colors.SURFACE_LIGHT,
        progress_color=color or Colors.ACCENT_GREEN,
        corner_radius=6,
        height=8,
        **kwargs
    )
    bar.set(0)
    return bar


def create_option_menu(parent, values, variable, **kwargs):
    """Creates a styled option menu."""
    menu = customtkinter.CTkOptionMenu(
        parent,
        values=values,
        variable=variable,
        fg_color=Colors.SURFACE_LIGHT,
        button_color=Colors.SURFACE_HOVER,
        button_hover_color=Colors.ACCENT_PRIMARY,
        dropdown_fg_color=Colors.SURFACE,
        dropdown_hover_color=Colors.SURFACE_HOVER,
        corner_radius=Layout.CORNER_RADIUS_SM,
        font=Fonts.body(),
        dropdown_font=Fonts.body(),
        text_color=Colors.TEXT_PRIMARY,
        **kwargs
    )
    return menu


def create_delete_button(parent, command, **kwargs):
    """Creates a small styled delete button."""
    btn = customtkinter.CTkButton(
        parent,
        text="✕",
        command=command,
        fg_color=Colors.BTN_DANGER,
        hover_color=Colors.BTN_DANGER_HOVER,
        corner_radius=6,
        width=32,
        height=32,
        font=Fonts.small_bold(),
        **kwargs
    )
    return btn


def create_scrollable_frame(parent, label_text="", **kwargs):
    """Creates a styled scrollable frame."""
    frame = customtkinter.CTkScrollableFrame(
        parent,
        fg_color=Colors.SURFACE,
        border_color=Colors.BORDER,
        border_width=1,
        corner_radius=Layout.CORNER_RADIUS,
        label_text=label_text,
        label_font=Fonts.h3() if label_text else None,
        label_text_color=Colors.TEXT_PRIMARY if label_text else None,
        label_fg_color=Colors.SURFACE if label_text else None,
        scrollbar_button_color=Colors.SURFACE_HOVER,
        scrollbar_button_hover_color=Colors.ACCENT_PRIMARY,
        **kwargs
    )
    return frame


# ═══════════════════════════════════════════════════════════════
# ANIMATION UTILITIES
# ═══════════════════════════════════════════════════════════════

import tkinter as tk
import math


def animate_value(widget, start, end, duration_ms, callback, step=0, total_steps=None):
    """Smoothly interpolate a value from start to end over duration_ms.
    callback(current_value) is called each frame.
    Uses ease-out cubic for a premium feel.
    """
    if total_steps is None:
        total_steps = max(1, duration_ms // 16)  # ~60fps

    if step > total_steps:
        callback(end)
        return

    t = step / total_steps
    # Ease-out cubic
    eased = 1 - (1 - t) ** 3
    current = start + (end - start) * eased
    callback(current)

    widget.after(16, animate_value, widget, start, end, duration_ms, callback, step + 1, total_steps)


class CircularProgressRing(tk.Canvas):
    """A premium animated circular progress ring drawn on a Canvas."""

    def __init__(self, parent, size=110, line_width=10, bg_color=None,
                 ring_color=Colors.ACCENT_GREEN, track_color=None,
                 glow_color=None, **kwargs):
        self.size = size
        self.line_width = line_width
        self.ring_color = ring_color
        self.track_color = track_color or Colors.SURFACE_LIGHT
        self.glow_color = glow_color or ring_color
        self._progress = 0.0

        super().__init__(
            parent, width=size, height=size,
            bg=bg_color or Colors.SURFACE,
            highlightthickness=0, **kwargs
        )
        self._draw_ring(0)

    def _draw_ring(self, progress):
        """Draw the ring at the given progress (0.0 to 1.0)."""
        self.delete("all")
        pad = self.line_width + 4
        x0, y0 = pad, pad
        x1, y1 = self.size - pad, self.size - pad

        # Track (background ring)
        self.create_arc(x0, y0, x1, y1, outline=self.track_color,
                        width=self.line_width, style="arc",
                        start=90, extent=-359.9)

        # Progress arc
        if progress > 0:
            extent = -360 * min(progress, 1.0)
            # Glow effect — slightly wider, more transparent
            self.create_arc(x0 - 2, y0 - 2, x1 + 2, y1 + 2,
                            outline=self.glow_color, width=self.line_width + 4,
                            style="arc", start=90, extent=extent)
            # Main arc
            self.create_arc(x0, y0, x1, y1,
                            outline=self.ring_color, width=self.line_width,
                            style="arc", start=90, extent=extent)

    def set_progress(self, value):
        """Set progress without animation (0.0 to 1.0)."""
        self._progress = value
        self._draw_ring(value)

    def animate_to(self, target, duration_ms=800):
        """Animate from current progress to target (0.0 to 1.0)."""
        start = self._progress
        self._progress = target

        def _update(val):
            self._draw_ring(val)

        animate_value(self, start, target, duration_ms, _update)


def create_gradient_header(parent, text, icon, color1=None, color2=None):
    """Creates a visually distinct modern header strip for a tab."""
    header = customtkinter.CTkFrame(
        parent, fg_color=Colors.SURFACE, border_color=Colors.BORDER, border_width=1,
        corner_radius=Layout.CORNER_RADIUS, height=52
    )
    header.pack_propagate(False)
    header.grid_propagate(False)

    # Instead of a large colorful overlay, we add an elegant vertical accent line
    accent_color = color1 or Colors.ACCENT_PRIMARY
    accent_strip = customtkinter.CTkFrame(
        header, fg_color=accent_color, corner_radius=2, width=4, height=32
    )
    accent_strip.pack(side="left", padx=(12, 0), pady=10)
    accent_strip.pack_propagate(False)

    customtkinter.CTkLabel(
        header, text=f"{icon}  {text}",
        font=Fonts.h2(), text_color=Colors.TEXT_PRIMARY, anchor="w"
    ).pack(side="left", padx=(12, 12), pady=10)

    return header


def pulse_widget(widget, count=0, max_pulses=6):
    """Creates a subtle pulsing glow on a widget by toggling border color."""
    if count >= max_pulses * 2:
        return
    if count % 2 == 0:
        try:
            widget.configure(border_color=Colors.ACCENT_ORANGE, border_width=2)
        except Exception:
            pass
    else:
        try:
            widget.configure(border_color=Colors.BORDER, border_width=1)
        except Exception:
            pass
    widget.after(400, pulse_widget, widget, count + 1, max_pulses)


def add_hover_highlight(widget, normal_fg=None, hover_fg=None,
                        normal_border=None, hover_border=None):
    """Adds hover enter/leave highlighting to a CTk frame or widget."""
    normal_fg = normal_fg or Colors.SURFACE_LIGHT
    hover_fg = hover_fg or Colors.SURFACE_HOVER
    normal_border = normal_border or Colors.BORDER
    hover_border = hover_border or Colors.ACCENT_PRIMARY

    def on_enter(e):
        try:
            widget.configure(fg_color=hover_fg, border_color=hover_border)
        except Exception:
            pass

    def on_leave(e):
        try:
            widget.configure(fg_color=normal_fg, border_color=normal_border)
        except Exception:
            pass

    widget.bind("<Enter>", on_enter)
    widget.bind("<Leave>", on_leave)


class Tooltip:
    """A floating tooltip that appears on hover."""

    def __init__(self, widget, text, delay=400):
        self.widget = widget
        self.text = text
        self.delay = delay
        self.tip_window = None
        self._after_id = None

        widget.bind("<Enter>", self._schedule)
        widget.bind("<Leave>", self._hide)

    def _schedule(self, event=None):
        self._after_id = self.widget.after(self.delay, self._show)

    def _show(self):
        if self.tip_window:
            return
        x = self.widget.winfo_rootx() + self.widget.winfo_width() + 8
        y = self.widget.winfo_rooty() + 4

        self.tip_window = tw = tk.Toplevel(self.widget)
        tw.wm_overrideredirect(True)
        tw.wm_geometry(f"+{x}+{y}")
        tw.configure(bg=Colors.SURFACE)

        frame = tk.Frame(tw, bg=Colors.SURFACE, bd=1, relief="solid",
                         highlightbackground=Colors.BORDER, highlightthickness=1)
        frame.pack()

        label = tk.Label(
            frame, text=self.text, bg=Colors.SURFACE,
            fg=Colors.TEXT_PRIMARY, font=("Segoe UI", 10),
            padx=10, pady=6, justify="left"
        )
        label.pack()

    def _hide(self, event=None):
        if self._after_id:
            self.widget.after_cancel(self._after_id)
            self._after_id = None
        if self.tip_window:
            self.tip_window.destroy()
            self.tip_window = None

    def update_text(self, new_text):
        self.text = new_text


def create_nav_icon_button(parent, icon, tooltip_text, command):
    """Creates a sidebar navigation icon button with tooltip."""
    btn = customtkinter.CTkButton(
        parent, text=icon, command=command,
        fg_color="transparent", hover_color=Colors.SURFACE_HOVER,
        corner_radius=Layout.CORNER_RADIUS_SM,
        width=44, height=44,
        font=customtkinter.CTkFont(size=20)
    )
    Tooltip(btn, tooltip_text, delay=300)
    return btn


# ═══════════════════════════════════════════════════════════════
# GREETING UTILITIES
# ═══════════════════════════════════════════════════════════════

import datetime as _dt
import random as _random

_TIPS = [
    "💡 Tip: Eating slowly helps you feel full faster!",
    "💡 Tip: Aim for 5 servings of fruits & veggies daily.",
    "💡 Tip: Staying hydrated boosts your metabolism.",
    "💡 Tip: Protein at every meal keeps hunger at bay.",
    "💡 Tip: A 10-min walk after meals aids digestion.",
    "💡 Tip: Sleep 7-9 hours — it affects hunger hormones!",
    "💡 Tip: Prep your meals ahead to avoid unhealthy choices.",
    "💡 Tip: Dark leafy greens are nutrient powerhouses 🥬",
    "💡 Tip: Mindful eating reduces overeating by 30%.",
    "💡 Tip: Replace sugary drinks with herbal tea 🍵",
]


def get_greeting():
    """Returns a time-appropriate greeting with icon."""
    hour = _dt.datetime.now().hour
    if hour < 12:
        return "Good Morning 🌅"
    elif hour < 17:
        return "Good Afternoon ☀️"
    elif hour < 21:
        return "Good Evening 🌆"
    else:
        return "Good Night 🌙"


def get_daily_tip():
    """Returns a random daily wellness tip."""
    return _random.choice(_TIPS)
