// src/components/AIChatBubble.js
// Conversational chat message bubble with sage sprout avatar and structured text

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../theme/colors';
import { formatTimeString } from '../services/databaseService';

export default function AIChatBubble({
  message,
  onQuickReplyPress,
}) {
  const isUser = message.role === 'user';

  // Renders simple bold and markdown lists
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;

    // Splits into lines
    const lines = rawText.split('\n');

    return lines.map((line, lIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <View key={lIdx} style={{ height: 6 }} />;
      }

      // Bullet points
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
      const content = isBullet ? trimmed.substring(2) : trimmed;

      return (
        <View key={lIdx} style={[styles.textLine, isBullet && styles.bulletLine]}>
          {isBullet && (
            <View style={styles.bulletDot} />
          )}
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {content}
          </Text>
        </View>
      );
    });
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      {/* AI Sage Leaf Avatar */}
      {!isUser && (
        <View style={styles.avatarCircle}>
          <Ionicons name="leaf" size={14} color={colors.sageBright} />
        </View>
      )}

      <View style={[styles.bubbleWrapper, isUser ? styles.userBubbleWrapper : styles.aiBubbleWrapper]}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.aiBubble,
          ]}
        >
          {renderFormattedText(message.text)}

          <Text style={[styles.timeText, isUser ? styles.userTimeText : styles.aiTimeText]}>
            {formatTimeString(message.timestamp)}
          </Text>
        </View>

        {/* Quick Reply Chips if provided */}
        {message.quickReplies && message.quickReplies.length > 0 && (
          <View style={styles.quickRepliesContainer}>
            {message.quickReplies.map((reply, rIdx) => (
              <TouchableOpacity
                key={rIdx}
                style={styles.replyChip}
                onPress={() => onQuickReplyPress?.(reply)}
                activeOpacity={0.7}
              >
                <Text style={styles.replyChipText}>{reply}</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.sageBright} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.sageSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.3)',
  },
  bubbleWrapper: {
    maxWidth: '82%',
  },
  userBubbleWrapper: {
    alignItems: 'flex-end',
  },
  aiBubbleWrapper: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: '#2A3B31',
    borderColor: 'rgba(107, 155, 125, 0.4)',
    borderBottomRightRadius: radius.xs,
  },
  aiBubble: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.cardBorder,
    borderBottomLeftRadius: radius.xs,
  },
  textLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 1,
  },
  bulletLine: {
    paddingLeft: 4,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.sageBright,
    marginTop: 8,
    marginRight: 6,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  userText: {
    color: '#FFF',
  },
  aiText: {
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimeText: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  aiTimeText: {
    color: colors.textTertiary,
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  replyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.3)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  replyChipText: {
    ...typography.caption,
    color: colors.textPrimary,
    marginRight: 4,
  },
});
