import google.generativeai as genai
import json
import os

class AIManager:
    def __init__(self):
        # Default API key (can be improved with .env later)
        self.api_key = os.environ.get("GEMINI_API_KEY", "AIzaSyARiMM-cfeVHABE0q47hb14RBh0Z7mImV4")
        self.model = None
        self.configure()

    def configure(self):
        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        except Exception as e:
            print(f"Failed to configure AI: {e}")
            # In a real app, you might raise an error here to be caught by UI
            self.model = None

    def analyze_food(self, food_text):
        if not self.model:
            raise RuntimeError("AI model not configured")
        
        prompt = f"""
        Analyze the following food description and return a detailed nutritional breakdown in a clean JSON format.
        The JSON object should have a key "foods" which is an array of food items.
        For each item, provide: name, calories, protein_g, fat_g, and carbs_g.
        Also include fiber_g, sugar_g, and sodium_mg if available.
        Food description: "{food_text}"
        """
        response = self.model.generate_content(prompt)
        cleaned_response = response.text.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
        return json.loads(cleaned_response)

    def analyze_photo(self, image):
        if not self.model:
             raise RuntimeError("AI model not configured")
             
        prompt = "Analyze this image of food. Identify the items and quantities. Provide a descriptive string for the food entry box."
        response = self.model.generate_content([prompt, image])
        return response.text

    def get_nutrition_answer(self, question):
        if not self.model:
             return "AI not available."

        prompt = f"""
        You are a helpful nutrition assistant. Please answer the following question about food and nutrition.
        Provide a concise and easy-to-understand answer.
        Question: "{question}"
        """
        response = self.model.generate_content(prompt)
        return response.text

    def generate_meal_plan(self, calories, diet_type, restrictions, preferences):
        if not self.model:
            return "AI not available."

        prompt = f"""
        Create a one-day sample meal plan for a '{diet_type}' diet, targeting approximately {calories} calories.
        Consider the following dietary information:
        - Restrictions: {restrictions if restrictions else "None"}
        - Preferences/Dislikes: {preferences if preferences else "None"}

        Structure the response with sections for Breakfast, Lunch, Dinner, and Snacks.
        For each meal, list the food items and their estimated nutritional values (calories, protein, fat, carbs).
        Provide a total summary at the end. Make it easy to read.
        """
        response = self.model.generate_content(prompt)
        return response.text

    def get_contextual_analysis(self, context_prompt):
        if not self.model:
            return "AI not available."
        response = self.model.generate_content(context_prompt)
        return response.text
