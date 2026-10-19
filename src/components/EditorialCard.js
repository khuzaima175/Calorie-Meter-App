import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Button from './Button';
import { colors, radius } from '../theme/colors';

const images = { meal: require('../../assets/editorial/meal.jpg'), walk: require('../../assets/editorial/walk.jpg'), ingredients: require('../../assets/editorial/ingredients.jpg') };
export default function EditorialCard({ image = 'meal', eyebrow, title, description, action, onPress }) {
  return <View style={styles.card}>
    <View style={styles.copy}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text><Text style={styles.body}>{description}</Text>{action && <Button title={action} onPress={onPress} variant="ghost" size="sm" style={styles.action} />}</View>
    <Image source={images[image]} style={styles.image} accessible={false} resizeMode="cover" />
  </View>;
}
const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, marginBottom: 18, borderRadius: radius.lg, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.cardBorder },
  copy: { flex: 1 }, eyebrow: { color: colors.sageBright, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  title: { color: colors.textPrimary, fontSize: 17, fontWeight: '600', lineHeight: 23 }, body: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6 },
  image: { width: 88, height: 108, borderRadius: 16 }, action: { alignSelf: 'flex-start', marginLeft: -10, marginTop: 6, minHeight: 44 },
});
